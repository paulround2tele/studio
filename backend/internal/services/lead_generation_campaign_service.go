// File: backend/internal/services/lead_generation_campaign_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// leadGenerationCampaignService implements LeadGenerationCampaignService interface
// This service focuses ONLY on campaign lifecycle management and phase coordination
type leadGenerationCampaignService struct {
	db                      *sqlx.DB
	store                   store.CampaignStore
	domainGenerationService DomainGenerationService
	dnsValidationService    DNSCampaignService
	httpValidationService   HTTPKeywordCampaignService
	websocketManager        websocket.Broadcaster
}

// NewLeadGenerationCampaignService creates a new Lead Generation Campaign Service
// This service coordinates standalone services but does NOT implement phase logic
func NewLeadGenerationCampaignService(
	db *sqlx.DB,
	store store.CampaignStore,
	domainGenerationService DomainGenerationService,
	dnsValidationService DNSCampaignService,
	httpValidationService HTTPKeywordCampaignService,
	websocketManager websocket.Broadcaster,
) LeadGenerationCampaignService {
	return &leadGenerationCampaignService{
		db:                      db,
		store:                   store,
		domainGenerationService: domainGenerationService,
		dnsValidationService:    dnsValidationService,
		httpValidationService:   httpValidationService,
		websocketManager:        websocketManager,
	}
}

// CreateCampaign creates a new lead generation campaign with Phase 1 initialized
func (s *leadGenerationCampaignService) CreateCampaign(ctx context.Context, req CreateLeadGenerationCampaignRequest) (*models.LeadGenerationCampaign, error) {
	// Create campaign record with Phase 1 setup
	campaignID := uuid.New()
	now := time.Now()

	// Set default batch size if not provided
	batchSize := req.DomainConfig.BatchSize
	if batchSize <= 0 {
		batchSize = 100 // Default batch size for domain generation
	}

	// Store domain generation configuration in campaign metadata for modern architecture
	metadata := map[string]interface{}{
		"domain_generation_config": map[string]interface{}{
			"pattern_type":            req.DomainConfig.PatternType,
			"variable_length":         req.DomainConfig.VariableLength,
			"character_set":           req.DomainConfig.CharacterSet,
			"constant_string":         req.DomainConfig.ConstantString,
			"tld":                     req.DomainConfig.TLD,
			"num_domains_to_generate": req.DomainConfig.NumDomainsToGenerate,
			"batch_size":              batchSize,
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
	err = s.store.CreateCampaign(ctx, s.db, campaign)
	if err != nil {
		return nil, fmt.Errorf("failed to create campaign: %w", err)
	}

	// Initialize Phase 1 (Domain Generation) - coordinate with standalone service
	err = s.InitializePhase1(ctx, campaignID)
	if err != nil {
		// Cleanup campaign if Phase 1 initialization fails
		s.store.DeleteCampaign(ctx, s.db, campaignID)
		return nil, fmt.Errorf("failed to initialize Phase 1: %w", err)
	}

	// Send campaign creation notification via WebSocket
	s.broadcastCampaignUpdate(campaignID, "campaign.created", "Campaign created with Phase 1 initialized")

	return campaign, nil
}

// GetCampaign retrieves a campaign by ID
func (s *leadGenerationCampaignService) GetCampaign(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, error) {
	campaign, err := s.store.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}
	return campaign, nil
}

// UpdateCampaignStatus updates the campaign status
func (s *leadGenerationCampaignService) UpdateCampaignStatus(ctx context.Context, campaignID uuid.UUID, status string) error {
	// Convert string status to enum
	phaseStatus := models.CampaignPhaseStatusEnum(status)

	err := s.store.UpdateCampaignStatus(ctx, s.db, campaignID, phaseStatus, sql.NullString{})
	if err != nil {
		return fmt.Errorf("failed to update campaign status: %w", err)
	}

	// Broadcast status update
	s.broadcastCampaignUpdate(campaignID, "campaign.status.updated", fmt.Sprintf("Status updated to %s", status))

	return nil
}

// InitializePhase1 initializes Phase 1 (Domain Generation) using standalone service with real configuration
func (s *leadGenerationCampaignService) InitializePhase1(ctx context.Context, campaignID uuid.UUID) error {
	// Get campaign details to extract real configuration
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for Phase 1 initialization: %w", err)
	}

	// Extract domain generation configuration from campaign metadata or parameters
	var domainConfig DomainGenerationConfig

	// Try to extract from campaign metadata first
	if campaign.Metadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
			if configData, exists := metadata["domain_generation_config"]; exists {
				if configMap, ok := configData.(map[string]interface{}); ok {
					domainConfig = extractDomainConfigFromMetadata(configMap)
				}
			}
		}
	}

	// If no configuration in metadata, this indicates a data integrity issue
	if domainConfig.PatternType == "" {
		return fmt.Errorf("no domain generation configuration found in campaign metadata for campaign %s - this should not happen with modern campaigns", campaignID)
	}

	// Validate the extracted configuration
	if err := s.domainGenerationService.ValidateGenerationConfig(ctx, domainConfig); err != nil {
		return fmt.Errorf("invalid domain generation configuration: %w", err)
	}

	// Create real generation request with extracted configuration
	generateRequest := GenerateDomainsRequest{
		CampaignID: campaignID,
		Config:     domainConfig,
	}

	log.Printf("InitializePhase1: Starting domain generation for campaign %s with config: %+v", campaignID, domainConfig)

	// Call standalone domain generation service with real configuration
	err = s.domainGenerationService.GenerateDomains(ctx, generateRequest)
	if err != nil {
		return fmt.Errorf("failed to initialize domain generation with real config: %w", err)
	}

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

// Helper function to extract domain config from metadata
func extractDomainConfigFromMetadata(configMap map[string]interface{}) DomainGenerationConfig {
	config := DomainGenerationConfig{}

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
	if tld, ok := configMap["tld"].(string); ok {
		config.TLD = tld
	}
	if numDomains, ok := configMap["num_domains_to_generate"].(float64); ok {
		config.NumDomainsToGenerate = int64(numDomains)
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
func (s *leadGenerationCampaignService) ConfigurePhase(ctx context.Context, campaignID uuid.UUID, phaseType string, config interface{}) error {
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

	err = s.store.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return fmt.Errorf("failed to update campaign metadata with phase configuration: %w", err)
	}

	// Broadcast phase state change using User-Driven Phase Lifecycle messages
	s.broadcastPhaseStateChanged(campaignID, phaseType, "ready", "configured")

	log.Printf("ConfigurePhase: Successfully configured phase %s for campaign %s", phaseType, campaignID)
	return nil
}

// StartPhase coordinates starting a specific phase using appropriate standalone service
func (s *leadGenerationCampaignService) StartPhase(ctx context.Context, campaignID uuid.UUID, phaseType string) error {
	// Validate phase readiness before starting
	if err := s.validatePhaseReadiness(ctx, campaignID, phaseType); err != nil {
		return fmt.Errorf("phase readiness validation failed: %w", err)
	}

	switch phaseType {
	case string(models.PhaseTypeDomainGeneration):
		// Domain generation is handled by standalone service
		return s.startDomainGenerationPhase(ctx, campaignID)

	case string(models.PhaseTypeDNSValidation):
		// DNS validation is handled by existing DNS service
		return s.startDNSValidationPhase(ctx, campaignID)

	case string(models.PhaseTypeHTTPKeywordValidation):
		// HTTP validation is handled by existing HTTP service
		return s.startHTTPValidationPhase(ctx, campaignID)

	case string(models.PhaseTypeAnalysis):
		// Analysis phase would be handled by future analysis service
		return s.startAnalysisPhase(ctx, campaignID)

	default:
		return fmt.Errorf("unknown phase type: %s", phaseType)
	}
}

// TransitionToNextPhase manages transitions between phases
func (s *leadGenerationCampaignService) TransitionToNextPhase(ctx context.Context, campaignID uuid.UUID) error {
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

	err = s.store.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return fmt.Errorf("failed to update campaign for phase transition: %w", err)
	}

	// Broadcast phase transition
	s.broadcastPhaseTransition(campaignID, string(currentPhase), string(nextPhase), "Phase transition completed")

	return nil
}

// GetCampaignProgress retrieves overall campaign progress by aggregating from real phase services
func (s *leadGenerationCampaignService) GetCampaignProgress(ctx context.Context, campaignID uuid.UUID) (*LeadGenerationProgress, error) {
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
	if domainProgress, err := s.domainGenerationService.GetGenerationProgress(ctx, campaignID); err == nil {
		// Convert to standardized PhaseProgress format
		phaseProgress[domainPhaseKey] = PhaseProgress{
			Status:          domainProgress.Status,
			ProgressPercent: domainProgress.Progress,
			ProcessedItems:  int64(domainProgress.DomainsGenerated),
			TotalItems:      int64(domainProgress.TotalDomains),
			StartedAt:       &domainProgress.StartedAt,
			EstimatedEnd:    &domainProgress.EstimatedEnd,
		}

		// Add to overall progress calculation
		totalPhaseProgress += domainProgress.Progress
		if domainProgress.Status == "completed" {
			completedPhases++
		}

		log.Printf("GetCampaignProgress: Domain generation phase - Status: %s, Progress: %.2f%%, Domains: %d/%d",
			domainProgress.Status, domainProgress.Progress, domainProgress.DomainsGenerated, domainProgress.TotalDomains)
	} else {
		log.Printf("GetCampaignProgress: Failed to get domain generation progress: %v", err)
		// Add placeholder phase if service call fails
		phaseProgress[domainPhaseKey] = PhaseProgress{
			Status:          "unknown",
			ProgressPercent: 0.0,
			ProcessedItems:  0,
			TotalItems:      0,
		}
	}

	// Get REAL DNS validation progress if campaign has reached that phase
	dnsPhaseKey := string(models.PhaseTypeDNSValidation)
	if campaign.CurrentPhase != nil && (*campaign.CurrentPhase == models.PhaseTypeDNSValidation || completedPhases >= 1) {
		// Try to get DNS campaign details and progress
		if dnsDetails, _, err := s.dnsValidationService.GetCampaignDetails(ctx, campaignID); err == nil {
			dnsStatus := "pending"
			dnsProgress := 0.0
			var dnsProcessed, dnsTotal int64 = 0, 0
			var dnsStarted, dnsCompleted *time.Time

			if dnsDetails.PhaseStatus != nil {
				switch *dnsDetails.PhaseStatus {
				case models.PhaseStatusNotStarted:
					dnsStatus = "pending"
				case models.PhaseStatusInProgress:
					dnsStatus = "running"
				case models.PhaseStatusCompleted:
					dnsStatus = "completed"
					dnsProgress = 100.0
					completedPhases++
				case models.PhaseStatusFailed:
					dnsStatus = "failed"
				case models.PhaseStatusPaused:
					dnsStatus = "paused"
				}
			}

			if dnsDetails.ProcessedItems != nil {
				dnsProcessed = *dnsDetails.ProcessedItems
			}
			if dnsDetails.TotalItems != nil {
				dnsTotal = *dnsDetails.TotalItems
			}
			if dnsDetails.ProgressPercentage != nil {
				dnsProgress = *dnsDetails.ProgressPercentage
			}
			if dnsDetails.StartedAt != nil {
				dnsStarted = dnsDetails.StartedAt
			}
			if dnsDetails.CompletedAt != nil {
				dnsCompleted = dnsDetails.CompletedAt
			}

			phaseProgress[dnsPhaseKey] = PhaseProgress{
				Status:          dnsStatus,
				ProgressPercent: dnsProgress,
				ProcessedItems:  dnsProcessed,
				TotalItems:      dnsTotal,
				StartedAt:       dnsStarted,
				CompletedAt:     dnsCompleted,
			}

			totalPhaseProgress += dnsProgress
			log.Printf("GetCampaignProgress: DNS validation phase - Status: %s, Progress: %.2f%%", dnsStatus, dnsProgress)
		} else {
			// DNS phase not started yet
			phaseProgress[dnsPhaseKey] = PhaseProgress{
				Status:          "pending",
				ProgressPercent: 0.0,
			}
		}
	}

	// Get REAL HTTP validation progress if campaign has reached that phase
	httpPhaseKey := string(models.PhaseTypeHTTPKeywordValidation)
	if campaign.CurrentPhase != nil && (*campaign.CurrentPhase == models.PhaseTypeHTTPKeywordValidation || completedPhases >= 2) {
		// Try to get HTTP campaign details and progress
		if httpDetails, _, err := s.httpValidationService.GetCampaignDetails(ctx, campaignID); err == nil {
			httpStatus := "pending"
			httpProgress := 0.0
			var httpProcessed, httpTotal int64 = 0, 0
			var httpStarted, httpCompleted *time.Time

			if httpDetails.PhaseStatus != nil {
				switch *httpDetails.PhaseStatus {
				case models.PhaseStatusNotStarted:
					httpStatus = "pending"
				case models.PhaseStatusInProgress:
					httpStatus = "running"
				case models.PhaseStatusCompleted:
					httpStatus = "completed"
					httpProgress = 100.0
					completedPhases++
				case models.PhaseStatusFailed:
					httpStatus = "failed"
				case models.PhaseStatusPaused:
					httpStatus = "paused"
				}
			}

			if httpDetails.ProcessedItems != nil {
				httpProcessed = *httpDetails.ProcessedItems
			}
			if httpDetails.TotalItems != nil {
				httpTotal = *httpDetails.TotalItems
			}
			if httpDetails.ProgressPercentage != nil {
				httpProgress = *httpDetails.ProgressPercentage
			}
			if httpDetails.StartedAt != nil {
				httpStarted = httpDetails.StartedAt
			}
			if httpDetails.CompletedAt != nil {
				httpCompleted = httpDetails.CompletedAt
			}

			phaseProgress[httpPhaseKey] = PhaseProgress{
				Status:          httpStatus,
				ProgressPercent: httpProgress,
				ProcessedItems:  httpProcessed,
				TotalItems:      httpTotal,
				StartedAt:       httpStarted,
				CompletedAt:     httpCompleted,
			}

			totalPhaseProgress += httpProgress
			log.Printf("GetCampaignProgress: HTTP validation phase - Status: %s, Progress: %.2f%%", httpStatus, httpProgress)
		} else {
			// HTTP phase not started yet
			phaseProgress[httpPhaseKey] = PhaseProgress{
				Status:          "pending",
				ProgressPercent: 0.0,
			}
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
		if updateErr := s.store.UpdateCampaign(ctx, s.db, campaign); updateErr != nil {
			log.Printf("Failed to update campaign completed phases: %v", updateErr)
		}
	}

	progress := &LeadGenerationProgress{
		CampaignID:      campaignID,
		CurrentPhase:    stringOrEmpty(campaign.CurrentPhase),
		PhaseProgress:   phaseProgress,
		OverallProgress: overallProgress,
	}

	log.Printf("GetCampaignProgress: Campaign %s - Overall: %.2f%%, Completed phases: %d/%d",
		campaignID, overallProgress, completedPhases, campaign.TotalPhases)

	return progress, nil
}

// ListCampaigns retrieves campaigns for a user
func (s *leadGenerationCampaignService) ListCampaigns(ctx context.Context, userID uuid.UUID) ([]*models.LeadGenerationCampaign, error) {
	filter := store.ListCampaignsFilter{
		UserID: userID.String(),
		Limit:  100, // Default limit
		Offset: 0,
	}

	campaigns, err := s.store.ListCampaigns(ctx, s.db, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaigns: %w", err)
	}

	return campaigns, nil
}

// DeleteCampaign deletes a campaign and coordinates cleanup with phase services
func (s *leadGenerationCampaignService) DeleteCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// Coordinate cleanup with phase services if needed
	// For now, rely on database cascading deletes

	err := s.store.DeleteCampaign(ctx, s.db, campaignID)
	if err != nil {
		return fmt.Errorf("failed to delete campaign: %w", err)
	}

	// Broadcast campaign deletion
	s.broadcastCampaignUpdate(campaignID, "campaign.deleted", "Campaign deleted")

	return nil
}

// Phase validation and coordination helper methods

// validatePhaseReadiness ensures a phase can be started based on campaign state and prerequisites
func (s *leadGenerationCampaignService) validatePhaseReadiness(ctx context.Context, campaignID uuid.UUID, phaseType string) error {
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
func (s *leadGenerationCampaignService) validatePhaseTransitionOrder(campaign *models.Campaign, targetPhase models.PhaseTypeEnum) error {
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
func (s *leadGenerationCampaignService) validatePhaseConfiguration(campaign *models.Campaign, targetPhase models.PhaseTypeEnum) error {
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
func (s *leadGenerationCampaignService) isPhaseCompleted(campaign *models.Campaign, phase models.PhaseTypeEnum) bool {
	// Check phase status in campaign metadata or use service-specific checks
	switch phase {
	case models.PhaseTypeDomainGeneration:
		// Check with domain generation service
		if progress, err := s.domainGenerationService.GetGenerationProgress(context.Background(), campaign.ID); err == nil {
			return progress.Status == "completed"
		}
		return false

	case models.PhaseTypeDNSValidation:
		// Check with DNS validation service
		if details, _, err := s.dnsValidationService.GetCampaignDetails(context.Background(), campaign.ID); err == nil {
			return details.PhaseStatus != nil && *details.PhaseStatus == models.PhaseStatusCompleted
		}
		return false

	case models.PhaseTypeHTTPKeywordValidation:
		// Check with HTTP validation service (would need to implement this check)
		// For now, return false as a safe default
		return false

	case models.PhaseTypeAnalysis:
		// Analysis is the final phase
		return false

	default:
		return false
	}
}

func (s *leadGenerationCampaignService) startDomainGenerationPhase(ctx context.Context, campaignID uuid.UUID) error {
	// Coordinate with domain generation service to resume/start generation
	err := s.domainGenerationService.ResumeGeneration(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to start domain generation phase: %w", err)
	}

	s.broadcastCampaignUpdate(campaignID, "phase.started", "Domain generation phase started")
	return nil
}

func (s *leadGenerationCampaignService) startDNSValidationPhase(ctx context.Context, campaignID uuid.UUID) error {
	// Get campaign and extract DNS configuration from metadata
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for DNS validation phase: %w", err)
	}

	// Extract DNS validation configuration from metadata
	if campaign.Metadata == nil {
		return fmt.Errorf("DNS validation phase requires configuration but campaign metadata is missing")
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal(*campaign.Metadata, &metadata); err != nil {
		return fmt.Errorf("failed to unmarshal campaign metadata: %w", err)
	}

	dnsConfigRaw, exists := metadata["dns_validation_config"]
	if !exists {
		return fmt.Errorf("DNS validation configuration not found in campaign metadata")
	}

	// Convert to DNS validation config struct
	dnsConfigBytes, err := json.Marshal(dnsConfigRaw)
	if err != nil {
		return fmt.Errorf("failed to marshal DNS config: %w", err)
	}

	// Use the correct DNSValidationConfig type from api package
	type DNSValidationConfig struct {
		PersonaIDs               []string `json:"personaIds"`
		RotationIntervalSeconds  int      `json:"rotationIntervalSeconds,omitempty"`
		ProcessingSpeedPerMinute int      `json:"processingSpeedPerMinute,omitempty"`
		BatchSize                int      `json:"batchSize,omitempty"`
		RetryAttempts            int      `json:"retryAttempts,omitempty"`
	}

	var dnsConfig DNSValidationConfig
	if err := json.Unmarshal(dnsConfigBytes, &dnsConfig); err != nil {
		return fmt.Errorf("failed to unmarshal DNS validation config: %w", err)
	}

	// Create DNS validation campaign request using the stored configuration
	dnsRequest := models.DNSPhaseConfigRequest{
		PersonaIDs: dnsConfig.PersonaIDs,
		Name:       nil, // Will use campaign name if needed
	}

	// Configure DNS validation phase using the existing DNS service
	err = s.dnsValidationService.ConfigureDNSValidationPhase(ctx, campaignID, dnsRequest)
	if err != nil {
		return fmt.Errorf("failed to configure DNS validation phase: %w", err)
	}

	log.Printf("startDNSValidationPhase: Started DNS validation for campaign %s with personas %v",
		campaignID, dnsConfig.PersonaIDs)

	s.broadcastCampaignUpdate(campaignID, "phase.started",
		fmt.Sprintf("DNS validation phase started with %d personas", len(dnsConfig.PersonaIDs)))

	return nil
}

func (s *leadGenerationCampaignService) startHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID) error {
	// Get campaign and extract HTTP configuration from metadata
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for HTTP validation phase: %w", err)
	}

	// Extract HTTP validation configuration from metadata
	if campaign.Metadata == nil {
		return fmt.Errorf("HTTP validation phase requires configuration but campaign metadata is missing")
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal(*campaign.Metadata, &metadata); err != nil {
		return fmt.Errorf("failed to unmarshal campaign metadata: %w", err)
	}

	httpConfigRaw, exists := metadata["http_validation_config"]
	if !exists {
		return fmt.Errorf("HTTP validation configuration not found in campaign metadata")
	}

	// Convert to HTTP validation config struct
	httpConfigBytes, err := json.Marshal(httpConfigRaw)
	if err != nil {
		return fmt.Errorf("failed to marshal HTTP config: %w", err)
	}

	// Use the correct HTTPValidationConfig type
	type HTTPValidationConfig struct {
		PersonaIDs               []string `json:"personaIds"`
		KeywordSetIDs            []string `json:"keywordSetIds,omitempty"`
		AdHocKeywords            []string `json:"adHocKeywords,omitempty"`
		ProxyIDs                 []string `json:"proxyIds,omitempty"`
		ProxyPoolID              string   `json:"proxyPoolId,omitempty"`
		ProxySelectionStrategy   string   `json:"proxySelectionStrategy,omitempty"`
		TargetHTTPPorts          []int    `json:"targetHttpPorts,omitempty"`
		RotationIntervalSeconds  int      `json:"rotationIntervalSeconds,omitempty"`
		ProcessingSpeedPerMinute int      `json:"processingSpeedPerMinute,omitempty"`
		BatchSize                int      `json:"batchSize,omitempty"`
		RetryAttempts            int      `json:"retryAttempts,omitempty"`
	}

	var httpConfig HTTPValidationConfig
	if err := json.Unmarshal(httpConfigBytes, &httpConfig); err != nil {
		return fmt.Errorf("failed to unmarshal HTTP validation config: %w", err)
	}

	// Create HTTP validation campaign request using the stored configuration
	httpRequest := models.HTTPPhaseConfigRequest{
		PersonaIDs:    httpConfig.PersonaIDs,
		Keywords:      httpConfig.KeywordSetIDs, // Note: This maps to Keywords field
		AdHocKeywords: httpConfig.AdHocKeywords,
		Name:          nil, // Will use campaign name if needed
	}

	// Configure HTTP validation phase using the existing HTTP service
	err = s.httpValidationService.ConfigureHTTPValidationPhase(ctx, campaignID, httpRequest)
	if err != nil {
		return fmt.Errorf("failed to configure HTTP validation phase: %w", err)
	}

	log.Printf("startHTTPValidationPhase: Started HTTP validation for campaign %s with personas %v and keywords %v",
		campaignID, httpConfig.PersonaIDs, httpConfig.AdHocKeywords)

	s.broadcastCampaignUpdate(campaignID, "phase.started",
		fmt.Sprintf("HTTP validation phase started with %d personas and %d keywords",
			len(httpConfig.PersonaIDs), len(httpConfig.AdHocKeywords)+len(httpConfig.KeywordSetIDs)))

	return nil
}

func (s *leadGenerationCampaignService) startAnalysisPhase(ctx context.Context, campaignID uuid.UUID) error {
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
	// For now, we'll just log the configuration and mark phase as started

	s.broadcastCampaignUpdate(campaignID, "phase.started",
		fmt.Sprintf("Analysis phase started with %s analysis type", analysisConfig.AnalysisType))

	return nil
}

func (s *leadGenerationCampaignService) completeCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// Mark campaign as completed
	now := time.Now()
	campaign, err := s.GetCampaign(ctx, campaignID)
	if err != nil {
		return err
	}

	campaign.CompletedAt = &now
	campaign.OverallProgress = float64Ptr(100.0)
	campaign.UpdatedAt = now

	err = s.store.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		return fmt.Errorf("failed to complete campaign: %w", err)
	}

	s.broadcastCampaignUpdate(campaignID, "campaign.completed", "Campaign completed successfully")
	return nil
}

// WebSocket coordination methods

func (s *leadGenerationCampaignService) broadcastCampaignUpdate(campaignID uuid.UUID, eventType, message string) {
	if s.websocketManager == nil {
		return
	}

	wsMessage := websocket.WebSocketMessage{
		ID:             uuid.New().String(),
		Timestamp:      time.Now().Format(time.RFC3339),
		Type:           eventType,
		SequenceNumber: time.Now().UnixNano(),
		Message:        message,
		CampaignID:     campaignID.String(),
	}

	s.websocketManager.BroadcastToCampaign(campaignID.String(), wsMessage)
}

// broadcastPhaseStateChanged broadcasts User-Driven Phase Lifecycle state changes
func (s *leadGenerationCampaignService) broadcastPhaseStateChanged(campaignID uuid.UUID, phase, oldState, newState string) {
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

	// Convert to the legacy WebSocketMessage format for broadcasting
	wsMessage := websocket.WebSocketMessage{
		ID:             uuid.New().String(),
		Timestamp:      time.Now().Format(time.RFC3339),
		Type:           "phase.state.changed",
		SequenceNumber: time.Now().UnixNano(),
		Message:        fmt.Sprintf("Phase %s changed from %s to %s", phase, oldState, newState),
		CampaignID:     campaignID.String(),
		Data:           payload,
	}

	s.websocketManager.BroadcastToCampaign(campaignID.String(), wsMessage)
	log.Printf("Broadcast phase state change: campaign=%s, phase=%s, %s->%s", campaignID, phase, oldState, newState)
}

// broadcastPhaseConfigurationRequired broadcasts when a phase needs configuration
func (s *leadGenerationCampaignService) broadcastPhaseConfigurationRequired(campaignID uuid.UUID, phase, message string) {
	if s.websocketManager == nil {
		return
	}

	// Create standardized phase configuration required message
	payload := websocket.PhaseConfigurationRequiredPayload{
		CampaignID: campaignID.String(),
		Phase:      phase,
		Message:    message,
	}

	// Convert to the legacy WebSocketMessage format for broadcasting
	wsMessage := websocket.WebSocketMessage{
		ID:             uuid.New().String(),
		Timestamp:      time.Now().Format(time.RFC3339),
		Type:           "phase.configuration.required",
		SequenceNumber: time.Now().UnixNano(),
		Message:        message,
		CampaignID:     campaignID.String(),
		Data:           payload,
	}

	s.websocketManager.BroadcastToCampaign(campaignID.String(), wsMessage)
	log.Printf("Broadcast phase configuration required: campaign=%s, phase=%s, message=%s", campaignID, phase, message)
}

func (s *leadGenerationCampaignService) broadcastPhaseTransition(campaignID uuid.UUID, fromPhase, toPhase, message string) {
	if s.websocketManager == nil {
		return
	}

	wsMessage := websocket.WebSocketMessage{
		ID:             uuid.New().String(),
		Timestamp:      time.Now().Format(time.RFC3339),
		Type:           "campaign.phase.transition",
		SequenceNumber: time.Now().UnixNano(),
		Message:        message,
		CampaignID:     campaignID.String(),
		Phase:          toPhase,
		Data: map[string]interface{}{
			"previousPhase":  fromPhase,
			"newPhase":       toPhase,
			"transitionType": "automatic",
			"triggerReason":  message,
		},
	}

	s.websocketManager.BroadcastToCampaign(campaignID.String(), wsMessage)
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
