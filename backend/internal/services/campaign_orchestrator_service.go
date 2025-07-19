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

func (s *campaignOrchestratorServiceImpl) CreateDomainGenerationCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: Delegating CreateDomainGenerationCampaign for Name: %s", req.Name)
	camp, err := s.domainGenService.CreateCampaign(ctx, req)
	if err == nil && s.asyncManager != nil {
		msg := &communication.AsyncMessage{
			ID:            uuid.New().String(),
			CorrelationID: uuid.New().String(),
			SourceService: "orchestrator-service",
			TargetService: "domain-generation-service",
			MessageType:   "campaign_created",
			Payload:       req,
			Pattern:       communication.PatternPubSub,
			Timestamp:     time.Now(),
		}
		if perr := s.asyncManager.PublishMessage(ctx, msg); perr != nil {
			log.Printf("async publish error: %v", perr)
		}
	}
	return camp, err
}

func (s *campaignOrchestratorServiceImpl) CreateDNSValidationCampaign(ctx context.Context, req CreateDNSValidationCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: ARCHITECTURAL FIX - CreateDNSValidationCampaign should use phase transition, not separate campaign creation")
	log.Printf("Redirecting to UpdateCampaign with phase transition for source campaign: %s", req.SourceGenerationCampaignID)

	// ARCHITECTURAL FIX: DNS validation should be a phase transition, not separate campaign creation
	// Use the correct UpdateCampaign pattern with phase transition
	dnsValidationType := models.CampaignTypeDNSValidation
	updateReq := UpdateCampaignRequest{
		Name:                     &req.Name,
		CampaignType:             &dnsValidationType,
		PersonaIDs:               &req.PersonaIDs,
		RotationIntervalSeconds:  &req.RotationIntervalSeconds,
		ProcessingSpeedPerMinute: &req.ProcessingSpeedPerMinute,
		BatchSize:                &req.BatchSize,
		RetryAttempts:            &req.RetryAttempts,
	}

	camp, err := s.UpdateCampaign(ctx, req.SourceGenerationCampaignID, updateReq)
	if err == nil && s.asyncManager != nil {
		msg := &communication.AsyncMessage{
			ID:            uuid.New().String(),
			CorrelationID: uuid.New().String(),
			SourceService: "orchestrator-service",
			TargetService: "dns-service",
			MessageType:   "campaign_created",
			Payload:       req,
			Pattern:       communication.PatternPubSub,
			Timestamp:     time.Now(),
		}
		if perr := s.asyncManager.PublishMessage(ctx, msg); perr != nil {
			log.Printf("async publish error: %v", perr)
		}
	}
	return camp, err
}
func (s *campaignOrchestratorServiceImpl) CreateHTTPKeywordValidationCampaign(ctx context.Context, req CreateHTTPKeywordCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: ARCHITECTURAL FIX - CreateHTTPKeywordValidationCampaign should use phase transition, not separate campaign creation")
	log.Printf("Redirecting to UpdateCampaign with phase transition for source campaign: %s", req.SourceCampaignID)

	// ARCHITECTURAL FIX: HTTP keyword validation should be a phase transition, not separate campaign creation
	// Use the correct UpdateCampaign pattern with phase transition
	httpValidationType := models.CampaignTypeHTTPKeywordValidation
	updateReq := UpdateCampaignRequest{
		Name:                     &req.Name,
		CampaignType:             &httpValidationType,
		KeywordSetIDs:            &req.KeywordSetIDs,
		AdHocKeywords:            &req.AdHocKeywords,
		PersonaIDs:               &req.PersonaIDs,
		ProxyPoolID:              req.ProxyPoolID,
		ProxySelectionStrategy:   &req.ProxySelectionStrategy,
		RotationIntervalSeconds:  &req.RotationIntervalSeconds,
		ProcessingSpeedPerMinute: &req.ProcessingSpeedPerMinute,
		BatchSize:                &req.BatchSize,
		RetryAttempts:            &req.RetryAttempts,
		TargetHTTPPorts:          &req.TargetHTTPPorts,
	}

	camp, err := s.UpdateCampaign(ctx, req.SourceCampaignID, updateReq)
	if err == nil && s.asyncManager != nil {
		msg := &communication.AsyncMessage{
			ID:            uuid.New().String(),
			CorrelationID: uuid.New().String(),
			SourceService: "orchestrator-service",
			TargetService: "http-keyword-service",
			MessageType:   "campaign_created",
			Payload:       req,
			Pattern:       communication.PatternPubSub,
			Timestamp:     time.Now(),
		}
		if perr := s.asyncManager.PublishMessage(ctx, msg); perr != nil {
			log.Printf("async publish error: %v", perr)
		}
	}
	return camp, err
}

func (s *campaignOrchestratorServiceImpl) CreateHTTPKeywordCampaign(ctx context.Context, req CreateHTTPKeywordCampaignRequest) (*models.Campaign, error) {
	log.Printf("Orchestrator: Delegating CreateHTTPKeywordCampaign for Name: %s", req.Name)
	camp, err := s.httpKeywordService.CreateCampaign(ctx, req)
	if err == nil && s.asyncManager != nil {
		msg := &communication.AsyncMessage{
			ID:            uuid.New().String(),
			CorrelationID: uuid.New().String(),
			SourceService: "orchestrator-service",
			TargetService: "http-keyword-service",
			MessageType:   "campaign_created",
			Payload:       req,
			Pattern:       communication.PatternPubSub,
			Timestamp:     time.Now(),
		}
		if perr := s.asyncManager.PublishMessage(ctx, msg); perr != nil {
			log.Printf("async publish error: %v", perr)
		}
	}
	return camp, err
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
	if campaign.CampaignType != models.CampaignTypeDomainGeneration && campaign.CampaignType != models.CampaignTypeDNSValidation {
		return nil, fmt.Errorf("orchestrator: campaign %s is not a domain generation or DNS validation campaign", campaignID)
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
	log.Printf("[DIAGNOSTIC] StartCampaign called for campaign %s: {type: %s, status: %s, name: %s}",
		campaignID, campaign.CampaignType, campaign.Status, campaign.Name)

	// Allow starting campaigns in specific scenarios:
	// 1. Standard flow: campaign status is pending
	// 2. DNS validation flow: completed domain_generation campaign with DNS params added
	isValidForStart := false
	startReason := ""

	if campaign.Status == models.CampaignStatusPending {
		isValidForStart = true
		startReason = "standard_pending_campaign"
	} else if campaign.Status == models.CampaignStatusCompleted && campaign.CampaignType == models.CampaignTypeDomainGeneration {
		// Check if this is a domain generation campaign that has DNS validation params added
		// This enables DNS validation processing on existing domain generation campaigns
		if dnsParams, getErr := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID); getErr == nil && dnsParams != nil {
			isValidForStart = true
			startReason = "dns_validation_phase_on_domain_generation"
			log.Printf("[DIAGNOSTIC] StartCampaign allowing DNS validation phase on completed domain generation campaign %s", campaignID)
		}
	}

	if !isValidForStart {
		log.Printf("[DIAGNOSTIC] StartCampaign FAILED - Invalid status for campaign %s: expected '%s' or DNS validation transition, but got type '%s' status '%s'",
			campaignID, models.CampaignStatusPending, campaign.CampaignType, campaign.Status)
		opErr = fmt.Errorf("campaign %s not startable: type=%s status=%s", campaignID, campaign.CampaignType, campaign.Status)
		return opErr // opErr will be handled by defer if in SQL transaction
	}

	log.Printf("[DIAGNOSTIC] StartCampaign proceeding - campaign %s valid for start: reason=%s", campaignID, startReason)

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

	// Set job payload based on campaign type and available params
	// Priority: Check for DNS validation params first (in-place processing), then fall back to campaign type
	dnsParams, dnsErr := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID)
	if dnsErr == nil && dnsParams != nil {
		// DNS validation processing on existing campaign (in-place)
		log.Printf("[INFO] Creating DNS validation job for in-place processing on campaign %s", campaignID)
		initialJob.JobType = models.CampaignTypeDNSValidation
		payloadBytes, err := json.Marshal(dnsParams)
		if err != nil {
			log.Printf("Warning: Failed to marshal DNS validation job payload: %v", err)
		} else {
			rawMsg := json.RawMessage(payloadBytes)
			initialJob.JobPayload = &rawMsg
		}
	} else {
		// Standard processing based on campaign type
		switch campaign.CampaignType {
		case models.CampaignTypeDomainGeneration:
			params, getErr := s.campaignStore.GetDomainGenerationParams(ctx, querier, campaignID)
			if getErr != nil {
				log.Printf("Warning: Failed to get domain generation params for job payload: %v", getErr)
			} else {
				// Marshal the params struct directly to JSON
				payloadBytes, err := json.Marshal(params)
				if err != nil {
					log.Printf("Warning: Failed to marshal domain generation job payload: %v", err)
				} else {
					rawMsg := json.RawMessage(payloadBytes)
					initialJob.JobPayload = &rawMsg
				}
			}
		case models.CampaignTypeDNSValidation:
			params, getErr := s.campaignStore.GetDNSValidationParams(ctx, querier, campaignID)
			if getErr != nil {
				log.Printf("Warning: Failed to get DNS validation params for job payload: %v", getErr)
			} else {
				// Marshal the params struct directly to JSON
				payloadBytes, err := json.Marshal(params)
				if err != nil {
					log.Printf("Warning: Failed to marshal DNS validation job payload: %v", err)
				} else {
					rawMsg := json.RawMessage(payloadBytes)
					initialJob.JobPayload = &rawMsg
				}
			}
		case models.CampaignTypeHTTPKeywordValidation:
			params, getErr := s.campaignStore.GetHTTPKeywordParams(ctx, querier, campaignID)
			if getErr != nil {
				log.Printf("Warning: Failed to get HTTP keyword params for job payload: %v", getErr)
			} else {
				// Marshal the params struct directly to JSON
				payloadBytes, err := json.Marshal(params)
				if err != nil {
					log.Printf("Warning: Failed to marshal HTTP keyword job payload: %v", err)
				} else {
					rawMsg := json.RawMessage(payloadBytes)
					initialJob.JobPayload = &rawMsg
				}
			}
		}
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

	// If we couldn't create a job but we still want to update the campaign status,
	// we need to make sure the campaign is marked as running so it doesn't get stuck in pending
	if !jobCreated {
		log.Printf("No job created for campaign %s. Marking campaign as running directly.", campaignID)
		campaign.Status = models.CampaignStatusRunning
		campaign.UpdatedAt = time.Now().UTC()
		if campaign.StartedAt == nil {
			now := time.Now().UTC()
			campaign.StartedAt = &now
		}
		if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
			opErr = fmt.Errorf("failed to update campaign %s status to running: %w", campaignID, err)
			return opErr
		}
	}

	// DIAGNOSTIC: Check if this is DNS validation after phase transition
	// After phase transition: campaign type is now dns_validation and status is pending
	isDNSValidationAfterTransition := (campaign.Status == models.CampaignStatusPending &&
		campaign.CampaignType == models.CampaignTypeDNSValidation &&
		startReason == "standard_pending_campaign")

	// DIAGNOSTIC: Legacy check for DNS validation on completed campaign (before transition)
	isDNSValidationOnCompleted := (campaign.Status == models.CampaignStatusCompleted &&
		campaign.CampaignType == models.CampaignTypeDomainGeneration &&
		startReason == "dns_validation_phase_on_domain_generation")

	log.Printf("[DIAGNOSTIC] StartCampaign transition check - campaignID=%s, currentStatus=%s, targetStatus=%s, isDNSValidationAfterTransition=%t, isDNSValidationOnCompleted=%t, startReason=%s",
		campaignID, campaign.Status, models.CampaignStatusQueued, isDNSValidationAfterTransition, isDNSValidationOnCompleted, startReason)

	// FIX: For DNS validation campaigns (both legacy and post-transition), use appropriate handling
	if isDNSValidationOnCompleted {
		log.Printf("[FIX] Bypassing status transition for DNS validation on completed campaign %s - preserving completed status", campaignID)
		s.logAuditEvent(ctx, querier, campaign, "DNS Validation Started on Completed Campaign", "DNS validation job created without changing campaign status")
		return nil // Success without status change
	} else if isDNSValidationAfterTransition {
		log.Printf("[FIX] DNS validation after phase transition for campaign %s - proceeding with normal status transition", campaignID)
		// Continue to normal status transition flow
	}

	desc := fmt.Sprintf("Campaign status changed to %s", models.CampaignStatusQueued)
	// s.updateCampaignStatusInTx will use the querier (which is sqlTx or nil)
	opErr = s.updateCampaignStatusInTx(ctx, querier, campaign, models.CampaignStatusQueued, "", desc, "Campaign Start Requested")
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
	if campaign.Status != models.CampaignStatusRunning && campaign.Status != models.CampaignStatusQueued {
		opErr = fmt.Errorf("campaign %s not running/queued: %s", campaignID, campaign.Status)
		return opErr
	}
	desc := fmt.Sprintf("Status changed from %s to %s", campaign.Status, models.CampaignStatusPaused)
	opErr = s.updateCampaignStatusInTx(ctx, querier, campaign, models.CampaignStatusPaused, "", desc, "Campaign Paused")
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
	if campaign.Status != models.CampaignStatusPaused {
		opErr = fmt.Errorf("campaign %s not paused: %s", campaignID, campaign.Status)
		return opErr
	}

	desc := fmt.Sprintf("Status changed from %s to %s", campaign.Status, models.CampaignStatusQueued)
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

	// If we couldn't create a job but we still want to update the campaign status,
	// we need to make sure the campaign is marked as running so it doesn't get stuck in queued
	if !jobCreated {
		log.Printf("No resume job created for campaign %s. Marking campaign as running directly.", campaignID)
		campaign.Status = models.CampaignStatusRunning
		campaign.UpdatedAt = time.Now().UTC()
		if campaign.StartedAt == nil {
			now := time.Now().UTC()
			campaign.StartedAt = &now
		}
		if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
			opErr = fmt.Errorf("failed to update campaign %s status to running: %w", campaignID, err)
			return opErr
		}
		// Return early since we've already updated the campaign status
		return nil
	}
	opErr = s.updateCampaignStatusInTx(ctx, querier, campaign, models.CampaignStatusQueued, "", desc, "Campaign Resumed")
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
	if campaign.Status == models.CampaignStatusCompleted || campaign.Status == models.CampaignStatusFailed ||
		campaign.Status == models.CampaignStatusArchived || campaign.Status == models.CampaignStatusCancelled {
		opErr = fmt.Errorf("campaign %s already in a final state: %s", campaignID, campaign.Status)
		return opErr
	}
	desc := fmt.Sprintf("Status changed from %s to %s", campaign.Status, models.CampaignStatusCancelled)
	opErr = s.updateCampaignStatusInTx(ctx, querier, campaign, models.CampaignStatusCancelled, "User cancelled campaign", desc, "Campaign Cancelled")
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
	opErr = s.updateCampaignStatusInTx(ctx, querier, campaign, models.CampaignStatusFailed, errorMessage, desc, "Campaign Error")
	return opErr
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

	// Validate state transition using the state machine
	currentState := originalStatus
	newState := newStatus

	if err := s.stateMachine.ValidateTransition(currentState, newState); err != nil {
		// Log the invalid transition attempt with detailed context
		log.Printf("[DIAGNOSTIC] Invalid state transition attempt for campaign %s: from=%s to=%s, campaignType=%s, error=%v",
			campaign.ID, currentState, newState, campaign.CampaignType, err)
		return fmt.Errorf("state transition validation failed for campaign %s: %w", campaign.ID, err)
	}

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
	log.Printf("Current campaign type: %s, status: %s", campaign.CampaignType, campaign.Status)
	log.Printf("Update request - Name: %v, CampaignType: %v, Status: %v", req.Name, req.CampaignType, req.Status)

	// Handle phase transitions first (before general updates)
	if req.CampaignType != nil && *req.CampaignType != campaign.CampaignType {
		log.Printf("Campaign type transition requested: %s -> %s", campaign.CampaignType, *req.CampaignType)

		// Handle domain_generation -> dns_validation transition
		if campaign.CampaignType == models.CampaignTypeDomainGeneration && *req.CampaignType == models.CampaignTypeDNSValidation {
			if campaign.Status != models.CampaignStatusCompleted {
				opErr = fmt.Errorf("UpdateCampaign: cannot transition to DNS validation - domain generation campaign %s must be completed (current status: %s)", campaignID, campaign.Status)
				return nil, opErr
			}

			// Validate required DNS parameters
			if req.PersonaIDs == nil || len(*req.PersonaIDs) == 0 {
				opErr = fmt.Errorf("UpdateCampaign: personaIds required for DNS validation phase transition")
				return nil, opErr
			}

			// Transition the campaign to DNS validation phase
			if err := s.transitionToDNSValidation(ctx, querier, campaign, &req); err != nil {
				opErr = fmt.Errorf("UpdateCampaign: failed to transition to DNS validation: %w", err)
				return nil, opErr
			}

			log.Printf("Successfully transitioned campaign %s from domain_generation to dns_validation", campaignID)
		} else {
			// Other transitions not supported yet
			opErr = fmt.Errorf("UpdateCampaign: campaign type transition from %s to %s is not supported", campaign.CampaignType, *req.CampaignType)
			return nil, opErr
		}
	} else {
		// Standard campaign field updates (no type transition)
		if req.Name != nil {
			campaign.Name = *req.Name
		}
		if req.Status != nil {
			campaign.Status = *req.Status
		}

		campaign.UpdatedAt = time.Now().UTC()

		if err := s.campaignStore.UpdateCampaign(ctx, querier, campaign); err != nil {
			opErr = fmt.Errorf("UpdateCampaign: update campaign %s failed: %w", campaignID, err)
			return nil, opErr
		}

		// Handle DNS validation parameters for existing DNS campaigns (not phase transitions)
		if campaign.CampaignType == models.CampaignTypeDNSValidation && req.PersonaIDs != nil {
			if err := s.updateDNSValidationParams(ctx, querier, campaignID, &req); err != nil {
				log.Printf("Warning: Failed to update DNS validation params for campaign %s: %v", campaignID, err)
				// Don't fail the whole update, just log the error
			}
		}
	}

	// Log audit event
	s.logAuditEvent(ctx, querier, campaign, "Campaign Updated", fmt.Sprintf("Campaign %s was updated", campaign.Name))

	return campaign, nil
}

// transitionToDNSValidation handles the transition from domain_generation to dns_validation
func (s *campaignOrchestratorServiceImpl) transitionToDNSValidation(ctx context.Context, querier store.Querier, campaign *models.Campaign, req *UpdateCampaignRequest) error {
	log.Printf("Transitioning campaign %s from domain_generation phase to dns_validation phase", campaign.ID)

	// CRITICAL FIX: Do NOT change campaign type - it remains a domain_generation campaign
	// Only change the current phase to DNS validation
	campaign.Status = models.CampaignStatusPending
	campaign.UpdatedAt = time.Now().UTC()

	// CORRECT: Set currentPhase to dns_validation while keeping campaignType as domain_generation
	dnsPhase := models.CampaignPhaseDNSValidation
	campaign.CurrentPhase = &dnsPhase

	// Reset phase status for the new phase
	phaseStatusPending := models.CampaignPhaseStatusPending
	campaign.PhaseStatus = &phaseStatusPending

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

	// Create DNS validation params in the database
	if err := s.campaignStore.CreateDNSValidationParams(ctx, querier, dnsParams); err != nil {
		return fmt.Errorf("failed to create DNS validation params: %w", err)
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
	if campaign.Status == models.CampaignStatusRunning {
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

		log.Printf("Successfully auto-cancelled campaign %s (status: %s), proceeding with deletion", campaignID, campaign.Status)
	}

	// Find and delete dependent campaigns first (following the orchestration chain)
	if !skipDependencyCheck {
		dependentCampaigns, err := s.findDependentCampaigns(ctx, querier, campaignID, campaign.CampaignType)
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
	if campaign.CampaignType == models.CampaignTypeDomainGeneration {
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
func (s *campaignOrchestratorServiceImpl) findDependentCampaigns(ctx context.Context, querier store.Querier, campaignID uuid.UUID, campaignType models.CampaignTypeEnum) ([]uuid.UUID, error) {
	var dependentIDs []uuid.UUID

	switch campaignType {
	case models.CampaignTypeDomainGeneration:
		// Find DNS campaigns that use this domain generation campaign as source
		dnsFilter := store.ListCampaignsFilter{Type: models.CampaignTypeDNSValidation}
		dnsCampaigns, err := s.campaignStore.ListCampaigns(ctx, querier, dnsFilter)
		if err != nil {
			return nil, err
		}

		for _, dnsCampaign := range dnsCampaigns {
			if dnsCampaign != nil {
				// Check if this DNS campaign references our domain generation campaign
				dnsParams, err := s.campaignStore.GetDNSValidationParams(ctx, querier, dnsCampaign.ID)
				if err == nil && dnsParams.SourceGenerationCampaignID != nil && *dnsParams.SourceGenerationCampaignID == campaignID {
					dependentIDs = append(dependentIDs, dnsCampaign.ID)

					// Also find HTTP campaigns that depend on this DNS campaign
					httpDependents, err := s.findDependentCampaigns(ctx, querier, dnsCampaign.ID, models.CampaignTypeDNSValidation)
					if err == nil {
						dependentIDs = append(dependentIDs, httpDependents...)
					}
				}
			}
		}

	case models.CampaignTypeDNSValidation:
		// Find HTTP campaigns that use this DNS campaign as source
		httpFilter := store.ListCampaignsFilter{Type: models.CampaignTypeHTTPKeywordValidation}
		httpCampaigns, err := s.campaignStore.ListCampaigns(ctx, querier, httpFilter)
		if err != nil {
			return nil, err
		}

		for _, httpCampaign := range httpCampaigns {
			if httpCampaign != nil {
				// Check if this HTTP campaign references our DNS campaign
				httpParams, err := s.campaignStore.GetHTTPKeywordParams(ctx, querier, httpCampaign.ID)
				if err == nil && httpParams.SourceCampaignID == campaignID {
					dependentIDs = append(dependentIDs, httpCampaign.ID)
				}
			}
		}

	case models.CampaignTypeHTTPKeywordValidation:
		// HTTP campaigns are leaf nodes in the dependency chain
		// No other campaigns depend on HTTP campaigns
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
	log.Printf("Orchestrator: Creating campaign with unified endpoint. Type: %s, Name: %s, LaunchSequence: %v", req.CampaignType, req.Name, req.LaunchSequence)

	var campaign *models.Campaign
	var err error

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

		campaign, err = s.domainGenService.CreateCampaign(ctx, legacyReq)

	case "dns_validation":
		if req.DnsValidationParams == nil {
			return nil, fmt.Errorf("dnsValidationParams required for dns_validation campaigns")
		}

		// Handle DNS validation campaign creation
		if req.DnsValidationParams.SourceGenerationCampaignID != nil {
			// PHASE TRANSITION: This should use UpdateCampaign instead of creating a new campaign
			// to properly transition an existing domain generation campaign to DNS validation
			return nil, fmt.Errorf("phase transitions from domain_generation to dns_validation should use UpdateCampaign with campaignType change, not CreateCampaign")
		} else if req.DnsValidationParams.SourceCampaignID != nil {
			// Path 2: Standalone DNS Validation (from past campaign)

			// First, validate that the source campaign exists and get its domains
			querier := s.db
			sourceCampaign, validateErr := s.campaignStore.GetCampaignByID(ctx, querier, *req.DnsValidationParams.SourceCampaignID)
			if validateErr != nil {
				return nil, fmt.Errorf("source campaign %s not found: %w", *req.DnsValidationParams.SourceCampaignID, validateErr)
			}

			// Determine the source generation campaign based on the source campaign type
			var sourceGenerationCampaignID uuid.UUID
			switch sourceCampaign.CampaignType {
			case models.CampaignTypeDomainGeneration:
				// Source is a domain generation campaign - use it directly
				sourceGenerationCampaignID = sourceCampaign.ID
			case models.CampaignTypeDNSValidation:
				// Source is a DNS validation campaign - get its source generation campaign
				dnsParams, paramErr := s.campaignStore.GetDNSValidationParams(ctx, querier, sourceCampaign.ID)
				if paramErr != nil {
					return nil, fmt.Errorf("failed to get DNS validation params for source campaign %s: %w", sourceCampaign.ID, paramErr)
				}
				if dnsParams.SourceGenerationCampaignID == nil {
					return nil, fmt.Errorf("source DNS validation campaign %s has no source generation campaign", sourceCampaign.ID)
				}
				sourceGenerationCampaignID = *dnsParams.SourceGenerationCampaignID
			default:
				return nil, fmt.Errorf("source campaign %s must be either domain_generation or dns_validation type, got %s", sourceCampaign.ID, sourceCampaign.CampaignType)
			}

			// Create the new standalone DNS validation campaign
			legacyReq := CreateDNSValidationCampaignRequest{
				Name:                       req.Name,
				SourceGenerationCampaignID: sourceGenerationCampaignID,
				PersonaIDs:                 req.DnsValidationParams.PersonaIDs,
				RotationIntervalSeconds:    req.DnsValidationParams.RotationIntervalSeconds,
				ProcessingSpeedPerMinute:   req.DnsValidationParams.ProcessingSpeedPerMinute,
				BatchSize:                  req.DnsValidationParams.BatchSize,
				RetryAttempts:              req.DnsValidationParams.RetryAttempts,
				UserID:                     req.UserID,
			}
			campaign, err = s.dnsService.CreateCampaign(ctx, legacyReq)
		} else {
			return nil, fmt.Errorf("dnsValidationParams must specify sourceCampaignId for creating new DNS validation campaigns. For phase transitions from domain_generation, use UpdateCampaign with campaignType change")
		}

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

		campaign, err = s.httpKeywordService.CreateCampaign(ctx, legacyReq)

	default:
		return nil, fmt.Errorf("unsupported campaign type: %s", req.CampaignType)
	}

	if err != nil {
		return nil, err
	}

	// Update the campaign with the launch sequence preference
	if campaign != nil && campaign.LaunchSequence != req.LaunchSequence {
		log.Printf("Orchestrator: Setting launch_sequence to %v for campaign %s", req.LaunchSequence, campaign.ID)
		campaign.LaunchSequence = req.LaunchSequence
		campaign.UpdatedAt = time.Now().UTC()

		var querier store.Querier
		if s.db != nil {
			querier = s.db
		}

		if updateErr := s.campaignStore.UpdateCampaign(ctx, querier, campaign); updateErr != nil {
			log.Printf("Warning: Failed to update launch_sequence for campaign %s: %v", campaign.ID, updateErr)
			// Don't fail the entire operation, just log the warning
		}
	}

	return campaign, nil
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

	dependentIDs, err := s.findDependentCampaigns(ctx, querier, campaignID, campaign.CampaignType)
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

	return &CampaignDependencyInfo{
		Campaign:           *campaign,
		DependentCampaigns: dependentCampaigns,
		HasDependencies:    len(dependentCampaigns) > 0,
		CanDelete:          campaign.Status != models.CampaignStatusRunning,
	}, nil
}

// HandleCampaignCompletion creates and queues the next campaign in the chain
// when a campaign completes. Domain generation -> DNS -> HTTP.
// Only creates the next campaign if the original campaign has launch_sequence=true.
func (s *campaignOrchestratorServiceImpl) HandleCampaignCompletion(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("[DEBUG] HandleCampaignCompletion called for campaign %s", campaignID)

	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		log.Printf("[DEBUG] Failed to get campaign %s: %v", campaignID, err)
		return err
	}

	log.Printf("[DEBUG] Campaign %s type: %s, launch_sequence: %v", campaignID, campaign.CampaignType, campaign.LaunchSequence)

	// Check if campaign has launch_sequence flag enabled before auto-chaining
	if !campaign.LaunchSequence {
		log.Printf("[INFO] Campaign %s has launch_sequence=false, skipping auto-chaining to next campaign type", campaignID)
		return nil
	}

	log.Printf("[INFO] Campaign %s has launch_sequence=true, proceeding with auto-chaining to next campaign type", campaignID)

	switch campaign.CampaignType {
	case models.CampaignTypeDomainGeneration:
		// DNS validation is now handled in-place on the same campaign, not via auto-chaining
		// Users manually add DNS validation params and call StartCampaign on the same campaign
		log.Printf("[INFO] Domain generation campaign %s completed. DNS validation will be handled in-place when configured manually.", campaignID)
		return nil

	case models.CampaignTypeDNSValidation:
		enabled := true
		personas, err := s.personaStore.ListPersonas(ctx, s.db, store.ListPersonasFilter{Type: models.PersonaTypeHTTP, IsEnabled: &enabled, Limit: 1})
		if err != nil || len(personas) == 0 {
			log.Printf("[ERROR] Failed to find enabled HTTP personas for auto-chaining from campaign %s: %v", campaignID, err)
			return err
		}
		sets, err := s.keywordStore.ListKeywordSets(ctx, s.db, store.ListKeywordSetsFilter{Limit: 1})
		if err != nil || len(sets) == 0 {
			log.Printf("[ERROR] Failed to find keyword sets for auto-chaining from campaign %s: %v", campaignID, err)
			return err
		}
		req := CreateHTTPKeywordCampaignRequest{
			Name:             campaign.Name + " HTTP",
			SourceCampaignID: campaignID,
			PersonaIDs:       []uuid.UUID{personas[0].ID},
			KeywordSetIDs:    []uuid.UUID{sets[0].ID},
			UserID:           *campaign.UserID,
		}
		log.Printf("[INFO] Creating HTTP keyword validation campaign for auto-chain from campaign %s", campaignID)
		nextCamp, err := s.httpKeywordService.CreateCampaign(ctx, req)
		if err != nil {
			log.Printf("[ERROR] Failed to create HTTP keyword validation campaign for auto-chain: %v", err)
			return err
		}
		log.Printf("[INFO] Successfully created HTTP keyword validation campaign %s, starting it", nextCamp.ID)
		return s.StartCampaign(ctx, nextCamp.ID)

	default:
		log.Printf("[DEBUG] Campaign %s type %s is not configured for auto-chaining", campaignID, campaign.CampaignType)
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
	filter := store.ListCampaignsFilter{
		Type: models.CampaignTypeDomainGeneration,
		// We don't exclude the current campaign here because we want to count it
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
