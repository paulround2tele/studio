// File: backend/internal/services/http_keyword_campaign_service.go
package services

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"reflect"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/keywordscanner"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/proxymanager"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// HTTPPersonaGroup represents a group of personas with identical HTTP configurations
type HTTPPersonaGroup struct {
	ConfigFingerprint string
	HTTPConfig        models.HTTPConfigDetails
	Personas          []*models.Persona
	HTTPClient        *http.Client
}

// OptimizedHTTPClient represents a pooled HTTP client with usage tracking
type OptimizedHTTPClient struct {
	Client            *http.Client
	ConfigFingerprint string
	CreatedAt         time.Time
	UsageCount        int64
}

// HTTPPerformanceMetrics tracks HTTP optimization performance
type HTTPPerformanceMetrics struct {
	TotalHTTPRequests     int64
	UniqueConfigurations  int
	ConnectionPoolHits    int64
	ConnectionPoolMisses  int64
	ValidationErrors      int64
	AverageResponseTimeMs int64
	ActiveConnections     int
}

type httpKeywordCampaignServiceImpl struct {
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	personaStore     store.PersonaStore
	proxyStore       store.ProxyStore
	keywordStore     store.KeywordStore
	auditLogStore    store.AuditLogStore
	auditLogger      *utils.AuditLogger
	campaignJobStore store.CampaignJobStore
	httpValidator    *httpvalidator.HTTPValidator
	keywordScanner   *keywordscanner.Service
	proxyManager     *proxymanager.ProxyManager
	appConfig        *config.AppConfig
	// PHASE 3 OPTIMIZATION: HTTP client pool for connection reuse and reduced N+1 calls
	httpClientPool    map[string]*OptimizedHTTPClient
	clientPoolMutex   sync.RWMutex
	clientMaxIdleTime time.Duration
	// PHASE 3 MONITORING: Performance metrics tracking
	performanceMetrics HTTPPerformanceMetrics
	metricsMutex       sync.Mutex
	// PHASE 4 REDIS CACHING: Add Redis cache and optimization config
	redisCache         cache.RedisCache
	optimizationConfig *config.OptimizationConfig
	// PHASE 4 VALIDATION CACHE: In-memory validation result cache
	validationResultCache map[string]*cache.ValidationResult
	validationCacheMutex  sync.RWMutex
}

// NewHTTPKeywordCampaignService creates a new HTTPKeywordCampaignService.
func NewHTTPKeywordCampaignService(
	db *sqlx.DB,
	cs store.CampaignStore, ps store.PersonaStore, prStore store.ProxyStore, ks store.KeywordStore, as store.AuditLogStore,
	cjs store.CampaignJobStore,
	hv *httpvalidator.HTTPValidator, kwScanner *keywordscanner.Service, pm *proxymanager.ProxyManager, appCfg *config.AppConfig,
) HTTPKeywordCampaignService {
	return &httpKeywordCampaignServiceImpl{
		db:                    db,
		campaignStore:         cs,
		personaStore:          ps,
		proxyStore:            prStore,
		keywordStore:          ks,
		auditLogStore:         as,
		auditLogger:           utils.NewAuditLogger(as),
		campaignJobStore:      cjs,
		httpValidator:         hv,
		keywordScanner:        kwScanner,
		proxyManager:          pm,
		appConfig:             appCfg,
		httpClientPool:        make(map[string]*OptimizedHTTPClient),
		clientMaxIdleTime:     10 * time.Minute,
		validationResultCache: make(map[string]*cache.ValidationResult),
	}
}

// NewHTTPKeywordCampaignServiceWithCache creates a new HTTPKeywordCampaignService with Redis cache integration.
func NewHTTPKeywordCampaignServiceWithCache(
	db *sqlx.DB,
	cs store.CampaignStore, ps store.PersonaStore, prStore store.ProxyStore, ks store.KeywordStore, as store.AuditLogStore,
	cjs store.CampaignJobStore,
	hv *httpvalidator.HTTPValidator, kwScanner *keywordscanner.Service, pm *proxymanager.ProxyManager, appCfg *config.AppConfig,
	redisCache cache.RedisCache, optimizationConfig *config.OptimizationConfig,
) HTTPKeywordCampaignService {
	return &httpKeywordCampaignServiceImpl{
		db:                    db,
		campaignStore:         cs,
		personaStore:          ps,
		proxyStore:            prStore,
		keywordStore:          ks,
		auditLogStore:         as,
		auditLogger:           utils.NewAuditLogger(as),
		campaignJobStore:      cjs,
		httpValidator:         hv,
		keywordScanner:        kwScanner,
		proxyManager:          pm,
		appConfig:             appCfg,
		httpClientPool:        make(map[string]*OptimizedHTTPClient),
		clientMaxIdleTime:     10 * time.Minute,
		redisCache:            redisCache,
		optimizationConfig:    optimizationConfig,
		validationResultCache: make(map[string]*cache.ValidationResult),
	}
}

// ConfigureHTTPValidationPhase configures HTTP validation phase for a campaign (single-campaign architecture)
func (s *httpKeywordCampaignServiceImpl) ConfigureHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.HTTPPhaseConfigRequest) error {
	log.Printf("ConfigureHTTPValidationPhase: Configuring HTTP validation phase for campaign %s", campaignID)

	// Convert persona IDs from strings to UUIDs
	personaUUIDs := make([]uuid.UUID, len(req.PersonaIDs))
	for i, idStr := range req.PersonaIDs {
		personaUUID, parseErr := uuid.Parse(idStr)
		if parseErr != nil {
			return fmt.Errorf("invalid persona ID format: %s", idStr)
		}
		personaUUIDs[i] = personaUUID
	}

	// Validate personas are HTTP type and enabled
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	if err := s.validatePersonaIDs(ctx, querier, personaUUIDs, models.PersonaTypeHTTP); err != nil {
		return fmt.Errorf("persona validation failed: %w", err)
	}

	// NOTE: In phase-centric approach, HTTP validation parameters are stored in campaign configuration
	// The phase uses campaign.DNSResults for input and campaign.HTTPResults for output
	// Remove SourceCampaignID as we read from current campaign's DNSResults JSONB
	httpParams := &models.HTTPKeywordCampaignParams{
		CampaignID:               campaignID,
		PersonaIDs:               personaUUIDs,
		KeywordSetIDs:            &[]uuid.UUID{}, // Will be configured separately if needed
		AdHocKeywords:            &req.AdHocKeywords,
		RotationIntervalSeconds:  models.IntPtr(30),
		ProcessingSpeedPerMinute: models.IntPtr(60),
		BatchSize:                models.IntPtr(50),
		RetryAttempts:            models.IntPtr(3),
	}

	// Store HTTP validation parameters
	if err := s.campaignStore.CreateHTTPKeywordParams(ctx, querier, httpParams); err != nil {
		log.Printf("INFO: HTTP params may already exist for campaign %s, continuing...", campaignID)
	}

	log.Printf("ConfigureHTTPValidationPhase: Successfully configured HTTP validation phase for campaign %s", campaignID)
	return nil
}

// TransitionToAnalysisPhase transitions campaign from HTTP validation to analysis phase
func (s *httpKeywordCampaignServiceImpl) TransitionToAnalysisPhase(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("TransitionToAnalysisPhase: Transitioning campaign %s to analysis phase", campaignID)

	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	// Get campaign and validate current state
	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}

	// Validate campaign is in HTTP validation phase and completed
	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.PhaseTypeHTTPKeywordValidation {
		return fmt.Errorf("campaign %s must be in http_keyword_validation phase to transition to analysis, current: %v", campaignID, campaign.CurrentPhase)
	}

	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
		return fmt.Errorf("HTTP validation phase must be completed before transitioning to analysis, current status: %v", campaign.PhaseStatus)
	}

	// Update campaign phase to analysis
	analysisPhase := models.PhaseTypeAnalysis
	pendingStatus := models.PhaseStatusNotStarted

	campaign.CurrentPhase = &analysisPhase
	campaign.PhaseStatus = &pendingStatus
	// PhaseStatus is already set above, remove this line
	campaign.UpdatedAt = time.Now().UTC()

	// Reset progress for new phase
	campaign.ProcessedItems = models.Int64Ptr(0)
	campaign.ProgressPercentage = models.Float64Ptr(0.0)

	// Update campaign record
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		return fmt.Errorf("failed to update campaign for analysis phase transition: %w", err)
	}

	// Broadcast phase transition
	websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, "pending", "analysis", 0, 0)

	log.Printf("TransitionToAnalysisPhase: Successfully transitioned campaign %s to analysis phase", campaignID)
	return nil
}

func (s *httpKeywordCampaignServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, *models.HTTPKeywordCampaignParams, error) {
	fmt.Printf("[DEBUG http_keyword] GetCampaignDetails called for campaign ID: %s\n", campaignID)
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		fmt.Printf("[DEBUG http_keyword] Error getting campaign: %v\n", err)
		return nil, nil, fmt.Errorf("failed to get campaign by ID %s: %w", campaignID, err)
	}
	currentPhase := "unknown"
	if campaign.CurrentPhase != nil {
		currentPhase = string(*campaign.CurrentPhase)
	}
	fmt.Printf("[DEBUG http_keyword] Campaign phase: %s\n", currentPhase)

	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.PhaseTypeHTTPKeywordValidation {
		fmt.Printf("[DEBUG http_keyword] Campaign %s is not an HTTP/Keyword campaign (phase: %s)\n", campaignID, currentPhase)
		return nil, nil, fmt.Errorf("campaign %s is not an HTTP/Keyword campaign (phase: %s)", campaignID, currentPhase)
	}

	fmt.Printf("[DEBUG http_keyword] Calling GetHTTPKeywordParams for campaign ID: %s\n", campaignID)
	params, err := s.campaignStore.GetHTTPKeywordParams(ctx, querier, campaignID)
	if err != nil {
		fmt.Printf("[DEBUG http_keyword] Error getting HTTP/Keyword params: %v\n", err)
		return nil, nil, fmt.Errorf("failed to get HTTP/Keyword params for campaign %s: %w", campaignID, err)
	}

	fmt.Printf("[DEBUG http_keyword] GetHTTPKeywordParams returned params: %+v\n", params)
	fmt.Printf("[DEBUG http_keyword] PersonaIDs in params: %+v (ptr: %p, len: %d)\n", params.PersonaIDs, &params.PersonaIDs, len(params.PersonaIDs))

	// Detailed inspection of PersonaIDs
	if len(params.PersonaIDs) > 0 {
		fmt.Printf("[DEBUG http_keyword] First PersonaID: %s (address: %p)\n", params.PersonaIDs[0], &params.PersonaIDs[0])
	} else {
		fmt.Printf("[DEBUG http_keyword] WARNING: PersonaIDs slice is empty!\n")
	}

	// Inspect JSON serialization to check for potential issues
	jsonBytes, jsonErr := json.Marshal(params)
	if jsonErr != nil {
		fmt.Printf("[DEBUG http_keyword] Error marshaling params to JSON: %v\n", jsonErr)
	} else {
		fmt.Printf("[DEBUG http_keyword] JSON representation: %s\n", string(jsonBytes))

		// Check if PersonaIDs are correctly represented in JSON
		var jsonMap map[string]interface{}
		if err := json.Unmarshal(jsonBytes, &jsonMap); err == nil {
			fmt.Printf("[DEBUG http_keyword] JSON keys: %v\n", reflect.ValueOf(jsonMap).MapKeys())
			if personaIds, ok := jsonMap["personaIds"]; ok {
				fmt.Printf("[DEBUG http_keyword] personaIds in JSON: %v\n", personaIds)
			} else {
				fmt.Printf("[DEBUG http_keyword] WARNING: personaIds key not found in JSON!\n")
			}
		}
	}

	// Create a deep copy of the params to ensure we're not losing data
	paramsCopy := *params
	// Explicitly copy the slice to ensure it's not shared
	paramsCopy.PersonaIDs = make([]uuid.UUID, len(params.PersonaIDs))
	copy(paramsCopy.PersonaIDs, params.PersonaIDs)

	fmt.Printf("[DEBUG http_keyword] Created paramsCopy: %+v\n", paramsCopy)
	fmt.Printf("[DEBUG http_keyword] PersonaIDs in paramsCopy: %+v (ptr: %p, len: %d)\n", paramsCopy.PersonaIDs, &paramsCopy.PersonaIDs, len(paramsCopy.PersonaIDs))

	// Return the deep copy instead of the original params to ensure PersonaIDs are preserved
	return campaign, &paramsCopy, nil
}

func (s *httpKeywordCampaignServiceImpl) validatePersonaIDs(ctx context.Context, querier store.Querier, personaIDs []uuid.UUID, expectedType models.PersonaTypeEnum) error {
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
		if s.redisCache != nil && expectedType == models.PersonaTypeHTTP {
			if err := s.cachePersonaConfigValidation(ctx, persona); err != nil {
				log.Printf("Warning: Failed to cache persona config validation for %s: %v", persona.ID, err)
			}
		}
	}
	return nil
}

func (s *httpKeywordCampaignServiceImpl) validateKeywordSetIDs(ctx context.Context, querier store.Querier, keywordSetIDs []uuid.UUID) error {
	if len(keywordSetIDs) == 0 {
		return nil
	}

	// PHASE 4 REDIS CACHING: Try to get keyword sets from cache first if Redis is enabled
	var keywordSets []*models.KeywordSet
	var err error

	if s.redisCache != nil && s.optimizationConfig != nil && s.optimizationConfig.Phases.Caching {
		keywordSets, err = s.getKeywordSetsWithCache(ctx, querier, keywordSetIDs)
	} else {
		// PHASE 2 N+1 OPTIMIZATION: Batch load all keyword sets to eliminate N+1 pattern
		keywordSets, err = s.keywordStore.GetKeywordSetsByIDs(ctx, querier, keywordSetIDs)
	}

	if err != nil {
		return fmt.Errorf("failed to batch load keyword sets for validation: %w", err)
	}

	// Create lookup map for efficient keyword set processing by ID
	keywordSetMap := make(map[uuid.UUID]*models.KeywordSet)
	for _, keywordSet := range keywordSets {
		keywordSetMap[keywordSet.ID] = keywordSet
	}

	// Validate each requested keyword set ID using batch-loaded data
	for _, ksID := range keywordSetIDs {
		set, exists := keywordSetMap[ksID]
		if !exists {
			return fmt.Errorf("keyword set ID '%s' not found", ksID)
		}
		if !set.IsEnabled {
			return fmt.Errorf("keyword set ID '%s' is disabled", ksID)
		}

		// PHASE 4 CACHING: Cache keyword set for future lookups
		if s.redisCache != nil {
			if err := s.redisCache.SetKeywordSet(ctx, set, s.optimizationConfig.Performance.CacheTTL.KeywordSets); err != nil {
				log.Printf("Warning: Failed to cache keyword set %s: %v", set.ID, err)
			}
		}
	}
	return nil
}

// PHASE 4 REDIS CACHING: Helper methods for cache integration

// getPersonasWithCache attempts to get personas from cache first, falling back to database
func (s *httpKeywordCampaignServiceImpl) getPersonasWithCache(ctx context.Context, querier store.Querier, personaIDs []uuid.UUID) ([]*models.Persona, error) {
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

// getKeywordSetsWithCache attempts to get keyword sets from cache first, falling back to database
func (s *httpKeywordCampaignServiceImpl) getKeywordSetsWithCache(ctx context.Context, querier store.Querier, keywordSetIDs []uuid.UUID) ([]*models.KeywordSet, error) {
	// Try batch cache lookup first
	cachedKeywordSets, missedIDs, err := s.redisCache.GetKeywordSetsBatch(ctx, keywordSetIDs)
	if err != nil {
		log.Printf("Cache lookup failed, falling back to database: %v", err)
		return s.keywordStore.GetKeywordSetsByIDs(ctx, querier, keywordSetIDs)
	}

	var allKeywordSets []*models.KeywordSet
	allKeywordSets = append(allKeywordSets, cachedKeywordSets...)

	// If we have cache misses, fetch them from database
	if len(missedIDs) > 0 {
		dbKeywordSets, err := s.keywordStore.GetKeywordSetsByIDs(ctx, querier, missedIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch missed keyword sets from database: %w", err)
		}

		// Cache the keyword sets we just fetched
		for _, keywordSet := range dbKeywordSets {
			if err := s.redisCache.SetKeywordSet(ctx, keywordSet, s.optimizationConfig.Performance.CacheTTL.KeywordSets); err != nil {
				log.Printf("Warning: Failed to cache keyword set %s: %v", keywordSet.ID, err)
			}
		}

		allKeywordSets = append(allKeywordSets, dbKeywordSets...)
	}

	return allKeywordSets, nil
}

// cachePersonaConfigValidation caches HTTP configuration validation results
func (s *httpKeywordCampaignServiceImpl) cachePersonaConfigValidation(ctx context.Context, persona *models.Persona) error {
	if persona.PersonaType != models.PersonaTypeHTTP {
		return nil
	}

	// Generate configuration fingerprint
	configHash := s.createHTTPConfigFingerprint(models.HTTPConfigDetails{})
	if len(persona.ConfigDetails) > 0 {
		var httpConfig models.HTTPConfigDetails
		if err := json.Unmarshal(persona.ConfigDetails, &httpConfig); err == nil {
			configHash = s.createHTTPConfigFingerprint(httpConfig)
		}
	}

	// Check if we already have a cached validation result
	if _, err := s.redisCache.GetHTTPValidationResult(ctx, configHash); err == nil {
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
	return s.redisCache.SetHTTPValidationResult(ctx, configHash, validationResult, s.optimizationConfig.Performance.CacheTTL.HTTPValidation)
}

func (s *httpKeywordCampaignServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign, action, description string) {
	if s.auditLogger == nil {
		return
	}
	s.auditLogger.LogCampaignEvent(ctx, exec, campaign, action, description)
}

// PHASE 3 N+1 OPTIMIZATION: HTTP persona grouping and connection pooling functions

// createHTTPConfigFingerprint creates a unique fingerprint for HTTP configuration deduplication
func (s *httpKeywordCampaignServiceImpl) createHTTPConfigFingerprint(httpConfig models.HTTPConfigDetails) string {
	// Create deterministic fingerprint for HTTP configuration
	configBytes, _ := json.Marshal(httpConfig)
	hash := sha256.Sum256(configBytes)
	return hex.EncodeToString(hash[:16]) // Use first 16 bytes for shorter fingerprint
}

// groupPersonasByHTTPConfig groups HTTP personas by unique configurations to eliminate redundant clients
func (s *httpKeywordCampaignServiceImpl) groupPersonasByHTTPConfig(personas []*models.Persona) map[string]*HTTPPersonaGroup {
	groups := make(map[string]*HTTPPersonaGroup)

	for _, persona := range personas {
		if persona.PersonaType != models.PersonaTypeHTTP {
			continue
		}

		var httpConfig models.HTTPConfigDetails
		if len(persona.ConfigDetails) > 0 {
			if err := json.Unmarshal(persona.ConfigDetails, &httpConfig); err != nil {
				log.Printf("Error unmarshalling HTTP persona %s config: %v. Using defaults.", persona.ID, err)
				httpConfig = models.HTTPConfigDetails{} // Use empty config as default
			}
		}

		fingerprint := s.createHTTPConfigFingerprint(httpConfig)

		if group, exists := groups[fingerprint]; exists {
			group.Personas = append(group.Personas, persona)
		} else {
			// Create new group with cached HTTP client
			httpClient := s.getOrCreateHTTPClient(fingerprint, httpConfig)
			groups[fingerprint] = &HTTPPersonaGroup{
				ConfigFingerprint: fingerprint,
				HTTPConfig:        httpConfig,
				Personas:          []*models.Persona{persona},
				HTTPClient:        httpClient,
			}
		}
	}

	return groups
}

// getOrCreateHTTPClient gets cached HTTP client or creates new one with aggressive connection pooling
func (s *httpKeywordCampaignServiceImpl) getOrCreateHTTPClient(fingerprint string, httpConfig models.HTTPConfigDetails) *http.Client {
	s.clientPoolMutex.RLock()
	if clientInfo, exists := s.httpClientPool[fingerprint]; exists {
		clientInfo.UsageCount++
		s.clientPoolMutex.RUnlock()
		return clientInfo.Client
	}
	s.clientPoolMutex.RUnlock()

	s.clientPoolMutex.Lock()
	defer s.clientPoolMutex.Unlock()

	// Double-check after acquiring write lock
	if clientInfo, exists := s.httpClientPool[fingerprint]; exists {
		clientInfo.UsageCount++
		return clientInfo.Client
	}

	// PHASE 3 OPTIMIZATION: Create HTTP client with aggressive connection pooling
	client := &http.Client{
		Timeout: 30 * time.Second, // Default timeout
		Transport: &http.Transport{
			// CRITICAL: Connection pooling settings for massive performance improvement
			MaxIdleConns:        200,               // Increased from default 100
			MaxIdleConnsPerHost: 50,                // Increased from default 2
			IdleConnTimeout:     120 * time.Second, // Keep connections alive longer
			DisableKeepAlives:   false,             // Ensure keep-alives are enabled

			// DNS and connection optimizations
			DisableCompression: false,
			ForceAttemptHTTP2:  true,
			MaxConnsPerHost:    100, // Limit concurrent connections per host

			// Timeout optimizations
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 15 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,

			// TLS configuration
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: false, // Default to secure
			},
		},
	}

	// Apply persona-specific timeout if configured
	if httpConfig.RequestTimeoutSeconds > 0 {
		client.Timeout = time.Duration(httpConfig.RequestTimeoutSeconds) * time.Second
	}

	// Cache with size limit (simple LRU)
	maxCacheSize := 50
	if len(s.httpClientPool) >= maxCacheSize {
		// Remove oldest entry
		var oldestKey string
		var oldestTime time.Time
		for k, v := range s.httpClientPool {
			if oldestKey == "" || v.CreatedAt.Before(oldestTime) {
				oldestKey = k
				oldestTime = v.CreatedAt
			}
		}
		if oldestKey != "" {
			if oldClient := s.httpClientPool[oldestKey]; oldClient != nil {
				oldClient.Client.CloseIdleConnections()
			}
			delete(s.httpClientPool, oldestKey)
		}
	}

	s.httpClientPool[fingerprint] = &OptimizedHTTPClient{
		Client:            client,
		ConfigFingerprint: fingerprint,
		CreatedAt:         time.Now(),
		UsageCount:        1,
	}

	// PHASE 3 MONITORING: Track connection pool miss
	s.incrementConnectionPoolMiss()
	return client
}

// PHASE 3 MONITORING: HTTP performance tracking methods
func (s *httpKeywordCampaignServiceImpl) updateHTTPPerformanceMetrics(totalPersonas, uniqueConfigs int) {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.UniqueConfigurations = uniqueConfigs
	s.performanceMetrics.ActiveConnections = len(s.httpClientPool)
}

func (s *httpKeywordCampaignServiceImpl) incrementHTTPRequestCount() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.TotalHTTPRequests++
}

func (s *httpKeywordCampaignServiceImpl) incrementConnectionPoolHit() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.ConnectionPoolHits++
}

func (s *httpKeywordCampaignServiceImpl) incrementConnectionPoolMiss() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.ConnectionPoolMisses++
}

func (s *httpKeywordCampaignServiceImpl) incrementHTTPErrorCount() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.ValidationErrors++
}

func (s *httpKeywordCampaignServiceImpl) updateHTTPResponseTime(duration time.Duration) {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()
	s.performanceMetrics.AverageResponseTimeMs = duration.Milliseconds()
}

func (s *httpKeywordCampaignServiceImpl) GetHTTPPerformanceMetrics() HTTPPerformanceMetrics {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()

	metrics := s.performanceMetrics

	// PHASE 4 REDIS CACHING: Include Redis cache metrics if available
	if s.redisCache != nil {
		cacheMetrics := s.redisCache.GetMetrics()
		metrics.ConnectionPoolHits = cacheMetrics.HitCount
		metrics.ConnectionPoolMisses = cacheMetrics.MissCount
		metrics.ValidationErrors = cacheMetrics.ErrorCount

		// Update average response time with cache latency if available
		if cacheMetrics.AvgLatencyMs > 0 {
			metrics.AverageResponseTimeMs = cacheMetrics.AvgLatencyMs
		}
	}

	return metrics
}

// cleanupIdleHTTPClients removes idle HTTP clients to free resources
func (s *httpKeywordCampaignServiceImpl) cleanupIdleHTTPClients() {
	s.clientPoolMutex.Lock()
	defer s.clientPoolMutex.Unlock()

	now := time.Now()
	for fingerprint, clientInfo := range s.httpClientPool {
		if now.Sub(clientInfo.CreatedAt) > s.clientMaxIdleTime {
			clientInfo.Client.CloseIdleConnections()
			delete(s.httpClientPool, fingerprint)
		}
	}
}

func derefUUIDPtr(id *uuid.UUID) uuid.UUID {
	if id == nil {
		return uuid.Nil
	}
	return *id
}

// filterValidDNSResults filters DNS results to only include those with resolved status
func filterValidDNSResults(dnsResults []models.DNSValidationResult) []models.DNSValidationResult {
	var validResults []models.DNSValidationResult
	for _, result := range dnsResults {
		if result.ValidationStatus == "resolved" {
			validResults = append(validResults, result)
		}
	}
	return validResults
}

// getPaginatedDomainsFromDNSResults returns a paginated subset of DNS results for HTTP processing
func getPaginatedDomainsFromDNSResults(dnsResults []models.DNSValidationResult, lastProcessedDomain string, batchSize int) []*models.DNSValidationResult {
	var result []*models.DNSValidationResult

	// Find the starting index based on lastProcessedDomain
	startIndex := 0
	if lastProcessedDomain != "" {
		for i, dnsResult := range dnsResults {
			if dnsResult.DomainName == lastProcessedDomain {
				startIndex = i + 1 // Start after the last processed domain
				break
			}
		}
	}

	// Get the next batch of domains
	endIndex := startIndex + batchSize
	if endIndex > len(dnsResults) {
		endIndex = len(dnsResults)
	}

	for i := startIndex; i < endIndex; i++ {
		result = append(result, &dnsResults[i])
	}

	return result
}

func (s *httpKeywordCampaignServiceImpl) ProcessHTTPKeywordCampaignBatch(ctx context.Context, campaignID uuid.UUID) (done bool, processedInThisBatch int, err error) {
	log.Printf("ProcessHTTPKeywordCampaignBatch: Starting for campaignID %s", campaignID)

	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			return false, 0, fmt.Errorf("failed to begin SQL transaction for HTTP/Keyword campaign %s: %w", campaignID, startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for ProcessHTTPKeywordCampaignBatch %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL ProcessHTTPKeywordCampaignBatch for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("ProcessHTTPKeywordCampaignBatch: Rolled back SQL transaction for campaign %s due to error: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("ProcessHTTPKeywordCampaignBatch: Failed to commit SQL transaction for campaign %s: %v", campaignID, commitErr)
					opErr = fmt.Errorf("failed to commit SQL transaction: %w", commitErr)
				} else {
					log.Printf("SQL Transaction committed for ProcessHTTPKeywordCampaignBatch %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for ProcessHTTPKeywordCampaignBatch %s (no service-level transaction).", campaignID)
		// querier remains nil
	}

	campaign, errGetCamp := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGetCamp != nil {
		opErr = fmt.Errorf("failed to fetch campaign %s: %w", campaignID, errGetCamp)
		return false, 0, opErr
	}

	if campaign.PhaseStatus == nil || (*campaign.PhaseStatus != models.PhaseStatusInProgress && *campaign.PhaseStatus != models.PhaseStatusNotStarted) {
		statusStr := "unknown"
		if campaign.PhaseStatus != nil {
			statusStr = string(*campaign.PhaseStatus)
		}
		log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s not runnable (status: %s). Skipping.", campaignID, statusStr)
		return true, 0, nil
	}

	if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusNotStarted {
		// Use phase-first approach: Update HTTP validation phase to 'in_progress'
		// The database trigger will automatically sync the campaign table
		err := s.campaignStore.UpdatePhaseStatus(ctx, querier, campaignID, models.PhaseTypeHTTPKeywordValidation, models.PhaseStatusInProgress)
		if err != nil {
			opErr = fmt.Errorf("failed to mark HTTP validation phase as running for campaign %s: %w", campaignID, err)
			return false, 0, opErr
		}

		// Update started_at timestamp directly on campaign (this doesn't conflict with trigger)
		now := time.Now().UTC()
		campaign.StartedAt = &now
		if errUpdateCamp := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCamp != nil {
			log.Printf("WARNING: Failed to update started_at for campaign %s: %v", campaignID, errUpdateCamp)
		}
	}

	hkParams, errGetParams := s.campaignStore.GetHTTPKeywordParams(ctx, querier, campaignID)
	if errGetParams != nil {
		opErr = fmt.Errorf("failed to fetch HTTP/Keyword params for campaign %s: %w", campaignID, errGetParams)
		return false, 0, opErr
	}

	// NEW PHASE-CENTRIC APPROACH: Read DNS results from current campaign's DNSResults JSONB
	dnsResultsData, err := s.campaignStore.GetCampaignDNSResults(ctx, querier, campaignID)
	if err != nil {
		opErr = fmt.Errorf("failed to get DNS results for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	if dnsResultsData == nil {
		opErr = fmt.Errorf("no DNS results found for campaign %s - ensure DNS validation phase completed", campaignID)
		return false, 0, opErr
	}

	// Parse DNS results from JSONB
	var dnsResults []models.DNSValidationResult
	if err := json.Unmarshal(*dnsResultsData, &dnsResults); err != nil {
		opErr = fmt.Errorf("failed to parse DNS results for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	// Filter for valid DNS results to process for HTTP validation
	validDNSResults := filterValidDNSResults(dnsResults)
	expectedTotalItems := int64(len(validDNSResults))

	if campaign.TotalItems == nil || *campaign.TotalItems != expectedTotalItems {
		log.Printf("ProcessHTTPKeywordCampaignBatch: Setting TotalItems for campaign %s to %d based on valid DNS results",
			campaignID, expectedTotalItems)
		campaign.TotalItems = models.Int64Ptr(expectedTotalItems)
	}
	// If opErr was set by store calls, return (defer will handle rollback)
	if opErr != nil {
		return false, 0, opErr
	}

	// Ensure pointers are not nil for upcoming operations.
	// These should ideally be initialized when the campaign object is created or fetched.
	if campaign.TotalItems == nil {
		campaign.TotalItems = models.Int64Ptr(0)
	}
	if campaign.ProcessedItems == nil {
		campaign.ProcessedItems = models.Int64Ptr(0)
	}
	if campaign.ProgressPercentage == nil {
		campaign.ProgressPercentage = models.Float64Ptr(0.0)
	}

	if *campaign.TotalItems > 0 && *campaign.ProcessedItems >= *campaign.TotalItems {
		log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s already processed all %d items. Marking complete and transitioning to analysis phase.", campaignID, *campaign.TotalItems)

		// Use phase-first approach: Complete HTTP validation phase
		// The database trigger will automatically sync the campaign table
		err := s.campaignStore.CompletePhase(ctx, querier, campaignID, models.PhaseTypeHTTPKeywordValidation)
		if err != nil {
			opErr = fmt.Errorf("failed to complete HTTP validation phase for campaign %s: %w", campaignID, err)
			return false, 0, opErr
		}

		// Update progress and completion timestamp directly on campaign (doesn't conflict with trigger)
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		now := time.Now().UTC()
		campaign.CompletedAt = &now

		opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
		return true, 0, opErr
	}
	if *campaign.TotalItems == 0 {
		log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s has 0 TotalItems. Marking complete and transitioning to analysis phase.", campaignID)

		// Use phase-first approach: Complete HTTP validation phase
		// The database trigger will automatically sync the campaign table
		err := s.campaignStore.CompletePhase(ctx, querier, campaignID, models.PhaseTypeHTTPKeywordValidation)
		if err != nil {
			opErr = fmt.Errorf("failed to complete HTTP validation phase for campaign %s: %w", campaignID, err)
			return false, 0, opErr
		}

		// Update progress and completion timestamp directly on campaign (doesn't conflict with trigger)
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		now := time.Now().UTC()
		campaign.CompletedAt = &now

		opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
		return true, 0, opErr
	}

	var batchSizeVal int
	if hkParams.BatchSize != nil && *hkParams.BatchSize > 0 {
		batchSizeVal = *hkParams.BatchSize
	} else {
		batchSizeVal = 500 // Phase 3: 25x increase for enterprise infrastructure
	}

	lastProcessedDomainNameVal := ""
	if hkParams.LastProcessedDomainName != nil {
		lastProcessedDomainNameVal = *hkParams.LastProcessedDomainName
	}

	// NEW PHASE-CENTRIC APPROACH: Process domains from validDNSResults with pagination
	domainsToProcess := getPaginatedDomainsFromDNSResults(validDNSResults, lastProcessedDomainNameVal, batchSizeVal)

	currentLastProcessedDomainNameInBatch := hkParams.LastProcessedDomainName

	if len(domainsToProcess) == 0 {
		lastDomainCursor := ""
		if hkParams.LastProcessedDomainName != nil {
			lastDomainCursor = *hkParams.LastProcessedDomainName
		}
		log.Printf("ProcessHTTPKeywordCampaignBatch: No more DNS valid domains to process for campaign %s using cursor '%s'. Checking completion.", campaignID, lastDomainCursor)
		if campaign.TotalItems == nil {
			campaign.TotalItems = models.Int64Ptr(0)
		} // Should be set
		if campaign.ProcessedItems == nil {
			campaign.ProcessedItems = models.Int64Ptr(0)
		}

		if *campaign.TotalItems > 0 && *campaign.ProcessedItems >= *campaign.TotalItems {
			// Use phase-first approach: Complete HTTP validation phase
			// The database trigger will automatically sync the campaign table
			err := s.campaignStore.CompletePhase(ctx, querier, campaignID, models.PhaseTypeHTTPKeywordValidation)
			if err != nil {
				opErr = fmt.Errorf("failed to complete HTTP validation phase for campaign %s: %w", campaignID, err)
				return false, 0, opErr
			}

			// Update progress and completion timestamp directly on campaign (doesn't conflict with trigger)
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now

			log.Printf("ProcessHTTPKeywordCampaignBatch: All items processed for HTTP campaign %s. Marking complete and transitioning to analysis phase.", campaignID)
			done = true
		} else {
			lastDomainCursor := ""
			if hkParams.LastProcessedDomainName != nil {
				lastDomainCursor = *hkParams.LastProcessedDomainName
			}
			log.Printf("ProcessHTTPKeywordCampaignBatch: HTTP Campaign %s has %d/%d processed, but no domains fetched. Cursor: '%s'.",
				campaignID, *campaign.ProcessedItems, *campaign.TotalItems, lastDomainCursor)
			done = true
		}
		opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
		return done, 0, opErr
	}

	// PHASE 2 N+1 OPTIMIZATION: Batch load all personas to eliminate N+1 pattern
	allPersonas, pErr := s.personaStore.GetPersonasByIDs(ctx, querier, hkParams.PersonaIDs)
	if pErr != nil {
		opErr = fmt.Errorf("failed to batch load HTTP personas: %w", pErr)
		return false, 0, opErr
	}

	// Create lookup map for efficient persona processing by ID
	personaMap := make(map[uuid.UUID]*models.Persona)
	for _, persona := range allPersonas {
		personaMap[persona.ID] = persona
	}

	// Validate and filter personas using batch-loaded data
	personas := make([]*models.Persona, 0, len(hkParams.PersonaIDs))
	for _, pID := range hkParams.PersonaIDs {
		p, exists := personaMap[pID]
		if !exists {
			opErr = fmt.Errorf("HTTP persona %s not found", pID)
			return false, 0, opErr
		}
		if p.PersonaType != models.PersonaTypeHTTP || !p.IsEnabled {
			opErr = fmt.Errorf("persona %s is not a valid/enabled HTTP persona", pID)
			return false, 0, opErr
		}
		personas = append(personas, p)
	}
	if len(personas) == 0 {
		opErr = fmt.Errorf("no valid HTTP personas for campaign %s", campaignID)
		return false, 0, opErr
	}

	// PHASE 3 N+1 OPTIMIZATION: Group personas by HTTP configuration to reduce redundant HTTP clients
	personaGroups := s.groupPersonasByHTTPConfig(personas)

	// PHASE 3 MONITORING: Track performance metrics
	s.updateHTTPPerformanceMetrics(len(personas), len(personaGroups))
	log.Printf("ProcessHTTPKeywordCampaignBatch: OPTIMIZATION - Reduced %d HTTP personas to %d unique configurations (%.1f%% reduction) for campaign %s",
		len(personas), len(personaGroups), (1.0-float64(len(personaGroups))/float64(len(personas)))*100.0, campaignID)

	// Cleanup idle connections periodically
	defer s.cleanupIdleHTTPClients()

	allKeywordRulesModels := []models.KeywordRule{}
	if hkParams.KeywordSetIDs != nil && len(*hkParams.KeywordSetIDs) > 0 {
		// PHASE 2 N+1 OPTIMIZATION: Batch load all keyword rules to eliminate N+1 pattern
		// Replace individual GetKeywordRulesBySetID calls with single batch operation
		batchKeywordRules, rErr := s.keywordStore.GetKeywordsByKeywordSetIDs(ctx, querier, *hkParams.KeywordSetIDs)
		if rErr != nil {
			opErr = fmt.Errorf("failed to batch load keyword rules for keyword sets: %w", rErr)
			return false, 0, opErr
		}
		// Convert from []*models.KeywordRule to []models.KeywordRule
		for _, rule := range batchKeywordRules {
			allKeywordRulesModels = append(allKeywordRulesModels, *rule)
		}
	}
	compiledKeywordRules := make([]keywordscanner.CompiledKeywordRule, 0, len(allKeywordRulesModels))
	for _, r := range allKeywordRulesModels {
		var compiledRegex *regexp.Regexp
		if r.RuleType == models.KeywordRuleTypeRegex {
			re, compErr := regexp.Compile(r.Pattern)
			if compErr == nil {
				compiledRegex = re
			} else {
				log.Printf("Error compiling regex for rule %s: %v. Will be skipped for regex matching.", r.ID, compErr)
			}
		}
		compiledKeywordRules = append(compiledKeywordRules, keywordscanner.CompiledKeywordRule{KeywordRule: r, CompiledRegex: compiledRegex})
	}
	// If opErr was set by store calls, return (defer will handle rollback)
	if opErr != nil {
		return false, 0, opErr
	}

	dbResults := make([]*models.HTTPKeywordResult, 0, len(domainsToProcess))
	nowTime := time.Now().UTC()

	// Context for batch processing
	batchCtx, batchCancel := context.WithCancel(ctx)
	defer batchCancel()
	var batchProcessingContextErr error

	// PHASE 3 ENHANCEMENT: Use bulk validation instead of N+1 pattern
	// Extract domains for bulk validation and create GeneratedDomain objects
	domains := make([]*models.GeneratedDomain, len(domainsToProcess))
	domainMap := make(map[string]models.DNSValidationResult)
	for i, dnsRecord := range domainsToProcess {
		// Create GeneratedDomain from DNSValidationResult
		domains[i] = &models.GeneratedDomain{
			ID:         dnsRecord.GeneratedDomainID.UUID, // Extract UUID from NullUUID
			DomainName: dnsRecord.DomainName,
			CampaignID: dnsRecord.DNSCampaignID, // Use campaign ID
		}
		domainMap[dnsRecord.DomainName] = *dnsRecord
	}

	// Use the existing batchSizeVal already configured earlier in the method (line 913)

	// Use bulk validation from Phase 2
	if len(personaGroups) == 0 {
		opErr = fmt.Errorf("no persona groups available for bulk HTTP validation")
		return false, 0, opErr
	}

	// Get the first persona from the first group for bulk validation
	var representativePersona *models.Persona
	for _, group := range personaGroups {
		if len(group.Personas) > 0 {
			representativePersona = group.Personas[0]
			break
		}
	}

	if representativePersona == nil {
		opErr = fmt.Errorf("no personas available for bulk HTTP validation")
		return false, 0, opErr
	}

	// Get proxy if configured
	var proxyForValidator *models.Proxy
	if hkParams.ProxyPoolID != nil && s.proxyManager != nil {
		proxyEntry, errPmGet := s.proxyManager.GetProxy()
		if errPmGet == nil && proxyEntry != nil {
			proxyUUID, errParse := uuid.Parse(proxyEntry.ID)
			if errParse == nil {
				var proxyReadQuerier store.Querier
				if s.db != nil {
					proxyReadQuerier = s.db
				}
				fetchedProxy, errDbGet := s.proxyStore.GetProxyByID(batchCtx, proxyReadQuerier, proxyUUID)
				if errDbGet == nil {
					proxyForValidator = fetchedProxy
				}
			}
		}
	}

	// Perform bulk validation
	log.Printf("ProcessHTTPKeywordCampaignBatch: Performing bulk HTTP validation for %d domains", len(domains))
	bulkResults := s.httpValidator.ValidateDomainsBulk(batchCtx, domains, batchSizeVal, representativePersona, proxyForValidator)

	// Process bulk results and convert to database format
	for _, bulkResult := range bulkResults {
		if batchCtx.Err() != nil {
			log.Printf("Batch context cancelled during result processing for domain %s", bulkResult.Domain)
			batchProcessingContextErr = batchCtx.Err()
			break
		}

		dnsRecord, exists := domainMap[bulkResult.Domain]
		if !exists {
			continue // Skip if domain not found in map
		}

		// Track metrics
		s.incrementHTTPRequestCount()
		if bulkResult.Error != "" || !bulkResult.IsSuccess {
			s.incrementHTTPErrorCount()
		}

		// Initialize variables for this domain
		var foundKeywordsFromSetsJSON json.RawMessage
		var adhocKeywordsFoundForThisDomain []string

		// Create database result
		dbRes := &models.HTTPKeywordResult{
			ID:                    uuid.New(),
			HTTPKeywordCampaignID: campaignID,
			DNSResultID:           uuid.NullUUID{UUID: dnsRecord.ID, Valid: true},
			DomainName:            dnsRecord.DomainName,
			Attempts:              models.IntPtr(1),
			ValidatedByPersonaID:  uuid.NullUUID{UUID: representativePersona.ID, Valid: true},
			UsedProxyID:           uuid.NullUUID{}, // Could be set if proxy used
			LastCheckedAt:         &nowTime,
		}

		// Set HTTP response details
		if bulkResult.StatusCode > 0 {
			statusCode := int32(bulkResult.StatusCode)
			dbRes.HTTPStatusCode = &statusCode
		}

		if bulkResult.ResponseHeaders != nil {
			hBytes, _ := json.Marshal(bulkResult.ResponseHeaders)
			dbRes.ResponseHeaders = models.JSONRawMessagePtr(json.RawMessage(hBytes))
		}

		if bulkResult.ContentHash != "" {
			dbRes.ContentHash = models.StringPtr(bulkResult.ContentHash)
		}

		if bulkResult.ExtractedTitle != "" {
			dbRes.PageTitle = models.StringPtr(bulkResult.ExtractedTitle)
		}

		if bulkResult.ExtractedContentSnippet != "" {
			dbRes.ExtractedContentSnippet = models.StringPtr(bulkResult.ExtractedContentSnippet)
		}

		// Keyword scanning: check for ad-hoc keywords and keyword sets
		if bulkResult.IsSuccess && len(bulkResult.RawBody) > 0 {
			if len(compiledKeywordRules) > 0 {
				foundPatterns, scanErr := s.keywordScanner.ScanWithRules(batchCtx, bulkResult.RawBody, compiledKeywordRules)
				if scanErr != nil {
					log.Printf("Error scanning keywords from sets for %s: %v", dnsRecord.DomainName, scanErr)
				} else if len(foundPatterns) > 0 {
					foundKeywordsFromSetsJSON, _ = json.Marshal(foundPatterns)
				}
			}
			if hkParams.AdHocKeywords != nil && len(*hkParams.AdHocKeywords) > 0 {
				bodyLower := strings.ToLower(string(bulkResult.RawBody))
				for _, adhocKw := range *hkParams.AdHocKeywords {
					if strings.Contains(bodyLower, strings.ToLower(adhocKw)) {
						adhocKeywordsFoundForThisDomain = append(adhocKeywordsFoundForThisDomain, adhocKw)
					}
				}
			}

			if len(foundKeywordsFromSetsJSON) > 0 {
				dbRes.FoundKeywordsFromSets = models.JSONRawMessagePtr(foundKeywordsFromSetsJSON)
			} else {
				dbRes.FoundKeywordsFromSets = nil
			}

			if len(adhocKeywordsFoundForThisDomain) > 0 {
				dbRes.FoundAdHocKeywords = &adhocKeywordsFoundForThisDomain
			} else {
				dbRes.FoundAdHocKeywords = nil
			}

			if (foundKeywordsFromSetsJSON != nil && string(foundKeywordsFromSetsJSON) != "null" && string(foundKeywordsFromSetsJSON) != "[]") || len(adhocKeywordsFoundForThisDomain) > 0 {
				dbRes.ValidationStatus = "lead_valid"
			} else {
				dbRes.ValidationStatus = "http_valid_no_keywords"
			}
		} else if bulkResult.Error != "" {
			dbRes.ValidationStatus = "invalid_http_response_error"
		} else {
			dbRes.ValidationStatus = "invalid_http_code"
		}

		dbResults = append(dbResults, dbRes)
	}

	if batchProcessingContextErr != nil {
		log.Printf("Context cancelled during HTTP batch processing for campaign %s. Partial results may be saved. Error: %v", campaignID, batchProcessingContextErr)
		if opErr == nil {
			opErr = fmt.Errorf("context cancelled during batch processing: %w", batchProcessingContextErr)
		}
	}

	if len(dbResults) > 0 {
		if errCreateResults := s.campaignStore.CreateHTTPKeywordResults(ctx, querier, dbResults); errCreateResults != nil {
			currentErr := fmt.Errorf("failed to save HTTP/Keyword results for campaign %s: %w", campaignID, errCreateResults)
			if opErr == nil {
				opErr = currentErr
			} else {
				log.Printf("Additionally failed to save HTTP results for campaign %s: %v (original opErr: %v)", campaignID, currentErr, opErr)
			}
			if batchProcessingContextErr == nil {
				return false, 0, opErr
			}
		} else {
			processedInThisBatch = len(dbResults)
			log.Printf("ProcessHTTPKeywordCampaignBatch: Saved %d HTTP/Keyword results for campaign %s.", processedInThisBatch, campaignID)
			lastDomainName := domainsToProcess[len(domainsToProcess)-1].DomainName
			currentLastProcessedDomainNameInBatch = &lastDomainName

			// PHASE-CENTRIC APPROACH: Also update campaign's HTTPResults JSONB field
			// Get all HTTP results for this campaign to store in JSONB
			allHTTPResults, errGetAllResults := s.campaignStore.GetHTTPKeywordResultsByCampaign(ctx, querier, campaignID, store.ListValidationResultsFilter{})
			if errGetAllResults != nil {
				log.Printf("Warning: failed to get all HTTP results for JSONB update in campaign %s: %v", campaignID, errGetAllResults)
			} else {
				// Convert to JSONB and store in campaign.HTTPResults
				httpResultsJSON, errMarshal := json.Marshal(allHTTPResults)
				if errMarshal != nil {
					log.Printf("Warning: failed to marshal HTTP results to JSON for campaign %s: %v", campaignID, errMarshal)
				} else {
					httpResultsRaw := json.RawMessage(httpResultsJSON)
					if errUpdateHTTPResults := s.campaignStore.UpdateCampaignHTTPResults(ctx, querier, campaignID, &httpResultsRaw); errUpdateHTTPResults != nil {
						log.Printf("Warning: failed to update campaign HTTPResults JSONB for campaign %s: %v", campaignID, errUpdateHTTPResults)
					} else {
						log.Printf("ProcessHTTPKeywordCampaignBatch: Updated campaign HTTPResults JSONB for campaign %s with %d results", campaignID, len(allHTTPResults))
					}
				}
			}
		}
	}

	var currentLPDNValue string
	if hkParams.LastProcessedDomainName != nil {
		currentLPDNValue = *hkParams.LastProcessedDomainName
	}

	if len(domainsToProcess) > 0 && (currentLastProcessedDomainNameInBatch != nil && (hkParams.LastProcessedDomainName == nil || currentLPDNValue != *currentLastProcessedDomainNameInBatch)) {
		newDomainName := *currentLastProcessedDomainNameInBatch
		log.Printf("ProcessHTTPKeywordCampaignBatch: Updating LastProcessedDomainName for campaign %s from '%s' to '%s'",
			campaignID, currentLPDNValue, newDomainName)
		hkParams.LastProcessedDomainName = models.StringPtr(newDomainName)
		// Note: In phase-centric approach, HTTP params are stored separately via campaignStore
	}

	if opErr == nil || batchProcessingContextErr != nil { // Update processed count if no critical save error or if context cancelled (partial save)
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

	// MULTI-PHASE PROGRESS TRACKING: HTTP validation uses 66-100% range
	httpPhaseStartProgress := 66.0 // HTTP phase starts at 66%
	httpPhaseEndProgress := 100.0  // HTTP phase ends at 100%

	if *campaign.TotalItems > 0 {
		// Calculate HTTP validation progress within the 66-100% range
		httpProgress := (float64(*campaign.ProcessedItems) / float64(*campaign.TotalItems)) * 100
		if httpProgress > 100 {
			httpProgress = 100
		}

		// Scale HTTP progress to 66-100% range
		scaledProgress := httpPhaseStartProgress + (httpProgress/100.0)*(httpPhaseEndProgress-httpPhaseStartProgress)
		*campaign.ProgressPercentage = scaledProgress

		log.Printf("[MULTI-PHASE] HTTP validation progress for campaign %s: %.1f%% within phase, %.1f%% overall (66-100%% range)",
			campaignID, httpProgress, scaledProgress)
	} else if *campaign.TotalItems == 0 {
		// If total is 0, HTTP phase is complete - set to 100%
		*campaign.ProgressPercentage = httpPhaseEndProgress
		log.Printf("[MULTI-PHASE] HTTP validation complete for campaign %s (0 total items) - setting to %.1f%%", campaignID, httpPhaseEndProgress)
	}

	if *campaign.TotalItems > 0 && *campaign.ProcessedItems >= *campaign.TotalItems {
		// HTTP validation phase is complete - transition to Analysis phase
		analysisPhase := models.PhaseTypeAnalysis
		pendingStatus := models.PhaseStatusNotStarted
		campaign.CurrentPhase = &analysisPhase
		campaign.PhaseStatus = &pendingStatus
		// CRITICAL FIX: Maintain cumulative progress at 100% instead of resetting to 0%
		campaign.ProgressPercentage = models.Float64Ptr(httpPhaseEndProgress)
		done = true
		log.Printf("[PHASE-TRANSITION] Campaign %s completed HTTP validation, transitioning to Analysis at %.1f%% progress", campaignID, httpPhaseEndProgress)
	} else if *campaign.TotalItems == 0 {
		// HTTP validation phase is complete - transition to Analysis phase
		analysisPhase := models.PhaseTypeAnalysis
		pendingStatus := models.PhaseStatusNotStarted
		campaign.CurrentPhase = &analysisPhase
		campaign.PhaseStatus = &pendingStatus
		// CRITICAL FIX: Maintain cumulative progress at 100% instead of resetting to 0%
		campaign.ProgressPercentage = models.Float64Ptr(httpPhaseEndProgress)
		done = true
		log.Printf("[PHASE-TRANSITION] Campaign %s (0 total items) transitioning to Analysis at %.1f%% progress", campaignID, httpPhaseEndProgress)
	} else {
		done = false
	}

	if errUpdateCamp := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCamp != nil {
		currentErr := fmt.Errorf("failed to update campaign %s status/progress: %w", campaignID, errUpdateCamp)
		if opErr == nil {
			opErr = currentErr
		} else {
			log.Printf("ProcessHTTPKeywordCampaignBatch: Also failed to update campaign %s: %v (original opErr: %v)", campaignID, currentErr, opErr)
		}
		return false, processedInThisBatch, opErr
	}

	// Broadcast HTTP validation progress via WebSocket
	if campaign.ProgressPercentage != nil && campaign.ProcessedItems != nil && campaign.TotalItems != nil {
		processedCount := *campaign.ProcessedItems
		totalCount := *campaign.TotalItems

		if done {
			// Campaign completed
			websocket.BroadcastCampaignProgress(campaignID.String(), 100.0, "completed", "http_keyword_validation", processedCount, totalCount)

			// HTTP keyword validation complete - campaign stays in http_keyword_validation phase until user manually configures next phase
			log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s HTTP keyword validation phase complete. Waiting for user to configure analysis phase.", campaignID)
		} else {
			// Progress update
			websocket.BroadcastValidationProgress(campaignID.String(), processedCount, totalCount, "http_keyword_validation")
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
	lastDomainCursor := ""
	if hkParams.LastProcessedDomainName != nil {
		lastDomainCursor = *hkParams.LastProcessedDomainName
	}
	log.Printf("ProcessHTTPKeywordCampaignBatch: Finished batch for campaign %s. Processed: %d, DoneForJob: %t. LastDomainCursor: %s. CampaignProcessed: %d/%d, Final opErr: %v",
		campaignID, processedInThisBatch, done, lastDomainCursor, processedItemsVal, totalItemsVal, opErr)
	return done, processedInThisBatch, opErr
}
