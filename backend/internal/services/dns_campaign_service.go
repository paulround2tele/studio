// File: backend/internal/services/dns_campaign_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

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

type dnsCampaignServiceImpl struct {
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	personaStore     store.PersonaStore
	auditLogStore    store.AuditLogStore
	auditLogger      *utils.AuditLogger
	campaignJobStore store.CampaignJobStore
	appConfig        *config.AppConfig
}

// NewDNSCampaignService creates a new DNSCampaignService.
func NewDNSCampaignService(db *sqlx.DB, cs store.CampaignStore, ps store.PersonaStore, as store.AuditLogStore, cjs store.CampaignJobStore, appCfg *config.AppConfig) DNSCampaignService {
	return &dnsCampaignServiceImpl{
		db:               db,
		campaignStore:    cs,
		personaStore:     ps,
		auditLogStore:    as,
		auditLogger:      utils.NewAuditLogger(as),
		campaignJobStore: cjs,
		appConfig:        appCfg,
	}
}

func (s *dnsCampaignServiceImpl) CreateCampaign(ctx context.Context, req CreateDNSValidationCampaignRequest) (*models.Campaign, error) {
	log.Printf("DNSCampaignService: CreateCampaign called - This should NOT create separate campaigns!")
	log.Printf("ARCHITECTURAL FIX: DNS phase transitions should use Campaign Orchestrator's UpdateCampaign with phase transition")

	// CRITICAL ARCHITECTURAL FIX:
	// This method should NOT exist for phase transitions. Phase transitions should be handled
	// by the Campaign Orchestrator's transitionToDNSValidation method using UpdateCampaign.
	//
	// This method violates the single-campaign architecture where:
	// - campaignType stays 'domain_generation'
	// - currentPhase changes to 'dns_validation'
	// - Domain status updates happen in-place on generated_domains table

	return nil, fmt.Errorf("ARCHITECTURAL VIOLATION: DNS phase transitions must use Campaign Orchestrator's UpdateCampaign, not CreateCampaign. Source campaign: %s", req.SourceGenerationCampaignID)
}

func (s *dnsCampaignServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DNSValidationCampaignParams, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get campaign by ID %s: %w", campaignID, err)
	}
	if campaign.CampaignType != models.CampaignTypeDNSValidation {
		return nil, nil, fmt.Errorf("campaign %s is not a DNS validation campaign (type: %s)", campaignID, campaign.CampaignType)
	}

	params, err := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get DNS validation params for campaign %s: %w", campaignID, err)
	}
	return campaign, params, nil
}

func (s *dnsCampaignServiceImpl) validatePersonaIDs(ctx context.Context, querier store.Querier, personaIDs []uuid.UUID, expectedType models.PersonaTypeEnum) error {
	if len(personaIDs) == 0 {
		return fmt.Errorf("%s Persona IDs required", expectedType)
	}
	for _, pID := range personaIDs {
		persona, err := s.personaStore.GetPersonaByID(ctx, querier, pID)
		if err != nil {
			if err == store.ErrNotFound {
				return fmt.Errorf("%s persona ID '%s' not found", expectedType, pID)
			}
			return fmt.Errorf("verifying %s persona ID '%s': %w", expectedType, pID, err)
		}
		if persona.PersonaType != expectedType {
			return fmt.Errorf("persona ID '%s' type '%s', expected '%s'", pID, persona.PersonaType, expectedType)
		}
		if !persona.IsEnabled {
			return fmt.Errorf("%s persona ID '%s' disabled", expectedType, pID)
		}
	}
	return nil
}

func (s *dnsCampaignServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.Campaign, action, description string) {
	if s.auditLogger == nil {
		return
	}
	s.auditLogger.LogCampaignEvent(ctx, exec, campaign, action, description)
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

// StartInPlaceDNSValidation starts DNS validation on an existing campaign using its stored configuration
func (s *dnsCampaignServiceImpl) StartInPlaceDNSValidation(ctx context.Context, req InPlaceDNSValidationRequest) error {
	log.Printf("INFO [In-Place DNS Validation]: Starting in-place DNS validation for campaign %s", req.CampaignID)

	// DEBUG: Check if database connection is nil
	if s.db == nil {
		log.Printf("ERROR [In-Place DNS Validation]: Database connection is nil in DNS service!")
		return fmt.Errorf("database connection is nil in DNS service")
	}
	log.Printf("DEBUG [In-Place DNS Validation]: Database connection is valid (%p)", s.db)

	// Get the campaign and its DNS validation parameters
	var campaign *models.Campaign
	var dnsParams *models.DNSValidationCampaignParams
	var err error

	if s.db != nil {
		// SQL implementation
		campaign, err = s.campaignStore.GetCampaignByID(ctx, s.db, req.CampaignID)
		if err != nil {
			return fmt.Errorf("failed to get campaign: %w", err)
		}

		dnsParams, err = s.campaignStore.GetDNSValidationParams(ctx, s.db, req.CampaignID)
		if err != nil {
			log.Printf("INFO [In-Place DNS Validation]: No existing DNS params found for campaign %s, using request parameters", req.CampaignID)
			dnsParams = nil
		}
	} else {
		return fmt.Errorf("database connection is nil - cannot perform in-place DNS validation")
	}

	// Validate campaign is suitable for in-place DNS validation
	if campaign.CampaignType != models.CampaignTypeDomainGeneration && campaign.CampaignType != models.CampaignTypeDNSValidation {
		return fmt.Errorf("campaign type %s is not suitable for DNS validation", campaign.CampaignType)
	}

	if campaign.Status != models.CampaignStatusCompleted && campaign.Status != models.CampaignStatusRunning {
		return fmt.Errorf("campaign must be completed or running to perform in-place DNS validation, current status: %s", campaign.Status)
	}

	// Determine persona IDs: use request personas if provided, otherwise use campaign's stored personas
	var personaIDs []uuid.UUID
	if len(req.PersonaIDs) > 0 {
		personaIDs = req.PersonaIDs
		log.Printf("INFO [In-Place DNS Validation]: Using personas from request: %v", personaIDs)
	} else if dnsParams != nil && len(dnsParams.PersonaIDs) > 0 {
		personaIDs = dnsParams.PersonaIDs
		log.Printf("INFO [In-Place DNS Validation]: Using personas from stored campaign config: %v", personaIDs)
	} else {
		return fmt.Errorf("no DNS personas found in request or campaign configuration - please configure DNS personas first")
	}

	// Determine other validation parameters (use request values or stored values or defaults)
	rotationInterval := req.RotationIntervalSeconds
	if rotationInterval == 0 && dnsParams != nil && dnsParams.RotationIntervalSeconds != nil {
		rotationInterval = *dnsParams.RotationIntervalSeconds
	}
	if rotationInterval == 0 {
		rotationInterval = 30 // Default: 30 seconds
	}

	processingSpeed := req.ProcessingSpeedPerMinute
	if processingSpeed == 0 && dnsParams != nil && dnsParams.ProcessingSpeedPerMinute != nil {
		processingSpeed = *dnsParams.ProcessingSpeedPerMinute
	}
	if processingSpeed == 0 {
		processingSpeed = 60 // Default: 60 domains per minute
	}

	batchSize := req.BatchSize
	if batchSize == 0 && dnsParams != nil && dnsParams.BatchSize != nil {
		batchSize = *dnsParams.BatchSize
	}
	if batchSize == 0 {
		batchSize = 10 // Default: 10 domains per batch
	}

	retryAttempts := req.RetryAttempts
	if retryAttempts == 0 && dnsParams != nil && dnsParams.RetryAttempts != nil {
		retryAttempts = *dnsParams.RetryAttempts
	}
	if retryAttempts == 0 {
		retryAttempts = 3 // Default: 3 retry attempts
	}

	log.Printf("INFO [In-Place DNS Validation]: Using validation parameters - Personas: %v, Rotation: %ds, Speed: %d/min, Batch: %d, Retries: %d",
		personaIDs, rotationInterval, processingSpeed, batchSize, retryAttempts)

	// Update or create DNS validation parameters for this campaign
	// CRITICAL FIX: Set SourceGenerationCampaignID to the same campaign ID for in-place validation
	sourceGenCampaignID := req.CampaignID
	updateParams := models.DNSValidationCampaignParams{
		CampaignID:                 req.CampaignID,
		SourceGenerationCampaignID: &sourceGenCampaignID,
		PersonaIDs:                 personaIDs,
		RotationIntervalSeconds:    &rotationInterval,
		ProcessingSpeedPerMinute:   &processingSpeed,
		BatchSize:                  &batchSize,
		RetryAttempts:              &retryAttempts,
	}

	// Store/update the DNS validation parameters
	err = s.campaignStore.CreateDNSValidationParams(ctx, nil, &updateParams)
	if err != nil {
		log.Printf("INFO [In-Place DNS Validation]: DNS params may already exist for campaign %s, continuing...", req.CampaignID)
	}

	// ATOMIC TRANSACTION: Update campaign state, phase, and broadcast in a single transaction
	err = s.atomicPhaseTransition(ctx, campaign, req.CampaignID)
	if err != nil {
		return fmt.Errorf("failed to perform atomic phase transition: %w", err)
	}

	// Create a job for the worker service to process the DNS validation
	if s.campaignJobStore != nil {
		jobCreationTime := time.Now().UTC()

		// Create job payload from the stored DNS validation params
		storedParams, getErr := s.campaignStore.GetDNSValidationParams(ctx, s.db, req.CampaignID)
		if getErr != nil {
			log.Printf("WARNING [In-Place DNS Validation]: Failed to get stored DNS params for job payload: %v", getErr)
		}

		job := &models.CampaignJob{
			ID:              uuid.New(),
			CampaignID:      req.CampaignID,
			JobType:         models.CampaignTypeDNSValidation,
			Status:          models.JobStatusQueued,
			ScheduledAt:     jobCreationTime,
			NextExecutionAt: sql.NullTime{Time: jobCreationTime, Valid: true},
			CreatedAt:       jobCreationTime,
			UpdatedAt:       jobCreationTime,
			MaxAttempts:     3,
		}

		// Add job payload if we successfully retrieved the DNS params
		if storedParams != nil {
			payloadBytes, err := json.Marshal(storedParams)
			if err != nil {
				log.Printf("WARNING [In-Place DNS Validation]: Failed to marshal DNS validation job payload: %v", err)
			} else {
				rawMsg := json.RawMessage(payloadBytes)
				job.JobPayload = &rawMsg
			}
		}

		if err := s.campaignJobStore.CreateJob(ctx, s.db, job); err != nil {
			log.Printf("ERROR [In-Place DNS Validation]: Failed to create DNS validation job for campaign %s: %v", req.CampaignID, err)
			return fmt.Errorf("failed to create DNS validation job: %w", err)
		} else {
			log.Printf("SUCCESS [In-Place DNS Validation]: Created DNS validation job %s for campaign %s", job.ID, req.CampaignID)
		}
	} else {
		log.Printf("WARNING [In-Place DNS Validation]: campaignJobStore is nil for campaign %s. DNS validation configured but no job created.", req.CampaignID)
	}

	// CRITICAL FIX: Immediately broadcast phase transition to frontend
	log.Printf("BROADCAST [In-Place DNS Validation]: Broadcasting phase transition to dns_validation for campaign %s", req.CampaignID)
	websocket.BroadcastCampaignProgress(req.CampaignID.String(), 0.0, "running", "dns_validation")

	log.Printf("SUCCESS [In-Place DNS Validation]: Successfully configured in-place DNS validation for campaign %s with personas %v", req.CampaignID, personaIDs)
	return nil
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
	originalStatus := campaign.Status
	if campaign.Status == models.CampaignStatusPending || campaign.Status == models.CampaignStatusQueued {
		campaign.Status = models.CampaignStatusRunning
		now := time.Now().UTC()
		campaign.StartedAt = &now
		if errUpdateCamp := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCamp != nil {
			opErr = fmt.Errorf("failed to mark campaign %s as running: %w", campaignID, errUpdateCamp)
			return false, 0, opErr
		}
		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s marked as Running (was %s).", campaignID, originalStatus)
	} else if campaign.Status != models.CampaignStatusRunning && campaign.Status != models.CampaignStatusCompleted && campaign.Status != models.CampaignStatusPaused {
		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s not runnable (status: %s). DNS validation requires status: running, completed, or paused.", campaignID, campaign.Status)
		return true, 0, nil
	}

	dnsParams, errGetParams := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID)
	if errGetParams != nil {
		opErr = fmt.Errorf("failed to fetch DNS params for campaign %s: %w", campaignID, errGetParams)
		return false, 0, opErr
	}
	if dnsParams.SourceGenerationCampaignID == nil {
		opErr = fmt.Errorf("ProcessDNSValidationCampaignBatch: SourceGenerationCampaignID is nil for DNS params of campaign %s", campaignID)
		return false, 0, opErr
	}
	sourceGenParams, errGetSourceParams := s.campaignStore.GetDomainGenerationParams(ctx, querier, *dnsParams.SourceGenerationCampaignID)
	if errGetSourceParams != nil {
		opErr = fmt.Errorf("failed to fetch params for source generation campaign %s: %w", dnsParams.SourceGenerationCampaignID, errGetSourceParams)
		return false, 0, opErr
	}
	expectedTotalItems := int64(sourceGenParams.NumDomainsToGenerate)
	if campaign.TotalItems == nil || *campaign.TotalItems != expectedTotalItems {
		log.Printf("ProcessDNSValidationCampaignBatch: Correcting TotalItems for campaign %s from %v to %d based on source.",
			campaignID, campaign.TotalItems, expectedTotalItems)
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
	if *campaign.ProcessedItems >= *campaign.TotalItems && *campaign.TotalItems > 0 && campaign.Status == models.CampaignStatusCompleted {
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
			campaign.Status = models.CampaignStatusRunning
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

	var batchSizeVal int
	if dnsParams.BatchSize != nil && *dnsParams.BatchSize > 0 {
		batchSizeVal = *dnsParams.BatchSize
	} else {
		batchSizeVal = 1000 // Phase 3: 20x increase for enterprise infrastructure
	}
	// Ensure SourceGenerationCampaignID is not nil before dereferencing
	if dnsParams.SourceGenerationCampaignID == nil {
		opErr = fmt.Errorf("ProcessDNSValidationCampaignBatch: SourceGenerationCampaignID is nil when trying to get domains for campaign %s", campaignID)
		return false, 0, opErr
	}
	domainsToProcess, errGetDomains := s.campaignStore.GetDomainsForDNSValidation(ctx, querier, campaignID, *dnsParams.SourceGenerationCampaignID, batchSizeVal, 0)
	if errGetDomains != nil {
		opErr = fmt.Errorf("failed to get domains for DNS validation for campaign %s: %w", campaignID, errGetDomains)
		return false, 0, opErr
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
			campaign.Status = models.CampaignStatusCompleted
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			log.Printf("ProcessDNSValidationCampaignBatch: All domains processed for campaign %s. Marking complete.", campaignID)
			done = true
		} else if *campaign.TotalItems == 0 {
			campaign.Status = models.CampaignStatusCompleted
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now
			log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s has 0 total items. Marking complete.", campaignID)
			done = true
		} else {
			log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s has %d/%d processed, but no domains fetched for this batch. May need more jobs or source completed.", campaignID, *campaign.ProcessedItems, *campaign.TotalItems)
			done = true
		}
		opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
		return done, 0, opErr
	}

	personas := make([]*models.Persona, 0, len(dnsParams.PersonaIDs))
	for _, pID := range dnsParams.PersonaIDs {
		p, pErr := s.personaStore.GetPersonaByID(ctx, querier, pID)
		if pErr != nil {
			opErr = fmt.Errorf("failed to fetch DNS persona %s for campaign %s: %w", pID, campaignID, pErr)
			return false, 0, opErr
		}
		if p.PersonaType != models.PersonaTypeDNS || !p.IsEnabled {
			opErr = fmt.Errorf("persona %s is not a valid/enabled DNS persona for campaign %s", pID, campaignID)
			return false, 0, opErr
		}
		personas = append(personas, p)
	}
	if len(personas) == 0 {
		opErr = fmt.Errorf("no valid DNS personas configured for campaign %s", campaignID)
		return false, 0, opErr
	}

	var wg sync.WaitGroup
	concurrencyLimit := s.appConfig.Worker.DNSSubtaskConcurrency
	if concurrencyLimit <= 0 {
		concurrencyLimit = 75 // Phase 3: 7.5x increase for 1000-domain batches
	}
	semaphore := make(chan struct{}, concurrencyLimit)
	muResults := sync.Mutex{}
	dbResults := make([]*models.DNSValidationResult, 0, len(domainsToProcess))
	nowTime := time.Now().UTC()

	// Store the original context error, if any, to check after the loop
	// This helps determine if the loop was cut short by cancellation.
	var batchProcessingContextErr error
	batchCtx, batchCancel := context.WithCancel(ctx) // Create a cancellable context for this batch
	defer batchCancel()                              // Ensure cancellation if function exits early for other reasons

	for _, domainToValidate := range domainsToProcess {
		// Check for batch context cancellation before starting new goroutine
		if batchCtx.Err() != nil {
			log.Printf("Batch context cancelled before processing domain %s for campaign %s", domainToValidate.DomainName, campaignID)
			batchProcessingContextErr = batchCtx.Err()
			break // Exit the domain processing loop
		}

		wg.Add(1)
		semaphore <- struct{}{}
		go func(domainModel models.GeneratedDomain) {
			defer wg.Done()
			defer func() { <-semaphore }()

			var finalValidationResult *dnsvalidator.ValidationResult
			var successPersonaID uuid.NullUUID
			attemptCount := 0

			for i, persona := range personas {
				// Check for batch context cancellation before each persona attempt
				if batchCtx.Err() != nil {
					log.Printf("Batch context cancelled during persona processing for domain %s (persona %s)", domainModel.DomainName, persona.ID)
					finalValidationResult = &dnsvalidator.ValidationResult{Domain: domainModel.DomainName, Status: constants.DNSStatusError, Error: fmt.Sprintf("Context cancelled during persona %s processing", persona.ID)}
					goto StoreResultInGoRoutine
				}

				attemptCount++

				var modelDNSDetails models.DNSConfigDetails
				if errUnmarshal := json.Unmarshal(persona.ConfigDetails, &modelDNSDetails); errUnmarshal != nil {
					log.Printf("Error unmarshalling DNS persona %s ConfigDetails for domain %s: %v. Using app defaults.", persona.ID, domainModel.DomainName, errUnmarshal)
					validator := dnsvalidator.New(s.appConfig.DNSValidator)
					valResult := validator.ValidateSingleDomain(domainModel.DomainName, batchCtx) // Use batchCtx
					finalValidationResult = &valResult
					goto StoreResultInGoRoutine
				}

				configDNSJSON := modelsDNStoConfigDNSJSON(modelDNSDetails)
				validatorConfig := config.ConvertJSONToDNSConfig(configDNSJSON)
				validator := dnsvalidator.New(validatorConfig)
				valResult := validator.ValidateSingleDomain(domainModel.DomainName, batchCtx) // Use batchCtx

				if valResult.Status == constants.DNSStatusResolved {
					finalValidationResult = &valResult
					successPersonaID = uuid.NullUUID{UUID: persona.ID, Valid: true}
					goto StoreResultInGoRoutine
				}
				finalValidationResult = &valResult

				rotationInterval := 0
				if dnsParams.RotationIntervalSeconds != nil {
					rotationInterval = *dnsParams.RotationIntervalSeconds
				}
				if i < len(personas)-1 && rotationInterval > 0 {
					select {
					case <-batchCtx.Done(): // Use batchCtx.Done()
						log.Printf("Batch context cancelled during DNS persona rotation for domain %s", domainModel.DomainName)
						finalValidationResult = &dnsvalidator.ValidationResult{Domain: domainModel.DomainName, Status: constants.DNSStatusError, Error: "Context cancelled during rotation"}
						goto StoreResultInGoRoutine
					case <-time.After(time.Duration(rotationInterval) * time.Second):
						// Continue
					}
				}
			} // End persona loop

			// After persona loop, check batch context one last time
			if batchCtx.Err() != nil && finalValidationResult == nil { // only if not already set due to cancellation
				log.Printf("Batch context cancelled after all DNS persona attempts for domain %s", domainModel.DomainName)
				finalValidationResult = &dnsvalidator.ValidationResult{
					Domain: domainModel.DomainName,
					Status: constants.DNSStatusError,
					Error:  "Context cancelled after all attempts",
				}
			}

		StoreResultInGoRoutine:
			if finalValidationResult == nil {
				log.Printf("CRITICAL: finalValidationResult is nil for domain %s before storing. Setting to generic error.", domainModel.DomainName)
				finalValidationResult = &dnsvalidator.ValidationResult{
					Domain: domainModel.DomainName,
					Status: constants.DNSStatusError,
					Error:  "Internal processing error: validation result not captured.",
				}
			}

			dbRes := &models.DNSValidationResult{
				ID:                   uuid.New(),
				DNSCampaignID:        campaignID,
				GeneratedDomainID:    uuid.NullUUID{UUID: domainModel.ID, Valid: true},
				DomainName:           domainModel.DomainName,
				ValidationStatus:     finalValidationResult.Status,
				ValidatedByPersonaID: successPersonaID,
				Attempts:             models.IntPtr(attemptCount),
				LastCheckedAt:        &nowTime,
			}
			if len(finalValidationResult.IPs) > 0 {
				ipBytes, _ := json.Marshal(finalValidationResult.IPs)
				dbRes.DNSRecords = models.JSONRawMessagePtr(json.RawMessage(ipBytes))
			} else if finalValidationResult.Error != "" {
				errorMap := map[string]string{"error": finalValidationResult.Error}
				errorBytes, _ := json.Marshal(errorMap)
				dbRes.DNSRecords = models.JSONRawMessagePtr(json.RawMessage(errorBytes))
			}

			// CRITICAL FIX: Stream individual DNS validation result as it completes
			log.Printf("🔴 [DNS_STREAMING_DEBUG] Attempting to stream DNS result for domain %s, status: %s, campaign: %s",
				domainModel.DomainName, finalValidationResult.Status, campaignID)

			// Prepare DNS records map for message payload
			dnsRecordsMap := make(map[string]interface{})
			if len(finalValidationResult.IPs) > 0 {
				dnsRecordsMap["ips"] = finalValidationResult.IPs
			}
			if finalValidationResult.Error != "" {
				dnsRecordsMap["error"] = finalValidationResult.Error
			}

			// Create consolidated message using new standardized format
			payload := websocket.DNSValidationPayload{
				CampaignID:       campaignID.String(),
				DomainID:         dbRes.ID.String(),
				Domain:           domainModel.DomainName,
				ValidationStatus: finalValidationResult.Status,
				DNSRecords:       dnsRecordsMap,
				Attempts:         attemptCount,
				ProcessingTime:   0, // Could be calculated if needed
				TotalValidated:   0, // Could be calculated if needed
			}

			// ENHANCED: Try WebSocket broadcast with fallback mechanism
			if err := s.streamDNSResultWithFallback(ctx, campaignID.String(), payload); err != nil {
				log.Printf("❌ [DNS_STREAMING_ERROR] Failed to stream DNS result for domain %s, campaign %s: %v",
					domainModel.DomainName, campaignID, err)
				// Continue execution - streaming failure should not break the validation process
			} else {
				log.Printf("✅ [DNS_STREAMING_SUCCESS] Successfully streamed DNS result: domain=%s, status=%s, campaign=%s",
					domainModel.DomainName, finalValidationResult.Status, campaignID)
			}

			muResults.Lock()
			dbResults = append(dbResults, dbRes)
			muResults.Unlock()
		}(*domainToValidate)
	}
	wg.Wait()

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

	if *campaign.TotalItems > 0 {
		*campaign.ProgressPercentage = (float64(*campaign.ProcessedItems) / float64(*campaign.TotalItems)) * 100
		if *campaign.ProgressPercentage > 100 {
			*campaign.ProgressPercentage = 100
		}
	} else if *campaign.TotalItems == 0 { // If total is 0, it's 100% done
		*campaign.ProgressPercentage = 100
	}

	// Determine 'done' status based on current state, even if there was a context error
	if *campaign.ProcessedItems >= *campaign.TotalItems && *campaign.TotalItems > 0 {
		campaign.Status = models.CampaignStatusCompleted
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		campaign.CompletedAt = &nowTime
		done = true
		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s completed DNS validation (post-batch).", campaignID)
	} else if *campaign.TotalItems == 0 {
		campaign.Status = models.CampaignStatusCompleted
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		campaign.CompletedAt = &nowTime
		done = true
		log.Printf("ProcessDNSValidationCampaignBatch: Campaign %s has 0 total items, marked as completed (post-batch).", campaignID)
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
			websocket.BroadcastCampaignProgress(campaignID.String(), 100.0, "completed", "dns_validation")
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
		// Create standardized message using new V2 format
		message := websocket.CreateDNSValidationMessageV2(payload)

		// Convert standardized message to legacy format for compatibility
		legacyMessage := websocket.WebSocketMessage{
			ID:         uuid.New().String(),
			Timestamp:  message.Timestamp.Format(time.RFC3339),
			Type:       message.Type,
			CampaignID: campaignID,
			Data:       payload,
		}

		// Attempt broadcast using existing method
		broadcaster.BroadcastToCampaign(campaignID, legacyMessage)
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
func (s *dnsCampaignServiceImpl) atomicPhaseTransition(ctx context.Context, campaign *models.Campaign, campaignID uuid.UUID) error {
	// Use the established transaction manager pattern from the codebase
	tm := utils.NewTransactionManager(s.db)

	return tm.WithTransaction(ctx, "DNS_Phase_Transition", func(querier store.Querier) error {
		log.Printf("INFO [Atomic Phase Transition]: Starting atomic transition for campaign %s", campaignID)

		// Step 1: Update campaign status to running if it was completed (within transaction)
		if campaign.Status == models.CampaignStatusCompleted {
			err := s.campaignStore.UpdateCampaignStatus(ctx, querier, campaignID, models.CampaignStatusRunning, sql.NullString{})
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
		dnsValidationPhase := models.CampaignPhaseDNSValidation
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
	websocket.BroadcastCampaignProgress(campaignID.String(), 0.0, newStatus, newPhase)

	// Create phase transition event message
	transitionMessage := websocket.WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().Format(time.RFC3339),
		Type:       "phase_transition",
		CampaignID: campaignID.String(),
		Data: map[string]interface{}{
			"campaignId":     campaignID.String(),
			"previousPhase":  "domain_generation", // Could be made dynamic if needed
			"newPhase":       newPhase,
			"newStatus":      newStatus,
			"timestamp":      time.Now().Format(time.RFC3339),
			"transitionType": "dns_validation_start",
		},
	}

	// Broadcast the phase transition event
	if broadcaster := websocket.GetBroadcaster(); broadcaster != nil {
		broadcaster.BroadcastToCampaign(campaignID.String(), transitionMessage)
		log.Printf("✅ [Phase Transition]: WebSocket phase transition event broadcast successful for campaign %s", campaignID)
	} else {
		log.Printf("⚠️ [Phase Transition]: No WebSocket broadcaster available for campaign %s", campaignID)
	}
}
