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

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type campaignOrchestratorServiceImpl struct {
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	personaStore     store.PersonaStore
	keywordStore     store.KeywordStore
	auditLogStore    store.AuditLogStore
	campaignJobStore store.CampaignJobStore

	// Specialized services
	domainGenService   DomainGenerationService
	dnsService         DNSCampaignService
	httpKeywordService HTTPKeywordCampaignService

	// Centralized state coordination (replaces local state machine)
	stateCoordinator StateCoordinator

	// BL-006 compliance: Audit context service for complete user context integration
	auditContextService AuditContextService

	// SI-001: Enhanced transaction management for campaign operations
	transactionManager store.TransactionManager
}

func NewCampaignOrchestratorService(
	db *sqlx.DB,
	cs store.CampaignStore, ps store.PersonaStore, ks store.KeywordStore, as store.AuditLogStore, cjs store.CampaignJobStore,
	dgs DomainGenerationService, dNSService DNSCampaignService, hkService HTTPKeywordCampaignService,
	stateCoordinator StateCoordinator, auditContextService AuditContextService,
	transactionManager store.TransactionManager,
) CampaignOrchestratorService {
	return &campaignOrchestratorServiceImpl{
		db:                  db,
		campaignStore:       cs,
		personaStore:        ps,
		keywordStore:        ks,
		auditLogStore:       as,
		campaignJobStore:    cjs,
		domainGenService:    dgs,
		dnsService:          dNSService,
		httpKeywordService:  hkService,
		stateCoordinator:    stateCoordinator,
		auditContextService: auditContextService,
		transactionManager:  transactionManager,
	}
}

func (s *campaignOrchestratorServiceImpl) CreateDomainGenerationCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: Delegating CreateDomainGenerationCampaign for Name: %s", req.Name)
	return s.domainGenService.CreateCampaign(ctx, req)
}

func (s *campaignOrchestratorServiceImpl) CreateDNSValidationCampaign(ctx context.Context, req CreateDNSValidationCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: Delegating CreateDNSValidationCampaign for Name: %s", req.Name)
	return s.dnsService.CreateCampaign(ctx, req)
}

func (s *campaignOrchestratorServiceImpl) CreateHTTPKeywordCampaign(ctx context.Context, req CreateHTTPKeywordCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: Delegating CreateHTTPKeywordCampaign for Name: %s", req.Name)
	return s.httpKeywordService.CreateCampaign(ctx, req)
}

func (s *campaignOrchestratorServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, interface{}, error) {
	fmt.Printf("[DEBUG orchestrator] GetCampaignDetails called for campaign ID: %s\n", campaignID)
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}
	baseCampaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		fmt.Printf("[DEBUG orchestrator] Error getting campaign: %v\n", err)
		return nil, nil, fmt.Errorf("orchestrator: get campaign failed: %w", err)
	}
	fmt.Printf("[DEBUG orchestrator] Campaign type: %s\n", baseCampaign.CampaignType)

	var specificParams interface{}
	var specificErr error

	fmt.Printf("[DEBUG orchestrator] Entering switch for campaign type: %s\n", baseCampaign.CampaignType)
	switch baseCampaign.CampaignType {
	case models.CampaignTypeDomainGeneration:
		fmt.Printf("[DEBUG orchestrator] Handling DomainGeneration case\n")
		_, params, errGet := s.domainGenService.GetCampaignDetails(ctx, campaignID)
		if errGet != nil {
			specificErr = fmt.Errorf("orchestrator: get domain gen params failed: %w", errGet)
		} else {
			specificParams = params
			baseCampaign.DomainGenerationParams = params
		}
	case models.CampaignTypeDNSValidation:
		fmt.Printf("[DEBUG orchestrator] Handling DNSValidation case\n")
		_, params, errGet := s.dnsService.GetCampaignDetails(ctx, campaignID)
		if errGet != nil {
			specificErr = fmt.Errorf("orchestrator: get dns validation params failed: %w", errGet)
		} else {
			specificParams = params
			baseCampaign.DNSValidationParams = params
		}
	case models.CampaignTypeHTTPKeywordValidation:
		fmt.Printf("[DEBUG orchestrator] Handling HTTPKeywordValidation case\n")
		fmt.Printf("[DEBUG orchestrator] Calling httpKeywordService.GetCampaignDetails for campaign ID: %s\n", campaignID)
		_, params, errGet := s.httpKeywordService.GetCampaignDetails(ctx, campaignID)
		if errGet != nil {
			fmt.Printf("[DEBUG orchestrator] Error from httpKeywordService.GetCampaignDetails: %v\n", errGet)
			specificErr = fmt.Errorf("orchestrator: get http keyword params failed: %w", errGet)
		} else {
			fmt.Printf("[DEBUG orchestrator] httpKeywordService.GetCampaignDetails returned params: %+v\n", params)
			typeStr := fmt.Sprintf("%T", params)
			fmt.Printf("[DEBUG orchestrator] (before assign) params type: %s, ptr: %p, PersonaIDs: %+v (len=%d)\n", typeStr, params, params.PersonaIDs, len(params.PersonaIDs))

			// Detailed inspection of incoming PersonaIDs
			if len(params.PersonaIDs) > 0 {
				fmt.Printf("[DEBUG orchestrator] First PersonaID from service: %s\n", params.PersonaIDs[0])
			} else {
				fmt.Printf("[DEBUG orchestrator] WARNING: Incoming PersonaIDs slice is empty!\n")
			}

			// Create a new instance of HTTPKeywordCampaignParams with all fields copied
			// This ensures we don't lose the PersonaIDs during assignment
			newParams := &models.HTTPKeywordCampaignParams{
				CampaignID:       params.CampaignID,
				SourceCampaignID: params.SourceCampaignID,
				// KeywordSetIDs and PersonaIDs are not pointers to slices in the model, direct copy is fine.
				KeywordSetIDs:            make([]uuid.UUID, len(params.KeywordSetIDs)),
				PersonaIDs:               make([]uuid.UUID, len(params.PersonaIDs)),
				ProxyPoolID:              params.ProxyPoolID,
				ProxySelectionStrategy:   params.ProxySelectionStrategy,
				RotationIntervalSeconds:  params.RotationIntervalSeconds,  // These are *int, direct assignment of pointer is fine
				ProcessingSpeedPerMinute: params.ProcessingSpeedPerMinute, // *int
				BatchSize:                params.BatchSize,                // *int
				RetryAttempts:            params.RetryAttempts,            // *int
				LastProcessedDomainName:  params.LastProcessedDomainName,  // *string
				SourceType:               params.SourceType,
				Metadata:                 params.Metadata, // *json.RawMessage
			}

			// Deep copy for slices that are pointers in the model
			if params.AdHocKeywords != nil {
				adhocCopy := make([]string, len(*params.AdHocKeywords))
				copy(adhocCopy, *params.AdHocKeywords)
				newParams.AdHocKeywords = &adhocCopy
			} else {
				newParams.AdHocKeywords = nil
			}

			if params.TargetHTTPPorts != nil {
				targetPortsCopy := make([]int, len(*params.TargetHTTPPorts))
				copy(targetPortsCopy, *params.TargetHTTPPorts)
				newParams.TargetHTTPPorts = &targetPortsCopy
			} else {
				newParams.TargetHTTPPorts = nil
			}

			if params.ProxyIDs != nil {
				proxyIDsCopy := make([]uuid.UUID, len(*params.ProxyIDs))
				copy(proxyIDsCopy, *params.ProxyIDs)
				newParams.ProxyIDs = &proxyIDsCopy
			} else {
				newParams.ProxyIDs = nil
			}

			// Copy non-pointer slice contents
			copy(newParams.KeywordSetIDs, params.KeywordSetIDs)
			copy(newParams.PersonaIDs, params.PersonaIDs)

			fmt.Printf("[DEBUG orchestrator] Created deep copy with PersonaIDs: %+v (len=%d)\n", newParams.PersonaIDs, len(newParams.PersonaIDs))

			// Explicitly set the specificParams first
			specificParams = newParams

			// Then set the baseCampaign.HTTPKeywordValidationParams
			baseCampaign.HTTPKeywordValidationParams = newParams

			// Verify both pointers are the same
			fmt.Printf("[DEBUG orchestrator] specificParams ptr: %p\n", specificParams)
			fmt.Printf("[DEBUG orchestrator] baseCampaign.HTTPKeywordValidationParams ptr: %p\n", baseCampaign.HTTPKeywordValidationParams)

			// Final verification of PersonaIDs
			fmt.Printf("[DEBUG orchestrator] (after assign) baseCampaign.HTTPKeywordValidationParams type: %T, ptr: %p\n", baseCampaign.HTTPKeywordValidationParams, baseCampaign.HTTPKeywordValidationParams)
			fmt.Printf("[DEBUG orchestrator] (after assign) baseCampaign.HTTPKeywordValidationParams.PersonaIDs: %+v (len=%d)\n", baseCampaign.HTTPKeywordValidationParams.PersonaIDs, len(baseCampaign.HTTPKeywordValidationParams.PersonaIDs))
			fmt.Printf("[DEBUG orchestrator] (after assign) specificParams.(*models.HTTPKeywordCampaignParams).PersonaIDs: %+v (len=%d)\n", specificParams.(*models.HTTPKeywordCampaignParams).PersonaIDs, len(specificParams.(*models.HTTPKeywordCampaignParams).PersonaIDs))
		}
	default:
		specificErr = fmt.Errorf("orchestrator: unknown campaign type '%s' for campaign %s", baseCampaign.CampaignType, campaignID)
	}

	if specificErr != nil {
		return baseCampaign, nil, specificErr
	}

	// Final verification before returning
	fmt.Printf("[DEBUG orchestrator] FINAL CHECK - specificParams type: %T\n", specificParams)
	if specificParams != nil && baseCampaign.CampaignType == models.CampaignTypeHTTPKeywordValidation {
		httpParams, ok := specificParams.(*models.HTTPKeywordCampaignParams)
		if ok {
			fmt.Printf("[DEBUG orchestrator] FINAL CHECK - specificParams.PersonaIDs: %+v (len=%d)\n",
				httpParams.PersonaIDs, len(httpParams.PersonaIDs))
		}
	}

	return baseCampaign, specificParams, nil
}

func (s *campaignOrchestratorServiceImpl) GetCampaignStatus(ctx context.Context, campaignID uuid.UUID) (models.CampaignStatusEnum, *float64, error) {
	var querier store.Querier
	if s.db != nil {
		querier = s.db
	}
	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return "", nil, err
	}
	return campaign.Status, campaign.ProgressPercentage, nil
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
	if campaign.CampaignType != models.CampaignTypeDomainGeneration {
		return nil, fmt.Errorf("orchestrator: campaign %s is not a domain generation campaign", campaignID)
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
	if campaign.CampaignType != models.CampaignTypeHTTPKeywordValidation {
		return nil, fmt.Errorf("orchestrator: campaign %s is not an HTTP/Keyword validation campaign", campaignID)
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
	if campaign.Status == models.CampaignStatusCompleted && campaign.ProcessedItems != nil {
		totalCount = *campaign.ProcessedItems
	} else if campaign.TotalItems == nil && campaign.Status == models.CampaignStatusCompleted {
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
	// SI-001: Use enhanced transaction management for campaign start operation
	opts := &store.CampaignTransactionOptions{
		Operation:  "start_campaign",
		CampaignID: campaignID.String(),
		Timeout:    45 * time.Second, // Extended timeout for campaign start
		MaxRetries: 2,                // Allow retries for campaign start
		RetryDelay: 500 * time.Millisecond,
	}

	log.Printf("SI-001: Starting campaign %s with enhanced transaction management", campaignID)

	return s.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		// Get campaign with row-level locking to prevent concurrent modifications
		campaign, err := s.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
		}

		if campaign.Status != models.CampaignStatusPending {
			return fmt.Errorf("campaign %s not pending: %s", campaignID, campaign.Status)
		}

		// Create initial job within the same transaction
		initialJob := &models.CampaignJob{
			ID:              uuid.New(),
			CampaignID:      campaignID,
			JobType:         campaign.CampaignType,
			Status:          models.JobStatusQueued,
			MaxAttempts:     3,
			CreatedAt:       time.Now().UTC(),
			UpdatedAt:       time.Now().UTC(),
			NextExecutionAt: sql.NullTime{Time: time.Now().UTC(), Valid: true},
		}

		// Set job payload based on campaign type
		if err := s.setJobPayload(ctx, tx, campaign, initialJob); err != nil {
			log.Printf("Warning: Failed to set job payload for campaign %s: %v", campaignID, err)
			// Continue without payload - job processing will handle this
		}

		// Create job within transaction
		if s.campaignJobStore != nil {
			if err := s.campaignJobStore.CreateJob(ctx, tx, initialJob); err != nil {
				return fmt.Errorf("failed to create initial job for campaign %s: %w", campaignID, err)
			}
			log.Printf("SI-001: Created initial job for campaign %s", campaignID)
		} else {
			log.Printf("Warning: campaignJobStore is nil for campaign %s. Marking as running directly.", campaignID)
			// Update campaign directly if job store unavailable
			campaign.Status = models.CampaignStatusRunning
			campaign.UpdatedAt = time.Now().UTC()
			if campaign.StartedAt == nil {
				now := time.Now().UTC()
				campaign.StartedAt = &now
			}
			if err := s.campaignStore.UpdateCampaign(ctx, tx, campaign); err != nil {
				return fmt.Errorf("failed to update campaign %s status to running: %w", campaignID, err)
			}
			return nil
		}

		// Update campaign status within the same transaction
		desc := fmt.Sprintf("Campaign status changed to %s", models.CampaignStatusQueued)
		return s.updateCampaignStatusInTx(ctx, tx, campaign, models.CampaignStatusQueued, "", desc, "Campaign Start Requested")
	})
}

// setJobPayload sets the job payload based on campaign type (SI-001 helper)
func (s *campaignOrchestratorServiceImpl) setJobPayload(ctx context.Context, querier store.Querier, campaign *models.Campaign, job *models.CampaignJob) error {
	switch campaign.CampaignType {
	case models.CampaignTypeDomainGeneration:
		params, err := s.campaignStore.GetDomainGenerationParams(ctx, querier, campaign.ID)
		if err != nil {
			return fmt.Errorf("failed to get domain generation params: %w", err)
		}
		payloadBytes, err := json.Marshal(params)
		if err != nil {
			return fmt.Errorf("failed to marshal domain generation job payload: %w", err)
		}
		rawMsg := json.RawMessage(payloadBytes)
		job.JobPayload = &rawMsg

	case models.CampaignTypeDNSValidation:
		params, err := s.campaignStore.GetDNSValidationParams(ctx, querier, campaign.ID)
		if err != nil {
			return fmt.Errorf("failed to get DNS validation params: %w", err)
		}
		payloadBytes, err := json.Marshal(params)
		if err != nil {
			return fmt.Errorf("failed to marshal DNS validation job payload: %w", err)
		}
		rawMsg := json.RawMessage(payloadBytes)
		job.JobPayload = &rawMsg

	case models.CampaignTypeHTTPKeywordValidation:
		params, err := s.campaignStore.GetHTTPKeywordParams(ctx, querier, campaign.ID)
		if err != nil {
			return fmt.Errorf("failed to get HTTP keyword params: %w", err)
		}
		payloadBytes, err := json.Marshal(params)
		if err != nil {
			return fmt.Errorf("failed to marshal HTTP keyword job payload: %w", err)
		}
		rawMsg := json.RawMessage(payloadBytes)
		job.JobPayload = &rawMsg

	default:
		log.Printf("Warning: Unknown campaign type %s for job payload", campaign.CampaignType)
	}

	return nil
}

func (s *campaignOrchestratorServiceImpl) PauseCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// SI-001: Use enhanced transaction management for campaign pause operation
	opts := &store.CampaignTransactionOptions{
		Operation:  "pause_campaign",
		CampaignID: campaignID.String(),
		Timeout:    30 * time.Second,
		MaxRetries: 2,
		RetryDelay: 300 * time.Millisecond,
	}

	log.Printf("SI-001: Pausing campaign %s with enhanced transaction management", campaignID)

	return s.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		campaign, err := s.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
		}

		if campaign.Status != models.CampaignStatusRunning && campaign.Status != models.CampaignStatusQueued {
			return fmt.Errorf("campaign %s not running/queued: %s", campaignID, campaign.Status)
		}

		desc := fmt.Sprintf("Status changed from %s to %s", campaign.Status, models.CampaignStatusPaused)
		return s.updateCampaignStatusInTx(ctx, tx, campaign, models.CampaignStatusPaused, "", desc, "Campaign Paused")
	})
}

func (s *campaignOrchestratorServiceImpl) ResumeCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// SI-001: Use enhanced transaction management for campaign resume operation
	opts := &store.CampaignTransactionOptions{
		Operation:  "resume_campaign",
		CampaignID: campaignID.String(),
		Timeout:    40 * time.Second, // Extended timeout for resume with job creation
		MaxRetries: 2,
		RetryDelay: 400 * time.Millisecond,
	}

	log.Printf("SI-001: Resuming campaign %s with enhanced transaction management", campaignID)

	return s.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		campaign, err := s.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
		}

		if campaign.Status != models.CampaignStatusPaused {
			return fmt.Errorf("campaign %s not paused: %s", campaignID, campaign.Status)
		}

		desc := fmt.Sprintf("Status changed from %s to %s", campaign.Status, models.CampaignStatusQueued)

		// Create resume job within the same transaction
		resumeJob := &models.CampaignJob{
			ID:              uuid.New(),
			CampaignID:      campaignID,
			JobType:         campaign.CampaignType,
			Status:          models.JobStatusQueued,
			MaxAttempts:     3,
			CreatedAt:       time.Now().UTC(),
			UpdatedAt:       time.Now().UTC(),
			NextExecutionAt: sql.NullTime{Time: time.Now().UTC(), Valid: true},
		}

		// Set job payload for resume
		if err := s.setJobPayload(ctx, tx, campaign, resumeJob); err != nil {
			log.Printf("Warning: Failed to set job payload for resume campaign %s: %v", campaignID, err)
		}

		if s.campaignJobStore != nil {
			if err := s.campaignJobStore.CreateJob(ctx, tx, resumeJob); err != nil {
				return fmt.Errorf("failed to create resume job for campaign %s: %w", campaignID, err)
			}
			log.Printf("SI-001: Created resume job for campaign %s", campaignID)
		} else {
			log.Printf("Warning: campaignJobStore is nil for campaign %s. Marking as running directly.", campaignID)
			// Update campaign directly if job store unavailable
			campaign.Status = models.CampaignStatusRunning
			campaign.UpdatedAt = time.Now().UTC()
			if campaign.StartedAt == nil {
				now := time.Now().UTC()
				campaign.StartedAt = &now
			}
			if err := s.campaignStore.UpdateCampaign(ctx, tx, campaign); err != nil {
				return fmt.Errorf("failed to update campaign %s status to running: %w", campaignID, err)
			}
			return nil
		}

		return s.updateCampaignStatusInTx(ctx, tx, campaign, models.CampaignStatusQueued, "", desc, "Campaign Resumed")
	})
}

func (s *campaignOrchestratorServiceImpl) CancelCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// SI-001: Use enhanced transaction management for campaign cancellation
	opts := &store.CampaignTransactionOptions{
		Operation:  "cancel_campaign",
		CampaignID: campaignID.String(),
		Timeout:    20 * time.Second, // Standard timeout for status update
		MaxRetries: 2,
		RetryDelay: 200 * time.Millisecond,
	}

	log.Printf("SI-001: Cancelling campaign %s with enhanced transaction management", campaignID)

	return s.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		campaign, err := s.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
		}

		if campaign.Status == models.CampaignStatusCompleted || campaign.Status == models.CampaignStatusFailed ||
			campaign.Status == models.CampaignStatusCancelled ||
			(campaign.BusinessStatus != nil && *campaign.BusinessStatus == models.CampaignBusinessStatusArchived) {
			return fmt.Errorf("campaign %s already in a final state: %s", campaignID, campaign.Status)
		}

		desc := fmt.Sprintf("Status changed from %s to %s", campaign.Status, models.CampaignStatusCancelled)
		return s.updateCampaignStatusInTx(ctx, tx, campaign, models.CampaignStatusCancelled, "User cancelled campaign", desc, "Campaign Cancelled")
	})
}

func (s *campaignOrchestratorServiceImpl) SetCampaignErrorStatus(ctx context.Context, campaignID uuid.UUID, errorMessage string) error {
	// SI-001: Use enhanced transaction management for campaign error status update
	opts := &store.CampaignTransactionOptions{
		Operation:  "set_campaign_error_status",
		CampaignID: campaignID.String(),
		Timeout:    20 * time.Second, // Standard timeout for status update
		MaxRetries: 3,                // Higher retry count for error handling operations
		RetryDelay: 300 * time.Millisecond,
	}

	log.Printf("SI-001: Setting error status for campaign %s with enhanced transaction management", campaignID)

	return s.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		campaign, err := s.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("SetCampaignErrorStatus: get campaign %s failed: %w", campaignID, err)
		}

		desc := fmt.Sprintf("Campaign %s error: %s", campaign.Name, errorMessage)
		return s.updateCampaignStatusInTx(ctx, tx, campaign, models.CampaignStatusFailed, errorMessage, desc, "Campaign Error")
	})
}

// SetCampaignStatus sets the campaign status to the specified value
func (s *campaignOrchestratorServiceImpl) SetCampaignStatus(ctx context.Context, campaignID uuid.UUID, status models.CampaignStatusEnum) error {
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

	desc := fmt.Sprintf("Campaign status changed from %s to %s", campaign.Status, status)
	auditAction := fmt.Sprintf("Campaign Status Changed to %s", status)
	opErr = s.updateCampaignStatusInTx(ctx, querier, campaign, status, "", desc, auditAction)
	return opErr
}

// updateCampaignStatusInTx correctly uses the passed querier (which can be sqlTx or nil)
func (s *campaignOrchestratorServiceImpl) updateCampaignStatusInTx(ctx context.Context, querier store.Querier, campaign *models.Campaign, newStatus models.CampaignStatusEnum, errMsg string, auditDesc string, auditAction string) error {
	originalStatus := campaign.Status

	// Use centralized state coordinator for validation and transition
	if err := s.stateCoordinator.TransitionState(ctx, campaign.ID, newStatus, models.StateEventSourceOrchestrator, auditDesc, auditAction, nil); err != nil {
		log.Printf("State transition failed for campaign %s: %v", campaign.ID, err)
		return fmt.Errorf("state transition validation failed for campaign %s: %w", campaign.ID, err)
	}

	// Update campaign metadata that isn't handled by state coordinator
	campaign.Status = newStatus
	campaign.UpdatedAt = time.Now().UTC()
	if errMsg != "" {
		campaign.ErrorMessage = models.StringPtr(errMsg)
	} else {
		campaign.ErrorMessage = nil
	}
	if newStatus == models.CampaignStatusCompleted || newStatus == models.CampaignStatusFailed || newStatus == models.CampaignStatusCancelled {
		if campaign.CompletedAt == nil {
			campaign.CompletedAt = &campaign.UpdatedAt
		}
	}

	// s.campaignStore.UpdateCampaign will use the querier
	if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
		return fmt.Errorf("update campaign %s to %s: %w", campaign.ID, newStatus, err)
	}
	// s.logAuditEvent will use the querier
	s.logAuditEvent(ctx, querier, campaign, auditAction, auditDesc)
	log.Printf("Campaign %s status changed from %s to %s.", campaign.ID, originalStatus, newStatus)
	return nil
}

// logAuditEvent uses the audit context service for BL-006 compliance
func (s *campaignOrchestratorServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.Campaign, action, description string) {
	// BL-006 compliance: Use audit context service for complete user context
	if s.auditContextService == nil {
		log.Printf("Warning: auditContextService is nil for campaign %s, action %s. Falling back to legacy audit logging.", campaign.ID, action)
		s.logAuditEventLegacy(ctx, exec, campaign, action, description)
		return
	}

	// Create enhanced audit event details with campaign context
	details := map[string]interface{}{
		"campaign_name":      campaign.Name,
		"campaign_type":      string(campaign.CampaignType),
		"campaign_status":    string(campaign.Status),
		"campaign_id":        campaign.ID.String(),
		"description":        description,
		"orchestrator_event": true,
		"bl_006_compliant":   true,
		"audit_source":       "campaign_orchestrator",
		"entity_type":        "Campaign",
		"operation_type":     "campaign_lifecycle",
		"service_layer":      "orchestrator",
	}

	// Create system audit event if no user context available
	if campaign.UserID == nil {
		systemIdentifier := "campaign_orchestrator_service"
		if err := s.auditContextService.CreateSystemAuditEvent(ctx, systemIdentifier, action, "Campaign", &campaign.ID, details); err != nil {
			log.Printf("Orchestrator Audit: Error creating system audit event for campaign %s, action %s: %v", campaign.ID, action, err)
			// Fall back to legacy logging on error
			s.logAuditEventLegacy(ctx, exec, campaign, action, description)
		}
		return
	}

	// Create audit user context for campaign owner
	userCtx := &AuditUserContext{
		UserID:             *campaign.UserID,
		AuthenticationType: "session",               // Default for campaign operations
		SessionID:          "orchestrator_internal", // Mark as internal service call
		RequestID:          uuid.New().String(),
		ClientIP:           "internal",
		UserAgent:          "campaign_orchestrator_service",
		HTTPMethod:         "SERVICE_CALL",
		RequestPath:        fmt.Sprintf("/internal/campaigns/%s", campaign.ID),
		RequestTimestamp:   time.Now().UTC(),
		Permissions:        []string{"campaign:manage"},
		Roles:              []string{"campaign_owner"},
	}

	// Create audit event with full user context
	if err := s.auditContextService.CreateAuditEvent(ctx, userCtx, action, "Campaign", &campaign.ID, details); err != nil {
		log.Printf("Orchestrator Audit: Error creating audit event for campaign %s, action %s: %v", campaign.ID, action, err)
		// Fall back to legacy logging on error
		s.logAuditEventLegacy(ctx, exec, campaign, action, description)
	}
}

// logAuditEventLegacy provides fallback audit logging for BL-006 compatibility
func (s *campaignOrchestratorServiceImpl) logAuditEventLegacy(ctx context.Context, exec store.Querier, campaign *models.Campaign, action, description string) {
	detailsMap := map[string]string{
		"campaign_name":      campaign.Name,
		"description":        description,
		"orchestrator_event": "true",
		"bl_006_fallback":    "true", // Mark as fallback for compliance tracking
	}
	detailsJSON, err := json.Marshal(detailsMap)
	if err != nil {
		log.Printf("Orchestrator Audit: Error marshalling details for campaign %s, action %s: %v. Using raw desc.", campaign.ID, action, err)
		detailsJSON = json.RawMessage(fmt.Sprintf(`{"campaign_name": "%s", "description": "%s (details marshalling error)"}`, campaign.Name, description))
	}

	var auditLogUserID uuid.NullUUID
	if campaign.UserID != nil {
		auditLogUserID = uuid.NullUUID{UUID: *campaign.UserID, Valid: true}
	}
	auditLog := &models.AuditLog{
		Timestamp:  time.Now().UTC(),
		UserID:     auditLogUserID,
		Action:     action,
		EntityType: sql.NullString{String: "Campaign", Valid: true},
		EntityID:   uuid.NullUUID{UUID: campaign.ID, Valid: true},
		Details:    models.JSONRawMessagePtr(detailsJSON),
	}

	if s.auditLogStore == nil {
		log.Printf("Warning: auditLogStore is nil for campaign %s, action %s. Skipping legacy audit log creation.", campaign.ID, action)
	} else if exec == nil {
		log.Printf("Warning: exec is nil for campaign %s, action %s. Skipping legacy audit log creation.", campaign.ID, action)
	} else if err := s.auditLogStore.CreateAuditLog(ctx, exec, auditLog); err != nil {
		log.Printf("Orchestrator Audit: Error creating legacy log for campaign %s, action %s: %v", campaign.ID, action, err)
	}
}

func (s *campaignOrchestratorServiceImpl) UpdateCampaign(ctx context.Context, campaignID uuid.UUID, req UpdateCampaignRequest) (*models.Campaign, error) {
	// SI-001: Use enhanced transaction management for campaign update operation
	opts := &store.CampaignTransactionOptions{
		Operation:  "update_campaign",
		CampaignID: campaignID.String(),
		Timeout:    25 * time.Second, // Standard timeout for update operations
		MaxRetries: 2,
		RetryDelay: 200 * time.Millisecond,
	}

	log.Printf("SI-001: Updating campaign %s with enhanced transaction management", campaignID)

	var updatedCampaign *models.Campaign
	err := s.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		campaign, err := s.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("UpdateCampaign: get campaign %s failed: %w", campaignID, err)
		}

		// Update campaign fields if provided
		if req.Name != nil {
			campaign.Name = *req.Name
		}
		if req.Status != nil {
			campaign.Status = *req.Status
		}

		campaign.UpdatedAt = time.Now().UTC()

		if err := s.campaignStore.UpdateCampaign(ctx, tx, campaign); err != nil {
			return fmt.Errorf("UpdateCampaign: update campaign %s failed: %w", campaignID, err)
		}

		// Log audit event
		s.logAuditEvent(ctx, tx, campaign, "Campaign Updated", fmt.Sprintf("Campaign %s was updated", campaign.Name))

		updatedCampaign = campaign
		return nil
	})

	if err != nil {
		return nil, err
	}

	return updatedCampaign, nil
}

func (s *campaignOrchestratorServiceImpl) DeleteCampaign(ctx context.Context, campaignID uuid.UUID) error {
	// SI-001: Use enhanced transaction management for campaign deletion
	opts := &store.CampaignTransactionOptions{
		Operation:  "delete_campaign",
		CampaignID: campaignID.String(),
		Timeout:    30 * time.Second, // Extended timeout for delete operations with cascading
		MaxRetries: 2,
		RetryDelay: 300 * time.Millisecond,
	}

	log.Printf("SI-001: Deleting campaign %s with enhanced transaction management", campaignID)

	return s.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		campaign, err := s.campaignStore.GetCampaignByID(ctx, tx, campaignID)
		if err != nil {
			return fmt.Errorf("DeleteCampaign: get campaign %s failed: %w", campaignID, err)
		}

		// Check if campaign can be deleted (not running)
		if campaign.Status == models.CampaignStatusRunning || campaign.Status == models.CampaignStatusQueued {
			return fmt.Errorf("cannot delete campaign %s: campaign is %s", campaignID, campaign.Status)
		}

		if err := s.campaignStore.DeleteCampaign(ctx, tx, campaignID); err != nil {
			return fmt.Errorf("DeleteCampaign: delete campaign %s failed: %w", campaignID, err)
		}

		// Log audit event before deletion completes
		s.logAuditEvent(ctx, tx, campaign, "Campaign Deleted", fmt.Sprintf("Campaign %s was deleted", campaign.Name))

		return nil
	})
}

// CreateCampaignUnified creates a campaign of any type using a unified request structure
func (s *campaignOrchestratorServiceImpl) CreateCampaignUnified(ctx context.Context, req CreateCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: Creating campaign with unified endpoint. Type: %s, Name: %s", req.CampaignType, req.Name)

	switch req.CampaignType {
	case "domain_generation":
		if req.DomainGenerationParams == nil {
			return nil, fmt.Errorf("domainGenerationParams required for domain_generation campaigns")
		}

		// Convert unified request to legacy request structure
		legacyReq := CreateDomainGenerationCampaignRequest{
			Name:                 req.Name,
			PatternType:          req.DomainGenerationParams.PatternType,
			VariableLength:       req.DomainGenerationParams.VariableLength,
			CharacterSet:         req.DomainGenerationParams.CharacterSet,
			ConstantString:       req.DomainGenerationParams.ConstantString,
			TLD:                  req.DomainGenerationParams.TLD,
			NumDomainsToGenerate: req.DomainGenerationParams.NumDomainsToGenerate,
			UserID:               req.UserID,
		}

		return s.domainGenService.CreateCampaign(ctx, legacyReq)

	case "dns_validation":
		if req.DnsValidationParams == nil {
			return nil, fmt.Errorf("dnsValidationParams required for dns_validation campaigns")
		}

		// Convert unified request to legacy request structure
		legacyReq := CreateDNSValidationCampaignRequest{
			Name:                       req.Name,
			SourceGenerationCampaignID: req.DnsValidationParams.SourceGenerationCampaignID,
			PersonaIDs:                 req.DnsValidationParams.PersonaIDs,
			RotationIntervalSeconds:    req.DnsValidationParams.RotationIntervalSeconds,
			ProcessingSpeedPerMinute:   req.DnsValidationParams.ProcessingSpeedPerMinute,
			BatchSize:                  req.DnsValidationParams.BatchSize,
			RetryAttempts:              req.DnsValidationParams.RetryAttempts,
			UserID:                     req.UserID,
		}

		return s.dnsService.CreateCampaign(ctx, legacyReq)

	case "http_keyword_validation":
		if req.HttpKeywordParams == nil {
			return nil, fmt.Errorf("httpKeywordParams required for http_keyword_validation campaigns")
		}

		// Convert unified request to legacy request structure
		legacyReq := CreateHTTPKeywordCampaignRequest{
			Name:                     req.Name,
			SourceCampaignID:         req.HttpKeywordParams.SourceCampaignID,
			KeywordSetIDs:            req.HttpKeywordParams.KeywordSetIDs,
			AdHocKeywords:            req.HttpKeywordParams.AdHocKeywords,
			PersonaIDs:               req.HttpKeywordParams.PersonaIDs,
			ProxyPoolID:              req.HttpKeywordParams.ProxyPoolID,
			ProxySelectionStrategy:   req.HttpKeywordParams.ProxySelectionStrategy,
			RotationIntervalSeconds:  req.HttpKeywordParams.RotationIntervalSeconds,
			ProcessingSpeedPerMinute: req.HttpKeywordParams.ProcessingSpeedPerMinute,
			BatchSize:                req.HttpKeywordParams.BatchSize,
			RetryAttempts:            req.HttpKeywordParams.RetryAttempts,
			TargetHTTPPorts:          req.HttpKeywordParams.TargetHTTPPorts,
			UserID:                   req.UserID,
		}

		return s.httpKeywordService.CreateCampaign(ctx, legacyReq)

	default:
		return nil, fmt.Errorf("unsupported campaign type: %s", req.CampaignType)
	}
}

// CreateCampaignWithAuthorizationContext creates a campaign with comprehensive authorization context logging (BL-006)
func (s *campaignOrchestratorServiceImpl) CreateCampaignWithAuthorizationContext(
	ctx context.Context,
	req CreateCampaignRequest,
	userCtx *AuditUserContext,
) (*models.Campaign, error) {
	log.Printf("BL-006: Creating campaign with authorization context logging - Type: %s, Name: %s, User: %s",
		req.CampaignType, req.Name, userCtx.UserID)

	startTime := time.Now()

	// Create enhanced authorization context for campaign creation
	authCtx := &EnhancedAuthorizationContext{
		UserID:        userCtx.UserID,
		SessionID:     userCtx.SessionID,
		RequestID:     userCtx.RequestID,
		ResourceType:  "campaign",
		Action:        "create",
		Decision:      "pending", // Will be updated based on result
		PolicyVersion: "v1.0",
		EvaluatedPolicies: []string{
			"campaign:create",
			"resource:ownership",
			"user:authenticated",
		},
		PermissionsRequired: []string{
			"campaign:create",
			"campaign:manage",
		},
		PermissionsGranted: userCtx.Permissions,
		RiskScore:          s.calculateCampaignCreationRiskScore(userCtx, req),
		RequestContext: map[string]interface{}{
			"campaign_type":       req.CampaignType,
			"campaign_name":       req.Name,
			"user_id":             userCtx.UserID.String(),
			"session_id":          userCtx.SessionID,
			"client_ip":           userCtx.ClientIP,
			"user_agent":          userCtx.UserAgent,
			"authentication_type": userCtx.AuthenticationType,
			"request_path":        userCtx.RequestPath,
			"http_method":         userCtx.HTTPMethod,
			"user_roles":          userCtx.Roles,
			"risk_factors":        s.identifyRiskFactors(userCtx, req),
			"request_timestamp":   startTime.Format(time.RFC3339),
		},
		Timestamp: startTime,
	}

	// Validate user permissions for campaign creation
	if !s.hasRequiredPermissions(userCtx.Permissions, authCtx.PermissionsRequired) {
		authCtx.Decision = "deny"
		authCtx.DenialReason = "insufficient_permissions"
		authCtx.RiskScore = 80 // High risk for permission denial

		// Log authorization denial
		if err := s.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
			log.Printf("BL-006: Failed to log authorization denial for campaign creation: %v", err)
		}

		return nil, fmt.Errorf("insufficient permissions to create campaign: required %v, granted %v",
			authCtx.PermissionsRequired, authCtx.PermissionsGranted)
	}

	// Validate resource access based on campaign type
	if !s.canAccessCampaignType(userCtx, req.CampaignType) {
		authCtx.Decision = "deny"
		authCtx.DenialReason = "campaign_type_access_denied"
		authCtx.RiskScore = 70

		// Log authorization denial
		if err := s.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
			log.Printf("BL-006: Failed to log campaign type access denial: %v", err)
		}

		return nil, fmt.Errorf("access denied for campaign type: %s", req.CampaignType)
	}

	// Proceed with campaign creation
	campaign, err := s.CreateCampaignUnified(ctx, req)
	if err != nil {
		authCtx.Decision = "error"
		authCtx.DenialReason = "campaign_creation_failed"
		authCtx.RiskScore = 40
		authCtx.RequestContext["error"] = err.Error()

		// Log authorization error
		if logErr := s.auditContextService.LogAuthorizationDecision(ctx, authCtx); logErr != nil {
			log.Printf("BL-006: Failed to log campaign creation error: %v", logErr)
		}

		return nil, fmt.Errorf("campaign creation failed: %w", err)
	}

	// Campaign creation successful - log authorization success
	authCtx.Decision = "allow"
	authCtx.ResourceID = campaign.ID.String()
	authCtx.RiskScore = s.calculateSuccessRiskScore(userCtx, req)
	authCtx.RequestContext["campaign_id"] = campaign.ID.String()
	authCtx.RequestContext["campaign_status"] = string(campaign.Status)
	authCtx.RequestContext["creation_duration_ms"] = time.Since(startTime).Milliseconds()

	// Log successful authorization decision
	if err := s.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
		log.Printf("BL-006: Failed to log successful campaign creation authorization: %v", err)
		// Don't fail the operation, just log the error
	}

	log.Printf("BL-006: Successfully created campaign %s with authorization context logging", campaign.ID)
	return campaign, nil
}

// calculateCampaignCreationRiskScore calculates risk score for campaign creation request
func (s *campaignOrchestratorServiceImpl) calculateCampaignCreationRiskScore(userCtx *AuditUserContext, req CreateCampaignRequest) int {
	riskScore := 10 // Base risk score

	// Increase risk based on campaign type complexity
	switch req.CampaignType {
	case "domain_generation":
		riskScore += 20 // Domain generation has moderate risk
	case "dns_validation":
		riskScore += 30 // DNS validation has higher risk (external queries)
	case "http_keyword_validation":
		riskScore += 40 // HTTP validation has highest risk (web scraping)
	}

	// Increase risk based on user context
	if userCtx.RequiresPasswordChange {
		riskScore += 20
	}

	// Increase risk for elevated roles
	for _, role := range userCtx.Roles {
		if role == "admin" || role == "super_admin" {
			riskScore += 15
			break
		}
	}

	// Increase risk for API key authentication
	if userCtx.AuthenticationType == "api_key" {
		riskScore += 25
	}

	// Cap maximum risk score
	if riskScore > 100 {
		riskScore = 100
	}

	return riskScore
}

// identifyRiskFactors identifies potential risk factors in the request
func (s *campaignOrchestratorServiceImpl) identifyRiskFactors(userCtx *AuditUserContext, req CreateCampaignRequest) []string {
	var riskFactors []string

	if userCtx.RequiresPasswordChange {
		riskFactors = append(riskFactors, "password_change_required")
	}

	if userCtx.AuthenticationType == "api_key" {
		riskFactors = append(riskFactors, "api_key_authentication")
	}

	// Check for high-volume campaign requests
	switch req.CampaignType {
	case "domain_generation":
		if req.DomainGenerationParams != nil && req.DomainGenerationParams.NumDomainsToGenerate > 10000 {
			riskFactors = append(riskFactors, "high_volume_domain_generation")
		}
	case "http_keyword_validation":
		riskFactors = append(riskFactors, "external_http_requests")
	case "dns_validation":
		riskFactors = append(riskFactors, "external_dns_queries")
	}

	// Check for privileged user roles
	for _, role := range userCtx.Roles {
		if role == "admin" || role == "super_admin" {
			riskFactors = append(riskFactors, "privileged_user_role")
			break
		}
	}

	return riskFactors
}

// hasRequiredPermissions checks if user has all required permissions
func (s *campaignOrchestratorServiceImpl) hasRequiredPermissions(grantedPermissions, requiredPermissions []string) bool {
	permissionMap := make(map[string]bool)
	for _, perm := range grantedPermissions {
		permissionMap[perm] = true
	}

	for _, required := range requiredPermissions {
		if !permissionMap[required] {
			return false
		}
	}

	return true
}

// canAccessCampaignType checks if user can access specific campaign type
func (s *campaignOrchestratorServiceImpl) canAccessCampaignType(userCtx *AuditUserContext, campaignType string) bool {
	// Check role-based access control for campaign types
	hasAccess := false

	for _, role := range userCtx.Roles {
		switch role {
		case "admin", "super_admin":
			// Admins can access all campaign types
			hasAccess = true
		case "campaign_manager":
			// Campaign managers can access all campaign types
			hasAccess = true
		case "domain_specialist":
			// Domain specialists can only access domain-related campaigns
			if campaignType == "domain_generation" || campaignType == "dns_validation" {
				hasAccess = true
			}
		case "security_analyst":
			// Security analysts can access validation campaigns
			if campaignType == "dns_validation" || campaignType == "http_keyword_validation" {
				hasAccess = true
			}
		case "user":
			// Regular users can access basic domain generation
			if campaignType == "domain_generation" {
				hasAccess = true
			}
		}

		if hasAccess {
			break
		}
	}

	return hasAccess
}

// calculateSuccessRiskScore calculates risk score for successful operations
func (s *campaignOrchestratorServiceImpl) calculateSuccessRiskScore(userCtx *AuditUserContext, req CreateCampaignRequest) int {
	// Lower risk score for successful operations
	baseRisk := s.calculateCampaignCreationRiskScore(userCtx, req)
	return baseRisk / 2 // Halve the risk for successful operations
}

// CreateCampaignWithAtomicOperations creates a campaign using atomic transaction operations (SI-001)
func (s *campaignOrchestratorServiceImpl) CreateCampaignWithAtomicOperations(
	ctx context.Context,
	campaign *models.Campaign,
) error {
	// Define transaction boundary with steps
	boundary := &store.TransactionBoundary{
		Name:        "create_campaign_atomic",
		Description: "Atomic campaign creation with state coordination",
		Steps: []store.TransactionStep{
			{
				Name:        "create_campaign",
				Description: "Create campaign record",
				Required:    true,
				Rollback: func(tx *sqlx.Tx) error {
					return s.campaignStore.DeleteCampaign(ctx, tx, campaign.ID)
				},
			},
			{
				Name:        "initialize_state_transition",
				Description: "Initialize campaign state with transition",
				Required:    true,
				Rollback: func(tx *sqlx.Tx) error {
					// State transitions are recorded events, no rollback needed
					return nil
				},
			},
			{
				Name:        "audit_campaign_creation",
				Description: "Log campaign creation audit event",
				Required:    false,
				Rollback: func(tx *sqlx.Tx) error {
					// Audit events don't need rollback - they're informational
					return nil
				},
			},
		},
	}

	// Execute transaction boundary with custom executor
	return s.transactionManager.ExecuteTransactionBoundary(ctx, boundary, campaign.ID.String(),
		func(tx *sqlx.Tx, steps []store.TransactionStep) error {
			// Step 1: Create campaign record
			if err := s.campaignStore.CreateCampaign(ctx, tx, campaign); err != nil {
				return fmt.Errorf("failed to create campaign: %w", err)
			}
			log.Printf("SI-001: Created campaign record for %s", campaign.ID)

			// Step 2: Initialize campaign state using state coordinator
			if err := s.stateCoordinator.TransitionState(ctx, campaign.ID,
				models.CampaignStatusPending, models.StateEventSourceOrchestrator,
				"Campaign Created", "Initial campaign creation with atomic operations", nil); err != nil {
				return fmt.Errorf("failed to initialize campaign state: %w", err)
			}
			log.Printf("SI-001: Initialized campaign state for %s", campaign.ID)

			// Step 3: Log audit event
			s.logAuditEvent(ctx, tx, campaign, "Campaign Created",
				fmt.Sprintf("Campaign %s was created with atomic operations", campaign.Name))
			log.Printf("SI-001: Logged audit event for campaign %s", campaign.ID)

			return nil
		})
}

// SI-002: Centralized State Management Integration

// UpdateCampaignStatusWithCoordination updates campaign status using centralized state coordination
func (s *campaignOrchestratorServiceImpl) UpdateCampaignStatusWithCoordination(
	ctx context.Context,
	campaignID uuid.UUID,
	newStatus models.CampaignStatusEnum,
	metadata map[string]interface{},
) error {
	// Initialize centralized state manager if needed
	centralizedStateMgr := NewCentralizedStateManager(s.db)

	// Create campaign transaction options for state coordination
	opts := &postgres.CampaignTransactionOptions{
		Operation:  "coordinated_status_update",
		CampaignID: campaignID.String(),
		Timeout:    30 * time.Second,
		MaxRetries: 2,
		RetryDelay: 200 * time.Millisecond,
	}

	log.Printf("SI-002: Updating campaign %s status to %s with centralized coordination", campaignID, newStatus)

	// Perform coordinated state update
	return centralizedStateMgr.CoordinatedStateUpdate(ctx, campaignID, func(aggregate *CampaignStateAggregate) (*StateEvent, error) {
		// Validate state transition
		if !s.isValidStatusTransition(aggregate.State, newStatus) {
			return nil, fmt.Errorf("invalid status transition from %s to %s for campaign %s",
				aggregate.State, newStatus, campaignID)
		}

		// Create state change event
		event := &StateEvent{
			ID:        uuid.New(),
			EntityID:  campaignID,
			EventType: "campaign_status_changed",
			EventData: map[string]interface{}{
				"old_status":    string(aggregate.State),
				"new_status":    string(newStatus),
				"changed_by":    "campaign_orchestrator",
				"change_reason": "coordinated_update",
			},
			Timestamp: time.Now(),
			Metadata:  metadata,
		}

		// If additional metadata provided, merge it
		if metadata != nil {
			for k, v := range metadata {
				event.EventData[k] = v
			}
			// Also update aggregate metadata
			for k, v := range metadata {
				aggregate.Metadata[k] = v
			}
		}

		// Update aggregate state
		aggregate.State = newStatus

		return event, nil
	}, opts)
}

// isValidStatusTransition validates if a status transition is allowed
func (s *campaignOrchestratorServiceImpl) isValidStatusTransition(currentStatus, newStatus models.CampaignStatusEnum) bool {
	// Define valid status transitions
	validTransitions := map[models.CampaignStatusEnum][]models.CampaignStatusEnum{
		models.CampaignStatusPending: {
			models.CampaignStatusQueued,
			models.CampaignStatusCancelled,
		},
		models.CampaignStatusQueued: {
			models.CampaignStatusRunning,
			models.CampaignStatusPaused,
			models.CampaignStatusCancelled,
		},
		models.CampaignStatusRunning: {
			models.CampaignStatusPausing,
			models.CampaignStatusCompleted,
			models.CampaignStatusFailed,
			models.CampaignStatusCancelled,
		},
		models.CampaignStatusPausing: {
			models.CampaignStatusPaused,
			models.CampaignStatusFailed,
		},
		models.CampaignStatusPaused: {
			models.CampaignStatusQueued,
			models.CampaignStatusCancelled,
		},
		models.CampaignStatusCompleted: {
			// Terminal state - no transitions allowed
		},
		models.CampaignStatusFailed: {
			// Terminal state - only restart via new campaign
		},
		models.CampaignStatusCancelled: {
			// Terminal state - no transitions allowed
		},
	}

	allowedTransitions, exists := validTransitions[currentStatus]
	if !exists {
		return false
	}

	for _, allowed := range allowedTransitions {
		if allowed == newStatus {
			return true
		}
	}

	return false
}

// GetCampaignStateAggregate retrieves the current state aggregate for a campaign
func (s *campaignOrchestratorServiceImpl) GetCampaignStateAggregate(ctx context.Context, campaignID uuid.UUID) (*CampaignStateAggregate, error) {
	centralizedStateMgr := NewCentralizedStateManager(s.db)

	centralizedStateMgr.mu.RLock()
	aggregate, exists := centralizedStateMgr.activeStates[campaignID]
	centralizedStateMgr.mu.RUnlock()

	if exists {
		return aggregate, nil
	}

	// Load aggregate from events if not in active states
	return centralizedStateMgr.loadOrCreateAggregate(ctx, campaignID)
}

// CreateStateSnapshot creates a performance snapshot for a campaign's state
func (s *campaignOrchestratorServiceImpl) CreateStateSnapshot(ctx context.Context, campaignID uuid.UUID) error {
	centralizedStateMgr := NewCentralizedStateManager(s.db)

	aggregate, err := s.GetCampaignStateAggregate(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign state aggregate: %w", err)
	}

	return centralizedStateMgr.CreateSnapshot(ctx, aggregate)
}

// Legacy campaign creation methods (kept for backward compatibility)
