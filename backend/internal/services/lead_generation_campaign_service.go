// File: backend/internal/services/lead_generation_campaign_service.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/contentfetcher"
	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/keywordscanner"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/fntelecomllc/studio/backend/pkg/communication"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// phaseExecutionService implements PhaseExecutionService interface
// This service replaces both LeadGenerationCampaignService and CampaignOrchestratorService for simplified architecture
type phaseExecutionService struct {
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	personaStore     store.PersonaStore
	keywordStore     store.KeywordStore
	auditLogStore    store.AuditLogStore
	campaignJobStore store.CampaignJobStore
	auditLogger      *utils.AuditLogger
	websocketManager websocket.Broadcaster
	asyncManager     *communication.AsyncPatternManager

	// Direct engine integrations - using actual engine types
	domainGenerator *domainexpert.DomainGenerator
	dnsValidator    *dnsvalidator.DNSValidator
	httpValidator   *httpvalidator.HTTPValidator
	contentFetcher  *contentfetcher.ContentFetcher
	keywordScanner  *keywordscanner.Service

	// Service layer dependencies - proper architecture
	domainGenerationService DomainGenerationService
	dnsValidationService    DNSCampaignService
	httpValidationService   HTTPKeywordCampaignService
	phaseStatusDerivation   *PhaseStatusDerivationService
}

// NewPhaseExecutionService creates a new Phase Execution Service that replaces both
// LeadGenerationCampaignService and CampaignOrchestratorService
func NewPhaseExecutionService(
	db *sqlx.DB,
	campaignStore store.CampaignStore,
	personaStore store.PersonaStore,
	keywordStore store.KeywordStore,
	auditLogStore store.AuditLogStore,
	campaignJobStore store.CampaignJobStore,
	websocketManager websocket.Broadcaster,
	asyncManager *communication.AsyncPatternManager,
	// Direct engine dependencies
	domainGenerator *domainexpert.DomainGenerator,
	dnsValidator *dnsvalidator.DNSValidator,
	httpValidator *httpvalidator.HTTPValidator,
	contentFetcher *contentfetcher.ContentFetcher,
	keywordScanner *keywordscanner.Service,
	// Service dependencies
	domainGenerationService DomainGenerationService,
	dnsValidationService DNSCampaignService,
	httpValidationService HTTPKeywordCampaignService,
) PhaseExecutionService {
	return &phaseExecutionService{
		db:                      db,
		campaignStore:           campaignStore,
		personaStore:            personaStore,
		keywordStore:            keywordStore,
		auditLogStore:           auditLogStore,
		campaignJobStore:        campaignJobStore,
		auditLogger:             utils.NewAuditLogger(auditLogStore),
		websocketManager:        websocketManager,
		asyncManager:            asyncManager,
		domainGenerator:         domainGenerator,
		dnsValidator:            dnsValidator,
		httpValidator:           httpValidator,
		contentFetcher:          contentFetcher,
		keywordScanner:          keywordScanner,
		domainGenerationService: domainGenerationService,
		dnsValidationService:    dnsValidationService,
		httpValidationService:   httpValidationService,
		phaseStatusDerivation:   NewPhaseStatusDerivationService(campaignStore, db),
	}
}

// CreateCampaign creates a new lead generation campaign with Phase 1 initialized
func (s *phaseExecutionService) CreateCampaign(ctx context.Context, req CreateLeadGenerationCampaignRequest) (*models.LeadGenerationCampaign, error) {
	// Create campaign record with Phase 1 setup
	campaignID := uuid.New()
	now := time.Now()

	// Set default batch size if not provided
	batchSize := req.DomainConfig.BatchSize
	if batchSize <= 0 {
		batchSize = 100 // Default batch size for domain generation
	}

	// 🚨 CRITICAL FIX: Calculate total_possible_combinations using domain expert engine
	// This prevents the "0/0" global offset issue that causes immediate campaign completion
	var totalPossibleCombinations int64 = 0

	// Use first TLD to calculate total combinations (all TLDs have same pattern combinations)
	if len(req.DomainConfig.TLDs) > 0 {
		selectedTLD := req.DomainConfig.TLDs[0]
		// Normalize TLD format for domain generator
		if !strings.HasPrefix(selectedTLD, ".") {
			selectedTLD = "." + selectedTLD
		}

		// Create domain generator to calculate total possible combinations
		tempGenerator, genErr := domainexpert.NewDomainGenerator(
			domainexpert.CampaignPatternType(req.DomainConfig.PatternType),
			int(req.DomainConfig.VariableLength),
			req.DomainConfig.CharacterSet,
			req.DomainConfig.ConstantString,
			selectedTLD,
		)
		if genErr != nil {
			log.Printf("WARNING: Failed to calculate total combinations for campaign %s: %v. Using fallback calculation", campaignID, genErr)
			// Fallback: Basic calculation for prefix/suffix patterns
			if req.DomainConfig.PatternType == "prefix" || req.DomainConfig.PatternType == "suffix" {
				charSetLength := int64(len([]rune(req.DomainConfig.CharacterSet)))
				if charSetLength > 0 && req.DomainConfig.VariableLength > 0 {
					totalPossibleCombinations = 1
					for i := 0; i < int(req.DomainConfig.VariableLength); i++ {
						totalPossibleCombinations *= charSetLength
					}
				}
			}
		} else {
			totalPossibleCombinations = tempGenerator.GetTotalCombinations()
		}
	}

	log.Printf("DEBUG CreateCampaign: Calculated total_possible_combinations=%d for campaign %s", totalPossibleCombinations, campaignID)

	// 🚨 CRITICAL FIX: Get current global offset instead of hardcoding 0
	var currentOffset int64 = 0

	// Calculate config hash to look up existing offset using same logic as pattern offset API
	if len(req.DomainConfig.TLDs) > 0 {
		selectedTLD := req.DomainConfig.TLDs[0]
		// Normalize TLD format for hash calculation
		if !strings.HasPrefix(selectedTLD, ".") {
			selectedTLD = "." + selectedTLD
		}

		// Create params for hash calculation
		hashParams := models.DomainGenerationCampaignParams{
			PatternType:    req.DomainConfig.PatternType,
			VariableLength: req.DomainConfig.VariableLength,
			CharacterSet:   req.DomainConfig.CharacterSet,
			ConstantString: &req.DomainConfig.ConstantString,
			TLD:            selectedTLD,
		}

		// Calculate hash using domain expert
		if hashResult, err := domainexpert.GenerateDomainGenerationPhaseConfigHash(hashParams); err == nil {
			// Look up existing config state to get current offset
			if s.campaignStore != nil {
				if configState, err := s.campaignStore.GetDomainGenerationPhaseConfigStateByHash(ctx, s.db, hashResult.HashString); err == nil && configState != nil {
					currentOffset = configState.LastOffset
					log.Printf("DEBUG CreateCampaign: Found existing config state with offset %d for campaign %s", currentOffset, campaignID)
				} else {
					log.Printf("DEBUG CreateCampaign: No existing config state found, using offset 0 for campaign %s", campaignID)
				}
			}
		} else {
			log.Printf("WARNING CreateCampaign: Failed to calculate config hash for campaign %s: %v", campaignID, err)
		}
	}

	// Store domain generation configuration in campaign metadata for modern architecture
	metadata := map[string]interface{}{
		"domain_generation_config": map[string]interface{}{
			"pattern_type":            req.DomainConfig.PatternType,
			"variable_length":         req.DomainConfig.VariableLength,
			"character_set":           req.DomainConfig.CharacterSet,
			"constant_string":         req.DomainConfig.ConstantString,
			"tlds":                    req.DomainConfig.TLDs,
			"num_domains_to_generate": req.DomainConfig.NumDomainsToGenerate,
			"batch_size":              batchSize,
			// 🚨 CRITICAL FIX: Use calculated current offset instead of hardcoding 0
			"total_possible_combinations": totalPossibleCombinations,
			"current_offset":              currentOffset,
		},
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal campaign metadata: %w", err)
	}
	metadataRaw := json.RawMessage(metadataJSON)

	log.Printf("DEBUG CreateCampaign: Storing metadata: %s", string(metadataJSON))

	campaign := &models.LeadGenerationCampaign{
		ID:           campaignID,
		Name:         req.Name,
		UserID:       &req.UserID,
		CampaignType: "lead_generation",
		CreatedAt:    now,
		UpdatedAt:    now,

		// Phase management - start with domain generation phase
		CurrentPhase:    phaseTypePtr(models.PhaseTypeDomainGeneration),
		PhaseStatus:     phaseStatusPtr(models.PhaseStatusNotStarted),
		TotalPhases:     4,
		CompletedPhases: 0,
		OverallProgress: float64Ptr(0.0),

		// Phase lifecycle management
		IsFullSequenceMode: false,
		AutoAdvancePhases:  false,

		// Store domain configuration in metadata for modern architecture
		Metadata: &metadataRaw,
	}

	// Create campaign record
	log.Printf("DEBUG CreateCampaign: About to call store.CreateCampaign for campaign %s", campaignID)
	err = s.campaignStore.CreateCampaign(ctx, s.db, campaign)
	if err != nil {
		log.Printf("DEBUG CreateCampaign: store.CreateCampaign FAILED for campaign %s: %v", campaignID, err)
		return nil, fmt.Errorf("failed to create campaign: %w", err)
	}
	log.Printf("DEBUG CreateCampaign: store.CreateCampaign SUCCEEDED for campaign %s", campaignID)

	// 🆕 Create campaign phase records
	log.Printf("DEBUG CreateCampaign: About to create campaign phases for campaign %s", campaignID)
	err = s.campaignStore.CreateCampaignPhases(ctx, s.db, campaignID)
	if err != nil {
		log.Printf("DEBUG CreateCampaign: CreateCampaignPhases FAILED for campaign %s: %v", campaignID, err)
		// Cleanup campaign if phase creation fails
		s.campaignStore.DeleteCampaign(ctx, s.db, campaignID)
		return nil, fmt.Errorf("failed to create campaign phases: %w", err)
	}
	log.Printf("DEBUG CreateCampaign: CreateCampaignPhases SUCCEEDED for campaign %s", campaignID)

	// Initialize Phase 1 (Domain Generation) - coordinate with standalone service
	log.Printf("DEBUG CreateCampaign: About to call InitializePhase1 for campaign %s", campaignID)
	err = s.InitializePhase1(ctx, campaignID)
	if err != nil {
		log.Printf("DEBUG CreateCampaign: InitializePhase1 FAILED for campaign %s: %v", campaignID, err)
		// Cleanup campaign if Phase 1 initialization fails
		s.campaignStore.DeleteCampaign(ctx, s.db, campaignID)
		return nil, fmt.Errorf("failed to initialize Phase 1: %w", err)
	}
	log.Printf("DEBUG CreateCampaign: InitializePhase1 SUCCEEDED for campaign %s", campaignID)

	// Send campaign creation notification via WebSocket
	s.broadcastCampaignUpdate(campaignID, "campaign.created", "Campaign created with Phase 1 initialized")

	return campaign, nil
}

// GetCampaign retrieves a campaign by ID
func (s *phaseExecutionService) GetCampaign(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, error) {
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}
	return campaign, nil
}

// UpdateCampaignStatus updates the campaign status via phase table (single source of truth)
// ARCHITECTURE: This now updates campaign_phases table, which automatically syncs to campaign via trigger
func (s *phaseExecutionService) UpdateCampaignStatus(ctx context.Context, campaignID uuid.UUID, status string) error {
	log.Printf("UpdateCampaignStatus: Setting status '%s' for campaign %s using phase-first approach", status, campaignID)

	// Get current campaign to determine which phase to update
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign: %w", err)
	}

	if campaign.CurrentPhase == nil {
		// If no current phase, default to domain_generation
		defaultPhase := models.PhaseTypeDomainGeneration
		campaign.CurrentPhase = &defaultPhase
		log.Printf("No current phase set for campaign %s, defaulting to domain_generation", campaignID)
	}

	// Convert string status to enum
	phaseStatus := models.PhaseStatusEnum(status)

	// Update the current phase status in campaign_phases table
	// The database trigger will automatically sync the campaign table
	err = s.campaignStore.UpdatePhaseStatus(ctx, s.db, campaignID, *campaign.CurrentPhase, phaseStatus)
	if err != nil {
		return fmt.Errorf("failed to update phase status: %w", err)
	}

	log.Printf("Successfully updated phase %s status to '%s' for campaign %s (campaign auto-synced)",
		*campaign.CurrentPhase, status, campaignID)

	// Broadcast status update
	s.broadcastCampaignUpdate(campaignID, "campaign.status.updated", fmt.Sprintf("Status updated to %s", status))

	return nil
}

// InitializePhase1 initializes Phase 1 (Domain Generation) using standalone service with real configuration
func (s *phaseExecutionService) InitializePhase1(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("DEBUG InitializePhase1: Starting initialization for campaign %s", campaignID)

	// Get campaign details to extract real configuration
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		log.Printf("DEBUG InitializePhase1: GetCampaign FAILED for campaign %s: %v", campaignID, err)
		return fmt.Errorf("failed to get campaign for Phase 1 initialization: %w", err)
	}
	log.Printf("DEBUG InitializePhase1: GetCampaign SUCCEEDED for campaign %s", campaignID)

	// Extract domain generation configuration from campaign metadata or parameters
	var domainConfig DomainGenerationPhaseConfig

	// Try to extract from campaign metadata first
	if campaign.Metadata != nil {
		log.Printf("DEBUG InitializePhase1: Campaign %s has metadata, attempting to parse", campaignID)
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
			log.Printf("DEBUG InitializePhase1: Metadata JSON unmarshaling SUCCEEDED for campaign %s", campaignID)
			log.Printf("DEBUG InitializePhase1: Available metadata keys: %v", getMapKeys(metadata))

			if configData, exists := metadata["domain_generation_config"]; exists {
				log.Printf("DEBUG InitializePhase1: Found domain_generation_config key for campaign %s", campaignID)
				if configMap, ok := configData.(map[string]interface{}); ok {
					log.Printf("DEBUG InitializePhase1: Successfully cast config to map for campaign %s", campaignID)
					domainConfig = extractDomainConfigFromMetadata(configMap)
					log.Printf("DEBUG InitializePhase1: Extracted domain config: %+v", domainConfig)
				} else {
					log.Printf("DEBUG InitializePhase1: Failed to cast configData to map for campaign %s, type: %T", campaignID, configData)
				}
			} else {
				log.Printf("DEBUG InitializePhase1: No domain_generation_config key found in metadata for campaign %s", campaignID)
			}
		} else {
			log.Printf("DEBUG InitializePhase1: Metadata JSON unmarshaling FAILED for campaign %s: %v", campaignID, err)
		}
	} else {
		log.Printf("DEBUG InitializePhase1: Campaign %s has NO metadata", campaignID)
	}

	// If no configuration in metadata, this indicates a data integrity issue
	if domainConfig.PatternType == "" {
		log.Printf("DEBUG InitializePhase1: No domain configuration found, PatternType is empty for campaign %s", campaignID)
		return fmt.Errorf("no domain generation configuration found in campaign metadata for campaign %s - this should not happen with modern campaigns", campaignID)
	}

	// TODO: Replace with direct domainGenerator engine call
	// Validate the extracted configuration
	if domainConfig.PatternType == "" || domainConfig.CharacterSet == "" || len(domainConfig.TLDs) == 0 {
		return fmt.Errorf("invalid domain generation configuration: missing required fields")
	}

	log.Printf("InitializePhase1: Starting domain generation for campaign %s with config: %+v", campaignID, domainConfig)

	// Start domain generation using shared DomainGenerationService
	// Process first batch to kick off domain generation
	batchDone, processedCount, err := s.domainGenerationService.ProcessGenerationCampaignBatch(ctx, campaignID, domainConfig.BatchSize)
	if err != nil {
		log.Printf("InitializePhase1: Domain generation FAILED for campaign %s: %v", campaignID, err)
		return fmt.Errorf("failed to start domain generation: %w", err)
	}

	log.Printf("InitializePhase1: First batch processed - Campaign: %s, BatchDone: %v, ProcessedCount: %d", campaignID, batchDone, processedCount)

	log.Printf("DEBUG: Domain generation successfully started for campaign %s", campaignID)

	// Update campaign to reflect Phase 1 initialization with real status
	err = s.UpdateCampaignStatus(ctx, campaignID, string(models.PhaseStatusInProgress))
	if err != nil {
		return fmt.Errorf("failed to update campaign status after Phase 1 init: %w", err)
	}

	// Broadcast phase initialization with real data
	s.broadcastPhaseTransition(campaignID, "", string(models.PhaseTypeDomainGeneration),
		fmt.Sprintf("Phase 1 initialized with %d target domains", domainConfig.NumDomainsToGenerate))

	log.Printf("InitializePhase1: Successfully initialized Phase 1 for campaign %s", campaignID)
	return nil
}

// Helper function to get map keys for debugging
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// Helper function to extract domain config from metadata
func extractDomainConfigFromMetadata(configMap map[string]interface{}) DomainGenerationPhaseConfig {
	config := DomainGenerationPhaseConfig{}

	if patternType, ok := configMap["pattern_type"].(string); ok {
		config.PatternType = patternType
	}
	if varLength, ok := configMap["variable_length"].(float64); ok {
		config.VariableLength = int(varLength)
	}
	if charSet, ok := configMap["character_set"].(string); ok {
		config.CharacterSet = charSet
	}
	if constStr, ok := configMap["constant_string"].(string); ok {
		config.ConstantString = constStr
	}
	// Handle both old single TLD format and new TLDs array format
	if tlds, ok := configMap["tlds"].([]interface{}); ok {
		// New format: TLDs array
		for _, tldInterface := range tlds {
			if tld, ok := tldInterface.(string); ok {
				config.TLDs = append(config.TLDs, tld)
			}
		}
	} else if tld, ok := configMap["tld"].(string); ok {
		// Legacy format: single TLD - convert to array
		config.TLDs = []string{tld}
	}
	if numDomains, ok := configMap["num_domains_to_generate"].(float64); ok {
		config.NumDomainsToGenerate = int(numDomains)
	}
	if batchSize, ok := configMap["batch_size"].(float64); ok {
		config.BatchSize = int(batchSize)
	}

	return config
}

// Helper function to safely get string value from pointer
func getStringValue(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}

// ConfigurePhase stores configuration for a specific phase in campaign metadata
func (s *phaseExecutionService) ConfigurePhase(ctx context.Context, campaignID uuid.UUID, phaseType string, config interface{}) error {
	// Get campaign to update metadata
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for phase configuration: %w", err)
	}

	// Parse existing metadata or create new
	var metadata map[string]interface{}
	if campaign.Metadata != nil {
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err != nil {
			return fmt.Errorf("failed to parse existing campaign metadata: %w", err)
		}
	} else {
		metadata = make(map[string]interface{})
	}

	// Store phase configuration in metadata based on phase type
	switch phaseType {
	case string(models.PhaseTypeDNSValidation):
		metadata["dns_validation_config"] = config
		log.Printf("ConfigurePhase: Stored DNS validation config for campaign %s", campaignID)

	case string(models.PhaseTypeHTTPKeywordValidation):
		metadata["http_validation_config"] = config
		log.Printf("ConfigurePhase: Stored HTTP validation config for campaign %s", campaignID)

	case string(models.PhaseTypeAnalysis):
		metadata["analysis_config"] = config
		log.Printf("ConfigurePhase: Stored analysis config for campaign %s", campaignID)

	default:
		return fmt.Errorf("unsupported phase type for configuration: %s", phaseType)
	}

	// Marshal updated metadata
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal updated campaign metadata: %w", err)
	}
	metadataRaw := json.RawMessage(metadataJSON)

	// Update campaign metadata
	campaign.Metadata = &metadataRaw
	campaign.UpdatedAt = time.Now()

	err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return fmt.Errorf("failed to update campaign metadata with phase configuration: %w", err)
	}

	// Broadcast phase state change using User-Driven Phase Lifecycle messages
	s.broadcastPhaseStateChanged(campaignID, phaseType, "ready", "configured")

	log.Printf("ConfigurePhase: Successfully configured phase %s for campaign %s", phaseType, campaignID)
	return nil
}

// StartPhase starts a specific campaign phase with user control and dual-mode support
// Phase 4.11: User-controlled phase execution (JobTypeEnum routing eliminated, unified architecture maintained)
func (s *phaseExecutionService) StartPhase(ctx context.Context, campaignID uuid.UUID, phaseType string) error {
	// Get current campaign state to check mode and validate request
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign state: %w", err)
	}

	// Determine the appropriate phase based on campaign mode
	var phaseToStart models.PhaseTypeEnum

	// Check if campaign is in full auto sequence mode
	if campaign.AutoAdvancePhases {
		// Auto mode: Autonomously determine next phase based on campaign state
		if campaign.CurrentPhase == nil {
			// No current phase set - start with domain generation
			phaseToStart = models.PhaseTypeDomainGeneration
		} else {
			// Check if current phase is complete, if so advance to next phase
			switch *campaign.CurrentPhase {
			case models.PhaseTypeDomainGeneration:
				// Check if domain generation is complete
				if campaign.ProcessedItems != nil && *campaign.ProcessedItems > 0 {
					phaseToStart = models.PhaseTypeDNSValidation
				} else {
					phaseToStart = models.PhaseTypeDomainGeneration // Continue current phase
				}
			case models.PhaseTypeDNSValidation:
				phaseToStart = models.PhaseTypeHTTPKeywordValidation
			case models.PhaseTypeHTTPKeywordValidation:
				phaseToStart = models.PhaseTypeAnalysis
			case models.PhaseTypeAnalysis:
				return fmt.Errorf("campaign %s is already in final phase", campaignID)
			default:
				return fmt.Errorf("unknown current phase: %s", *campaign.CurrentPhase)
			}
		}
	} else {
		// Step-by-step mode: Use the specific phase requested by user
		switch phaseType {
		case "domain_generation":
			phaseToStart = models.PhaseTypeDomainGeneration
		case "dns_validation":
			phaseToStart = models.PhaseTypeDNSValidation
		case "http_keyword_validation":
			phaseToStart = models.PhaseTypeHTTPKeywordValidation
		case "analysis":
			phaseToStart = models.PhaseTypeAnalysis
		default:
			return fmt.Errorf("unsupported phase type: %s", phaseType)
		}
	}

	log.Printf("StartPhase: Starting phase %s for campaign %s (mode: %s)", phaseToStart, campaignID,
		map[bool]string{true: "auto", false: "step-by-step"}[campaign.AutoAdvancePhases])

	// Validate phase readiness before starting
	if err := s.validatePhaseReadiness(ctx, campaignID, string(phaseToStart)); err != nil {
		return fmt.Errorf("phase readiness validation failed: %w", err)
	}

	// Execute the determined phase
	var phaseErr error
	switch phaseToStart {
	case models.PhaseTypeDomainGeneration:
		phaseErr = s.startDomainGenerationPhase(ctx, campaignID)
	case models.PhaseTypeDNSValidation:
		phaseErr = s.startDNSValidationPhase(ctx, campaignID)
	case models.PhaseTypeHTTPKeywordValidation:
		phaseErr = s.startHTTPValidationPhase(ctx, campaignID)
	case models.PhaseTypeAnalysis:
		phaseErr = s.startAnalysisPhase(ctx, campaignID)
	default:
		phaseErr = fmt.Errorf("unsupported phase: %s", phaseToStart)
	}

	// If phase execution failed, reset the phase status to allow retry
	if phaseErr != nil {
		log.Printf("Phase execution failed for campaign %s, phase %s: %v. Resetting phase status for retry.", campaignID, phaseToStart, phaseErr)

		// Reset phase status in campaign_phases table to 'failed'
		// The database trigger will automatically sync the campaign table
		if resetErr := s.campaignStore.FailPhase(ctx, s.db, campaignID, phaseToStart, phaseErr.Error()); resetErr != nil {
			log.Printf("WARNING: Failed to set phase to failed status for campaign %s: %v", campaignID, resetErr)
		} else {
			log.Printf("Successfully set phase %s to 'failed' for campaign %s (campaign auto-synced)", phaseToStart, campaignID)
		}

		return phaseErr
	}

	return nil
}

// TransitionToNextPhase manages transitions between phases
func (s *phaseExecutionService) TransitionToNextPhase(ctx context.Context, campaignID uuid.UUID) error {
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for phase transition: %w", err)
	}

	if campaign.CurrentPhase == nil {
		return fmt.Errorf("campaign has no current phase set")
	}

	currentPhase := *campaign.CurrentPhase
	var nextPhase models.PhaseTypeEnum

	// Determine next phase based on current phase
	switch currentPhase {
	case models.PhaseTypeDomainGeneration:
		nextPhase = models.PhaseTypeDNSValidation
	case models.PhaseTypeDNSValidation:
		nextPhase = models.PhaseTypeHTTPKeywordValidation
	case models.PhaseTypeHTTPKeywordValidation:
		nextPhase = models.PhaseTypeAnalysis
	case models.PhaseTypeAnalysis:
		// Campaign complete
		return s.completeCampaign(ctx, campaignID)
	default:
		return fmt.Errorf("unknown current phase: %s", currentPhase)
	}

	// Update campaign to next phase
	campaign.CurrentPhase = &nextPhase
	campaign.CompletedPhases++
	campaign.UpdatedAt = time.Now()

	err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return fmt.Errorf("failed to update campaign for phase transition: %w", err)
	}

	// Broadcast phase transition
	s.broadcastPhaseTransition(campaignID, string(currentPhase), string(nextPhase), "Phase transition completed")

	return nil
}

// GetCampaignProgress retrieves overall campaign progress by aggregating from real phase services
func (s *phaseExecutionService) GetCampaignProgress(ctx context.Context, campaignID uuid.UUID) (*LeadGenerationProgress, error) {
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Build phase progress map by coordinating with real phase services
	phaseProgress := make(map[string]PhaseProgress)
	totalPhaseProgress := 0.0
	completedPhases := 0

	// Get REAL domain generation progress from standalone service
	domainPhaseKey := string(models.PhaseTypeDomainGeneration)

	// Get domain generation progress from shared service and campaign data
	domains, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, s.db, campaignID, 10000, 0)
	if err != nil {
		log.Printf("GetCampaignProgress: Failed to get domains for campaign %s: %v", campaignID, err)
	}

	domainsGenerated := len(domains)

	// Extract target domain count from campaign metadata
	var targetDomains int64 = 1000 // Default
	if campaign.Metadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
			if configData, exists := metadata["domain_generation_config"]; exists {
				if configMap, ok := configData.(map[string]interface{}); ok {
					if numDomains, ok := configMap["num_domains_to_generate"].(float64); ok {
						targetDomains = int64(numDomains)
					}
				}
			}
		}
	}

	// Calculate domain generation progress
	var domainProgress float64 = 0.0
	var domainStatus string = "pending"
	if targetDomains > 0 {
		domainProgress = float64(domainsGenerated) / float64(targetDomains) * 100.0
		if domainProgress >= 100.0 {
			domainProgress = 100.0
			domainStatus = "completed"
		} else if domainsGenerated > 0 {
			domainStatus = "in_progress"
		}
	}

	startedAt := campaign.CreatedAt
	phaseProgress[domainPhaseKey] = PhaseProgress{
		Status:         models.PhaseStatusEnum(domainStatus),
		Progress:       domainProgress,
		ItemsProcessed: int64(domainsGenerated),
		ItemsTotal:     targetDomains,
		StartedAt:      &startedAt,
	}

	// Add to overall progress calculation (domain generation is 33% of total)
	totalPhaseProgress += domainProgress * 0.33
	if domainStatus == "completed" {
		completedPhases++
	}

	log.Printf("GetCampaignProgress: Domain generation phase - Status: %s, Progress: %.2f%%, Domains: %d/%d",
		domainStatus, domainProgress, domainsGenerated, int(targetDomains))

	// Get REAL DNS validation progress if campaign has reached that phase
	dnsPhaseKey := string(models.PhaseTypeDNSValidation)
	if campaign.CurrentPhase != nil && (*campaign.CurrentPhase == models.PhaseTypeDNSValidation || completedPhases >= 1) {
		// Get DNS validation results by checking domains with DNS status
		dnsValidated := 0
		for _, domain := range domains {
			if domain.DNSStatus != nil && *domain.DNSStatus != "" && *domain.DNSStatus != "pending" {
				dnsValidated++
			}
		}
		totalDomainsForDNS := int64(domainsGenerated) // DNS validates generated domains

		var dnsProgress float64 = 0.0
		var dnsStatus string = "pending"
		if totalDomainsForDNS > 0 {
			dnsProgress = float64(dnsValidated) / float64(totalDomainsForDNS) * 100.0
			if dnsProgress >= 100.0 {
				dnsProgress = 100.0
				dnsStatus = "completed"
			} else if dnsValidated > 0 {
				dnsStatus = "in_progress"
			}
		}

		phaseProgress[dnsPhaseKey] = PhaseProgress{
			Status:         models.PhaseStatusEnum(dnsStatus),
			Progress:       dnsProgress,
			ItemsProcessed: int64(dnsValidated),
			ItemsTotal:     totalDomainsForDNS,
		}

		// Add to overall progress calculation (DNS validation is 33% of total)
		totalPhaseProgress += dnsProgress * 0.33
		if dnsStatus == "completed" {
			completedPhases++
		}

		log.Printf("GetCampaignProgress: DNS validation phase - Status: %s, Progress: %.2f%%, Validated: %d/%d",
			dnsStatus, dnsProgress, dnsValidated, int(totalDomainsForDNS))
	} else {
		// DNS phase not started yet
		phaseProgress[dnsPhaseKey] = PhaseProgress{
			Status:   "pending",
			Progress: 0.0,
		}
	}

	// Get REAL HTTP validation progress if campaign has reached that phase
	httpPhaseKey := string(models.PhaseTypeHTTPKeywordValidation)
	if campaign.CurrentPhase != nil && (*campaign.CurrentPhase == models.PhaseTypeHTTPKeywordValidation || completedPhases >= 2) {
		// Get HTTP validation results by checking domains with HTTP status
		httpValidated := 0
		for _, domain := range domains {
			if domain.HTTPStatus != nil && *domain.HTTPStatus != "" && *domain.HTTPStatus != "pending" {
				httpValidated++
			}
		}

		// Recalculate DNS validated count for HTTP phase
		dnsValidatedForHTTP := 0
		for _, domain := range domains {
			if domain.DNSStatus != nil && *domain.DNSStatus != "" && *domain.DNSStatus != "pending" {
				dnsValidatedForHTTP++
			}
		}
		totalDomainsForHTTP := int64(dnsValidatedForHTTP) // HTTP validates DNS-validated domains
		if totalDomainsForHTTP == 0 {
			totalDomainsForHTTP = int64(domainsGenerated) // Fallback to all domains
		}

		var httpProgress float64 = 0.0
		var httpStatus string = "pending"
		if totalDomainsForHTTP > 0 {
			httpProgress = float64(httpValidated) / float64(totalDomainsForHTTP) * 100.0
			if httpProgress >= 100.0 {
				httpProgress = 100.0
				httpStatus = "completed"
			} else if httpValidated > 0 {
				httpStatus = "in_progress"
			}
		}

		phaseProgress[httpPhaseKey] = PhaseProgress{
			Status:         models.PhaseStatusEnum(httpStatus),
			Progress:       httpProgress,
			ItemsProcessed: int64(httpValidated),
			ItemsTotal:     totalDomainsForHTTP,
		}

		// Add to overall progress calculation (HTTP validation is 34% of total)
		totalPhaseProgress += httpProgress * 0.34
		if httpStatus == "completed" {
			completedPhases++
		}

		log.Printf("GetCampaignProgress: HTTP validation phase - Status: %s, Progress: %.2f%%, Validated: %d/%d",
			httpStatus, httpProgress, httpValidated, int(totalDomainsForHTTP))
	} else {
		// HTTP phase not started yet
		phaseProgress[httpPhaseKey] = PhaseProgress{
			Status:   "pending",
			Progress: 0.0,
		}
	}

	// Calculate accurate overall progress based on real phase data
	overallProgress := 0.0
	totalPhases := float64(campaign.TotalPhases)
	if totalPhases > 0 {
		// Weight each phase equally in overall progress
		overallProgress = totalPhaseProgress / totalPhases
	}

	// Ensure overall progress doesn't exceed 100%
	if overallProgress > 100.0 {
		overallProgress = 100.0
	}

	// Update campaign completed phases based on real data
	if completedPhases != campaign.CompletedPhases {
		campaign.CompletedPhases = completedPhases
		campaign.OverallProgress = &overallProgress
		// Update campaign in database (optional, might be done elsewhere)
		if updateErr := s.campaignStore.UpdateCampaign(ctx, s.db, campaign); updateErr != nil {
			log.Printf("Failed to update campaign completed phases: %v", updateErr)
		}
	}

	progress := &LeadGenerationProgress{
		CampaignID:      campaignID,
		CurrentPhase:    models.PhaseTypeEnum(stringOrEmpty(campaign.CurrentPhase)),
		PhaseProgress:   phaseProgress,
		OverallProgress: overallProgress,
	}

	log.Printf("GetCampaignProgress: Campaign %s - Overall: %.2f%%, Completed phases: %d/%d",
		campaignID, overallProgress, completedPhases, campaign.TotalPhases)

	return progress, nil
}

// ListCampaigns retrieves campaigns for a user
func (s *phaseExecutionService) ListCampaigns(ctx context.Context, filter store.ListCampaignsFilter) ([]models.LeadGenerationCampaign, int64, error) {
	log.Printf("Listing campaigns with filter: %+v", filter)

	campaigns, err := s.campaignStore.ListCampaigns(ctx, s.db, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list campaigns: %w", err)
	}

	// Convert to []models.LeadGenerationCampaign and return count
	result := make([]models.LeadGenerationCampaign, len(campaigns))
	for i, campaign := range campaigns {
		result[i] = *campaign
	}

	return result, int64(len(result)), nil
}

// DeleteCampaign deletes a campaign and coordinates cleanup with phase services
func (s *phaseExecutionService) DeleteCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// Coordinate cleanup with phase services if needed
	// For now, rely on database cascading deletes

	err := s.campaignStore.DeleteCampaign(ctx, s.db, campaignID)
	if err != nil {
		return fmt.Errorf("failed to delete campaign: %w", err)
	}

	// Broadcast campaign deletion
	s.broadcastCampaignUpdate(campaignID, "campaign.deleted", "Campaign deleted")

	return nil
}

// Phase validation and coordination helper methods

// validatePhaseReadiness ensures a phase can be started based on campaign state and prerequisites
func (s *phaseExecutionService) validatePhaseReadiness(ctx context.Context, campaignID uuid.UUID, phaseType string) error {
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign: %w", err)
	}

	// Convert phaseType string to enum for comparison
	var targetPhase models.PhaseTypeEnum
	switch phaseType {
	case string(models.PhaseTypeDomainGeneration):
		targetPhase = models.PhaseTypeDomainGeneration
	case string(models.PhaseTypeDNSValidation):
		targetPhase = models.PhaseTypeDNSValidation
	case string(models.PhaseTypeHTTPKeywordValidation):
		targetPhase = models.PhaseTypeHTTPKeywordValidation
	case string(models.PhaseTypeAnalysis):
		targetPhase = models.PhaseTypeAnalysis
	default:
		return fmt.Errorf("unknown phase type: %s", phaseType)
	}

	// Phase transition guards - prevent skipping phases
	if err := s.validatePhaseTransitionOrder(campaign, targetPhase); err != nil {
		return fmt.Errorf("phase transition validation failed: %w", err)
	}

	// Phase configuration validation - ensure required phases are configured
	if err := s.validatePhaseConfiguration(campaign, targetPhase); err != nil {
		return fmt.Errorf("phase configuration validation failed: %w", err)
	}

	log.Printf("validatePhaseReadiness: Phase %s is ready to start for campaign %s", phaseType, campaignID)
	return nil
}

// validatePhaseTransitionOrder ensures phases are started in the correct order
func (s *phaseExecutionService) validatePhaseTransitionOrder(campaign *models.LeadGenerationCampaign, targetPhase models.PhaseTypeEnum) error {
	// Define phase order
	phaseOrder := []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeAnalysis,
	}

	// Find target phase index
	var targetIndex int = -1
	for i, phase := range phaseOrder {
		if phase == targetPhase {
			targetIndex = i
			break
		}
	}

	if targetIndex == -1 {
		return fmt.Errorf("invalid target phase: %s", targetPhase)
	}

	// For domain generation phase, always allow (it's the first phase)
	if targetPhase == models.PhaseTypeDomainGeneration {
		return nil
	}

	// Check if previous phases are completed
	for i := 0; i < targetIndex; i++ {
		prevPhase := phaseOrder[i]
		if !s.isPhaseCompleted(campaign, prevPhase) {
			return fmt.Errorf("cannot start phase %s: previous phase %s is not completed", targetPhase, prevPhase)
		}
	}

	return nil
}

// validatePhaseConfiguration ensures required configuration is present for phases that need it
func (s *phaseExecutionService) validatePhaseConfiguration(campaign *models.LeadGenerationCampaign, targetPhase models.PhaseTypeEnum) error {
	// Domain generation doesn't need separate configuration - it's configured during campaign creation
	if targetPhase == models.PhaseTypeDomainGeneration {
		// Check if domain config exists in metadata
		if campaign.Metadata == nil {
			return fmt.Errorf("campaign metadata is missing - domain configuration required")
		}

		// Unmarshal metadata to check for domain config
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err != nil {
			return fmt.Errorf("failed to unmarshal campaign metadata: %w", err)
		}

		if _, exists := metadata["domain_generation_config"]; !exists {
			return fmt.Errorf("domain generation configuration is missing from campaign metadata")
		}
		return nil
	}

	// Other phases require explicit configuration via ConfigurePhase
	var configKey string
	switch targetPhase {
	case models.PhaseTypeDNSValidation:
		configKey = "dns_validation_config"
	case models.PhaseTypeHTTPKeywordValidation:
		configKey = "http_validation_config"
	case models.PhaseTypeAnalysis:
		configKey = "analysis_config"
	default:
		return fmt.Errorf("unknown phase for configuration validation: %s", targetPhase)
	}

	if campaign.Metadata == nil {
		return fmt.Errorf("phase %s requires configuration but campaign metadata is missing", targetPhase)
	}

	// Unmarshal metadata to check for phase config
	var metadata map[string]interface{}
	if err := json.Unmarshal(*campaign.Metadata, &metadata); err != nil {
		return fmt.Errorf("failed to unmarshal campaign metadata: %w", err)
	}

	if _, exists := metadata[configKey]; !exists {
		return fmt.Errorf("phase %s requires configuration - please configure the phase before starting", targetPhase)
	}

	log.Printf("validatePhaseConfiguration: Phase %s configuration found in metadata", targetPhase)
	return nil
}

// isPhaseCompleted checks if a specific phase has been completed for the campaign
func (s *phaseExecutionService) isPhaseCompleted(campaign *models.LeadGenerationCampaign, phase models.PhaseTypeEnum) bool {
	ctx := context.Background()

	switch phase {
	case models.PhaseTypeDomainGeneration:
		// Check domain generation completion using database data
		domains, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, s.db, campaign.ID, 10000, 0)
		if err != nil {
			log.Printf("Failed to get domains for completion check: %v", err)
			return false
		}

		// Extract target domain count from campaign metadata
		var targetDomains int64 = 1000 // Default
		if campaign.Metadata != nil {
			var metadata map[string]interface{}
			if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
				if configData, exists := metadata["domain_generation_config"]; exists {
					if configMap, ok := configData.(map[string]interface{}); ok {
						if numDomains, ok := configMap["num_domains_to_generate"].(float64); ok {
							targetDomains = int64(numDomains)
						}
					}
				}
			}
		}

		// Phase is complete if we've generated the target number of domains
		domainsGenerated := int64(len(domains))
		return domainsGenerated >= targetDomains

	case models.PhaseTypeDNSValidation:
		// Check DNS validation completion using database data
		domains, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, s.db, campaign.ID, 10000, 0)
		if err != nil {
			log.Printf("Failed to get domains for DNS validation completion check: %v", err)
			return false
		}

		if len(domains) == 0 {
			return false
		}

		// Check if all domains have DNS validation status (not pending or empty)
		dnsValidated := 0
		for _, domain := range domains {
			if domain.DNSStatus != nil && *domain.DNSStatus != "" && *domain.DNSStatus != "pending" {
				dnsValidated++
			}
		}

		// Phase is complete if all generated domains have been DNS validated
		return dnsValidated >= len(domains)

	case models.PhaseTypeHTTPKeywordValidation:
		// Check HTTP validation completion using database data
		domains, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, s.db, campaign.ID, 10000, 0)
		if err != nil {
			log.Printf("Failed to get domains for HTTP validation completion check: %v", err)
			return false
		}

		if len(domains) == 0 {
			return false
		}

		// Check if all DNS-validated domains have HTTP validation status
		dnsValidatedCount := 0
		httpValidatedCount := 0
		for _, domain := range domains {
			if domain.DNSStatus != nil && *domain.DNSStatus != "" && *domain.DNSStatus != "pending" {
				dnsValidatedCount++
				if domain.HTTPStatus != nil && *domain.HTTPStatus != "" && *domain.HTTPStatus != "pending" {
					httpValidatedCount++
				}
			}
		}

		// Phase is complete if all DNS-validated domains have been HTTP validated
		return dnsValidatedCount > 0 && httpValidatedCount >= dnsValidatedCount

	case models.PhaseTypeAnalysis:
		// Analysis phase completion depends on campaign configuration
		// For now, assume it's completed immediately when started
		return campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeAnalysis

	default:
		log.Printf("Unknown phase type for completion check: %s", phase)
		return false
	}
}

func (s *phaseExecutionService) startDomainGenerationPhase(ctx context.Context, campaignID uuid.UUID) error {
	// Phase 2.4: Direct engine integration - create DomainGenerator per campaign

	// Get campaign details to configure domain generation
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign details: %w", err)
	}

	// Extract domain generation config from campaign metadata
	var domainConfig struct {
		PatternType          string `json:"pattern_type"`
		VariableLength       int    `json:"variable_length"`
		CharacterSet         string `json:"character_set"`
		ConstantString       string `json:"constant_string"`
		TLD                  string `json:"tld"`
		NumDomainsToGenerate int    `json:"num_domains_to_generate"`
		BatchSize            int    `json:"batch_size"`
	}

	// Parse metadata JSON to extract domain generation config
	if campaign.Metadata != nil {
		var metadataMap map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadataMap); err == nil {
			if domainGenConfigRaw, exists := metadataMap["domain_generation_config"]; exists {
				if domainGenConfigMap, ok := domainGenConfigRaw.(map[string]interface{}); ok {
					// Extract configuration values
					if val, ok := domainGenConfigMap["pattern_type"].(string); ok {
						domainConfig.PatternType = val
					}
					if val, ok := domainGenConfigMap["variable_length"].(float64); ok {
						domainConfig.VariableLength = int(val)
					}
					if val, ok := domainGenConfigMap["character_set"].(string); ok {
						domainConfig.CharacterSet = val
					}
					if val, ok := domainGenConfigMap["constant_string"].(string); ok {
						domainConfig.ConstantString = val
					}
					if val, ok := domainGenConfigMap["tld"].(string); ok {
						domainConfig.TLD = val
					}
					if val, ok := domainGenConfigMap["num_domains_to_generate"].(float64); ok {
						domainConfig.NumDomainsToGenerate = int(val)
					}
					if val, ok := domainGenConfigMap["batch_size"].(float64); ok {
						domainConfig.BatchSize = int(val)
					}
				}
			}
		}
	}

	// Use shared DomainGenerationService with global offset tracking
	log.Printf("Starting domain generation for campaign %s using shared service with global offset tracking", campaignID)

	// 🆕 Mark domain generation phase as started
	err = s.campaignStore.StartPhase(ctx, s.db, campaignID, models.PhaseTypeDomainGeneration)
	if err != nil {
		log.Printf("WARNING: Failed to mark domain generation phase as started for campaign %s: %v", campaignID, err)
	}

	// Process domain generation batch using shared service to maintain global offsets
	batchSize := 100 // Default batch size
	batchDone, processedCount, err := s.domainGenerationService.ProcessGenerationCampaignBatch(ctx, campaignID, batchSize)
	if err != nil {
		// 🆕 Mark phase as failed
		s.campaignStore.FailPhase(ctx, s.db, campaignID, models.PhaseTypeDomainGeneration, err.Error())
		return fmt.Errorf("failed to process domain generation batch: %w", err)
	}

	log.Printf("Domain generation batch completed for campaign %s: processed=%d, batchDone=%v",
		campaignID, processedCount, batchDone)

	// 🆕 Update phase progress
	processedInt64 := int64(processedCount)
	err = s.campaignStore.UpdatePhaseProgress(ctx, s.db, campaignID, models.PhaseTypeDomainGeneration,
		0.0, nil, &processedInt64, &processedInt64, nil)
	if err != nil {
		log.Printf("WARNING: Failed to update domain generation phase progress for campaign %s: %v", campaignID, err)
	}

	if processedCount == 0 {
		// 🆕 Complete the phase if no domains were processed
		err = s.campaignStore.CompletePhase(ctx, s.db, campaignID, models.PhaseTypeDomainGeneration)
		if err != nil {
			log.Printf("WARNING: Failed to complete domain generation phase for campaign %s: %v", campaignID, err)
		}
		s.broadcastCampaignUpdate(campaignID, "phase.completed", "Domain generation phase completed - no more domains")
		return nil
	}

	// Broadcast progress update
	s.broadcastCampaignUpdate(campaignID, "domain.generation.progress",
		fmt.Sprintf("Generated %d domains", processedCount))

	if batchDone {
		// 🆕 Complete the domain generation phase
		err = s.campaignStore.CompletePhase(ctx, s.db, campaignID, models.PhaseTypeDomainGeneration)
		if err != nil {
			log.Printf("WARNING: Failed to complete domain generation phase for campaign %s: %v", campaignID, err)
		}

		// 🆕 Mark next phase (DNS validation) as ready
		err = s.campaignStore.UpdatePhaseStatus(ctx, s.db, campaignID, models.PhaseTypeDNSValidation, models.PhaseStatusReady)
		if err != nil {
			log.Printf("WARNING: Failed to mark DNS validation phase as ready for campaign %s: %v", campaignID, err)
		}

		s.broadcastCampaignUpdate(campaignID, "phase.completed", "Domain generation phase completed")
	}

	return nil
}

func (s *phaseExecutionService) startDNSValidationPhase(ctx context.Context, campaignID uuid.UUID) error {
	// Use service layer architecture - delegate to DNSCampaignService like domain generation does
	log.Printf("startDNSValidationPhase: Starting DNS validation for campaign %s using service layer", campaignID)

	// Use the DNS validation service (like domain generation uses domainGenerationService)
	done, processedInThisBatch, err := s.dnsValidationService.ProcessDNSValidationCampaignBatch(ctx, campaignID)
	if err != nil {
		s.campaignStore.FailPhase(ctx, s.db, campaignID, models.PhaseTypeDNSValidation, err.Error())
		return fmt.Errorf("DNS validation service failed for campaign %s: %w", campaignID, err)
	}

	log.Printf("startDNSValidationPhase: DNS validation batch processed for campaign %s - done: %v, processed: %d",
		campaignID, done, processedInThisBatch)
	return nil
}

func (s *phaseExecutionService) startHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID) error {
	// Use service layer architecture - delegate to HTTPKeywordCampaignService like domain generation does
	log.Printf("startHTTPValidationPhase: Starting HTTP validation for campaign %s using service layer", campaignID)

	// Use the HTTP keyword validation service (like domain generation uses domainGenerationService)
	done, processedInThisBatch, err := s.httpValidationService.ProcessHTTPKeywordCampaignBatch(ctx, campaignID)
	if err != nil {
		s.campaignStore.FailPhase(ctx, s.db, campaignID, models.PhaseTypeHTTPKeywordValidation, err.Error())
		return fmt.Errorf("HTTP keyword validation service failed for campaign %s: %w", campaignID, err)
	}

	log.Printf("startHTTPValidationPhase: HTTP validation batch processed for campaign %s - done: %v, processed: %d",
		campaignID, done, processedInThisBatch)
	return nil
}

func (s *phaseExecutionService) startAnalysisPhase(ctx context.Context, campaignID uuid.UUID) error {
	// Get campaign and extract Analysis configuration from metadata
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for Analysis phase: %w", err)
	}

	// Extract Analysis configuration from metadata
	if campaign.Metadata == nil {
		return fmt.Errorf("Analysis phase requires configuration but campaign metadata is missing")
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal(*campaign.Metadata, &metadata); err != nil {
		return fmt.Errorf("failed to unmarshal campaign metadata: %w", err)
	}

	analysisConfigRaw, exists := metadata["analysis_config"]
	if !exists {
		return fmt.Errorf("Analysis configuration not found in campaign metadata")
	}

	// Convert to Analysis config struct
	analysisConfigBytes, err := json.Marshal(analysisConfigRaw)
	if err != nil {
		return fmt.Errorf("failed to marshal Analysis config: %w", err)
	}

	// Use the correct AnalysisConfig type
	type AnalysisConfig struct {
		AnalysisType       string   `json:"analysisType"`
		IncludeScreenshots bool     `json:"includeScreenshots,omitempty"`
		GenerateReport     bool     `json:"generateReport,omitempty"`
		CustomRules        []string `json:"customRules,omitempty"`
	}

	var analysisConfig AnalysisConfig
	if err := json.Unmarshal(analysisConfigBytes, &analysisConfig); err != nil {
		return fmt.Errorf("failed to unmarshal Analysis config: %w", err)
	}

	// For now, log the analysis configuration since there's no analysis service yet
	log.Printf("startAnalysisPhase: Starting analysis for campaign %s with type %s, screenshots: %v, report: %v",
		campaignID, analysisConfig.AnalysisType, analysisConfig.IncludeScreenshots, analysisConfig.GenerateReport)

	// TODO: When analysis service is implemented, configure and start analysis here
	// For now, we'll just log the configuration and mark phase as started and immediately completed

	s.broadcastCampaignUpdate(campaignID, "phase.started",
		fmt.Sprintf("Analysis phase started with %s analysis type", analysisConfig.AnalysisType))

	// 🆕 For now, immediately complete the analysis phase since no implementation exists
	err = s.campaignStore.CompletePhase(ctx, s.db, campaignID, models.PhaseTypeAnalysis)
	if err != nil {
		log.Printf("WARNING: Failed to complete analysis phase for campaign %s: %v", campaignID, err)
	}

	log.Printf("startAnalysisPhase: Completed analysis for campaign %s (placeholder implementation)", campaignID)

	s.broadcastCampaignUpdate(campaignID, "phase.completed",
		"Analysis phase completed (placeholder implementation)")

	return nil
}

func (s *phaseExecutionService) completeCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// Mark campaign as completed
	now := time.Now()
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return err
	}

	campaign.CompletedAt = &now
	campaign.OverallProgress = float64Ptr(100.0)
	campaign.UpdatedAt = now

	err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return fmt.Errorf("failed to complete campaign: %w", err)
	}

	s.broadcastCampaignUpdate(campaignID, "campaign.completed", "Campaign completed successfully")
	return nil
}

// WebSocket coordination methods

func (s *phaseExecutionService) broadcastCampaignUpdate(campaignID uuid.UUID, eventType, message string) {
	if s.websocketManager == nil {
		return
	}

	// Use the standardized WebSocket message creation for campaign progress
	payload := websocket.CampaignStatusPayload{
		CampaignID:   campaignID.String(),
		PhaseStatus:  message,
		CurrentPhase: "",
	}
	wsMessage := websocket.CreateCampaignStatusMessageV2(payload)
	s.websocketManager.BroadcastStandardizedMessage(campaignID.String(), wsMessage)
	log.Printf("Broadcasted campaign update: campaignID=%s, messageType=%s, message=%s", campaignID, eventType, message)
}

// broadcastPhaseStateChanged broadcasts User-Driven Phase Lifecycle state changes
func (s *phaseExecutionService) broadcastPhaseStateChanged(campaignID uuid.UUID, phase, oldState, newState string) {
	if s.websocketManager == nil {
		return
	}

	// Create standardized phase state change message
	payload := websocket.PhaseStateChangedPayload{
		CampaignID: campaignID.String(),
		Phase:      phase,
		OldState:   oldState,
		NewState:   newState,
		Timestamp:  time.Now().Format(time.RFC3339),
	}

	wsMessage := websocket.CreatePhaseStateChangedMessageV2(payload)
	s.websocketManager.BroadcastStandardizedMessage(campaignID.String(), wsMessage)
	log.Printf("Broadcast phase state change: campaign=%s, phase=%s, %s->%s", campaignID, phase, oldState, newState)
}

// broadcastPhaseConfigurationRequired broadcasts when a phase needs configuration
func (s *phaseExecutionService) broadcastPhaseConfigurationRequired(campaignID uuid.UUID, phase, message string) {
	if s.websocketManager == nil {
		return
	}

	// Create standardized phase configuration required message
	payload := websocket.PhaseConfigurationRequiredPayload{
		CampaignID: campaignID.String(),
		Phase:      phase,
		Message:    message,
	}

	wsMessage := websocket.CreatePhaseConfigurationRequiredMessageV2(payload)
	s.websocketManager.BroadcastStandardizedMessage(campaignID.String(), wsMessage)
	log.Printf("Broadcast phase configuration required: campaign=%s, phase=%s, message=%s", campaignID, phase, message)
}

func (s *phaseExecutionService) broadcastPhaseTransition(campaignID uuid.UUID, fromPhase, toPhase, message string) {
	if s.websocketManager == nil {
		return
	}

	payload := websocket.PhaseTransitionPayload{
		CampaignID:         campaignID.String(),
		PreviousPhase:      fromPhase,
		NewPhase:           toPhase,
		NewStatus:          message,     // Re-using Message field for status
		TransitionType:     "automatic", // Hardcoded for now
		PrerequisitesMet:   true,        // Assuming prerequisites are met
		DataIntegrityCheck: true,        // Assuming data integrity is checked
		DomainsCount:       0,           // Not applicable here
		ProcessedCount:     0,           // Not applicable here
		SuccessfulCount:    0,           // Not applicable here
		FailedCount:        0,           // Not applicable here
	}

	wsMessage := websocket.CreatePhaseTransitionMessageV2(payload)
	s.websocketManager.BroadcastStandardizedMessage(campaignID.String(), wsMessage)
	log.Printf("Broadcasted phase transition: campaignID=%s, fromPhase=%s, toPhase=%s, message=%s", campaignID, fromPhase, toPhase, message)
}

// Helper functions

func stringPtr(s string) *string {
	return &s
}

func phaseTypePtr(p models.PhaseTypeEnum) *models.PhaseTypeEnum {
	return &p
}

func phaseStatusPtr(p models.PhaseStatusEnum) *models.PhaseStatusEnum {
	return &p
}

func float64Ptr(f float64) *float64 {
	return &f
}

func stringOrEmpty(s *models.PhaseTypeEnum) string {
	if s == nil {
		return ""
	}
	return string(*s)
}

// BulkDeleteCampaigns implements PhaseExecutionService.BulkDeleteCampaigns
func (s *phaseExecutionService) BulkDeleteCampaigns(ctx context.Context, campaignIDs []uuid.UUID) (*BulkDeleteResult, error) {
	// PHASE 3 ENHANCEMENT: Use bulk delete instead of N+1 pattern
	result := &BulkDeleteResult{
		SuccessfullyDeleted: 0,
		FailedDeletions:     0,
		DeletedCampaignIDs:  make([]uuid.UUID, 0),
		FailedCampaignIDs:   make([]uuid.UUID, 0),
		Errors:              make([]string, 0),
	}

	// Use bulk delete from Phase 1
	err := s.campaignStore.BulkDeleteCampaignsByIDs(ctx, s.db, campaignIDs)
	if err != nil {
		// If bulk delete fails, all campaigns failed
		result.FailedDeletions = len(campaignIDs)
		result.FailedCampaignIDs = campaignIDs
		result.Errors = []string{fmt.Sprintf("Bulk delete failed: %s", err.Error())}
		return result, fmt.Errorf("bulk delete completed with %d failures", result.FailedDeletions)
	}

	// If bulk delete succeeds, all campaigns were deleted
	result.SuccessfullyDeleted = len(campaignIDs)
	result.DeletedCampaignIDs = campaignIDs

	return result, nil
}

// StartCampaign implements PhaseExecutionService.StartCampaign
func (s *phaseExecutionService) StartCampaign(ctx context.Context, campaignID uuid.UUID) error {
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign: %w", err)
	}

	// Update campaign status to in progress
	err = s.UpdateCampaignStatus(ctx, campaignID, string(models.PhaseStatusInProgress))
	if err != nil {
		return fmt.Errorf("failed to update campaign status: %w", err)
	}

	// Start the appropriate phase based on current campaign state
	if campaign.CurrentPhase == nil {
		// Start with domain generation phase
		return s.StartPhase(ctx, campaignID, string(models.PhaseTypeDomainGeneration))
	} else {
		// Resume current phase
		return s.StartPhase(ctx, campaignID, string(*campaign.CurrentPhase))
	}
}

// PauseCampaign implements PhaseExecutionService.PauseCampaign
func (s *phaseExecutionService) PauseCampaign(ctx context.Context, campaignID uuid.UUID) error {
	err := s.UpdateCampaignStatus(ctx, campaignID, string(models.PhaseStatusPaused))
	if err != nil {
		return fmt.Errorf("failed to pause campaign: %w", err)
	}

	s.broadcastCampaignUpdate(campaignID, "campaign.paused", "Campaign paused by user")
	log.Printf("Campaign %s paused successfully", campaignID)
	return nil
}

// ResumeCampaign implements PhaseExecutionService.ResumeCampaign
func (s *phaseExecutionService) ResumeCampaign(ctx context.Context, campaignID uuid.UUID) error {
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign: %w", err)
	}

	// Resume the current phase
	err = s.UpdateCampaignStatus(ctx, campaignID, string(models.PhaseStatusInProgress))
	if err != nil {
		return fmt.Errorf("failed to resume campaign: %w", err)
	}

	s.broadcastCampaignUpdate(campaignID, "campaign.resumed", "Campaign resumed by user")
	log.Printf("Campaign %s resumed successfully", campaignID)

	// Optionally restart the current phase
	if campaign.CurrentPhase != nil {
		return s.StartPhase(ctx, campaignID, string(*campaign.CurrentPhase))
	}

	return nil
}

// CancelCampaign implements PhaseExecutionService.CancelCampaign
func (s *phaseExecutionService) CancelCampaign(ctx context.Context, campaignID uuid.UUID) error {
	err := s.UpdateCampaignStatus(ctx, campaignID, string(models.PhaseStatusFailed))
	if err != nil {
		return fmt.Errorf("failed to cancel campaign: %w", err)
	}

	s.broadcastCampaignUpdate(campaignID, "campaign.cancelled", "Campaign cancelled by user")
	log.Printf("Campaign %s cancelled successfully", campaignID)
	return nil
}

// UpdateCampaign implements PhaseExecutionService.UpdateCampaign
func (s *phaseExecutionService) UpdateCampaign(ctx context.Context, campaignID uuid.UUID, req UpdateCampaignRequest) (*models.LeadGenerationCampaign, error) {
	// Get existing campaign
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign for update: %w", err)
	}

	// Update campaign fields if provided
	if req.Name != nil && *req.Name != "" {
		campaign.Name = *req.Name
	}

	// Update campaign metadata with configuration changes
	if campaign.Metadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
			// Update domain generation config in metadata if provided
			if req.NumDomainsToGenerate != nil || req.VariableLength != nil || req.CharacterSet != nil {
				if domainConfig, exists := metadata["domain_generation_config"]; exists {
					if configMap, ok := domainConfig.(map[string]interface{}); ok {
						if req.NumDomainsToGenerate != nil {
							configMap["num_domains_to_generate"] = float64(*req.NumDomainsToGenerate)
						}
						if req.VariableLength != nil {
							configMap["variable_length"] = float64(*req.VariableLength)
						}
						if req.CharacterSet != nil {
							configMap["character_set"] = *req.CharacterSet
						}
						metadata["domain_generation_config"] = configMap
					}
				}

				// Marshal updated metadata
				if metadataBytes, err := json.Marshal(metadata); err == nil {
					metadataRaw := json.RawMessage(metadataBytes)
					campaign.Metadata = &metadataRaw
				}
			}
		}
	}

	// Set updated timestamp
	campaign.UpdatedAt = time.Now()

	// Save updated campaign
	err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return nil, fmt.Errorf("failed to update campaign: %w", err)
	}

	// Broadcast campaign update
	s.broadcastCampaignUpdate(campaignID, "campaign.updated", "Campaign updated successfully")

	log.Printf("Campaign %s updated successfully", campaignID)
	return campaign, nil
}

// GetCampaignDetails implements PhaseExecutionService.GetCampaignDetails
func (s *phaseExecutionService) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, interface{}, error) {
	// Get campaign
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Get campaign progress with detailed phase information
	progress, err := s.GetCampaignProgress(ctx, campaignID)
	if err != nil {
		log.Printf("Failed to get campaign progress for details: %v", err)
		// Continue without progress data rather than failing completely
	}

	// Get generated domains count
	domains, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, s.db, campaignID, 10, 0)
	if err != nil {
		log.Printf("Failed to get domains count for campaign details: %v", err)
	}

	// Build detailed response
	details := map[string]interface{}{
		"campaign":         campaign,
		"progress":         progress,
		"domainsGenerated": len(domains),
	}

	// Add configuration details from metadata
	if campaign.Metadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
			details["configuration"] = metadata
		}
	}

	// Add recent domains sample
	if len(domains) > 0 {
		details["recentDomains"] = domains
	}

	log.Printf("Retrieved detailed information for campaign %s", campaignID)
	return campaign, details, nil
}

// ListCampaignsWithFilters implements PhaseExecutionService.ListCampaignsWithFilters
func (s *phaseExecutionService) ListCampaignsWithFilters(ctx context.Context, filters map[string]interface{}) ([]*models.LeadGenerationCampaign, error) {
	// TODO: Implement filtered campaign listing
	return nil, fmt.Errorf("ListCampaignsWithFilters not yet implemented")
}

// ConfigureDNSValidationPhase implements PhaseExecutionService.ConfigureDNSValidationPhase
func (s *phaseExecutionService) ConfigureDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.DNSPhaseConfigRequest) (*models.LeadGenerationCampaign, error) {
	// TODO: Implement direct DNS validation configuration
	return nil, fmt.Errorf("ConfigureDNSValidationPhase not yet implemented")
}

// ConfigureHTTPValidationPhase implements PhaseExecutionService.ConfigureHTTPValidationPhase
func (s *phaseExecutionService) ConfigureHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.HTTPPhaseConfigRequest) (*models.LeadGenerationCampaign, error) {
	// TODO: Implement direct HTTP validation configuration
	return nil, fmt.Errorf("ConfigureHTTPValidationPhase not yet implemented")
}

// RestartDNSValidationPhase implements PhaseExecutionService.RestartDNSValidationPhase
func (s *phaseExecutionService) RestartDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req *DNSValidationRequest) (*models.LeadGenerationCampaign, error) {
	// TODO: Implement DNS validation phase restart
	return nil, fmt.Errorf("RestartDNSValidationPhase not yet implemented")
}

// RestartHTTPValidationPhase implements PhaseExecutionService.RestartHTTPValidationPhase
func (s *phaseExecutionService) RestartHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req *HTTPKeywordValidationRequest) (*models.LeadGenerationCampaign, error) {
	// TODO: Implement HTTP validation phase restart
	return nil, fmt.Errorf("RestartHTTPValidationPhase not yet implemented")
}

// HandleCampaignCompletion implements PhaseExecutionService.HandleCampaignCompletion
func (s *phaseExecutionService) HandleCampaignCompletion(ctx context.Context, campaignID uuid.UUID) error {
	// TODO: Implement campaign completion handling
	return fmt.Errorf("HandleCampaignCompletion not yet implemented")
}

// GetCampaignDependencies implements PhaseExecutionService.GetCampaignDependencies
func (s *phaseExecutionService) GetCampaignDependencies(ctx context.Context, campaignID uuid.UUID) (*CampaignDependencyInfo, error) {
	// TODO: Implement campaign dependency analysis
	return nil, fmt.Errorf("GetCampaignDependencies not yet implemented")
}

// GetCampaignStatus implements PhaseExecutionService.GetCampaignStatus
func (s *phaseExecutionService) GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (models.PhaseStatusEnum, *float64, error) {
	// TODO: Implement campaign status retrieval - for now return basic status
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return "", nil, fmt.Errorf("failed to get campaign status: %w", err)
	}

	// Convert campaign status to phase status enum
	var phaseStatus models.PhaseStatusEnum = "unknown"
	// TODO: Fix campaign status field mapping after Campaign model verification
	// if campaign.Status != nil {
	//	phaseStatus = models.PhaseStatusEnum(*campaign.Status)
	// }

	// Calculate overall progress (placeholder logic)
	var progress *float64
	if campaign.OverallProgress != nil {
		progress = campaign.OverallProgress
	}

	return phaseStatus, progress, nil
}

// GetDNSValidationResultsForCampaign implements PhaseExecutionService.GetDNSValidationResultsForCampaign
func (s *phaseExecutionService) GetDNSValidationResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*DNSValidationResultsResponse, error) {
	// TODO: Implement DNS validation results retrieval
	return &DNSValidationResultsResponse{
		Data:       make([]models.DNSValidationResult, 0),
		NextCursor: "",
		TotalCount: 0,
	}, nil
}

// GetHTTPKeywordResultsForCampaign implements PhaseExecutionService.GetHTTPKeywordResultsForCampaign
func (s *phaseExecutionService) GetHTTPKeywordResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*HTTPKeywordResultsResponse, error) {
	// TODO: Implement HTTP keyword results retrieval
	return &HTTPKeywordResultsResponse{
		Data:       make([]models.HTTPKeywordResult, 0),
		NextCursor: "",
		TotalCount: 0,
	}, nil
}

// GetGeneratedDomainsForCampaign implements PhaseExecutionService.GetGeneratedDomainsForCampaign
func (s *phaseExecutionService) GetGeneratedDomainsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor int64) (*GeneratedDomainsResponse, error) {
	// Get generated domains from the database with pagination
	domains, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, s.db, campaignID, limit, cursor)
	if err != nil {
		return nil, fmt.Errorf("failed to get generated domains: %w", err)
	}

	// Get total count (for a more accurate total, you might want a separate count query)
	totalDomains, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, s.db, campaignID, 10000, 0)
	if err != nil {
		log.Printf("Failed to get total domains count: %v", err)
	}
	totalCount := int64(len(totalDomains))

	// Calculate next cursor
	var nextCursor int64 = 0
	if len(domains) == limit && len(domains) > 0 {
		// Use the ID of the last domain as the next cursor
		nextCursor = cursor + int64(limit)
	}

	// Convert from []*models.GeneratedDomain to []models.GeneratedDomain
	domainValues := make([]models.GeneratedDomain, len(domains))
	for i, domain := range domains {
		if domain != nil {
			domainValues[i] = *domain
		}
	}

	response := &GeneratedDomainsResponse{
		Data:       domainValues,
		NextCursor: nextCursor,
		TotalCount: totalCount,
	}

	log.Printf("Retrieved %d generated domains for campaign %s (total: %d)", len(domains), campaignID, totalCount)
	return response, nil
}

// SetCampaignErrorStatus implements PhaseExecutionService.SetCampaignErrorStatus
func (s *phaseExecutionService) SetCampaignErrorStatus(ctx context.Context, campaignID uuid.UUID, errorMessage string) error {
	// Update campaign status to failed
	err := s.UpdateCampaignStatus(ctx, campaignID, string(models.PhaseStatusFailed))
	if err != nil {
		return fmt.Errorf("failed to set campaign error status: %w", err)
	}

	// Get campaign to update with error message
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for error status update: %w", err)
	}

	// Update campaign metadata with error information
	var metadata map[string]interface{}
	if campaign.Metadata != nil {
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err != nil {
			metadata = make(map[string]interface{})
		}
	} else {
		metadata = make(map[string]interface{})
	}

	// Add error information
	metadata["error"] = map[string]interface{}{
		"message":   errorMessage,
		"timestamp": time.Now().Format(time.RFC3339),
		"status":    "failed",
	}

	// Marshal updated metadata
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal error metadata: %w", err)
	}
	metadataRaw := json.RawMessage(metadataBytes)
	campaign.Metadata = &metadataRaw
	campaign.UpdatedAt = time.Now()

	// Save updated campaign
	err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return fmt.Errorf("failed to update campaign with error status: %w", err)
	}

	// Broadcast error status
	s.broadcastCampaignUpdate(campaignID, "campaign.error", errorMessage)

	log.Printf("Set error status for campaign %s: %s", campaignID, errorMessage)
	return nil
}

// SetCampaignStatus implements PhaseExecutionService.SetCampaignStatus
func (s *phaseExecutionService) SetCampaignStatus(ctx context.Context, campaignID uuid.UUID, status models.PhaseStatusEnum) error {
	err := s.UpdateCampaignStatus(ctx, campaignID, string(status))
	if err != nil {
		return fmt.Errorf("failed to set campaign status: %w", err)
	}

	log.Printf("Set status for campaign %s to %s", campaignID, status)
	return nil
}
