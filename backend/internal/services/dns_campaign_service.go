// File: backend/internal/services/dns_campaign_service.go
package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/constants"
	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// DNSPersonaGroup represents a group of personas with identical DNS configurations
type DNSPersonaGroup struct {
	ConfigFingerprint string
	DNSConfig         models.DNSConfigDetails
	Personas          []*models.Persona
	Validator         *dnsvalidator.DNSValidator
}

// DNSPerformanceMetrics tracks optimization performance
type DNSPerformanceMetrics struct {
	TotalDNSCalls         int64
	UniqueConfigurations  int
	CacheHits             int64
	CacheMisses           int64
	ValidationErrors      int64
	AverageResponseTimeMs int64
}

type dnsCampaignServiceImpl struct {
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	personaStore     store.PersonaStore
	auditLogStore    store.AuditLogStore
	auditLogger      *utils.AuditLogger
	campaignJobStore store.CampaignJobStore
	appConfig        *config.AppConfig
	// PHASE 3 OPTIMIZATION: Cache for DNS validators to avoid recreating identical configurations
	dnsValidatorCache map[string]*dnsvalidator.DNSValidator
	cacheMutex        sync.RWMutex
	// PHASE 3 MONITORING: Performance metrics tracking
	performanceMetrics DNSPerformanceMetrics
	metricsMutex       sync.Mutex
	// PHASE 4 REDIS CACHING: Add Redis cache and optimization config
	redisCache         cache.RedisCache
	optimizationConfig *config.OptimizationConfig
	// PHASE 4 VALIDATION CACHE: In-memory validation result cache
	validationResultCache map[string]*cache.ValidationResult
	validationCacheMutex  sync.RWMutex
}

// NewDNSCampaignService creates a new DNSCampaignService with optional cache integration.
func NewDNSCampaignService(db *sqlx.DB, cs store.CampaignStore, ps store.PersonaStore, as store.AuditLogStore, cjs store.CampaignJobStore, appCfg *config.AppConfig) DNSCampaignService {
	return &dnsCampaignServiceImpl{
		db:                    db,
		campaignStore:         cs,
		personaStore:          ps,
		auditLogStore:         as,
		auditLogger:           utils.NewAuditLogger(as),
		campaignJobStore:      cjs,
		appConfig:             appCfg,
		dnsValidatorCache:     make(map[string]*dnsvalidator.DNSValidator),
		validationResultCache: make(map[string]*cache.ValidationResult),
	}
}

// NewDNSCampaignServiceWithCache creates a new DNSCampaignService with Redis cache integration.
func NewDNSCampaignServiceWithCache(db *sqlx.DB, cs store.CampaignStore, ps store.PersonaStore, as store.AuditLogStore, cjs store.CampaignJobStore, appCfg *config.AppConfig, redisCache cache.RedisCache, optimizationConfig *config.OptimizationConfig) DNSCampaignService {
	return &dnsCampaignServiceImpl{
		db:                    db,
		campaignStore:         cs,
		personaStore:          ps,
		auditLogStore:         as,
		auditLogger:           utils.NewAuditLogger(as),
		campaignJobStore:      cjs,
		appConfig:             appCfg,
		dnsValidatorCache:     make(map[string]*dnsvalidator.DNSValidator),
		redisCache:            redisCache,
		optimizationConfig:    optimizationConfig,
		validationResultCache: make(map[string]*cache.ValidationResult),
	}
}

// ConfigureDNSValidationPhase configures DNS validation phase for a campaign (single-campaign architecture)
func (s *dnsCampaignServiceImpl) ConfigureDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.DNSPhaseConfigRequest) error {
	log.Printf("ConfigureDNSValidationPhase: Configuring DNS validation phase for campaign %s", campaignID)

	// Convert persona IDs from strings to UUIDs
	personaUUIDs := make([]uuid.UUID, len(req.PersonaIDs))
	for i, idStr := range req.PersonaIDs {
		personaUUID, parseErr := uuid.Parse(idStr)
		if parseErr != nil {
			return fmt.Errorf("invalid persona ID format: %s", idStr)
		}
		personaUUIDs[i] = personaUUID
	}

	// Validate personas are DNS type and enabled
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	if err := s.validatePersonaIDs(ctx, querier, personaUUIDs, models.PersonaTypeDNS); err != nil {
		return fmt.Errorf("persona validation failed: %w", err)
	}

	// NOTE: In phase-centric approach, DNS validation parameters are stored in campaign configuration
	// The phase uses campaign.DomainsData for input and campaign.DNSResults for output
	// Persona validation is sufficient for phase configuration

	log.Printf("ConfigureDNSValidationPhase: Successfully configured DNS validation phase for campaign %s", campaignID)
	return nil
}

// TransitionToHTTPValidationPhase transitions campaign from DNS validation to HTTP validation phase
func (s *dnsCampaignServiceImpl) TransitionToHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("TransitionToHTTPValidationPhase: Transitioning campaign %s to HTTP validation phase", campaignID)

	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	// Get campaign and validate current state
	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}

	// Validate campaign is in DNS validation phase and completed
	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.PhaseTypeDNSValidation {
		return fmt.Errorf("campaign %s must be in dns_validation phase to transition to HTTP validation, current: %v", campaignID, campaign.CurrentPhase)
	}

	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
		return fmt.Errorf("DNS validation phase must be completed before transitioning to HTTP validation, current status: %v", campaign.PhaseStatus)
	}

	// Update campaign phase to HTTP validation
	httpPhase := models.PhaseTypeHTTPKeywordValidation
	pendingStatus := models.PhaseStatusNotStarted

	campaign.CurrentPhase = &httpPhase
	campaign.PhaseStatus = &pendingStatus
	campaign.UpdatedAt = time.Now().UTC()

	// MULTI-PHASE PROGRESS TRACKING: Maintain cumulative progress across phases
	// Phase Progress Ranges:
	// - Generation: 0-33%
	// - DNS Validation: 33-66%
	// - HTTP Validation: 66-100%

	oldProgress := 0.0
	if campaign.ProgressPercentage != nil {
		oldProgress = *campaign.ProgressPercentage
	}

	log.Printf("DEBUG [TransitionToHTTPValidationPhase]: MULTI-PHASE PROGRESS - Campaign %s", campaignID)
	log.Printf("DEBUG [TransitionToHTTPValidationPhase]: - DNS phase completed, progress: %.2f%%", oldProgress)

	// Set progress to 66% (DNS validation complete, starting HTTP validation)
	httpPhaseStartProgress := 66.0
	campaign.ProcessedItems = models.Int64Ptr(0) // Reset items counter for new phase
	campaign.ProgressPercentage = models.Float64Ptr(httpPhaseStartProgress)

	log.Printf("DEBUG [TransitionToHTTPValidationPhase]: - HTTP phase starting at: %.2f%%", httpPhaseStartProgress)
	log.Printf("DEBUG [TransitionToHTTPValidationPhase]: - Items counter reset for new phase tracking")

	// Update campaign record
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		return fmt.Errorf("failed to update campaign for HTTP validation phase transition: %w", err)
	}

	// Broadcast phase transition
	websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, "pending", "http_keyword_validation", 0, 0)

	log.Printf("TransitionToHTTPValidationPhase: Successfully transitioned campaign %s to HTTP validation phase", campaignID)
	return nil
}

func (s *dnsCampaignServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, *models.DNSValidationCampaignParams, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get campaign by ID %s: %w", campaignID, err)
	}
	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.PhaseTypeDNSValidation {
		currentPhase := "unknown"
		if campaign.CurrentPhase != nil {
			currentPhase = string(*campaign.CurrentPhase)
		}
		return nil, nil, fmt.Errorf("campaign %s is not a DNS validation campaign (current phase: %s)", campaignID, currentPhase)
	}

	// Phase-centric approach: DNS params are no longer stored separately
	// Return nil params to maintain interface compatibility during transition
	return campaign, nil, nil
}

func (s *dnsCampaignServiceImpl) validatePersonaIDs(ctx context.Context, querier store.Querier, personaIDs []uuid.UUID, expectedType models.PersonaTypeEnum) error {
	if len(personaIDs) == 0 {
		return fmt.Errorf("%s Persona IDs required", expectedType)
	}

	// PHASE 4 REDIS CACHING: Try to get personas from cache first if Redis is enabled
	var personas []*models.Persona
	var err error

	if s.redisCache != nil && s.optimizationConfig != nil && s.optimizationConfig.Phases.Caching {
		personas, err = s.getPersonasWithCache(ctx, querier, personaIDs)
	} else {
		// PHASE 2 N+1 OPTIMIZATION: Batch load all personas to eliminate N+1 pattern
		personas, err = s.personaStore.GetPersonasByIDs(ctx, querier, personaIDs)
	}

	if err != nil {
		return fmt.Errorf("failed to batch load personas for validation: %w", err)
	}

	// Create lookup map for efficient persona processing by ID
	personaMap := make(map[uuid.UUID]*models.Persona)
	for _, persona := range personas {
		personaMap[persona.ID] = persona
	}

	// Validate each requested persona ID using batch-loaded data
	for _, pID := range personaIDs {
		persona, exists := personaMap[pID]
		if !exists {
			return fmt.Errorf("%s persona ID '%s' not found", expectedType, pID)
		}
		if persona.PersonaType != expectedType {
			return fmt.Errorf("persona ID '%s' type '%s', expected '%s'", pID, persona.PersonaType, expectedType)
		}
		if !persona.IsEnabled {
			return fmt.Errorf("%s persona ID '%s' disabled", expectedType, pID)
		}

		// PHASE 4 CACHING: Cache validation result for persona configuration
		if s.redisCache != nil && expectedType == models.PersonaTypeDNS {
			if err := s.cachePersonaConfigValidation(ctx, persona); err != nil {
				log.Printf("Warning: Failed to cache persona config validation for %s: %v", persona.ID, err)
			}
		}
	}
	return nil
}

// PHASE 4 REDIS CACHING: Helper methods for cache integration

// getPersonasWithCache attempts to get personas from cache first, falling back to database
func (s *dnsCampaignServiceImpl) getPersonasWithCache(ctx context.Context, querier store.Querier, personaIDs []uuid.UUID) ([]*models.Persona, error) {
	// Try batch cache lookup first
	cachedPersonas, missedIDs, err := s.redisCache.GetPersonasBatch(ctx, personaIDs)
	if err != nil {
		log.Printf("Cache lookup failed, falling back to database: %v", err)
		return s.personaStore.GetPersonasByIDs(ctx, querier, personaIDs)
	}

	var allPersonas []*models.Persona
	allPersonas = append(allPersonas, cachedPersonas...)

	// If we have cache misses, fetch them from database
	if len(missedIDs) > 0 {
		dbPersonas, err := s.personaStore.GetPersonasByIDs(ctx, querier, missedIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch missed personas from database: %w", err)
		}

		// Cache the personas we just fetched
		for _, persona := range dbPersonas {
			if err := s.redisCache.SetPersona(ctx, persona, s.optimizationConfig.Performance.CacheTTL.Personas); err != nil {
				log.Printf("Warning: Failed to cache persona %s: %v", persona.ID, err)
			}
		}

		allPersonas = append(allPersonas, dbPersonas...)
	}

	return allPersonas, nil
}

// cachePersonaConfigValidation caches DNS configuration validation results
func (s *dnsCampaignServiceImpl) cachePersonaConfigValidation(ctx context.Context, persona *models.Persona) error {
	if persona.PersonaType != models.PersonaTypeDNS {
		return nil
	}

	// Generate configuration fingerprint
	configHash, err := s.getPersonaConfigFingerprintWithCache(ctx, persona)
	if err != nil {
		return fmt.Errorf("failed to generate config fingerprint: %w", err)
	}

	// Check if we already have a cached validation result
	if _, err := s.redisCache.GetDNSValidationResult(ctx, configHash); err == nil {
		return nil // Already cached
	}

	// Create validation result for caching
	validationResult := &cache.ValidationResult{
		IsValid:        true,
		ErrorMessage:   "",
		ResponseTime:   0, // Config validation is instant
		CachedAt:       time.Now(),
		ConfigHash:     configHash,
		ValidationHash: configHash,
		Metadata: map[string]interface{}{
			"persona_id":   persona.ID.String(),
			"persona_type": string(persona.PersonaType),
			"validated_at": time.Now().UTC(),
		},
	}

	// Cache the validation result
	return s.redisCache.SetDNSValidationResult(ctx, configHash, validationResult, s.optimizationConfig.Performance.CacheTTL.DNSValidation)
}

// getPersonaConfigFingerprintWithCache generates or retrieves cached configuration fingerprint
func (s *dnsCampaignServiceImpl) getPersonaConfigFingerprintWithCache(ctx context.Context, persona *models.Persona) (string, error) {
	// Try cache first if Redis is available
	if s.redisCache != nil {
		if cachedFingerprint, err := s.redisCache.GetConfigFingerprint(ctx, persona.ID); err == nil && cachedFingerprint != "" {
			return cachedFingerprint, nil
		}
	}

	// Generate new fingerprint
	var dnsConfig models.DNSConfigDetails
	if err := json.Unmarshal(persona.ConfigDetails, &dnsConfig); err != nil {
		return "", fmt.Errorf("failed to unmarshal DNS config for persona %s: %w", persona.ID, err)
	}

	fingerprint := s.createDNSConfigFingerprint(dnsConfig)

	// Cache the fingerprint if Redis is available
	if s.redisCache != nil {
		if err := s.redisCache.SetConfigFingerprint(ctx, persona.ID, fingerprint, s.optimizationConfig.Performance.CacheTTL.Personas); err != nil {
			log.Printf("Warning: Failed to cache config fingerprint for persona %s: %v", persona.ID, err)
		}
	}

	return fingerprint, nil
}

func (s *dnsCampaignServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign, action, description string) {
	if s.auditLogger == nil {
		return
	}
	s.auditLogger.LogCampaignEvent(ctx, exec, campaign, action, description)
}

// PHASE 3 N+1 OPTIMIZATION: DNS persona grouping and caching functions

// createDNSConfigFingerprint creates a unique fingerprint for DNS configuration deduplication
func (s *dnsCampaignServiceImpl) createDNSConfigFingerprint(dnsConfig models.DNSConfigDetails) string {
	// Create deterministic fingerprint for DNS configuration
	configBytes, _ := json.Marshal(dnsConfig)
	hash := sha256.Sum256(configBytes)
	return hex.EncodeToString(hash[:16]) // Use first 16 bytes for shorter fingerprint
}

// groupPersonasByDNSConfig groups DNS personas by unique configurations to eliminate redundant validations
func (s *dnsCampaignServiceImpl) groupPersonasByDNSConfig(personas []*models.Persona) map[string]*DNSPersonaGroup {
	groups := make(map[string]*DNSPersonaGroup)

	for _, persona := range personas {
		if persona.PersonaType != models.PersonaTypeDNS {
			continue
		}

		var dnsConfig models.DNSConfigDetails
		if len(persona.ConfigDetails) > 0 {
			if err := json.Unmarshal(persona.ConfigDetails, &dnsConfig); err != nil {
				log.Printf("Error unmarshalling DNS persona %s config: %v. Using defaults.", persona.ID, err)
				dnsConfig = models.DNSConfigDetails{} // Use empty config as default
			}
		}

		fingerprint := s.createDNSConfigFingerprint(dnsConfig)

		if group, exists := groups[fingerprint]; exists {
			group.Personas = append(group.Personas, persona)
		} else {
			// Create new group with cached validator
			validator := s.getOrCreateDNSValidator(fingerprint, dnsConfig)
			groups[fingerprint] = &DNSPersonaGroup{
				ConfigFingerprint: fingerprint,
				DNSConfig:         dnsConfig,
				Personas:          []*models.Persona{persona},
				Validator:         validator,
			}
		}
	}

	return groups
}

// getOrCreateDNSValidator gets cached DNS validator or creates new one
func (s *dnsCampaignServiceImpl) getOrCreateDNSValidator(fingerprint string, dnsConfig models.DNSConfigDetails) *dnsvalidator.DNSValidator {
	s.cacheMutex.RLock()
	if validator, exists := s.dnsValidatorCache[fingerprint]; exists {
		s.cacheMutex.RUnlock()
		return validator
	}
	s.cacheMutex.RUnlock()

	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	// Double-check after acquiring write lock
	if validator, exists := s.dnsValidatorCache[fingerprint]; exists {
		return validator
	}

	// Create new optimized DNS validator
	configDNSJSON := modelsDNStoConfigDNSJSON(dnsConfig)
	validatorConfig := config.ConvertJSONToDNSConfig(configDNSJSON)

	// PHASE 3 OPTIMIZATION: Enhanced DNS configuration for better performance
	if validatorConfig.MaxConcurrentGoroutines <= 0 {
		validatorConfig.MaxConcurrentGoroutines = 50 // Optimized concurrency
	}
	if validatorConfig.QueryTimeout <= 0 {
		validatorConfig.QueryTimeout = 5 * time.Second // Optimized timeout
	}

	validator := dnsvalidator.New(validatorConfig)

	// Cache with size limit (simple LRU)
	maxCacheSize := 50
	if len(s.dnsValidatorCache) >= maxCacheSize {
		// Remove first entry (could be enhanced with proper LRU)
		for k := range s.dnsValidatorCache {
			delete(s.dnsValidatorCache, k)
			break
		}
	}

	s.dnsValidatorCache[fingerprint] = validator

	// PHASE 3 MONITORING: Track cache miss
	s.incrementCacheMiss()
	return validator
}

// PHASE 3 MONITORING: Performance tracking methods
func (s *dnsCampaignServiceImpl) updatePerformanceMetrics(totalPersonas, uniqueConfigs int) {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.UniqueConfigurations = uniqueConfigs
}

func (s *dnsCampaignServiceImpl) incrementDNSCallCount() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.TotalDNSCalls++
}

func (s *dnsCampaignServiceImpl) incrementCacheHit() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.CacheHits++
}

func (s *dnsCampaignServiceImpl) incrementCacheMiss() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.CacheMisses++
}

func (s *dnsCampaignServiceImpl) incrementErrorCount() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.ValidationErrors++
}

func (s *dnsCampaignServiceImpl) updateResponseTime(duration time.Duration) {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.AverageResponseTimeMs = duration.Milliseconds()
}

func (s *dnsCampaignServiceImpl) GetPerformanceMetrics() DNSPerformanceMetrics {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()

	metrics := s.performanceMetrics

	// PHASE 4 REDIS CACHING: Include Redis cache metrics if available
	if s.redisCache != nil {
		cacheMetrics := s.redisCache.GetMetrics()
		metrics.CacheHits = cacheMetrics.HitCount
		metrics.CacheMisses = cacheMetrics.MissCount
		metrics.ValidationErrors = cacheMetrics.ErrorCount

		// Update average response time with cache latency if available
		if cacheMetrics.AvgLatencyMs > 0 {
			metrics.AverageResponseTimeMs = cacheMetrics.AvgLatencyMs
		}
	}

	return metrics
}

func modelsDNStoConfigDNSJSON(details models.DNSConfigDetails) config.DNSValidatorConfigJSON {
	return config.DNSValidatorConfigJSON{
		Resolvers:                  details.Resolvers,
		UseSystemResolvers:         details.UseSystemResolvers,
		QueryTimeoutSeconds:        details.QueryTimeoutSeconds,
		MaxDomainsPerRequest:       details.MaxDomainsPerRequest,
		ResolverStrategy:           details.ResolverStrategy,
		ResolversWeighted:          details.ResolversWeighted,
		ResolversPreferredOrder:    details.ResolversPreferredOrder,
		ConcurrentQueriesPerDomain: details.ConcurrentQueriesPerDomain,
		QueryDelayMinMs:            details.QueryDelayMinMs,
		QueryDelayMaxMs:            details.QueryDelayMaxMs,
		MaxConcurrentGoroutines:    details.MaxConcurrentGoroutines,
		RateLimitDPS:               details.RateLimitDps,
		RateLimitBurst:             details.RateLimitBurst,
	}
}

func (s *dnsCampaignServiceImpl) ProcessDNSValidationCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedInThisBatch int, err error) {
	log.Printf("ProcessDNSValidationCampaignBatch: Starting for campaignID %s", campaignID)

	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			return false, 0, fmt.Errorf("failed to begin SQL transaction for DNS campaign %s: %w", campaignID, startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for ProcessDNSValidationCampaignBatch %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL ProcessDNSValidationCampaignBatch for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("ProcessDNSValidationCampaignBatch: Rolled back SQL transaction for campaign %s due to error: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("ProcessDNSValidationCampaignBatch: Failed to commit SQL transaction for campaign %s: %v", campaignID, commitErr)
					opErr = fmt.Errorf("failed to commit SQL transaction: %w", commitErr)
				} else {
					log.Printf("SQL Transaction committed for ProcessDNSValidationCampaignBatch %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for ProcessDNSValidationCampaignBatch %s (no service-level transaction).", campaignID)
		// querier remains nil
	}

	campaign, errGetCamp := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGetCamp != nil {
		opErr = fmt.Errorf("failed to fetch campaign %s: %w", campaignID, errGetCamp)
		return false, 0, opErr
	}

	// Fix the status transition logic
	var originalStatus *models.PhaseStatusEnum
	if campaign.PhaseStatus != nil {
		originalStatus = campaign.PhaseStatus
	}

	if campaign.PhaseStatus == nil || *campaign.PhaseStatus == models.PhaseStatusNotStarted {
		status := models.PhaseStatusInProgress
		campaign.PhaseStatus = &status
		now := time.Now().UTC()
		campaign.StartedAt = &now
		if errUpdateCamp := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCamp != nil {
			opErr = fmt.Errorf("failed to mark campaign %s as running: %w", campaignID, errUpdateCamp)
			return false, 0, opErr
		}
		originalStatusStr := "unknown"
		if originalStatus != nil {
			originalStatusStr = string(*originalStatus)
		}
		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s marked as Running (was %s).", campaignID, originalStatusStr)
	} else if campaign.PhaseStatus != nil && *campaign.PhaseStatus != models.PhaseStatusInProgress && *campaign.PhaseStatus != models.PhaseStatusCompleted && *campaign.PhaseStatus != models.PhaseStatusPaused {
		statusStr := string(*campaign.PhaseStatus)
		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s not runnable (status: %s). DNS validation requires status: in_progress, completed, or paused.", campaignID, statusStr)
		return true, 0, nil
	}

	// NEW PHASE-CENTRIC APPROACH: Read domains from current campaign's DomainsData JSONB
	domainsData, err := s.campaignStore.GetCampaignDomainsData(ctx, querier, campaignID)
	if err != nil {
		opErr = fmt.Errorf("failed to get domains data for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	if domainsData == nil {
		opErr = fmt.Errorf("no domains data found for campaign %s - ensure domain generation phase completed", campaignID)
		return false, 0, opErr
	}

	// Parse domains from JSONB
	var domains []models.GeneratedDomain
	if err := json.Unmarshal(*domainsData, &domains); err != nil {
		opErr = fmt.Errorf("failed to parse domains data for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	// Set total items based on domains data
	expectedTotalItems := int64(len(domains))
	if campaign.TotalItems == nil || *campaign.TotalItems != expectedTotalItems {
		log.Printf("ProcessDNSValidationCampaignBatch: Setting TotalItems for campaign %s to %d based on DomainsData",
			campaignID, expectedTotalItems)
		campaign.TotalItems = models.Int64Ptr(expectedTotalItems)
	}

	// Ensure pointers are not nil for upcoming operations, defaulting to 0 if they are.
	// This is a safe-guard; they should be initialized.
	if campaign.ProcessedItems == nil {
		campaign.ProcessedItems = models.Int64Ptr(0)
	}
	if campaign.TotalItems == nil { // Should have been set above
		campaign.TotalItems = models.Int64Ptr(0)
	}
	if campaign.ProgressPercentage == nil {
		campaign.ProgressPercentage = models.Float64Ptr(0.0)
	}

	// Check if this is a completed campaign being re-triggered for DNS validation
	if *campaign.ProcessedItems >= *campaign.TotalItems && *campaign.TotalItems > 0 && campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusCompleted {
		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s was completed, checking for domains that need re-validation (preserving valid results).", campaignID)

		// Count domains that already have valid DNS status (these will be skipped)
		validDomainCount, errCountValid := s.campaignStore.CountDNSValidationResults(ctx, querier, campaignID, true)
		if errCountValid != nil {
			return false, 0, fmt.Errorf("failed to count valid DNS results for campaign %s: %w", campaignID, errCountValid)
		}

		// Count total domains that have been processed (valid + invalid)
		totalProcessedCount, errCountTotal := s.campaignStore.CountDNSValidationResults(ctx, querier, campaignID, false)
		if errCountTotal != nil {
			return false, 0, fmt.Errorf("failed to count total DNS results for campaign %s: %w", campaignID, errCountTotal)
		}

		// Calculate how many domains still need validation (total domains - already processed)
		domainsNeedingValidation := *campaign.TotalItems - totalProcessedCount

		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s has %d total domains, %d already processed (%d valid, %d invalid), %d need validation",
			campaignID, *campaign.TotalItems, totalProcessedCount, validDomainCount, totalProcessedCount-validDomainCount, domainsNeedingValidation)

		// Only restart if there are domains that need validation
		if domainsNeedingValidation > 0 {
			// Set processed items to count of domains that don't need reprocessing (valid ones)
			// This allows progress calculation to work correctly
			campaign.ProcessedItems = &validDomainCount
			campaign.ProgressPercentage = models.Float64Ptr(float64(validDomainCount) / float64(*campaign.TotalItems) * 100.0)
			status := models.PhaseStatusInProgress
			campaign.PhaseStatus = &status
			campaign.CompletedAt = nil
			now := time.Now().UTC()
			if campaign.StartedAt == nil {
				campaign.StartedAt = &now
			}

			opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
			if opErr != nil {
				return false, 0, fmt.Errorf("failed to restart campaign %s for re-validation: %w", campaignID, opErr)
			}
			log.Printf("ProcessDNSValidationCampaignBatch: Restarted campaign %s with %d valid domains preserved, will validate %d remaining domains",
				campaignID, validDomainCount, domainsNeedingValidation)
		} else {
			log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s has no domains needing validation, keeping completed status", campaignID)
			return false, 0, nil // No work to do
		}
	}

	// Set batch size for processing
	batchSizeVal := 1000 // Phase 3: Enterprise infrastructure default

	// Get domains that haven't been DNS validated yet from existing results
	existingResults, err := s.campaignStore.GetDNSValidationResultsByCampaign(ctx, querier, campaignID, store.ListValidationResultsFilter{})
	if err != nil {
		log.Printf("Warning: failed to get existing DNS results for campaign %s: %v. Proceeding with all domains.", campaignID, err)
		existingResults = []*models.DNSValidationResult{}
	}

	// Create a map of already processed domains
	processedDomains := make(map[string]bool)
	for _, result := range existingResults {
		processedDomains[result.DomainName] = true
	}

	// Filter domains to get only unprocessed ones for this batch
	var domainsToProcess []*models.GeneratedDomain
	for i, domain := range domains {
		if !processedDomains[domain.DomainName] {
			domainsToProcess = append(domainsToProcess, &domains[i])
			if len(domainsToProcess) >= batchSizeVal {
				break // Stop at batch size
			}
		}
	}

	if len(domainsToProcess) == 0 {
		log.Printf("ProcessDNSValidationCampaignBatch: No more domains to process for campaign %s. Checking for completion.", campaignID)
		if campaign.ProcessedItems == nil {
			campaign.ProcessedItems = models.Int64Ptr(0)
		}
		if campaign.TotalItems == nil {
			campaign.TotalItems = models.Int64Ptr(0)
		} // Should be set

		if *campaign.ProcessedItems >= *campaign.TotalItems && *campaign.TotalItems > 0 {
			status := models.PhaseStatusCompleted
			campaign.PhaseStatus = &status
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now

			// AUTOMATIC PHASE TRANSITION: Set currentPhase to http_validation
			httpValidationPhase := models.PhaseTypeHTTPKeywordValidation
			campaign.CurrentPhase = &httpValidationPhase

			log.Printf("ProcessDNSValidationCampaignBatch: All domains processed for campaign %s. Marking complete and transitioning to http_keyword_validation phase.", campaignID)
			done = true
		} else if *campaign.TotalItems == 0 {
			status := models.PhaseStatusCompleted
			campaign.PhaseStatus = &status
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now

			// AUTOMATIC PHASE TRANSITION: Set currentPhase to http_validation
			httpValidationPhase := models.PhaseTypeHTTPKeywordValidation
			campaign.CurrentPhase = &httpValidationPhase

			log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s has 0 total items. Marking complete and transitioning to http_keyword_validation phase.", campaignID)
			done = true
		} else {
			log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s has %d/%d processed, but no domains fetched for this batch. May need more jobs or source completed.", campaignID, *campaign.ProcessedItems, *campaign.TotalItems)
			done = true
		}
		opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
		return done, 0, opErr
	}

	// NEW PHASE-CENTRIC APPROACH: Get DNS personas from campaign configuration
	// For now, get all available DNS personas as a transition approach
	// TODO: Store persona configuration in campaign-level config
	personaFilter := store.ListPersonasFilter{
		Type:      models.PersonaTypeDNS,
		IsEnabled: store.BoolPtr(true),
		Limit:     100,
	}
	allDNSPersonas, err := s.personaStore.ListPersonas(ctx, querier, personaFilter)
	if err != nil {
		opErr = fmt.Errorf("failed to fetch DNS personas for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	if len(allDNSPersonas) == 0 {
		opErr = fmt.Errorf("no valid DNS personas available for campaign %s", campaignID)
		return false, 0, opErr
	}

	// PHASE 3 N+1 OPTIMIZATION: Group personas by DNS configuration to reduce redundant validations
	personas := allDNSPersonas
	personaGroups := s.groupPersonasByDNSConfig(personas)
	log.Printf("ProcessDNSValidationCampaignBatch: Grouped %d DNS personas into %d unique configurations for campaign %s",
		len(personas), len(personaGroups), campaignID)

	dbResults := make([]*models.DNSValidationResult, 0, len(domainsToProcess))
	nowTime := time.Now().UTC()

	// Store the original context error, if any, to check after the loop
	var batchProcessingContextErr error
	batchCtx, batchCancel := context.WithCancel(ctx)
	defer batchCancel()

	// PHASE 3 ENHANCEMENT: Use bulk validation instead of N+1 pattern
	// Extract domain names for bulk validation
	domainNames := make([]string, len(domainsToProcess))
	domainMap := make(map[string]*models.GeneratedDomain)
	for i, domain := range domainsToProcess {
		domainNames[i] = domain.DomainName
		domainMap[domain.DomainName] = domain
	}

	// Use bulk validation from Phase 2
	if len(personaGroups) == 0 {
		opErr = fmt.Errorf("no persona groups available for bulk validation")
		return false, 0, opErr
	}

	// Get the first persona group validator for bulk validation
	var validator *dnsvalidator.DNSValidator
	for _, group := range personaGroups {
		validator = group.Validator
		break
	}

	if validator == nil {
		opErr = fmt.Errorf("no validator available for bulk validation")
		return false, 0, opErr
	}

	// Perform bulk validation
	log.Printf("ProcessDNSValidationCampaignBatch: Performing bulk DNS validation for %d domains", len(domainNames))
	bulkResults := validator.ValidateDomainsBulk(domainNames, batchCtx, batchSizeVal)

	// Process bulk results and convert to database format
	for _, bulkResult := range bulkResults {
		if batchCtx.Err() != nil {
			log.Printf("Batch context cancelled during result processing for domain %s", bulkResult.Domain)
			batchProcessingContextErr = batchCtx.Err()
			break
		}

		domain := domainMap[bulkResult.Domain]
		if domain == nil {
			continue // Skip if domain not found in map
		}

		// Track metrics
		s.incrementDNSCallCount()
		if bulkResult.Status != constants.DNSStatusResolved {
			s.incrementErrorCount()
		}

		// Create database result
		dbRes := &models.DNSValidationResult{
			ID:                   uuid.New(),
			DNSCampaignID:        campaignID,
			GeneratedDomainID:    uuid.NullUUID{UUID: domain.ID, Valid: true},
			DomainName:           bulkResult.Domain,
			ValidationStatus:     bulkResult.Status,
			ValidatedByPersonaID: uuid.NullUUID{}, // Will be set if resolved
			Attempts:             models.IntPtr(1),
			LastCheckedAt:        &nowTime,
		}

		// Set persona ID if resolved
		if bulkResult.Status == constants.DNSStatusResolved {
			for _, group := range personaGroups {
				if len(group.Personas) > 0 {
					dbRes.ValidatedByPersonaID = uuid.NullUUID{UUID: group.Personas[0].ID, Valid: true}
					break
				}
			}
		}

		// Set DNS records or error
		if len(bulkResult.IPs) > 0 {
			ipBytes, _ := json.Marshal(bulkResult.IPs)
			dbRes.DNSRecords = models.JSONRawMessagePtr(json.RawMessage(ipBytes))
		} else if bulkResult.Error != "" {
			errorMap := map[string]string{"error": bulkResult.Error}
			errorBytes, _ := json.Marshal(errorMap)
			dbRes.DNSRecords = models.JSONRawMessagePtr(json.RawMessage(errorBytes))
		}

		// Stream individual DNS validation result
		log.Printf("🔴 [DNS_STREAMING_DEBUG] Streaming DNS result for domain %s, status: %s, campaign: %s",
			bulkResult.Domain, bulkResult.Status, campaignID)

		// Prepare DNS records map for message payload
		dnsRecordsMap := make(map[string]interface{})
		if len(bulkResult.IPs) > 0 {
			dnsRecordsMap["ips"] = bulkResult.IPs
		}
		if bulkResult.Error != "" {
			dnsRecordsMap["error"] = bulkResult.Error
		}

		// Create consolidated message using standardized format
		payload := websocket.DNSValidationPayload{
			CampaignID:       campaignID.String(),
			DomainID:         dbRes.ID.String(),
			Domain:           bulkResult.Domain,
			ValidationStatus: bulkResult.Status,
			DNSRecords:       dnsRecordsMap,
			Attempts:         1,
			ProcessingTime:   0,
			TotalValidated:   0,
		}

		// ENHANCED: Try WebSocket broadcast with fallback mechanism
		if err := s.streamDNSResultWithFallback(ctx, campaignID.String(), payload); err != nil {
			log.Printf("❌ [DNS_STREAMING_ERROR] Failed to stream DNS result for domain %s, campaign %s: %v",
				bulkResult.Domain, campaignID, err)
			// Continue execution - streaming failure should not break the validation process
		} else {
			log.Printf("✅ [DNS_STREAMING_SUCCESS] Successfully streamed DNS result: domain=%s, status=%s, campaign=%s",
				bulkResult.Domain, bulkResult.Status, campaignID)
		}

		dbResults = append(dbResults, dbRes)
	}

	// If the loop was exited due to batch context cancellation, batchProcessingContextErr will be set.
	if batchProcessingContextErr != nil {
		log.Printf("Context cancelled during DNS batch processing for campaign %s. Partial results may be saved. Error: %v", campaignID, batchProcessingContextErr)
		// Set opErr to ensure transaction rollback if in SQL mode and to signal an issue.
		// Preserve original opErr if it was already set (e.g., by a DB call before the loop).
		if opErr == nil {
			opErr = fmt.Errorf("context cancelled during batch processing: %w", batchProcessingContextErr)
		}
	}

	if len(dbResults) > 0 {
		if errCreateResults := s.campaignStore.CreateDNSValidationResults(ctx, querier, dbResults); errCreateResults != nil {
			currentErr := fmt.Errorf("failed to save DNS validation results for campaign %s: %w", campaignID, errCreateResults)
			if opErr == nil {
				opErr = currentErr
			} else { // opErr was already set (e.g. context cancellation), log this new error
				log.Printf("Additionally failed to save DNS results for campaign %s: %v (original opErr: %v)", campaignID, currentErr, opErr)
			}
			// Do not return yet if opErr was from context cancellation, allow campaign update attempt
			// If opErr was nil and now set by CreateDNSValidationResults, this is the primary error.
			if batchProcessingContextErr == nil { // If not a context error, this is the main failure.
				return false, 0, opErr
			}
		} else {
			processedInThisBatch = len(dbResults)
			log.Printf("ProcessDNSValidationCampaignBatch: Saved %d DNS results for campaign %s.", processedInThisBatch, campaignID)

			// PHASE-CENTRIC APPROACH: Also update campaign's DNSResults JSONB field
			// Get all DNS results for this campaign to store in JSONB
			allDNSResults, errGetAllResults := s.campaignStore.GetDNSValidationResultsByCampaign(ctx, querier, campaignID, store.ListValidationResultsFilter{})
			if errGetAllResults != nil {
				log.Printf("Warning: failed to get all DNS results for JSONB update in campaign %s: %v", campaignID, errGetAllResults)
			} else {
				// Convert to JSONB and store in campaign.DNSResults
				dnsResultsJSON, errMarshal := json.Marshal(allDNSResults)
				if errMarshal != nil {
					log.Printf("Warning: failed to marshal DNS results to JSON for campaign %s: %v", campaignID, errMarshal)
				} else {
					dnsResultsRaw := json.RawMessage(dnsResultsJSON)
					if errUpdateDNSResults := s.campaignStore.UpdateCampaignDNSResults(ctx, querier, campaignID, &dnsResultsRaw); errUpdateDNSResults != nil {
						log.Printf("Warning: failed to update campaign DNSResults JSONB for campaign %s: %v", campaignID, errUpdateDNSResults)
					} else {
						log.Printf("ProcessDNSValidationCampaignBatch: Updated campaign DNSResults JSONB for campaign %s with %d results", campaignID, len(allDNSResults))
					}
				}
			}
		}
	}

	// Only update ProcessedItems if opErr is not from a critical save failure of results
	// or if it's a context cancellation (where some results might have been saved)
	if opErr == nil || batchProcessingContextErr != nil {
		if campaign.ProcessedItems == nil {
			campaign.ProcessedItems = models.Int64Ptr(0)
		}
		*campaign.ProcessedItems += int64(processedInThisBatch)
	}

	if campaign.TotalItems == nil {
		campaign.TotalItems = models.Int64Ptr(0)
	} // Should be set
	if campaign.ProcessedItems == nil {
		campaign.ProcessedItems = models.Int64Ptr(0)
	}
	if campaign.ProgressPercentage == nil {
		campaign.ProgressPercentage = models.Float64Ptr(0.0)
	}

	// MULTI-PHASE PROGRESS TRACKING: DNS validation uses 33-66% range
	dnsPhaseStartProgress := 33.0 // DNS phase starts at 33%
	dnsPhaseEndProgress := 66.0   // DNS phase ends at 66%

	if *campaign.TotalItems > 0 {
		// Calculate DNS validation progress within the 33-66% range
		dnsProgress := (float64(*campaign.ProcessedItems) / float64(*campaign.TotalItems)) * 100
		if dnsProgress > 100 {
			dnsProgress = 100
		}

		// Scale DNS progress to 33-66% range
		scaledProgress := dnsPhaseStartProgress + (dnsProgress/100.0)*(dnsPhaseEndProgress-dnsPhaseStartProgress)
		*campaign.ProgressPercentage = scaledProgress

		log.Printf("[MULTI-PHASE] DNS validation progress for campaign %s: %.1f%% within phase, %.1f%% overall (33-66%% range)",
			campaignID, dnsProgress, scaledProgress)
	} else if *campaign.TotalItems == 0 {
		// If total is 0, DNS phase is complete - set to 66%
		*campaign.ProgressPercentage = dnsPhaseEndProgress
		log.Printf("[MULTI-PHASE] DNS validation complete for campaign %s (0 total items) - setting to %.1f%%", campaignID, dnsPhaseEndProgress)
	}

	// Determine 'done' status and auto-transition to HTTP validation phase
	if *campaign.ProcessedItems >= *campaign.TotalItems && *campaign.TotalItems > 0 {
		// DNS validation phase is complete - transition to HTTP validation
		httpPhase := models.PhaseTypeHTTPKeywordValidation
		pendingStatus := models.PhaseStatusNotStarted
		campaign.CurrentPhase = &httpPhase
		campaign.PhaseStatus = &pendingStatus
		// CRITICAL FIX: Maintain cumulative progress at 66% instead of resetting to 0%
		campaign.ProgressPercentage = models.Float64Ptr(dnsPhaseEndProgress)
		done = true
		log.Printf("[PHASE-TRANSITION] Campaign %s completed DNS validation, transitioning to HTTP validation at %.1f%% progress", campaignID, dnsPhaseEndProgress)
	} else if *campaign.TotalItems == 0 {
		// DNS validation phase is complete - transition to HTTP validation
		httpPhase := models.PhaseTypeHTTPKeywordValidation
		pendingStatus := models.PhaseStatusNotStarted
		campaign.CurrentPhase = &httpPhase
		campaign.PhaseStatus = &pendingStatus
		// CRITICAL FIX: Maintain cumulative progress at 66% instead of resetting to 0%
		campaign.ProgressPercentage = models.Float64Ptr(dnsPhaseEndProgress)
		done = true
		log.Printf("[PHASE-TRANSITION] Campaign %s (0 total items) transitioning to HTTP validation at %.1f%% progress", campaignID, dnsPhaseEndProgress)
	} else {
		done = false
	}

	if errUpdateCamp := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCamp != nil {
		currentErr := fmt.Errorf("failed to update campaign %s status/progress: %w", campaignID, errUpdateCamp)
		if opErr == nil {
			opErr = currentErr
		} else {
			log.Printf("ProcessDNSValidationCampaignBatch: Also failed to update campaign %s status/progress: %v (original opErr: %v)", campaignID, currentErr, opErr)
		}
		// If opErr was from context cancellation or result saving, this return includes processed count.
		// If opErr is newly set here, processedInThisBatch might be from a successful save.
		return false, processedInThisBatch, opErr
	}

	// Broadcast DNS validation progress via WebSocket
	if campaign.ProgressPercentage != nil && campaign.ProcessedItems != nil && campaign.TotalItems != nil {
		processedCount := *campaign.ProcessedItems
		totalCount := *campaign.TotalItems

		if done {
			// Campaign completed
			websocket.BroadcastCampaignProgress(campaignID.String(), 100.0, "completed", "dns_validation", processedCount, totalCount)

			// DNS validation complete - campaign stays in dns_validation phase until user manually configures next phase
			log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s DNS validation phase complete. Waiting for user to configure HTTP validation phase.", campaignID)
		} else {
			// Progress update
			websocket.BroadcastValidationProgress(campaignID.String(), processedCount, totalCount, "dns_validation")
		}
	}

	processedItemsVal := int64(0)
	if campaign.ProcessedItems != nil {
		processedItemsVal = *campaign.ProcessedItems
	}
	totalItemsVal := int64(0)
	if campaign.TotalItems != nil {
		totalItemsVal = *campaign.TotalItems
	}
	log.Printf("ProcessDNSValidationCampaignBatch: Finished batch for campaign %s. ProcessedInBatch: %d, DoneForJob: %t, CampaignProcessed: %d/%d, Final opErr: %v",
		campaignID, processedInThisBatch, done, processedItemsVal, totalItemsVal, opErr)
	return done, processedInThisBatch, opErr
}

// streamDNSResultWithFallback attempts to stream DNS validation results with fallback mechanisms
func (s *dnsCampaignServiceImpl) streamDNSResultWithFallback(ctx context.Context, campaignID string, payload websocket.DNSValidationPayload) error {
	// Primary attempt: Use WebSocket broadcaster
	broadcaster := websocket.GetBroadcaster()
	if broadcaster != nil {
		// Create and broadcast message directly
		message := websocket.WebSocketMessage{
			ID:         uuid.New().String(),
			Timestamp:  time.Now().Format(time.RFC3339),
			Type:       "dns.validation.result",
			CampaignID: campaignID,
			Data:       payload,
		}

		// Broadcast message
		broadcaster.BroadcastToCampaign(campaignID, message)
		log.Printf("✅ [DNS_STREAMING_SUCCESS] WebSocket broadcast successful for campaign %s, type: %s", campaignID, message.Type)
		return nil
	} else {
		log.Printf("⚠️ [DNS_STREAMING_WARNING] No WebSocket broadcaster available for campaign %s", campaignID)
	}

	// Fallback 1: Log detailed result for debugging/monitoring
	log.Printf("📊 [DNS_STREAMING_FALLBACK] DNS result logged: campaign=%s, domain=%s, status=%s, attempts=%d",
		campaignID, payload.Domain, payload.ValidationStatus, payload.Attempts)

	// Fallback 2: Store result summary for later retrieval (optional)
	// This could be enhanced to store in a separate streaming_failures table
	// for systems that need to replay missed messages

	// Return success - streaming failure should not break the validation process
	return nil
	// Fallback 2: Store result summary for later retrieval (optional)
	// This could be enhanced to store in a separate streaming_failures table
	// for systems that need to replay missed messages

	// Return success - streaming failure should not break the validation process
	return nil
}

// atomicPhaseTransition performs atomic campaign phase transition with event broadcasting
func (s *dnsCampaignServiceImpl) atomicPhaseTransition(ctx context.Context, campaign *models.LeadGenerationCampaign, campaignID uuid.UUID) error {
	// Use the established transaction manager pattern from the codebase
	tm := utils.NewTransactionManager(s.db)

	return tm.WithTransaction(ctx, "DNS_Phase_Transition", func(querier store.Querier) error {
		log.Printf("INFO [Atomic Phase Transition]: Starting atomic transition for campaign %s", campaignID)

		// Step 1: Update campaign status to running if it was completed (within transaction)
		if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusCompleted {
			status := models.PhaseStatusInProgress
			campaign.PhaseStatus = &status
			err := s.campaignStore.UpdateCampaign(ctx, querier, campaign)
			if err != nil {
				return fmt.Errorf("failed to update campaign status to running: %w", err)
			}
			log.Printf("INFO [Atomic Phase Transition]: Updated campaign %s status from completed to running", campaignID)
		}

		// Step 2: Update currentPhase to dns_validation (within same transaction)
		// Fetch the updated campaign within the transaction to ensure consistency
		updatedCampaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
		if err != nil {
			return fmt.Errorf("failed to fetch campaign for phase update: %w", err)
		}

		// Update the currentPhase to dns_validation
		dnsValidationPhase := models.PhaseTypeDNSValidation
		updatedCampaign.CurrentPhase = &dnsValidationPhase

		err = s.campaignStore.UpdateCampaign(ctx, querier, updatedCampaign)
		if err != nil {
			return fmt.Errorf("failed to update campaign currentPhase to dns_validation: %w", err)
		}

		log.Printf("INFO [Atomic Phase Transition]: Successfully updated campaign %s phase to dns_validation", campaignID)

		// Transaction will be committed automatically by TransactionManager
		// Step 3: Broadcast phase transition event synchronously to minimize race conditions
		// This ensures frontend gets the notification as soon as the transaction commits
		s.broadcastPhaseTransitionEvent(ctx, campaignID, "dns_validation", "running")

		log.Printf("INFO [Atomic Phase Transition]: Completed atomic transition - campaign %s now in dns_validation phase", campaignID)
		return nil
	})
}

// broadcastPhaseTransitionEvent broadcasts phase transition events via WebSocket and cache invalidation
func (s *dnsCampaignServiceImpl) broadcastPhaseTransitionEvent(ctx context.Context, campaignID uuid.UUID, newPhase string, newStatus string) {
	log.Printf("BROADCAST [Phase Transition]: Broadcasting phase transition to %s for campaign %s", newPhase, campaignID)

	// Broadcast via WebSocket for real-time UI updates
	websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, newStatus, newPhase, 0, 0)

	// CONSOLIDATED: Use standardized phase transition broadcast
	websocket.BroadcastPhaseTransition(campaignID.String(), "domain_generation", newPhase, 0.0)
	log.Printf("✅ [Phase Transition]: Standardized phase transition broadcast successful for campaign %s", campaignID)
}
