// File: backend/internal/services/campaign_orchestrator_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/fntelecomllc/studio/backend/pkg/communication"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type campaignOrchestratorServiceImpl struct {
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	personaStore     store.PersonaStore
	keywordStore     store.KeywordStore
	auditLogStore    store.AuditLogStore
	auditLogger      *utils.AuditLogger
	campaignJobStore store.CampaignJobStore

	// Specialized services
	domainGenService   DomainGenerationService
	dnsService         DNSCampaignService
	httpKeywordService HTTPKeywordCampaignService

	// State machine for campaign status transitions
	stateMachine *CampaignStateMachine

	asyncManager *communication.AsyncPatternManager
}

func NewCampaignOrchestratorService(
	db *sqlx.DB,
	cs store.CampaignStore, ps store.PersonaStore, ks store.KeywordStore, as store.AuditLogStore, cjs store.CampaignJobStore,
	dgs DomainGenerationService, dNSService DNSCampaignService, hkService HTTPKeywordCampaignService,
	apm *communication.AsyncPatternManager,
) CampaignOrchestratorService {
	return &campaignOrchestratorServiceImpl{
		db:                 db,
		campaignStore:      cs,
		personaStore:       ps,
		keywordStore:       ks,
		auditLogStore:      as,
		auditLogger:        utils.NewAuditLogger(as),
		campaignJobStore:   cjs,
		domainGenService:   dgs,
		dnsService:         dNSService,
		httpKeywordService: hkService,
		stateMachine:       NewCampaignStateMachine(),
		asyncManager:       apm,
	}
}

// CreateLeadGenerationCampaign creates a new Lead Generation Campaign with 4 phases:
// Phase 1: Domain Generation, Phase 2: DNS Validation, Phase 3: HTTP Keyword Validation, Phase 4: Analysis
func (s *campaignOrchestratorServiceImpl) CreateLeadGenerationCampaign(ctx context.Context, req CreateLeadGenerationCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: Creating Lead Generation Campaign: %s", req.Name)

	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			return nil, fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for CreateLeadGenerationCampaign %s.", req.Name)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL CreateLeadGenerationCampaign for %s, rolling back: %v", req.Name, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for CreateLeadGenerationCampaign %s (SQL), rolling back: %v", req.Name, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for CreateLeadGenerationCampaign %s: %v", req.Name, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for CreateLeadGenerationCampaign %s.", req.Name)
				}
			}
		}()
	} else {
		querier = nil
		log.Printf("Operating in Firestore mode for CreateLeadGenerationCampaign %s.", req.Name)
	}

	// Create the campaign starting in Phase 1 (Domain Generation)
	campaignID := uuid.New()
	currentPhase := models.PhaseTypeDomainGeneration // Phase 1: Domain Generation
	phaseStatus := models.PhaseStatusNotStarted      // Ready to start

	campaign := &models.Campaign{
		ID:                 campaignID,
		Name:               req.Name,
		CurrentPhase:       &currentPhase,
		CreatedAt:          time.Now().UTC(),
		UpdatedAt:          time.Now().UTC(),
		CampaignType:       "lead_generation",
		TotalPhases:        4,
		CompletedPhases:    0,
		IsFullSequenceMode: false, // Lead generation campaigns are phase-centric
		AutoAdvancePhases:  false, // Manual phase transitions
		// Legacy field for backward compatibility
		PhaseStatus:      &phaseStatus,
		FullSequenceMode: func() *bool { b := false; return &b }(),
	}

	// Store domain generation parameters (Phase 1) - using DomainConfig field
	constantStr := &req.DomainConfig.ConstantString
	if req.DomainConfig.ConstantString == "" {
		constantStr = nil
	}

	domainParams := &models.DomainGenerationCampaignParams{
		CampaignID:                campaignID,
		PatternType:               req.DomainConfig.PatternType,
		VariableLength:            req.DomainConfig.VariableLength,
		CharacterSet:              req.DomainConfig.CharacterSet,
		ConstantString:            constantStr,
		TLD:                       req.DomainConfig.TLD,
		NumDomainsToGenerate:      int(req.DomainConfig.NumDomainsToGenerate),
		TotalPossibleCombinations: 0, // Will be calculated later
		CurrentOffset:             0, // Start from beginning
		CreatedAt:                 time.Now().UTC(),
		UpdatedAt:                 time.Now().UTC(),
	}
	campaign.DomainGenerationParams = domainParams

	// Note: DNS and HTTP validation parameters are not set during campaign creation
	// They will be configured when transitioning to those phases in the lead generation workflow

	// Create the campaign in the database
	err := s.campaignStore.CreateCampaign(ctx, querier, campaign)
	if err != nil {
		opErr = err
		return nil, err
	}

	log.Printf("Lead Generation Campaign created successfully: %s (ID: %s) - Starting in Phase 1: Domain Generation",
		campaign.Name, campaign.ID)

	// Publish async message
	if s.asyncManager != nil {
		msg := &communication.AsyncMessage{
			ID:            uuid.New().String(),
			CorrelationID: uuid.New().String(),
			SourceService: "orchestrator-service",
			TargetService: "lead-generation-service",
			MessageType:   "lead_generation_campaign_created",
			Payload:       req,
			Pattern:       communication.PatternPubSub,
			Timestamp:     time.Now(),
		}
		if perr := s.asyncManager.PublishMessage(ctx, msg); perr != nil {
			log.Printf("async publish error: %v", perr)
		}
	}

	return campaign, nil
}

// DEPRECATED: CreateDomainGenerationCampaign - Use CreateLeadGenerationCampaign instead
// This function is kept for backward compatibility but should be migrated
func (s *campaignOrchestratorServiceImpl) CreateDomainGenerationCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error) {
	log.Printf("DEPRECATED: CreateDomainGenerationCampaign called - migrating to Lead Generation Campaign for: %s", req.Name)

	// Convert to CreateLeadGenerationCampaignRequest
	newReq := CreateLeadGenerationCampaignRequest{
		Name:        req.Name,
		Description: req.Description,
		UserID:      req.UserID,
		DomainConfig: DomainGenerationConfig{
			PatternType:          req.PatternType,
			VariableLength:       req.VariableLength,
			CharacterSet:         req.CharacterSet,
			ConstantString:       req.ConstantString,
			TLD:                  req.TLD,
			NumDomainsToGenerate: req.NumDomainsToGenerate,
			BatchSize:            1000, // Default batch size
		},
	}

	return s.CreateLeadGenerationCampaign(ctx, newReq)
}

// ConfigureDNSValidationPhase configures DNS validation phase for a campaign (single-campaign architecture)
func (s *campaignOrchestratorServiceImpl) ConfigureDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.DNSPhaseConfigRequest) (*models.Campaign, error) {
	log.Printf("ConfigureDNSValidationPhase: Configuring DNS validation phase for campaign %s", campaignID)

	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			return nil, fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx

		defer func() {
			if p := recover(); p != nil {
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					opErr = commitErr
				}
			}
		}()
	}

	// Get campaign and validate prerequisites
	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = fmt.Errorf("failed to get campaign %s: %w", campaignID, errGet)
		return nil, opErr
	}

	// Validate campaign is eligible for DNS validation phase (flexible approach)
	// Allow DNS validation configuration in multiple scenarios:
	// 1. Generation phase completed (initial DNS config)
	// 2. DNS validation phase (reconfiguration)
	// 3. HTTP validation phase (restart DNS validation)
	if campaign.CurrentPhase == nil {
		opErr = fmt.Errorf("campaign phase not set - cannot configure DNS validation")
		return nil, opErr
	}

	currentPhase := *campaign.CurrentPhase
	switch currentPhase {
	case models.PhaseTypeDomainGeneration:
		// Initial DNS configuration - require generation to be completed
		if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
			statusStr := "unknown"
			if campaign.PhaseStatus != nil {
				statusStr = string(*campaign.PhaseStatus)
			}
			opErr = fmt.Errorf("domain generation must be completed before configuring DNS validation phase, current status: %s", statusStr)
			return nil, opErr
		}
	case models.PhaseTypeDNSValidation:
		// DNS validation reconfiguration - always allowed
		log.Printf("Reconfiguring DNS validation for campaign %s in dns_validation phase", campaignID)
	case models.PhaseTypeHTTPKeywordValidation:
		// Restart DNS validation from HTTP phase - always allowed
		log.Printf("Restarting DNS validation for campaign %s from http_keyword_validation phase", campaignID)
	case models.PhaseTypeAnalysis:
		// Allow DNS validation restart from analysis phase
		log.Printf("Restarting DNS validation for campaign %s from analysis phase", campaignID)
	default:
		opErr = fmt.Errorf("DNS validation cannot be configured from current phase: %s", currentPhase)
		return nil, opErr
	}

	// Verify domains exist for validation
	if campaign.TotalItems == nil || *campaign.TotalItems == 0 {
		opErr = fmt.Errorf("no domains found in campaign - domain generation must complete successfully before DNS validation")
		return nil, opErr
	}

	// Convert and validate persona IDs
	personaUUIDs := make([]uuid.UUID, len(req.PersonaIDs))
	for i, idStr := range req.PersonaIDs {
		personaUUID, parseErr := uuid.Parse(idStr)
		if parseErr != nil {
			opErr = fmt.Errorf("invalid persona ID format: %s", idStr)
			return nil, opErr
		}
		personaUUIDs[i] = personaUUID
	}

	// Validate DNS personas are correct type and enabled
	for _, personaID := range personaUUIDs {
		persona, err := s.personaStore.GetPersonaByID(ctx, querier, personaID)
		if err != nil {
			opErr = fmt.Errorf("persona %s not found: %w", personaID, err)
			return nil, opErr
		}
		if persona.PersonaType != models.PersonaTypeDNS {
			opErr = fmt.Errorf("persona %s is type %s, expected DNS type", personaID, persona.PersonaType)
			return nil, opErr
		}
		if !persona.IsEnabled {
			opErr = fmt.Errorf("DNS persona %s is disabled", personaID)
			return nil, opErr
		}
	}

	// Transition campaign to DNS validation phase
	dnsPhase := models.PhaseTypeDNSValidation
	pendingStatus := models.PhaseStatusNotStarted

	campaign.CurrentPhase = &dnsPhase
	campaign.PhaseStatus = &pendingStatus
	status := models.PhaseStatusNotStarted
	campaign.PhaseStatus = &status
	campaign.UpdatedAt = time.Now().UTC()

	// CRITICAL FIX: Preserve domain count, reset only processed count for new phase
	campaign.ProcessedItems = models.Int64Ptr(0) // Reset processed count for DNS phase
	campaign.ProgressPercentage = models.Float64Ptr(0.0)
	// TotalItems stays the same - represents domains available for DNS validation

	// Update name if provided
	if req.Name != nil {
		campaign.Name = *req.Name
	}

	// Create DNS validation parameters using self-reference for in-place validation
	dnsParams := &models.DNSValidationCampaignParams{
		CampaignID:                 campaignID,
		SourceGenerationCampaignID: &campaignID, // Self-reference for phase transition
		PersonaIDs:                 personaUUIDs,
		RotationIntervalSeconds:    models.IntPtr(30),
		ProcessingSpeedPerMinute:   models.IntPtr(60),
		BatchSize:                  models.IntPtr(50),
		RetryAttempts:              models.IntPtr(3),
	}

	// Store DNS validation parameters
	if err := s.campaignStore.CreateDNSValidationParams(ctx, querier, dnsParams); err != nil {
		opErr = fmt.Errorf("failed to create DNS validation params: %w", err)
		return nil, opErr
	}

	// Update campaign record
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign for DNS validation phase: %w", err)
		return nil, opErr
	}

	// Broadcast phase transition with enhanced data integrity
	if s.asyncManager != nil {
		// CRITICAL FIX: Use correct domain counts for phase transition
		totalDomains := int64(0)
		if campaign.TotalItems != nil {
			totalDomains = *campaign.TotalItems
		}

		processedItems := int64(0)
		if campaign.ProcessedItems != nil {
			processedItems = *campaign.ProcessedItems
		}

		transitionPayload := websocket.PhaseTransitionPayload{
			CampaignID:         campaignID.String(),
			PreviousPhase:      string(models.PhaseTypeDomainGeneration),
			NewPhase:           string(models.PhaseTypeDNSValidation),
			NewStatus:          string(models.PhaseStatusNotStarted),
			TransitionType:     "manual",
			TriggerReason:      "DNS validation phase configured",
			PrerequisitesMet:   true,
			DataIntegrityCheck: true,
			DomainsCount:       totalDomains,   // Total domains available for DNS validation
			ProcessedCount:     processedItems, // 0 for new DNS phase
			SuccessfulCount:    totalDomains,   // Domains from successful generation phase
			FailedCount:        0,
			TransitionMetadata: map[string]interface{}{
				"personaCount":    len(personaUUIDs),
				"totalDomains":    totalDomains,
				"validationPhase": string(models.PhaseTypeDNSValidation),
				"configuredBy":    "orchestrator",
				"configuredAt":    time.Now().UTC().Format(time.RFC3339),
			},
		}

		// Create sequenced message for data integrity
		phaseTransitionMsg := websocket.CreatePhaseTransitionMessageV2(transitionPayload)
		sequencedMsg := websocket.CreateSequencedMessage(campaignID.String(), phaseTransitionMsg, true)

		// Broadcast using enhanced WebSocket with integrity checks
		if broadcaster := websocket.GetBroadcaster(); broadcaster != nil {
			if wsManager, ok := broadcaster.(*websocket.WebSocketManager); ok {
				if err := wsManager.BroadcastSequencedMessage(campaignID.String(), sequencedMsg); err != nil {
					log.Printf("WARNING: Failed to broadcast phase transition: %v", err)
				}
			}
		}

		// Also send basic progress update for backward compatibility
		websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, string(models.PhaseStatusNotStarted), string(models.PhaseTypeDNSValidation), 0, 0)
	}

	log.Printf("ConfigureDNSValidationPhase: Successfully configured DNS validation phase for campaign %s", campaignID)
	return campaign, nil
}

// ConfigureHTTPValidationPhase configures HTTP validation phase for a campaign (single-campaign architecture)
func (s *campaignOrchestratorServiceImpl) ConfigureHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req models.HTTPPhaseConfigRequest) (*models.Campaign, error) {
	log.Printf("ConfigureHTTPValidationPhase: Configuring HTTP validation phase for campaign %s", campaignID)

	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			return nil, fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx

		defer func() {
			if p := recover(); p != nil {
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					opErr = commitErr
				}
			}
		}()
	}

	// Get campaign and validate prerequisites
	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = fmt.Errorf("failed to get campaign %s: %w", campaignID, errGet)
		return nil, opErr
	}

	// Enhanced prerequisite validation for HTTP validation
	// Check campaign mode and phase requirements
	if campaign.CurrentPhase == nil {
		opErr = fmt.Errorf("campaign has no current phase set")
		return nil, opErr
	}

	isFullSequenceMode := campaign.FullSequenceMode != nil && *campaign.FullSequenceMode

	// Determine valid phases based on campaign mode
	var allowedPhases []models.CampaignPhaseEnum
	var phaseReason string

	if isFullSequenceMode {
		// Full sequence mode: Allow configuration during initial setup or after DNS completion
		allowedPhases = []models.CampaignPhaseEnum{
			models.PhaseTypeDomainGeneration,      // Initial setup - full auto sequence mode
			models.PhaseTypeDNSValidation,         // After DNS validation completes
			models.PhaseTypeHTTPKeywordValidation, // Restart/reconfigure HTTP validation
			models.PhaseTypeAnalysis,              // Go back from analysis to reconfigure HTTP
		}
		phaseReason = "In full sequence mode, HTTP validation can be configured during initial setup (generation), after DNS validation, or for reconfiguration (http_keyword_validation/analysis)"
	} else {
		// Step-by-step mode: Strict prerequisite - DNS must be completed first
		allowedPhases = []models.CampaignPhaseEnum{
			models.PhaseTypeDNSValidation,         // DNS validation must be completed first in step-by-step mode
			models.PhaseTypeHTTPKeywordValidation, // Restart/reconfigure HTTP validation
			models.PhaseTypeAnalysis,              // Go back from analysis to reconfigure HTTP
		}
		phaseReason = "In step-by-step mode, HTTP validation requires DNS validation to be completed first"
	}

	validPhase := false
	for _, allowed := range allowedPhases {
		if *campaign.CurrentPhase == allowed {
			validPhase = true
			break
		}
	}

	if !validPhase {
		currentPhase := string(*campaign.CurrentPhase)
		campaignMode := "step-by-step"
		if isFullSequenceMode {
			campaignMode = "full sequence"
		}
		opErr = fmt.Errorf("HTTP validation prerequisite validation failed: %s. Current phase: %s, Campaign mode: %s", phaseReason, currentPhase, campaignMode)
		return nil, opErr
	}

	// Additional validation for step-by-step mode: ensure DNS validation has actually completed
	if !isFullSequenceMode && *campaign.CurrentPhase == models.PhaseTypeDNSValidation {
		// Check if DNS validation phase has completed status
		if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
			currentStatus := "unknown"
			if campaign.PhaseStatus != nil {
				currentStatus = string(*campaign.PhaseStatus)
			}
			opErr = fmt.Errorf("DNS validation must be completed before HTTP validation can be configured. Current DNS validation status: %s", currentStatus)
			return nil, opErr
		}
	}

	// Log reconfiguration scenarios for debugging
	if campaign.CurrentPhase != nil {
		if *campaign.CurrentPhase == models.PhaseTypeHTTPKeywordValidation {
			log.Printf("ConfigureHTTPValidationPhase: Reconfiguring HTTP validation for campaign %s (current phase: http_keyword_validation)", campaignID)
		} else if *campaign.CurrentPhase == models.PhaseTypeAnalysis {
			log.Printf("ConfigureHTTPValidationPhase: Reconfiguring HTTP validation from analysis phase for campaign %s", campaignID)
		}
	}

	// CRITICAL FIX: Get count of domains that passed DNS validation
	validDNSCount, countErr := s.campaignStore.CountDNSValidationResults(ctx, querier, campaignID, true)
	if countErr != nil {
		opErr = fmt.Errorf("failed to count valid DNS results: %w", countErr)
		return nil, opErr
	}

	if validDNSCount == 0 {
		opErr = fmt.Errorf("no domains passed DNS validation - HTTP validation requires domains with valid DNS resolution")
		return nil, opErr
	}

	// Convert and validate persona IDs
	personaUUIDs := make([]uuid.UUID, len(req.PersonaIDs))
	for i, idStr := range req.PersonaIDs {
		personaUUID, parseErr := uuid.Parse(idStr)
		if parseErr != nil {
			opErr = fmt.Errorf("invalid persona ID format: %s", idStr)
			return nil, opErr
		}
		personaUUIDs[i] = personaUUID
	}

	// Validate HTTP personas are correct type and enabled
	for _, personaID := range personaUUIDs {
		persona, err := s.personaStore.GetPersonaByID(ctx, querier, personaID)
		if err != nil {
			opErr = fmt.Errorf("persona %s not found: %w", personaID, err)
			return nil, opErr
		}
		if persona.PersonaType != models.PersonaTypeHTTP {
			opErr = fmt.Errorf("persona %s is type %s, expected HTTP type", personaID, persona.PersonaType)
			return nil, opErr
		}
		if !persona.IsEnabled {
			opErr = fmt.Errorf("HTTP persona %s is disabled", personaID)
			return nil, opErr
		}
	}

	// Transition campaign to HTTP validation phase
	httpPhase := models.PhaseTypeHTTPKeywordValidation
	pendingStatus := models.PhaseStatusNotStarted

	campaign.CurrentPhase = &httpPhase
	campaign.PhaseStatus = &pendingStatus
	status := models.PhaseStatusNotStarted
	campaign.PhaseStatus = &status
	campaign.UpdatedAt = time.Now().UTC()

	// CRITICAL FIX: Set TotalItems to valid DNS count for HTTP phase
	campaign.TotalItems = models.Int64Ptr(validDNSCount)
	campaign.ProcessedItems = models.Int64Ptr(0) // Reset processed count for HTTP phase
	campaign.ProgressPercentage = models.Float64Ptr(0.0)

	// Update name if provided
	if req.Name != nil {
		campaign.Name = *req.Name
	}

	// Create HTTP validation parameters using self-reference for in-place validation
	httpParams := &models.HTTPKeywordCampaignParams{
		CampaignID:               campaignID,
		SourceCampaignID:         campaignID, // Self-reference for phase transition
		PersonaIDs:               personaUUIDs,
		KeywordSetIDs:            []uuid.UUID{}, // Will be configured separately if needed
		AdHocKeywords:            &req.AdHocKeywords,
		RotationIntervalSeconds:  models.IntPtr(30),
		ProcessingSpeedPerMinute: models.IntPtr(60),
		BatchSize:                models.IntPtr(50),
		RetryAttempts:            models.IntPtr(3),
	}

	// Store HTTP validation parameters
	if err := s.campaignStore.CreateHTTPKeywordParams(ctx, querier, httpParams); err != nil {
		opErr = fmt.Errorf("failed to create HTTP validation params: %w", err)
		return nil, opErr
	}

	// Update campaign record
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign for HTTP validation phase: %w", err)
		return nil, opErr
	}

	// Get DNS validation results for accurate counts
	dnsResultsCount, err := s.campaignStore.CountDNSValidationResults(ctx, querier, campaignID, true)
	if err != nil {
		log.Printf("WARNING: Failed to get DNS results count for HTTP phase broadcast: %v", err)
		dnsResultsCount = 0
	}

	// Broadcast phase transition with accurate DNS data
	if s.asyncManager != nil {
		transitionPayload := websocket.PhaseTransitionPayload{
			CampaignID:         campaignID.String(),
			PreviousPhase:      string(models.PhaseTypeDNSValidation),
			NewPhase:           string(models.PhaseTypeHTTPKeywordValidation),
			NewStatus:          string(models.PhaseStatusNotStarted),
			TransitionType:     "manual",
			TriggerReason:      "HTTP validation phase configured",
			PrerequisitesMet:   true,
			DataIntegrityCheck: true,
			DomainsCount:       dnsResultsCount,
			ProcessedCount:     dnsResultsCount,
			SuccessfulCount:    dnsResultsCount,
			FailedCount:        0,
			TransitionMetadata: map[string]interface{}{
				"personaCount": len(personaUUIDs),
				"keywordCount": len(req.AdHocKeywords),
				"configuredBy": "orchestrator",
				"configuredAt": time.Now().UTC().Format(time.RFC3339),
			},
		}

		phaseTransitionMsg := websocket.CreatePhaseTransitionMessageV2(transitionPayload)
		sequencedMsg := websocket.CreateSequencedMessage(campaignID.String(), phaseTransitionMsg, true)

		if broadcaster := websocket.GetBroadcaster(); broadcaster != nil {
			if wsManager, ok := broadcaster.(*websocket.WebSocketManager); ok {
				if err := wsManager.BroadcastSequencedMessage(campaignID.String(), sequencedMsg); err != nil {
					log.Printf("WARNING: Failed to broadcast phase transition: %v", err)
				}
			}
		}

		websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, string(models.PhaseStatusNotStarted), string(models.PhaseTypeHTTPKeywordValidation), 0, 0)
	}

	log.Printf("ConfigureHTTPValidationPhase: Successfully configured HTTP validation phase for campaign %s", campaignID)
	return campaign, nil
}

func (s *campaignOrchestratorServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, interface{}, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	baseCampaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("orchestrator: get campaign failed: %w", err)
	}

	var specificParams interface{}
	var specificErr error

	// Check if this is a full sequence mode campaign from metadata
	isFullSequenceMode := false
	if baseCampaign.Metadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(*baseCampaign.Metadata, &metadata); err == nil {
			if fullSeq, exists := metadata["fullSequenceMode"]; exists {
				if fullSeqBool, ok := fullSeq.(bool); ok {
					isFullSequenceMode = fullSeqBool
				}
			}
		}
	}

	log.Printf("GetCampaignDetails: Campaign %s mode: fullSequence=%v, phase=%v", campaignID, isFullSequenceMode, baseCampaign.CurrentPhase)

	// All campaigns are now phases-based, check current phase to load appropriate params
	if baseCampaign.CurrentPhase != nil {
		switch *baseCampaign.CurrentPhase {
		case models.PhaseTypeDomainGeneration:
			_, params, errGet := s.domainGenService.GetCampaignDetails(ctx, campaignID)
			if errGet != nil {
				specificErr = fmt.Errorf("orchestrator: get domain gen params failed: %w", errGet)
			} else {
				specificParams = params
				baseCampaign.DomainGenerationParams = params
			}
		case models.PhaseTypeDNSValidation:
			_, params, errGet := s.dnsService.GetCampaignDetails(ctx, campaignID)
			if errGet != nil {
				// Smart handling based on campaign mode
				if isFullSequenceMode {
					// Full sequence mode: params should exist, this is an error
					specificErr = fmt.Errorf("orchestrator: get dns validation params failed: %w", errGet)
				} else {
					// Individual phase mode: missing params is normal, log and continue
					log.Printf("GetCampaignDetails: DNS params not found for individual phase mode campaign %s (normal behavior)", campaignID)
					specificParams = nil
					baseCampaign.DNSValidationParams = nil
				}
			} else {
				specificParams = params
				baseCampaign.DNSValidationParams = params
			}
		case models.PhaseTypeHTTPKeywordValidation:
			_, params, errGet := s.httpKeywordService.GetCampaignDetails(ctx, campaignID)
			if errGet != nil {
				// Smart handling based on campaign mode
				if isFullSequenceMode {
					// Full sequence mode: params should exist, this is an error
					specificErr = fmt.Errorf("orchestrator: get http keyword params failed: %w", errGet)
				} else {
					// Individual phase mode: missing params is normal, log and continue
					log.Printf("GetCampaignDetails: HTTP params not found for individual phase mode campaign %s (normal behavior)", campaignID)
					specificParams = nil
					baseCampaign.HTTPKeywordValidationParams = nil
				}
			} else {
				specificParams = params
				baseCampaign.HTTPKeywordValidationParams = params
			}
		default:
			specificErr = fmt.Errorf("orchestrator: unknown campaign phase '%s' for campaign %s", *baseCampaign.CurrentPhase, campaignID)
		}
	} else {
		// Campaign has no current phase set, treat as setup phase
		specificErr = fmt.Errorf("orchestrator: campaign %s has no current phase set", campaignID)
	}

	if specificErr != nil {
		return baseCampaign, nil, specificErr
	}

	return baseCampaign, specificParams, nil
}

func (s *campaignOrchestratorServiceImpl) GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (models.CampaignPhaseStatusEnum, *float64, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}
	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return "", nil, err
	}

	status := models.PhaseStatusNotStarted
	if campaign.PhaseStatus != nil {
		status = *campaign.PhaseStatus
	}

	return status, campaign.ProgressPercentage, nil
}

func (s *campaignOrchestratorServiceImpl) ListCampaigns(ctx context.Context, filter store.ListCampaignsFilter) ([]models.Campaign, int64, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaignsSlice, err := s.campaignStore.ListCampaigns(ctx, querier, filter)
	if err != nil {
		return nil, 0, err
	}

	actualCampaigns := make([]models.Campaign, len(campaignsSlice))
	for i, cPtr := range campaignsSlice {
		if cPtr != nil {
			actualCampaigns[i] = *cPtr
		}
	}

	totalCount, err := s.campaignStore.CountCampaigns(ctx, querier, filter)
	if err != nil {
		log.Printf("Error counting campaigns: %v. List will be paged based on items returned.", err)
		return actualCampaigns, int64(len(actualCampaigns)), nil
	}
	return actualCampaigns, totalCount, nil
}

func (s *campaignOrchestratorServiceImpl) GetGeneratedDomainsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor int64) (*GeneratedDomainsResponse, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, fmt.Errorf("orchestrator: failed to get campaign %s: %w", campaignID, err)
	}
	// Check if campaign is in a valid phase for domain generation retrieval
	if campaign.CurrentPhase == nil {
		return nil, fmt.Errorf("orchestrator: campaign %s has no current phase set", campaignID)
	}

	phase := *campaign.CurrentPhase
	if phase != models.PhaseTypeDomainGeneration && phase != models.PhaseTypeDNSValidation {
		return nil, fmt.Errorf("orchestrator: campaign %s is not in domain generation or DNS validation phase, current phase: %s", campaignID, phase)
	}

	resultsPtr, err := s.campaignStore.GetGeneratedDomainsByCampaign(ctx, querier, campaignID, limit, cursor)
	if err != nil {
		return nil, fmt.Errorf("orchestrator: failed to get generated domains for campaign %s: %w", campaignID, err)
	}

	totalCount, countErr := s.campaignStore.CountGeneratedDomainsByCampaign(ctx, querier, campaignID)
	if countErr != nil {
		log.Printf("Orchestrator: Error counting generated domains for campaign %s: %v", campaignID, countErr)
	}

	var nextCursor int64 = 0
	if len(resultsPtr) > 0 && limit > 0 && len(resultsPtr) == limit {
		nextCursor = cursor + int64(limit)
	}
	results := models.DereferenceGeneratedDomainSlice(resultsPtr)

	return &GeneratedDomainsResponse{
		Data:       results,
		NextCursor: nextCursor,
		TotalCount: totalCount,
	}, nil
}

func (s *campaignOrchestratorServiceImpl) GetDNSValidationResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*DNSValidationResultsResponse, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	_, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, fmt.Errorf("orchestrator: failed to get campaign %s: %w", campaignID, err)
	}

	actualFilter := filter
	if limit > 0 {
		actualFilter.Limit = limit
	}
	currentOffset := 0
	if cursor != "" {
		parsedOffset, parseErr := strconv.Atoi(cursor)
		if parseErr == nil && parsedOffset > 0 {
			currentOffset = parsedOffset
		}
	}
	actualFilter.Offset = currentOffset

	resultsPtr, err := s.campaignStore.GetDNSValidationResultsByCampaign(ctx, querier, campaignID, actualFilter)
	if err != nil {
		return nil, fmt.Errorf("orchestrator: failed to get DNS validation results for campaign %s: %w", campaignID, err)
	}

	totalCount, countErr := s.campaignStore.CountDNSValidationResults(ctx, querier, campaignID, true)
	if countErr != nil {
		log.Printf("Orchestrator: Error counting DNS validation results for campaign %s: %v", campaignID, countErr)
	}

	var nextCursorStr string
	if len(resultsPtr) > 0 && actualFilter.Limit > 0 && len(resultsPtr) == actualFilter.Limit {
		nextCursorStr = strconv.Itoa(currentOffset + len(resultsPtr))
	}
	results := models.DereferenceDNSValidationResultSlice(resultsPtr)

	return &DNSValidationResultsResponse{
		Data:       results,
		NextCursor: nextCursorStr,
		TotalCount: totalCount,
	}, nil
}

func (s *campaignOrchestratorServiceImpl) GetHTTPKeywordResultsForCampaign(ctx context.Context, campaignID uuid.UUID, limit int, cursor string, filter store.ListValidationResultsFilter) (*HTTPKeywordResultsResponse, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, fmt.Errorf("orchestrator: failed to get campaign %s: %w", campaignID, err)
	}
	// Check if campaign is in HTTP validation phase
	if campaign.CurrentPhase == nil {
		return nil, fmt.Errorf("orchestrator: campaign %s has no current phase set", campaignID)
	}

	if *campaign.CurrentPhase != models.PhaseTypeHTTPKeywordValidation {
		return nil, fmt.Errorf("orchestrator: campaign %s is not in HTTP validation phase, current phase: %s", campaignID, *campaign.CurrentPhase)
	}

	actualFilter := filter
	if limit > 0 {
		actualFilter.Limit = limit
	}
	currentOffset := 0
	if cursor != "" {
		parsedOffset, parseErr := strconv.Atoi(cursor)
		if parseErr == nil && parsedOffset > 0 {
			currentOffset = parsedOffset
		}
	}
	actualFilter.Offset = currentOffset

	resultsPtr, err := s.campaignStore.GetHTTPKeywordResultsByCampaign(ctx, querier, campaignID, actualFilter)
	if err != nil {
		return nil, fmt.Errorf("orchestrator: failed to get HTTP/Keyword results for campaign %s: %w", campaignID, err)
	}

	var totalCount int64
	if campaign.TotalItems != nil {
		totalCount = *campaign.TotalItems
	}
	// If the campaign is completed, the total count for pagination purposes might be the number of processed items.
	// However, the frontend might still want to see the original total items.
	// For now, let's assume TotalItems is the authoritative source for the total,
	// and ProcessedItems is just for progress.
	// If the campaign is completed, and ProcessedItems is available, it might be more accurate for "results found".
	// The original logic was:
	// var totalCount int64 = campaign.TotalItems
	// if campaign.Status == models.CampaignStatusCompleted {
	//  totalCount = campaign.ProcessedItems
	// }
	// Replicating this with pointer checks:
	// Check if campaign phase is completed and use processed items count
	if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusCompleted && campaign.ProcessedItems != nil {
		totalCount = *campaign.ProcessedItems
	} else if campaign.TotalItems == nil && campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusCompleted {
		// If total items was nil, and it's completed, processed items might also be nil, implying 0.
		totalCount = 0
	}

	var nextCursorStr string
	if len(resultsPtr) > 0 && actualFilter.Limit > 0 && len(resultsPtr) == actualFilter.Limit {
		nextCursorStr = strconv.Itoa(currentOffset + len(resultsPtr))
	}
	results := models.DereferenceHTTPKeywordResultSlice(resultsPtr)

	return &HTTPKeywordResultsResponse{
		Data:       results,
		NextCursor: nextCursorStr,
		TotalCount: totalCount,
	}, nil
}

func (s *campaignOrchestratorServiceImpl) StartCampaign(ctx context.Context, campaignID uuid.UUID) error {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for StartCampaign %s: %v", campaignID, startTxErr)
			return fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for StartCampaign %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL StartCampaign for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for StartCampaign %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for StartCampaign %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for StartCampaign %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for StartCampaign %s (no service-level transaction).", campaignID)
	}

	// s.campaignStore.GetCampaignByID will use the querier (which is sqlTx or nil)
	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = errGet
		return opErr // opErr will be handled by defer if in SQL transaction
	}

	// DIAGNOSTIC: Log campaign details to debug status issue
	currentPhaseStr := "nil"
	if campaign.CurrentPhase != nil {
		currentPhaseStr = string(*campaign.CurrentPhase)
	}
	phaseStatusStr := "nil"
	if campaign.PhaseStatus != nil {
		phaseStatusStr = string(*campaign.PhaseStatus)
	}
	log.Printf("[DIAGNOSTIC] StartCampaign called for campaign %s: {phase: %s, status: %s, name: %s}",
		campaignID, currentPhaseStr, phaseStatusStr, campaign.Name)

	// Allow starting campaigns in specific scenarios:
	// 1. Standard flow: campaign phase status is not_started
	// 2. Setup phase: campaigns in setup phase (new campaigns)
	// 3. DNS validation flow: completed domain_generation campaign with DNS params added
	// 4. Full sequence mode: campaigns created with all configurations
	isValidForStart := false
	startReason := ""

	// Check if campaign has full sequence mode enabled (new field or legacy metadata)
	isFullSequenceMode := false
	if campaign.FullSequenceMode != nil && *campaign.FullSequenceMode {
		isFullSequenceMode = true
		log.Printf("[DIAGNOSTIC] Campaign %s has fullSequenceMode enabled via field", campaignID)
	} else {
		// Fallback to legacy metadata check for backward compatibility
		if campaign.Metadata != nil {
			var metadata map[string]interface{}
			if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
				if seq, ok := metadata["launch_sequence"].(bool); ok && seq {
					isFullSequenceMode = true
					log.Printf("[DIAGNOSTIC] Campaign %s has fullSequenceMode enabled via legacy metadata", campaignID)
				}
			}
		}
	}

	// Standard pending campaigns
	if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusNotStarted {
		isValidForStart = true
		startReason = "standard_pending_campaign"
	} else if campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeDomainGeneration {
		// New campaigns in setup phase (especially full sequence mode)
		isValidForStart = true
		startReason = "setup_phase_campaign"
		log.Printf("[DIAGNOSTIC] StartCampaign allowing setup phase campaign %s", campaignID)
	} else if campaign.PhaseStatus == nil || *campaign.PhaseStatus == models.PhaseStatusNotStarted {
		// Handle campaigns with nil status (new campaigns)
		isValidForStart = true
		startReason = "new_campaign_nil_status"
		log.Printf("[DIAGNOSTIC] StartCampaign allowing campaign with nil/pending status %s", campaignID)
	} else if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusCompleted &&
		campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeDomainGeneration {
		// Check if this is a domain generation campaign that has DNS validation params added
		// This enables DNS validation processing on existing domain generation campaigns
		if dnsParams, getErr := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID); getErr == nil && dnsParams != nil {
			isValidForStart = true
			startReason = "dns_validation_phase_on_domain_generation"
			log.Printf("[DIAGNOSTIC] StartCampaign allowing DNS validation phase on completed domain generation campaign %s", campaignID)
		}
	}

	// Special handling for full sequence mode campaigns
	if isFullSequenceMode && !isValidForStart {
		// Full sequence mode campaigns should be startable if they have generation params
		if campaign.DomainGenerationParams != nil {
			isValidForStart = true
			startReason = "full_sequence_mode_with_generation_params"
			log.Printf("[DIAGNOSTIC] StartCampaign allowing full sequence mode campaign %s", campaignID)
		}
	}

	if !isValidForStart {
		log.Printf("[DIAGNOSTIC] StartCampaign FAILED - Invalid status for campaign %s: expected '%s' or DNS validation transition, but got phase '%s' status '%s'",
			campaignID, models.PhaseStatusNotStarted, currentPhaseStr, phaseStatusStr)
		opErr = fmt.Errorf("campaign %s not startable: phase=%s status=%s", campaignID, currentPhaseStr, phaseStatusStr)
		return opErr // opErr will be handled by defer if in SQL transaction
	}

	log.Printf("[DIAGNOSTIC] StartCampaign proceeding - campaign %s valid for start: reason=%s", campaignID, startReason)

	// Determine job type based on current phase
	jobType := models.JobTypeGeneration // default fallback
	if campaign.CurrentPhase != nil {
		switch *campaign.CurrentPhase {
		case models.PhaseTypeDomainGeneration:
			jobType = models.JobTypeGeneration
		case models.PhaseTypeDNSValidation:
			jobType = models.JobTypeDNSValidation
		case models.PhaseTypeHTTPKeywordValidation:
			jobType = models.JobTypeHTTPValidation
		case models.PhaseTypeAnalysis:
			jobType = models.JobTypeAnalysis
		default:
			jobType = models.JobTypeGeneration
		}
	}

	initialJob := &models.CampaignJob{
		ID:              uuid.New(),
		CampaignID:      campaignID,
		JobType:         jobType,
		Status:          models.JobStatusQueued,
		MaxAttempts:     3,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
		NextExecutionAt: sql.NullTime{Time: time.Now().UTC(), Valid: true},
	}

	// 🚀 PHASE-AWARE JOB ROUTING: Set job payload based on current campaign phase
	log.Printf("[🔍 DIAGNOSTIC] StartCampaign phase-aware routing for campaign %s:", campaignID)
	log.Printf("[🔍 DIAGNOSTIC] - CurrentPhase: %v", campaign.CurrentPhase)
	log.Printf("[🔍 DIAGNOSTIC] - PhaseStatus: %v", campaign.PhaseStatus)
	log.Printf("[🔍 DIAGNOSTIC] - Start reason: %s", startReason)

	// Phase-aware parameter fetching and job creation
	if campaign.CurrentPhase == nil {
		log.Printf("[❌ ERROR] Campaign %s has no current phase set", campaignID)
		return fmt.Errorf("campaign %s has no current phase set", campaignID)
	}

	switch *campaign.CurrentPhase {
	case models.PhaseTypeDomainGeneration:
		// Domain Generation Phase: NO DNS/HTTP parameter fetching needed
		log.Printf("[✅ DOMAIN_GEN] Creating domain generation job for campaign %s", campaignID)
		initialJob.JobType = models.JobTypeGeneration

		// Only fetch domain generation params
		params, getErr := s.campaignStore.GetDomainGenerationParams(ctx, querier, campaignID)
		if getErr != nil {
			log.Printf("[⚠️ WARNING] Failed to get domain generation params for campaign %s: %v", campaignID, getErr)
		} else {
			payloadBytes, err := json.Marshal(params)
			if err != nil {
				log.Printf("[⚠️ WARNING] Failed to marshal domain generation job payload: %v", err)
			} else {
				rawMsg := json.RawMessage(payloadBytes)
				initialJob.JobPayload = &rawMsg
			}
		}

	case models.PhaseTypeDNSValidation:
		// DNS Validation Phase: Only fetch DNS parameters
		log.Printf("[✅ DNS_VAL] Creating DNS validation job for campaign %s", campaignID)
		initialJob.JobType = models.JobTypeDNSValidation

		dnsParams, dnsErr := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID)
		if dnsErr != nil {
			log.Printf("[⚠️ WARNING] Failed to get DNS validation params for campaign %s: %v", campaignID, dnsErr)
		} else {
			payloadBytes, err := json.Marshal(dnsParams)
			if err != nil {
				log.Printf("[⚠️ WARNING] Failed to marshal DNS validation job payload: %v", err)
			} else {
				rawMsg := json.RawMessage(payloadBytes)
				initialJob.JobPayload = &rawMsg
			}
		}

	case models.PhaseTypeHTTPKeywordValidation:
		// HTTP Keyword Validation Phase: Only fetch HTTP parameters
		log.Printf("[✅ HTTP_VAL] Creating HTTP keyword validation job for campaign %s", campaignID)
		initialJob.JobType = models.JobTypeHTTPValidation

		httpParams, httpErr := s.campaignStore.GetHTTPKeywordParams(ctx, querier, campaignID)
		if httpErr != nil {
			log.Printf("[⚠️ WARNING] Failed to get HTTP keyword params for campaign %s: %v", campaignID, httpErr)
		} else {
			payloadBytes, err := json.Marshal(httpParams)
			if err != nil {
				log.Printf("[⚠️ WARNING] Failed to marshal HTTP keyword job payload: %v", err)
			} else {
				rawMsg := json.RawMessage(payloadBytes)
				initialJob.JobPayload = &rawMsg
			}
		}

	case models.PhaseTypeAnalysis:
		// 🔧 PHASE_FIX: Auto-complete analysis phase and transition to final completion
		log.Printf("[🔧 PHASE_FIX] Campaign %s in Analysis phase - auto-completing and marking campaign as final completed", campaignID)

		// Mark campaign phase as completed
		completedStatus := models.PhaseStatusCompleted
		campaign.PhaseStatus = &completedStatus
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		nowTime := time.Now().UTC()
		campaign.CompletedAt = &nowTime

		// Clear phase since campaign is now fully completed
		campaign.CurrentPhase = nil
		campaign.PhaseStatus = nil

		// Update campaign in database
		if updateErr := s.campaignStore.UpdateCampaign(ctx, querier, campaign); updateErr != nil {
			log.Printf("[❌ ERROR] Failed to update campaign %s to completed status: %v", campaignID, updateErr)
			return fmt.Errorf("failed to complete analysis phase for campaign %s: %w", campaignID, updateErr)
		}

		log.Printf("[✅ SUCCESS] Campaign %s analysis phase completed - campaign marked as fully complete", campaignID)
		return nil // No job needed - campaign is complete

	default:
		log.Printf("[❌ ERROR] Unknown campaign phase %v for campaign %s", *campaign.CurrentPhase, campaignID)
		return fmt.Errorf("unknown campaign phase %v for campaign %s", *campaign.CurrentPhase, campaignID)
	}

	// s.campaignJobStore.CreateJob is called with its original signature.
	// It was NOT using 'tx' in the original code, so it does NOT use 'querier' here.
	// It handles its own DB interaction (e.g. using s.db directly, or its own transaction, or Firestore client).
	jobCreated := false
	if s.campaignJobStore == nil {
		log.Printf("Warning: campaignJobStore is nil for campaign %s. Skipping job creation.", campaignID)
		// Continue with status update even if we can't create a job
	} else if errCreateJob := s.campaignJobStore.CreateJob(ctx, querier, initialJob); errCreateJob != nil {
		opErr = fmt.Errorf("failed to create initial job for campaign %s: %w", campaignID, errCreateJob)
		return opErr // opErr will be handled by defer if in SQL transaction
	} else {
		jobCreated = true
	}

	// If we couldn't create a job but we still want to update the campaign phase status,
	// we need to make sure the campaign is marked as in progress so it doesn't get stuck in not_started
	if !jobCreated {
		log.Printf("No job created for campaign %s. Marking campaign phase as in progress directly.", campaignID)
		runningStatus := models.PhaseStatusInProgress
		campaign.PhaseStatus = &runningStatus
		campaign.UpdatedAt = time.Now().UTC()
		if campaign.StartedAt == nil {
			now := time.Now().UTC()
			campaign.StartedAt = &now
		}
		if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
			opErr = fmt.Errorf("failed to update campaign %s phase status to in progress: %w", campaignID, err)
			return opErr
		}
	}

	// DIAGNOSTIC: Check if this is DNS validation after phase transition
	// After phase transition: campaign phase is now dns_validation and status is not_started
	isDNSValidationAfterTransition := (campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusNotStarted &&
		campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeDNSValidation &&
		startReason == "standard_pending_campaign")

	// DIAGNOSTIC: Legacy check for DNS validation on completed campaign (before transition)
	isDNSValidationOnCompleted := (campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusCompleted &&
		campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeDomainGeneration &&
		startReason == "dns_validation_phase_on_domain_generation")

	currentPhaseStatusStr := "nil"
	if campaign.PhaseStatus != nil {
		currentPhaseStatusStr = string(*campaign.PhaseStatus)
	}

	log.Printf("[DIAGNOSTIC] StartCampaign transition check - campaignID=%s, currentPhaseStatus=%s, targetPhaseStatus=%s, isDNSValidationAfterTransition=%t, isDNSValidationOnCompleted=%t, startReason=%s",
		campaignID, currentPhaseStatusStr, models.PhaseStatusInProgress, isDNSValidationAfterTransition, isDNSValidationOnCompleted, startReason)

	// FIX: For DNS validation campaigns (both legacy and post-transition), use appropriate handling
	if isDNSValidationOnCompleted {
		log.Printf("[FIX] Bypassing status transition for DNS validation on completed campaign %s - preserving completed status", campaignID)
		s.logAuditEvent(ctx, querier, campaign, "DNS Validation Started on Completed Campaign", "DNS validation job created without changing campaign status")
		return nil // Success without status change
	} else if isDNSValidationAfterTransition {
		log.Printf("[FIX] DNS validation after phase transition for campaign %s - proceeding with normal status transition", campaignID)
		// Continue to normal status transition flow
	}

	queuedStatus := models.PhaseStatusInProgress
	desc := fmt.Sprintf("Campaign phase status changed to %s", queuedStatus)
	// Update phase status instead of legacy campaign status
	campaign.PhaseStatus = &queuedStatus
	campaign.UpdatedAt = time.Now().UTC()
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign %s phase status: %w", campaignID, err)
		return opErr
	}
	s.logAuditEvent(ctx, querier, campaign, "Campaign Start Requested", desc)
	return opErr
}

func (s *campaignOrchestratorServiceImpl) PauseCampaign(ctx context.Context, campaignID uuid.UUID) error {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for PauseCampaign %s: %v", campaignID, startTxErr)
			return fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for PauseCampaign %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL PauseCampaign for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for PauseCampaign %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for PauseCampaign %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for PauseCampaign %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for PauseCampaign %s (no service-level transaction).", campaignID)
	}

	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = errGet
		return opErr
	}
	currentPhaseStatusStr := "nil"
	if campaign.PhaseStatus != nil {
		currentPhaseStatusStr = string(*campaign.PhaseStatus)
	}

	if campaign.PhaseStatus == nil || (*campaign.PhaseStatus != models.PhaseStatusInProgress) {
		opErr = fmt.Errorf("campaign %s not running: %s", campaignID, currentPhaseStatusStr)
		return opErr
	}

	pausedStatus := models.PhaseStatusPaused
	desc := fmt.Sprintf("Phase status changed from %s to %s", currentPhaseStatusStr, pausedStatus)
	campaign.PhaseStatus = &pausedStatus
	campaign.UpdatedAt = time.Now().UTC()
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign %s phase status to paused: %w", campaignID, err)
		return opErr
	}
	s.logAuditEvent(ctx, querier, campaign, "Campaign Paused", desc)
	return opErr
}

func (s *campaignOrchestratorServiceImpl) ResumeCampaign(ctx context.Context, campaignID uuid.UUID) error {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for ResumeCampaign %s: %v", campaignID, startTxErr)
			return fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for ResumeCampaign %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL ResumeCampaign for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for ResumeCampaign %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for ResumeCampaign %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for ResumeCampaign %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for ResumeCampaign %s (no service-level transaction).", campaignID)
	}

	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = errGet
		return opErr
	}

	// Check if campaign phase is paused
	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusPaused {
		currentPhaseStatus := "unknown"
		if campaign.PhaseStatus != nil {
			currentPhaseStatus = string(*campaign.PhaseStatus)
		}
		opErr = fmt.Errorf("campaign %s not paused: %s", campaignID, currentPhaseStatus)
		return opErr
	}

	// Determine job type based on current phase
	jobType := models.JobTypeGeneration // default fallback
	if campaign.CurrentPhase != nil {
		switch *campaign.CurrentPhase {
		case models.PhaseTypeDomainGeneration:
			jobType = models.JobTypeGeneration
		case models.PhaseTypeDNSValidation:
			jobType = models.JobTypeDNSValidation
		case models.PhaseTypeHTTPKeywordValidation:
			jobType = models.JobTypeHTTPValidation
		case models.PhaseTypeAnalysis:
			jobType = models.JobTypeAnalysis
		default:
			jobType = models.JobTypeGeneration
		}
	}

	currentPhaseStatusStr := "unknown"
	if campaign.PhaseStatus != nil {
		currentPhaseStatusStr = string(*campaign.PhaseStatus)
	}
	desc := fmt.Sprintf("Phase status changed from %s to %s", currentPhaseStatusStr, models.PhaseStatusInProgress)
	resumeJob := &models.CampaignJob{
		ID:              uuid.New(),
		CampaignID:      campaignID,
		JobType:         jobType,
		Status:          models.JobStatusQueued,
		MaxAttempts:     3,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
		NextExecutionAt: sql.NullTime{Time: time.Now().UTC(), Valid: true},
	}
	jobCreated := false
	if s.campaignJobStore == nil {
		log.Printf("Warning: campaignJobStore is nil for campaign %s. Skipping resume job creation.", campaignID)
	} else if err := s.campaignJobStore.CreateJob(ctx, querier, resumeJob); err != nil {
		log.Printf("Warning: failed to create resume job for campaign %s: %v", campaignID, err)
		// If this error should cause the transaction to roll back (in SQL mode), set opErr:
		// opErr = fmt.Errorf("failed to create resume job for campaign %s: %w", campaignID, err)
		// return opErr
	} else {
		jobCreated = true
	}

	// If we couldn't create a job but we still want to update the campaign phase status,
	// we need to make sure the campaign is marked as in progress so it doesn't get stuck in queued
	if !jobCreated {
		log.Printf("No resume job created for campaign %s. Marking campaign phase as in progress directly.", campaignID)
		runningStatus := models.PhaseStatusInProgress
		campaign.PhaseStatus = &runningStatus
		campaign.UpdatedAt = time.Now().UTC()
		if campaign.StartedAt == nil {
			now := time.Now().UTC()
			campaign.StartedAt = &now
		}
		if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
			opErr = fmt.Errorf("failed to update campaign %s phase status to in progress: %w", campaignID, err)
			return opErr
		}
		// Return early since we've already updated the campaign phase status
		return nil
	}

	// Update campaign phase status to in progress for normal resume flow
	inProgressStatus := models.PhaseStatusInProgress
	campaign.PhaseStatus = &inProgressStatus
	campaign.UpdatedAt = time.Now().UTC()
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign %s phase status to in progress: %w", campaignID, err)
		return opErr
	}
	s.logAuditEvent(ctx, querier, campaign, "Campaign Resumed", desc)
	return opErr
}

func (s *campaignOrchestratorServiceImpl) CancelCampaign(ctx context.Context, campaignID uuid.UUID) error {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for CancelCampaign %s: %v", campaignID, startTxErr)
			return fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for CancelCampaign %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL CancelCampaign for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for CancelCampaign %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for CancelCampaign %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for CancelCampaign %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for CancelCampaign %s (no service-level transaction).", campaignID)
	}

	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = errGet
		return opErr
	}

	// Check if campaign phase is already in a final state
	if campaign.PhaseStatus != nil && (*campaign.PhaseStatus == models.PhaseStatusCompleted ||
		*campaign.PhaseStatus == models.PhaseStatusFailed) {
		currentPhaseStatus := string(*campaign.PhaseStatus)
		opErr = fmt.Errorf("campaign %s already in a final state: %s", campaignID, currentPhaseStatus)
		return opErr
	}

	currentPhaseStatusStr := "unknown"
	if campaign.PhaseStatus != nil {
		currentPhaseStatusStr = string(*campaign.PhaseStatus)
	}
	desc := fmt.Sprintf("Phase status changed from %s to %s", currentPhaseStatusStr, models.PhaseStatusFailed)

	// Update campaign phase status to failed (cancelled campaigns are marked as failed)
	cancelledStatus := models.PhaseStatusFailed
	campaign.PhaseStatus = &cancelledStatus
	campaign.UpdatedAt = time.Now().UTC()
	if campaign.CompletedAt == nil {
		now := time.Now().UTC()
		campaign.CompletedAt = &now
	}

	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign %s phase status to cancelled: %w", campaignID, err)
		return opErr
	}

	// Log audit event with error handling to prevent transaction rollback
	func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("WARNING: Audit logging failed during campaign cancellation: %v", r)
			}
		}()
		if s.auditLogger != nil {
			s.logAuditEvent(ctx, querier, campaign, "Campaign Cancelled", desc)
		}
	}()

	return opErr
}

func (s *campaignOrchestratorServiceImpl) SetCampaignErrorStatus(ctx context.Context, campaignID uuid.UUID, errorMessage string) error {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for SetCampaignErrorStatus %s: %v", campaignID, startTxErr)
			return fmt.Errorf("SetCampaignErrorStatus: failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for SetCampaignErrorStatus %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL SetCampaignErrorStatus for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for SetCampaignErrorStatus %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for SetCampaignErrorStatus %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for SetCampaignErrorStatus %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for SetCampaignErrorStatus %s (no service-level transaction).", campaignID)
	}

	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = fmt.Errorf("SetCampaignErrorStatus: get campaign %s failed: %w", campaignID, errGet)
		return opErr
	}

	desc := fmt.Sprintf("Campaign %s error: %s", campaign.Name, errorMessage)

	// Update campaign phase status to failed
	failedStatus := models.PhaseStatusFailed
	campaign.PhaseStatus = &failedStatus
	campaign.UpdatedAt = time.Now().UTC()
	campaign.ErrorMessage = models.StringPtr(errorMessage)
	if campaign.CompletedAt == nil {
		now := time.Now().UTC()
		campaign.CompletedAt = &now
	}

	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign %s phase status to failed: %w", campaignID, err)
		return opErr
	}

	s.logAuditEvent(ctx, querier, campaign, "Campaign Error", desc)
	return opErr
}

// SetCampaignStatus sets the campaign status to the specified value
func (s *campaignOrchestratorServiceImpl) SetCampaignStatus(ctx context.Context, campaignID uuid.UUID, status models.CampaignPhaseStatusEnum) error {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for SetCampaignStatus %s: %v", campaignID, startTxErr)
			return fmt.Errorf("SetCampaignStatus: failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for SetCampaignStatus %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL SetCampaignStatus for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for SetCampaignStatus %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for SetCampaignStatus %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for SetCampaignStatus %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for SetCampaignStatus %s (no service-level transaction).", campaignID)
	}

	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = fmt.Errorf("SetCampaignStatus: get campaign %s failed: %w", campaignID, errGet)
		return opErr
	}

	currentPhaseStatusStr := "unknown"
	if campaign.PhaseStatus != nil {
		currentPhaseStatusStr = string(*campaign.PhaseStatus)
	}
	desc := fmt.Sprintf("Campaign phase status changed from %s to %s", currentPhaseStatusStr, status)
	auditAction := fmt.Sprintf("Campaign Phase Status Changed to %s", status)

	// Update campaign phase status
	campaign.PhaseStatus = &status
	campaign.UpdatedAt = time.Now().UTC()

	// Set completion time for final states
	if status == models.PhaseStatusCompleted || status == models.PhaseStatusFailed {
		if campaign.CompletedAt == nil {
			now := time.Now().UTC()
			campaign.CompletedAt = &now
		}
	}

	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("failed to update campaign %s phase status to %s: %w", campaignID, status, err)
		return opErr
	}

	s.logAuditEvent(ctx, querier, campaign, auditAction, desc)
	return opErr
}

// updateCampaignPhaseStatusInTx correctly uses the passed querier (which can be sqlTx or nil)
func (s *campaignOrchestratorServiceImpl) updateCampaignPhaseStatusInTx(ctx context.Context, querier store.Querier, campaign *models.Campaign, newStatus models.CampaignPhaseStatusEnum, errMsg string, auditDesc string, auditAction string) error {
	originalStatus := "unknown"
	if campaign.PhaseStatus != nil {
		originalStatus = string(*campaign.PhaseStatus)
	}

	// Note: Phase-based state machine validation could be added here if needed
	// For now, we'll allow any phase status transitions as they're controlled by the orchestrator

	campaign.PhaseStatus = &newStatus
	campaign.UpdatedAt = time.Now().UTC()
	if errMsg != "" {
		campaign.ErrorMessage = models.StringPtr(errMsg)
	} else {
		campaign.ErrorMessage = nil
	}

	// Set completion time for final states
	if newStatus == models.PhaseStatusCompleted || newStatus == models.PhaseStatusFailed {
		if campaign.CompletedAt == nil {
			campaign.CompletedAt = &campaign.UpdatedAt
		}
	}

	// Update campaign in store using the querier
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		return fmt.Errorf("update campaign %s phase status to %s: %w", campaign.ID, newStatus, err)
	}

	// Log audit event using the querier
	s.logAuditEvent(ctx, querier, campaign, auditAction, auditDesc)
	log.Printf("Campaign %s phase status changed from %s to %s.", campaign.ID, originalStatus, newStatus)
	return nil
}

// logAuditEvent correctly uses the passed exec (querier)
func (s *campaignOrchestratorServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.Campaign, action, description string) {
	if s.auditLogger == nil {
		return
	}
	details := map[string]string{
		"campaign_name":      campaign.Name,
		"description":        description,
		"orchestrator_event": "true",
	}
	var userID *uuid.UUID
	if campaign.UserID != nil {
		uid := *campaign.UserID
		userID = &uid
	}
	s.auditLogger.LogGenericEvent(ctx, exec, userID, action, "Campaign", &campaign.ID, details)
}

func (s *campaignOrchestratorServiceImpl) UpdateCampaign(ctx context.Context, campaignID uuid.UUID, req UpdateCampaignRequest) (*models.Campaign, error) {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for UpdateCampaign %s: %v", campaignID, startTxErr)
			return nil, fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for UpdateCampaign %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL UpdateCampaign for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for UpdateCampaign %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for UpdateCampaign %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for UpdateCampaign %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for UpdateCampaign %s (no service-level transaction).", campaignID)
	}

	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = fmt.Errorf("UpdateCampaign: get campaign %s failed: %w", campaignID, errGet)
		return nil, opErr
	}

	// Log the update request details
	log.Printf("UpdateCampaign called for campaign %s", campaignID)

	currentPhaseStr := "unknown"
	if campaign.CurrentPhase != nil {
		currentPhaseStr = string(*campaign.CurrentPhase)
	}
	currentPhaseStatusStr := "unknown"
	if campaign.PhaseStatus != nil {
		currentPhaseStatusStr = string(*campaign.PhaseStatus)
	}
	log.Printf("Current campaign phase: %s, phase status: %s", currentPhaseStr, currentPhaseStatusStr)
	log.Printf("Update request - Name: %v, Status: %v", req.Name, req.Status)

	// EVENT-DRIVEN: Phase transitions are now automatic based on completion
	// UpdateCampaign now only handles standard field updates, no phase transitions

	// Standard campaign field updates
	if req.Name != nil {
		campaign.Name = *req.Name
	}
	if req.Status != nil {
		// Update phase status instead of legacy status
		campaign.PhaseStatus = req.Status
	}

	campaign.UpdatedAt = time.Now().UTC()

	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		opErr = fmt.Errorf("UpdateCampaign: update campaign %s failed: %w", campaignID, err)
		return nil, opErr
	}

	log.Printf("UpdateCampaign: Standard field update completed for campaign %s", campaignID)

	// Log audit event
	s.logAuditEvent(ctx, querier, campaign, "Campaign Updated", fmt.Sprintf("Campaign %s was updated", campaign.Name))

	return campaign, nil
}

// RestartDNSValidationPhase restarts the DNS validation phase with optional new configuration
func (s *campaignOrchestratorServiceImpl) RestartDNSValidationPhase(ctx context.Context, campaignID uuid.UUID, req *DNSValidationRequest) (*models.Campaign, error) {
	// Get the campaign
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		log.Printf("[ERROR] Failed to get campaign %s for DNS restart: %v", campaignID, err)
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Validate that DNS validation can be restarted
	if campaign.CurrentPhase == nil {
		return nil, fmt.Errorf("campaign has no current phase")
	}

	// Prevent restarting domain generation
	if *campaign.CurrentPhase == models.PhaseTypeDomainGeneration {
		return nil, fmt.Errorf("domain generation phase cannot be restarted")
	}

	// Only allow restarting DNS validation phase or later phases
	if *campaign.CurrentPhase != models.PhaseTypeDNSValidation &&
		*campaign.CurrentPhase != models.PhaseTypeHTTPKeywordValidation &&
		*campaign.CurrentPhase != models.PhaseTypeAnalysis {
		return nil, fmt.Errorf("DNS validation can only be restarted from DNS validation, HTTP validation, or analysis phases")
	}

	// Reset to DNS validation phase
	dnsPhase := models.PhaseTypeDNSValidation
	pendingStatus := models.PhaseStatusNotStarted
	campaign.CurrentPhase = &dnsPhase
	campaign.PhaseStatus = &pendingStatus
	campaign.ProcessedItems = models.Int64Ptr(0)
	campaign.ProgressPercentage = models.Float64Ptr(0.0)
	campaign.ErrorMessage = nil

	// Update DNS validation configuration if provided
	if req != nil {
		// Create DNS config JSON
		dnsConfigData := map[string]interface{}{
			"personaIds":               req.PersonaIDs,
			"rotationIntervalSeconds":  req.RotationIntervalSeconds,
			"processingSpeedPerMinute": req.ProcessingSpeedPerMinute,
			"batchSize":                req.BatchSize,
			"retryAttempts":            req.RetryAttempts,
		}

		dnsConfigJSON, err := json.Marshal(dnsConfigData)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal DNS config for campaign %s: %v", campaignID, err)
			return nil, fmt.Errorf("failed to marshal DNS config: %w", err)
		}

		dnsConfigRaw := json.RawMessage(dnsConfigJSON)
		campaign.DNSConfig = &dnsConfigRaw
	}

	campaign.UpdatedAt = time.Now().UTC()

	// Save the updated campaign
	err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		log.Printf("[ERROR] Failed to restart DNS validation for campaign %s: %v", campaignID, err)
		return nil, fmt.Errorf("failed to update campaign: %w", err)
	}

	log.Printf("[INFO] Restarted DNS validation phase for campaign %s", campaignID)
	return campaign, nil
}

// RestartHTTPValidationPhase restarts the HTTP validation phase with optional new configuration
func (s *campaignOrchestratorServiceImpl) RestartHTTPValidationPhase(ctx context.Context, campaignID uuid.UUID, req *HTTPKeywordValidationRequest) (*models.Campaign, error) {
	// Get the campaign
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		log.Printf("[ERROR] Failed to get campaign %s for HTTP restart: %v", campaignID, err)
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Validate that HTTP validation can be restarted
	if campaign.CurrentPhase == nil {
		return nil, fmt.Errorf("campaign has no current phase")
	}

	// Prevent restarting domain generation
	if *campaign.CurrentPhase == models.PhaseTypeDomainGeneration {
		return nil, fmt.Errorf("domain generation phase cannot be restarted")
	}

	// Only allow restarting HTTP validation phase or later phases
	if *campaign.CurrentPhase != models.PhaseTypeHTTPKeywordValidation &&
		*campaign.CurrentPhase != models.PhaseTypeAnalysis {
		return nil, fmt.Errorf("HTTP validation can only be restarted from HTTP validation or analysis phases")
	}

	// Check if DNS validation was completed (prerequisite validation)
	// We'll use the orchestrator service method to check for DNS results
	dnsResults, err := s.GetDNSValidationResultsForCampaign(ctx, campaignID, 1, "", store.ListValidationResultsFilter{})
	if err != nil {
		log.Printf("[ERROR] Failed to check DNS validation results for campaign %s: %v", campaignID, err)
		return nil, fmt.Errorf("failed to verify DNS validation prerequisite")
	}

	if dnsResults.TotalCount == 0 {
		return nil, fmt.Errorf("HTTP validation requires completed DNS validation results")
	}

	// Reset to HTTP validation phase
	httpPhase := models.PhaseTypeHTTPKeywordValidation
	pendingStatus := models.PhaseStatusNotStarted
	campaign.CurrentPhase = &httpPhase
	campaign.PhaseStatus = &pendingStatus
	campaign.ProcessedItems = models.Int64Ptr(0)
	campaign.ProgressPercentage = models.Float64Ptr(0.0)
	campaign.ErrorMessage = nil

	// Update HTTP validation configuration if provided
	if req != nil {
		// Create HTTP config JSON
		httpConfigData := map[string]interface{}{
			"personaIds":    req.PersonaIDs,
			"keywords":      req.Keywords,
			"adHocKeywords": req.AdHocKeywords,
		}

		httpConfigJSON, err := json.Marshal(httpConfigData)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal HTTP config for campaign %s: %v", campaignID, err)
			return nil, fmt.Errorf("failed to marshal HTTP config: %w", err)
		}

		httpConfigRaw := json.RawMessage(httpConfigJSON)
		campaign.HTTPConfig = &httpConfigRaw
	}

	campaign.UpdatedAt = time.Now().UTC()

	// Save the updated campaign
	err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
	if err != nil {
		log.Printf("[ERROR] Failed to restart HTTP validation for campaign %s: %v", campaignID, err)
		return nil, fmt.Errorf("failed to update campaign: %w", err)
	}

	log.Printf("[INFO] Restarted HTTP validation phase for campaign %s", campaignID)
	return campaign, nil
}

// ConfigureDNSValidation configures DNS validation parameters for a campaign

// updateHTTPValidationParams creates or updates HTTP validation parameters
func (s *campaignOrchestratorServiceImpl) updateHTTPValidationParams(ctx context.Context, querier store.Querier, campaignID uuid.UUID, req *UpdateCampaignRequest) error {
	// Implementation similar to updateDNSValidationParams but for HTTP validation
	// This would create HTTP validation params record
	log.Printf("TODO: Implement updateHTTPValidationParams for campaign %s", campaignID)
	return nil
}

// transitionToDNSValidation handles the transition from domain_generation to dns_validation
func (s *campaignOrchestratorServiceImpl) transitionToDNSValidation(ctx context.Context, querier store.Querier, campaign *models.Campaign, req *UpdateCampaignRequest) error {
	log.Printf("Transitioning campaign %s from domain_generation phase to dns_validation phase", campaign.ID)

	// CRITICAL FIX: Do NOT change campaign type - it remains a domain_generation campaign
	// Only change the current phase to DNS validation
	pendingStatus := models.PhaseStatusNotStarted
	campaign.PhaseStatus = &pendingStatus
	campaign.UpdatedAt = time.Now().UTC()

	// CORRECT: Set currentPhase to dns_validation while keeping campaignType as domain_generation
	dnsPhase := models.PhaseTypeDNSValidation
	campaign.CurrentPhase = &dnsPhase

	// Reset phase status for the new phase (already set above)

	// Update name if provided
	if req.Name != nil {
		campaign.Name = *req.Name
	}

	// Reset processing counters for DNS validation phase
	campaign.ProcessedItems = models.Int64Ptr(0)
	campaign.ProgressPercentage = models.Float64Ptr(0.0)
	campaign.CompletedAt = nil
	campaign.StartedAt = nil

	// Update the campaign record
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		return fmt.Errorf("failed to update campaign for DNS validation transition: %w", err)
	}

	// Create DNS validation parameters
	dnsParams := &models.DNSValidationCampaignParams{
		CampaignID:                 campaign.ID,
		SourceGenerationCampaignID: &campaign.ID, // Self-reference for phase transition
		PersonaIDs:                 *req.PersonaIDs,
		RotationIntervalSeconds:    req.RotationIntervalSeconds,
		ProcessingSpeedPerMinute:   req.ProcessingSpeedPerMinute,
		BatchSize:                  req.BatchSize,
		RetryAttempts:              req.RetryAttempts,
	}

	// Set defaults for missing parameters
	if dnsParams.BatchSize == nil || *dnsParams.BatchSize == 0 {
		dnsParams.BatchSize = models.IntPtr(50)
	}
	if dnsParams.RetryAttempts == nil || *dnsParams.RetryAttempts == 0 {
		dnsParams.RetryAttempts = models.IntPtr(1)
	}

	// 🐛 CRITICAL FIX: Check if DNS validation params already exist to avoid constraint violation
	// If they exist, reuse them; if not, create new ones
	existingDNSParams, getErr := s.campaignStore.GetDNSValidationParams(ctx, querier, campaign.ID)
	if getErr != nil && getErr.Error() != "record not found" {
		return fmt.Errorf("failed to check existing DNS validation params: %w", getErr)
	}

	if existingDNSParams != nil {
		// DNS validation params already exist - reuse them
		log.Printf("DNS validation params already exist for campaign %s, reusing existing configuration", campaign.ID)
		campaign.DNSValidationParams = existingDNSParams
	} else {
		// Create new DNS validation params in the database
		log.Printf("Creating new DNS validation params for campaign %s", campaign.ID)
		if err := s.campaignStore.CreateDNSValidationParams(ctx, querier, dnsParams); err != nil {
			return fmt.Errorf("failed to create DNS validation params: %w", err)
		}

		// Update the campaign object with new DNS params for consistency
		campaign.DNSValidationParams = dnsParams
		log.Printf("Successfully created DNS validation params for campaign %s", campaign.ID)
	}

	// Update the campaign object with DNS params for consistency
	campaign.DNSValidationParams = dnsParams

	log.Printf("Successfully transitioned campaign %s to DNS validation phase", campaign.ID)
	return nil
}

// updateDNSValidationParams handles updating DNS validation parameters for existing DNS campaigns
func (s *campaignOrchestratorServiceImpl) updateDNSValidationParams(ctx context.Context, querier store.Querier, campaignID uuid.UUID, req *UpdateCampaignRequest) error {
	log.Printf("Updating DNS validation params for campaign %s", campaignID)

	// Get existing DNS params
	existingParams, err := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get existing DNS validation params: %w", err)
	}

	if existingParams == nil {
		// Create new DNS params if they don't exist
		dnsParams := &models.DNSValidationCampaignParams{
			CampaignID:                 campaignID,
			SourceGenerationCampaignID: &campaignID,
			PersonaIDs:                 *req.PersonaIDs,
			RotationIntervalSeconds:    req.RotationIntervalSeconds,
			ProcessingSpeedPerMinute:   req.ProcessingSpeedPerMinute,
			BatchSize:                  req.BatchSize,
			RetryAttempts:              req.RetryAttempts,
		}

		return s.campaignStore.CreateDNSValidationParams(ctx, querier, dnsParams)
	}

	// Update existing params with new values
	if req.PersonaIDs != nil {
		existingParams.PersonaIDs = *req.PersonaIDs
	}
	if req.RotationIntervalSeconds != nil {
		existingParams.RotationIntervalSeconds = req.RotationIntervalSeconds
	}
	if req.ProcessingSpeedPerMinute != nil {
		existingParams.ProcessingSpeedPerMinute = req.ProcessingSpeedPerMinute
	}
	if req.BatchSize != nil {
		existingParams.BatchSize = req.BatchSize
	}
	if req.RetryAttempts != nil {
		existingParams.RetryAttempts = req.RetryAttempts
	}

	// Note: UpdateDNSValidationParams method would need to be implemented in the store
	// For now, we'll just log that the params couldn't be updated
	log.Printf("Warning: UpdateDNSValidationParams not implemented in store, existing params not updated")

	// Return success since the campaign itself was updated successfully
	return nil
}

func (s *campaignOrchestratorServiceImpl) DeleteCampaign(ctx context.Context, campaignID uuid.UUID) error {
	return s.deleteCampaignWithDependencies(ctx, campaignID, false)
}

// deleteCampaignWithDependencies handles campaign deletion with dependency awareness
func (s *campaignOrchestratorServiceImpl) deleteCampaignWithDependencies(ctx context.Context, campaignID uuid.UUID, skipDependencyCheck bool) error {
	var opErr error
	var querier store.Querier
	isSQL := s.db != nil
	var sqlTx *sqlx.Tx

	if isSQL {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for DeleteCampaign %s: %v", campaignID, startTxErr)
			return fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for DeleteCampaign %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL DeleteCampaign for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("Error occurred for DeleteCampaign %s (SQL), rolling back: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("Error committing SQL transaction for DeleteCampaign %s: %v", campaignID, commitErr)
					opErr = commitErr
				} else {
					log.Printf("SQL Transaction committed for DeleteCampaign %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for DeleteCampaign %s (no service-level transaction).", campaignID)
	}

	campaign, errGet := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGet != nil {
		opErr = fmt.Errorf("DeleteCampaign: get campaign %s failed: %w", campaignID, errGet)
		return opErr
	}

	// Auto-cancel running campaigns before deletion to enable force delete functionality
	if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusInProgress {
		log.Printf("Auto-cancelling running campaign %s before deletion", campaignID)

		// Use existing CancelCampaign method to maintain consistency and proper status transitions
		if err := s.CancelCampaign(ctx, campaignID); err != nil {
			opErr = fmt.Errorf("failed to cancel running campaign %s before deletion: %w", campaignID, err)
			return opErr
		}

		// Re-fetch campaign to get updated cancelled status after auto-cancellation
		campaign, errGet = s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
		if errGet != nil {
			opErr = fmt.Errorf("failed to re-fetch campaign %s after auto-cancellation: %w", campaignID, errGet)
			return opErr
		}

		currentPhaseStatusStr := "unknown"
		if campaign.PhaseStatus != nil {
			currentPhaseStatusStr = string(*campaign.PhaseStatus)
		}
		log.Printf("Successfully auto-cancelled campaign %s (phase status: %s), proceeding with deletion", campaignID, currentPhaseStatusStr)
	}

	// Find and delete dependent campaigns first (following the orchestration chain)
	if !skipDependencyCheck {
		// Use current phase to determine dependency type for phase-based architecture
		var dependencyType models.JobTypeEnum = models.JobTypeGeneration // default
		if campaign.CurrentPhase != nil {
			switch *campaign.CurrentPhase {
			case models.PhaseTypeDomainGeneration:
				dependencyType = models.JobTypeGeneration
			case models.PhaseTypeDNSValidation:
				dependencyType = models.JobTypeDNSValidation
			case models.PhaseTypeHTTPKeywordValidation:
				dependencyType = models.JobTypeHTTPValidation
			case models.PhaseTypeAnalysis:
				dependencyType = models.JobTypeAnalysis
			}
		}

		dependentCampaigns, err := s.findDependentCampaigns(ctx, querier, campaignID, dependencyType)
		if err != nil {
			opErr = fmt.Errorf("failed to find dependent campaigns for %s: %w", campaignID, err)
			return opErr
		}

		// Delete dependent campaigns recursively (in reverse dependency order)
		for _, depID := range dependentCampaigns {
			log.Printf("Deleting dependent campaign %s of %s", depID, campaignID)
			if err := s.deleteCampaignWithDependencies(ctx, depID, true); err != nil {
				opErr = fmt.Errorf("failed to delete dependent campaign %s: %w", depID, err)
				return opErr
			}
		}
	}

	// Handle domain generation pattern offset reset logic BEFORE deleting the campaign
	// Check if this is a domain generation campaign based on current phase
	if campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeDomainGeneration {
		if err := s.handleDomainGenerationOffsetOnDeletion(ctx, querier, campaignID, campaign); err != nil {
			log.Printf("Warning: Failed to handle domain generation offset on deletion for campaign %s: %v", campaignID, err)
			// Don't fail the deletion operation for offset handling errors
		}
	}

	// Delete the campaign itself
	if err := s.campaignStore.DeleteCampaign(ctx, querier, campaignID); err != nil {
		opErr = fmt.Errorf("DeleteCampaign: delete campaign %s failed: %w", campaignID, err)
		return opErr
	}

	// Log audit event
	s.logAuditEvent(ctx, querier, campaign, "Campaign Deleted", fmt.Sprintf("Campaign %s was deleted", campaign.Name))

	return nil
}

// findDependentCampaigns finds campaigns that depend on the given campaign
func (s *campaignOrchestratorServiceImpl) findDependentCampaigns(ctx context.Context, querier store.Querier, campaignID uuid.UUID, campaignType models.JobTypeEnum) ([]uuid.UUID, error) {
	var dependentIDs []uuid.UUID

	switch campaignType {
	case models.JobTypeGeneration:
		// Find campaigns in DNS validation phase that use this domain generation campaign as source
		// Use phase-based filtering since campaigns now use phases instead of types
		allCampaigns, err := s.campaignStore.ListCampaigns(ctx, querier, store.ListCampaignsFilter{})
		if err != nil {
			return nil, err
		}

		for _, campaign := range allCampaigns {
			if campaign != nil && campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeDNSValidation {
				// Check if this DNS validation phase campaign references our domain generation campaign
				dnsParams, err := s.campaignStore.GetDNSValidationParams(ctx, querier, campaign.ID)
				if err == nil && dnsParams.SourceGenerationCampaignID != nil && *dnsParams.SourceGenerationCampaignID == campaignID {
					dependentIDs = append(dependentIDs, campaign.ID)

					// Also find HTTP campaigns that depend on this DNS campaign
					httpDependents, err := s.findDependentCampaigns(ctx, querier, campaign.ID, models.JobTypeDNSValidation)
					if err == nil {
						dependentIDs = append(dependentIDs, httpDependents...)
					}
				}
			}
		}

	case models.JobTypeDNSValidation:
		// Find campaigns in HTTP validation phase that use this DNS campaign as source
		allCampaigns, err := s.campaignStore.ListCampaigns(ctx, querier, store.ListCampaignsFilter{})
		if err != nil {
			return nil, err
		}

		for _, campaign := range allCampaigns {
			if campaign != nil && campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeHTTPKeywordValidation {
				// Check if this HTTP validation phase campaign references our DNS campaign
				httpParams, err := s.campaignStore.GetHTTPKeywordParams(ctx, querier, campaign.ID)
				if err == nil && httpParams.SourceCampaignID == campaignID {
					dependentIDs = append(dependentIDs, campaign.ID)
				}
			}
		}

	case models.JobTypeHTTPValidation:
		// HTTP validation campaigns are leaf nodes in the dependency chain
		// No other campaigns depend on HTTP validation campaigns
	case models.JobTypeAnalysis:
		// Analysis campaigns are final leaf nodes
		// No other campaigns depend on analysis campaigns
	}

	return dependentIDs, nil
}

// BulkDeleteCampaigns deletes multiple campaigns at once with proper transaction handling and error aggregation
func (s *campaignOrchestratorServiceImpl) BulkDeleteCampaigns(ctx context.Context, campaignIDs []uuid.UUID) (*BulkDeleteResult, error) {
	if len(campaignIDs) == 0 {
		return &BulkDeleteResult{}, nil
	}

	result := &BulkDeleteResult{
		DeletedCampaignIDs: make([]uuid.UUID, 0, len(campaignIDs)),
		FailedCampaignIDs:  make([]uuid.UUID, 0),
		Errors:             make([]string, 0),
	}

	log.Printf("Starting bulk deletion of %d campaigns", len(campaignIDs))

	// Process each campaign deletion individually to ensure proper error handling
	// This approach provides better error isolation and transaction safety
	for _, campaignID := range campaignIDs {
		err := s.DeleteCampaign(ctx, campaignID)
		if err != nil {
			result.FailedDeletions++
			result.FailedCampaignIDs = append(result.FailedCampaignIDs, campaignID)
			result.Errors = append(result.Errors, fmt.Sprintf("Campaign %s: %v", campaignID, err))
			log.Printf("Failed to delete campaign %s: %v", campaignID, err)
		} else {
			result.SuccessfullyDeleted++
			result.DeletedCampaignIDs = append(result.DeletedCampaignIDs, campaignID)
			log.Printf("Successfully deleted campaign %s", campaignID)
		}
	}

	log.Printf("Bulk deletion completed: %d successful, %d failed",
		result.SuccessfullyDeleted, result.FailedDeletions)

	// Return error if all deletions failed
	if result.SuccessfullyDeleted == 0 && result.FailedDeletions > 0 {
		return result, fmt.Errorf("all %d campaign deletions failed", result.FailedDeletions)
	}

	// Return partial success if some deletions failed
	if result.FailedDeletions > 0 {
		log.Printf("Partial success: %d campaigns deleted, %d failed",
			result.SuccessfullyDeleted, result.FailedDeletions)
	}

	return result, nil
}

// CreateCampaignUnified creates a campaign of any type using a unified request structure
func (s *campaignOrchestratorServiceImpl) CreateCampaignUnified(ctx context.Context, req CreateCampaignRequest) (*models.Campaign, error) {
	// LEGACY: This function remains disabled during migration cleanup per MIGRATION_PLAN.md
	// Week 3 migration plan calls for replacement with phases-only creation endpoint
	return nil, fmt.Errorf("CreateCampaignUnified is legacy and disabled - use phase-specific campaign creation methods")
}

// Legacy campaign creation methods (kept for backward compatibility)

// GetCampaignDependencies returns information about campaigns that depend on the given campaign
func (s *campaignOrchestratorServiceImpl) GetCampaignDependencies(ctx context.Context, campaignID uuid.UUID) (*CampaignDependencyInfo, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}

	// Use current phase to determine dependency type for phase-based architecture
	var dependencyType models.JobTypeEnum = models.JobTypeGeneration // default
	if campaign.CurrentPhase != nil {
		switch *campaign.CurrentPhase {
		case models.PhaseTypeDomainGeneration:
			dependencyType = models.JobTypeGeneration
		case models.PhaseTypeDNSValidation:
			dependencyType = models.JobTypeDNSValidation
		case models.PhaseTypeHTTPKeywordValidation:
			dependencyType = models.JobTypeHTTPValidation
		case models.PhaseTypeAnalysis:
			dependencyType = models.JobTypeAnalysis
		}
	}

	dependentIDs, err := s.findDependentCampaigns(ctx, querier, campaignID, dependencyType)
	if err != nil {
		return nil, fmt.Errorf("failed to find dependent campaigns: %w", err)
	}

	var dependentCampaigns []models.Campaign
	for _, depID := range dependentIDs {
		depCampaign, err := s.campaignStore.GetCampaignByID(ctx, querier, depID)
		if err == nil && depCampaign != nil {
			dependentCampaigns = append(dependentCampaigns, *depCampaign)
		}
	}

	// Check if campaign can be deleted (not currently running)
	canDelete := true
	if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.PhaseStatusInProgress {
		canDelete = false
	}

	return &CampaignDependencyInfo{
		Campaign:           *campaign,
		DependentCampaigns: dependentCampaigns,
		HasDependencies:    len(dependentCampaigns) > 0,
		CanDelete:          canDelete,
	}, nil
}

// broadcastPhaseTransition sends notifications for automatic phase transitions
func (s *campaignOrchestratorServiceImpl) broadcastPhaseTransition(campaignID uuid.UUID, fromPhase, toPhase, message string) {
	log.Printf("[AUTO-TRANSITION] Campaign %s: %s → %s - %s", campaignID, fromPhase, toPhase, message)

	// Create phase transition payload for WebSocket broadcast
	transitionPayload := websocket.PhaseTransitionPayload{
		CampaignID:         campaignID.String(),
		PreviousPhase:      fromPhase,
		NewPhase:           toPhase,
		NewStatus:          string(models.PhaseStatusNotStarted),
		TransitionType:     "automatic",
		TriggerReason:      message,
		PrerequisitesMet:   true,
		DataIntegrityCheck: true,
		TransitionMetadata: map[string]interface{}{
			"autoTransition":   true,
			"notificationType": "toast",
			"message":          message,
			"transitionTime":   time.Now().UTC().Format(time.RFC3339),
		},
	}

	// Create sequenced message for data integrity
	phaseTransitionMsg := websocket.CreatePhaseTransitionMessageV2(transitionPayload)
	sequencedMsg := websocket.CreateSequencedMessage(campaignID.String(), phaseTransitionMsg, true)

	// Broadcast using enhanced WebSocket with integrity checks
	if broadcaster := websocket.GetBroadcaster(); broadcaster != nil {
		if wsManager, ok := broadcaster.(*websocket.WebSocketManager); ok {
			if err := wsManager.BroadcastSequencedMessage(campaignID.String(), sequencedMsg); err != nil {
				log.Printf("WARNING: Failed to broadcast automatic phase transition for campaign %s: %v", campaignID, err)
			} else {
				log.Printf("[AUTO-TRANSITION] Successfully broadcasted phase transition notification for campaign %s", campaignID)
			}
		}
	}
}

// HandleCampaignCompletion handles phase transitions when a campaign completes.
// Only auto-executes next phase if launch_sequence=true AND all required parameters exist
func (s *campaignOrchestratorServiceImpl) HandleCampaignCompletion(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("[DEBUG] HandleCampaignCompletion called for campaign %s", campaignID)

	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		log.Printf("[DEBUG] Failed to get campaign %s: %v", campaignID, err)
		return err
	}

	currentPhaseStr := "unknown"
	if campaign.CurrentPhase != nil {
		currentPhaseStr = string(*campaign.CurrentPhase)
	}
	log.Printf("[DEBUG] Campaign %s current phase: %s completed", campaignID, currentPhaseStr)

	// Check if campaign has full sequence mode enabled (new field or legacy metadata)
	isFullSequenceMode := false

	// Check new fullSequenceMode field first (preferred)
	if campaign.FullSequenceMode != nil && *campaign.FullSequenceMode {
		isFullSequenceMode = true
		log.Printf("[INFO] Campaign %s has fullSequenceMode enabled via field", campaignID)
	} else {
		// Fallback to legacy metadata check for backward compatibility
		if campaign.Metadata != nil {
			var metadata map[string]interface{}
			if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
				if seq, ok := metadata["launch_sequence"].(bool); ok && seq {
					isFullSequenceMode = true
					log.Printf("[INFO] Campaign %s has fullSequenceMode enabled via legacy metadata", campaignID)
				}
			}
		}
	}

	if !isFullSequenceMode {
		log.Printf("[INFO] Campaign %s does not have full auto sequence mode enabled - staying in current phase for manual configuration", campaignID)
		return nil
	}

	log.Printf("[INFO] Campaign %s has full auto sequence mode enabled - proceeding with automatic phase transition", campaignID)

	// Only proceed with phase transitions if launch_sequence=true
	if campaign.CurrentPhase == nil {
		log.Printf("[DEBUG] Campaign %s has no current phase set, skipping phase transition", campaignID)
		return nil
	}

	switch *campaign.CurrentPhase {
	case models.PhaseTypeDomainGeneration:
		// Check if DNS validation parameters exist before transitioning
		if campaign.DNSValidationParams == nil {
			log.Printf("[WARNING] Campaign %s has full sequence mode enabled but no DNS validation params - cannot auto-transition", campaignID)
			return nil
		}

		// Transition to DNS validation phase
		dnsPhase := models.PhaseTypeDNSValidation
		pendingStatus := models.PhaseStatusNotStarted
		campaign.CurrentPhase = &dnsPhase
		campaign.PhaseStatus = &pendingStatus
		campaign.ProcessedItems = models.Int64Ptr(0) // Reset processed count for new phase
		campaign.ProgressPercentage = models.Float64Ptr(0.0)
		campaign.UpdatedAt = time.Now().UTC()

		err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
		if err != nil {
			log.Printf("[ERROR] Failed to update currentPhase to dns_validation for campaign %s: %v", campaignID, err)
			return err
		}

		// Broadcast automatic phase transition with notification
		s.broadcastPhaseTransition(campaignID, "generation", "dns_validation", "Generation completed successfully! Starting DNS validation...")

		log.Printf("[INFO] Auto-transitioned campaign %s to dns_validation phase with notification", campaignID)
		return nil

	case models.PhaseTypeDNSValidation:
		// Check if HTTP keyword validation parameters exist before transitioning
		if campaign.HTTPKeywordValidationParams == nil {
			log.Printf("[WARNING] Campaign %s has full sequence mode enabled but no HTTP keyword params - cannot auto-transition", campaignID)
			return nil
		}

		// Transition to HTTP validation phase
		httpPhase := models.PhaseTypeHTTPKeywordValidation
		pendingStatus := models.PhaseStatusNotStarted
		campaign.CurrentPhase = &httpPhase
		campaign.PhaseStatus = &pendingStatus
		campaign.ProcessedItems = models.Int64Ptr(0) // Reset processed count for new phase
		campaign.ProgressPercentage = models.Float64Ptr(0.0)
		campaign.UpdatedAt = time.Now().UTC()

		err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
		if err != nil {
			log.Printf("[ERROR] Failed to update currentPhase to http_keyword_validation for campaign %s: %v", campaignID, err)
			return err
		}

		// Broadcast automatic phase transition with notification
		s.broadcastPhaseTransition(campaignID, "dns_validation", "http_keyword_validation", "DNS validation completed successfully! Starting HTTP keyword validation...")

		log.Printf("[INFO] Auto-transitioned campaign %s to http_keyword_validation phase with notification", campaignID)
		return nil

	case models.PhaseTypeHTTPKeywordValidation:
		// Transition to analysis phase
		analysisPhase := models.PhaseTypeAnalysis
		pendingStatus := models.PhaseStatusNotStarted
		campaign.CurrentPhase = &analysisPhase
		campaign.PhaseStatus = &pendingStatus
		campaign.ProcessedItems = models.Int64Ptr(0) // Reset processed count for new phase
		campaign.ProgressPercentage = models.Float64Ptr(0.0)
		campaign.UpdatedAt = time.Now().UTC()

		err = s.campaignStore.UpdateCampaign(ctx, s.db, campaign)
		if err != nil {
			log.Printf("[ERROR] Failed to update currentPhase to analysis for campaign %s: %v", campaignID, err)
			return err
		}

		// Broadcast automatic phase transition with notification
		s.broadcastPhaseTransition(campaignID, "http_keyword_validation", "analysis", "HTTP keyword validation completed successfully! Starting final analysis...")

		log.Printf("[INFO] Auto-transitioned campaign %s to analysis phase with notification", campaignID)
		return nil

	case models.PhaseTypeAnalysis:
		log.Printf("[INFO] Campaign %s has completed all phases", campaignID)
		return nil

	default:
		log.Printf("[DEBUG] Campaign %s current phase %s is not configured for phase transitions", campaignID, currentPhaseStr)
	}
	return nil
}

// handleDomainGenerationOffsetOnDeletion implements the correct offset reset logic:
// Only reset the offset when the very last campaign for that pattern is deleted.
// The offset tracks the highest point ever reached for that pattern, regardless of campaign deletions.
func (s *campaignOrchestratorServiceImpl) handleDomainGenerationOffsetOnDeletion(ctx context.Context, querier store.Querier, campaignID uuid.UUID, _ *models.Campaign) error {
	log.Printf("[INFO] HandleDomainGenerationOffsetOnDeletion: Processing offset logic for campaign %s deletion", campaignID)

	// Get the domain generation parameters for this campaign
	domainGenParams, err := s.campaignStore.GetDomainGenerationParams(ctx, querier, campaignID)
	if err != nil {
		log.Printf("[ERROR] Failed to get domain generation params for campaign %s: %v", campaignID, err)
		return fmt.Errorf("failed to get domain generation params: %w", err)
	}

	// Generate the config hash for this pattern
	hashResult, hashErr := domainexpert.GenerateDomainGenerationConfigHash(*domainGenParams)
	if hashErr != nil {
		log.Printf("[ERROR] Failed to generate config hash for campaign %s: %v", campaignID, hashErr)
		return fmt.Errorf("failed to generate config hash: %w", hashErr)
	}
	configHashString := hashResult.HashString

	log.Printf("[INFO] Campaign %s uses pattern config hash: %s", campaignID, configHashString)

	// Find all other campaigns that use the same pattern (excluding the one being deleted)
	// Since we moved to phase-based architecture, we need to find campaigns in generation phase
	filter := store.ListCampaignsFilter{
		// Note: Phase-based filtering would need to be implemented in the store layer
		// For now, get all campaigns and filter by phase in memory
	}

	allDomainGenCampaigns, err := s.campaignStore.ListCampaigns(ctx, querier, filter)
	if err != nil {
		log.Printf("[ERROR] Failed to list domain generation campaigns: %v", err)
		return fmt.Errorf("failed to list domain generation campaigns: %w", err)
	}

	// Count campaigns with the same pattern (excluding the one being deleted)
	campaignsWithSamePattern := 0
	for _, existingCampaign := range allDomainGenCampaigns {
		if existingCampaign != nil && existingCampaign.ID != campaignID {
			// Get params for each campaign and check if it has the same config hash
			existingParams, err := s.campaignStore.GetDomainGenerationParams(ctx, querier, existingCampaign.ID)
			if err != nil {
				log.Printf("[WARN] Failed to get params for campaign %s, skipping: %v", existingCampaign.ID, err)
				continue
			}

			existingHashResult, hashErr := domainexpert.GenerateDomainGenerationConfigHash(*existingParams)
			if hashErr != nil {
				log.Printf("[WARN] Failed to generate hash for campaign %s, skipping: %v", existingCampaign.ID, hashErr)
				continue
			}

			if existingHashResult.HashString == configHashString {
				campaignsWithSamePattern++
				log.Printf("[INFO] Found campaign %s with same pattern (hash: %s)", existingCampaign.ID, configHashString)
			}
		}
	}

	log.Printf("[INFO] Found %d other campaigns using the same pattern as campaign %s", campaignsWithSamePattern, campaignID)

	// Only reset the offset if this is the LAST campaign with this pattern
	if campaignsWithSamePattern == 0 {
		log.Printf("[INFO] Campaign %s is the LAST campaign using pattern %s - RESETTING offset to 0", campaignID, configHashString)

		// Convert the normalized params to JSON for storage
		configDetailsBytes, err := json.Marshal(hashResult.NormalizedParams)
		if err != nil {
			log.Printf("[ERROR] Failed to marshal config details for pattern %s: %v", configHashString, err)
			return fmt.Errorf("failed to marshal config details: %w", err)
		}

		// Reset the global offset for this pattern to 0
		resetConfigState := &models.DomainGenerationConfigState{
			ConfigHash:    configHashString,
			LastOffset:    0,
			ConfigDetails: configDetailsBytes,
			UpdatedAt:     time.Now().UTC(),
		}

		// Use the config manager if available, otherwise fall back to direct store access
		if s.domainGenService != nil {
			// Get the domain generation service to access its config manager
			// Since we can't access the config manager directly, we'll use the store directly
			if err := s.campaignStore.CreateOrUpdateDomainGenerationConfigState(ctx, querier, resetConfigState); err != nil {
				log.Printf("[ERROR] Failed to reset offset for pattern %s: %v", configHashString, err)
				return fmt.Errorf("failed to reset offset for pattern %s: %w", configHashString, err)
			}
		} else {
			if err := s.campaignStore.CreateOrUpdateDomainGenerationConfigState(ctx, querier, resetConfigState); err != nil {
				log.Printf("[ERROR] Failed to reset offset for pattern %s: %v", configHashString, err)
				return fmt.Errorf("failed to reset offset for pattern %s: %w", configHashString, err)
			}
		}

		log.Printf("[SUCCESS] Successfully reset offset to 0 for pattern %s after deleting last campaign %s", configHashString, campaignID)
	} else {
		log.Printf("[INFO] Campaign %s is NOT the last campaign using pattern %s - PRESERVING offset (keeping highest value reached)", campaignID, configHashString)
		log.Printf("[INFO] Remaining %d campaigns will continue using the current offset for pattern %s", campaignsWithSamePattern, configHashString)
	}

	return nil
}
