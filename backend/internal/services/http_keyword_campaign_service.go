// File: backend/internal/services/http_keyword_campaign_service.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"reflect"
	"regexp"
	"strings"
	"sync"
	"time"

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
}

// NewHTTPKeywordCampaignService creates a new HTTPKeywordCampaignService.
func NewHTTPKeywordCampaignService(
	db *sqlx.DB,
	cs store.CampaignStore, ps store.PersonaStore, prStore store.ProxyStore, ks store.KeywordStore, as store.AuditLogStore,
	cjs store.CampaignJobStore,
	hv *httpvalidator.HTTPValidator, kwScanner *keywordscanner.Service, pm *proxymanager.ProxyManager, appCfg *config.AppConfig,
) HTTPKeywordCampaignService {
	return &httpKeywordCampaignServiceImpl{
		db:               db,
		campaignStore:    cs,
		personaStore:     ps,
		proxyStore:       prStore,
		keywordStore:     ks,
		auditLogStore:    as,
		auditLogger:      utils.NewAuditLogger(as),
		campaignJobStore: cjs,
		httpValidator:    hv,
		keywordScanner:   kwScanner,
		proxyManager:     pm,
		appConfig:        appCfg,
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

	// Create/update HTTP validation parameters using self-reference for in-place validation
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
	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.CampaignPhaseHTTPValidation {
		return fmt.Errorf("campaign %s must be in http_keyword_validation phase to transition to analysis, current: %v", campaignID, campaign.CurrentPhase)
	}

	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.CampaignPhaseStatusSucceeded {
		return fmt.Errorf("HTTP validation phase must be completed before transitioning to analysis, current status: %v", campaign.PhaseStatus)
	}

	// Update campaign phase to analysis
	analysisPhase := models.CampaignPhaseAnalysis
	pendingStatus := models.CampaignPhaseStatusPending

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

func (s *httpKeywordCampaignServiceImpl) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.HTTPKeywordCampaignParams, error) {
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

	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.CampaignPhaseHTTPValidation {
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

func (s *httpKeywordCampaignServiceImpl) validateKeywordSetIDs(ctx context.Context, querier store.Querier, keywordSetIDs []uuid.UUID) error {
	if len(keywordSetIDs) == 0 {
		return nil
	}
	for _, ksID := range keywordSetIDs {
		set, err := s.keywordStore.GetKeywordSetByID(ctx, querier, ksID)
		if err != nil {
			if err == store.ErrNotFound {
				return fmt.Errorf("keyword set ID '%s' not found", ksID)
			}
			return fmt.Errorf("verifying keyword set ID '%s': %w", ksID, err)
		}
		if !set.IsEnabled {
			return fmt.Errorf("keyword set ID '%s' is disabled", ksID)
		}
	}
	return nil
}

func (s *httpKeywordCampaignServiceImpl) logAuditEvent(ctx context.Context, exec store.Querier, campaign *models.Campaign, action, description string) {
	if s.auditLogger == nil {
		return
	}
	s.auditLogger.LogCampaignEvent(ctx, exec, campaign, action, description)
}

func derefUUIDPtr(id *uuid.UUID) uuid.UUID {
	if id == nil {
		return uuid.Nil
	}
	return *id
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

	if campaign.PhaseStatus == nil || (*campaign.PhaseStatus != models.CampaignPhaseStatusInProgress && *campaign.PhaseStatus != models.CampaignPhaseStatusPending) {
		statusStr := "unknown"
		if campaign.PhaseStatus != nil {
			statusStr = string(*campaign.PhaseStatus)
		}
		log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s not runnable (status: %s). Skipping.", campaignID, statusStr)
		return true, 0, nil
	}

	if campaign.PhaseStatus != nil && *campaign.PhaseStatus == models.CampaignPhaseStatusPending {
		status := models.CampaignPhaseStatusInProgress
		campaign.PhaseStatus = &status
		now := time.Now().UTC()
		campaign.StartedAt = &now
		if errUpdateCamp := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCamp != nil {
			opErr = fmt.Errorf("failed to mark campaign %s as running: %w", campaignID, errUpdateCamp)
			return false, 0, opErr
		}
	}

	hkParams, errGetParams := s.campaignStore.GetHTTPKeywordParams(ctx, querier, campaignID)
	if errGetParams != nil {
		opErr = fmt.Errorf("failed to fetch HTTP/Keyword params for campaign %s: %w", campaignID, errGetParams)
		return false, 0, opErr
	}

	sourceDNSCampaign, sourceCampaignErr := s.campaignStore.GetCampaignByID(ctx, querier, hkParams.SourceCampaignID)
	if sourceCampaignErr != nil {
		opErr = fmt.Errorf("failed to fetch source DNS campaign %s for TotalItems update: %w", hkParams.SourceCampaignID, sourceCampaignErr)
		return false, 0, opErr
	}
	expectedTotalItems, countErr := s.campaignStore.CountDNSValidationResults(ctx, querier, hkParams.SourceCampaignID, true)
	if countErr == nil {
		if campaign.TotalItems == nil || *campaign.TotalItems != expectedTotalItems {
			log.Printf("ProcessHTTPKeywordCampaignBatch: Updating TotalItems for campaign %s from %v to %d.", campaignID, campaign.TotalItems, expectedTotalItems)
			campaign.TotalItems = models.Int64Ptr(expectedTotalItems)
		}
	} else {
		log.Printf("ProcessHTTPKeywordCampaignBatch: Warning - could not count valid DNS results for TotalItems update: %v. Using existing %v or source processed %v.",
			countErr, campaign.TotalItems, sourceDNSCampaign.ProcessedItems)
		if (campaign.TotalItems == nil || *campaign.TotalItems == 0) && sourceDNSCampaign.PhaseStatus != nil && *sourceDNSCampaign.PhaseStatus == models.CampaignPhaseStatusSucceeded {
			if sourceDNSCampaign.ProcessedItems != nil {
				campaign.TotalItems = models.Int64Ptr(*sourceDNSCampaign.ProcessedItems)
			} else if sourceDNSCampaign.TotalItems != nil { // Fallback if processed is nil
				campaign.TotalItems = models.Int64Ptr(*sourceDNSCampaign.TotalItems)
			} else {
				campaign.TotalItems = models.Int64Ptr(0)
			}
		} else if campaign.TotalItems == nil || *campaign.TotalItems == 0 {
			if sourceDNSCampaign.TotalItems != nil {
				campaign.TotalItems = models.Int64Ptr(*sourceDNSCampaign.TotalItems)
			} else {
				campaign.TotalItems = models.Int64Ptr(0)
			}
		}
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
		status := models.CampaignPhaseStatusSucceeded
		campaign.PhaseStatus = &status
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		now := time.Now().UTC()
		campaign.CompletedAt = &now

		// AUTOMATIC PHASE TRANSITION: Set currentPhase to analysis
		analysisPhase := models.CampaignPhaseAnalysis
		campaign.CurrentPhase = &analysisPhase

		opErr = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
		return true, 0, opErr
	}
	if *campaign.TotalItems == 0 {
		log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s has 0 TotalItems. Marking complete and transitioning to analysis phase.", campaignID)
		status := models.CampaignPhaseStatusSucceeded
		campaign.PhaseStatus = &status
		campaign.ProgressPercentage = models.Float64Ptr(100.0)
		now := time.Now().UTC()
		campaign.CompletedAt = &now

		// AUTOMATIC PHASE TRANSITION: Set currentPhase to analysis
		analysisPhase := models.CampaignPhaseAnalysis
		campaign.CurrentPhase = &analysisPhase

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

	domainsToProcess, errGetDomains := s.campaignStore.GetDomainsForHTTPValidation(ctx, querier, campaignID, hkParams.SourceCampaignID, batchSizeVal, lastProcessedDomainNameVal)
	if errGetDomains != nil {
		opErr = fmt.Errorf("failed to get domains for HTTP validation for campaign %s: %w", campaignID, errGetDomains)
		return false, 0, opErr
	}

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
			status := models.CampaignPhaseStatusSucceeded
			campaign.PhaseStatus = &status
			campaign.ProgressPercentage = models.Float64Ptr(100.0)
			now := time.Now().UTC()
			campaign.CompletedAt = &now

			// AUTOMATIC PHASE TRANSITION: Set currentPhase to analysis
			analysisPhase := models.CampaignPhaseAnalysis
			campaign.CurrentPhase = &analysisPhase

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

	personas := make([]*models.Persona, 0, len(hkParams.PersonaIDs))
	for _, pID := range hkParams.PersonaIDs {
		p, pErr := s.personaStore.GetPersonaByID(ctx, querier, pID)
		if pErr != nil {
			opErr = fmt.Errorf("failed to fetch HTTP persona %s: %w", pID, pErr)
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

	allKeywordRulesModels := []models.KeywordRule{}
	if len(hkParams.KeywordSetIDs) > 0 {
		for _, ksID := range hkParams.KeywordSetIDs {
			rules, rErr := s.keywordStore.GetKeywordRulesBySetID(ctx, querier, ksID)
			if rErr != nil {
				opErr = fmt.Errorf("failed to fetch rules for keyword set %s: %w", ksID, rErr)
				return false, 0, opErr
			}
			allKeywordRulesModels = append(allKeywordRulesModels, rules...)
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

	var wg sync.WaitGroup
	concurrencyLimit := s.appConfig.Worker.HTTPKeywordSubtaskConcurrency
	if concurrencyLimit <= 0 {
		concurrencyLimit = 50 // Phase 3: 10x increase for 500-domain batches
	}
	semaphore := make(chan struct{}, concurrencyLimit)
	muResults := sync.Mutex{}
	dbResults := make([]*models.HTTPKeywordResult, 0, len(domainsToProcess))
	nowTime := time.Now().UTC()

	// Context for goroutines in this batch
	batchCtx, batchCancel := context.WithCancel(ctx)
	defer batchCancel()
	var batchProcessingContextErr error

	for _, dnsRecord := range domainsToProcess {
		if batchCtx.Err() != nil {
			log.Printf("Batch context cancelled before processing domain %s for HTTP campaign %s", dnsRecord.DomainName, campaignID)
			batchProcessingContextErr = batchCtx.Err()
			break
		}

		wg.Add(1)
		semaphore <- struct{}{}
		go func(currentDNSRecord models.DNSValidationResult) {
			defer wg.Done()
			defer func() { <-semaphore }()

			var finalHTTPValResult *httpvalidator.ValidationResult
			var successPersonaID uuid.NullUUID
			var usedProxyID uuid.NullUUID
			attemptCount := 0
			var foundKeywordsFromSetsJSON json.RawMessage
			var adhocKeywordsFoundForThisDomain []string

			var proxyForValidator *models.Proxy
			if hkParams.ProxyPoolID.Valid && s.proxyManager != nil {
				proxyEntry, errPmGet := s.proxyManager.GetProxy()
				if errPmGet == nil && proxyEntry != nil {
					proxyUUID, errParse := uuid.Parse(proxyEntry.ID)
					if errParse == nil {
						// Use a local conditional querier for this read, independent of the main transaction
						var proxyReadQuerier store.Querier
						if s.db != nil {
							proxyReadQuerier = s.db
						}
						fetchedProxy, errDbGet := s.proxyStore.GetProxyByID(batchCtx, proxyReadQuerier, proxyUUID) // Use batchCtx
						if errDbGet == nil {
							proxyForValidator = fetchedProxy
							usedProxyID = uuid.NullUUID{UUID: fetchedProxy.ID, Valid: true}
							log.Printf("Using proxy %s (%s) for domain %s", fetchedProxy.ID, fetchedProxy.Address, currentDNSRecord.DomainName)
						} else {
							log.Printf("Error fetching full proxy model %s from store: %v", proxyEntry.ID, errDbGet)
						}
					} else {
						log.Printf("Error parsing proxy ID '%s' from manager: %v", proxyEntry.ID, errParse)
					}
				} else if errPmGet != nil {
					log.Printf("Error getting proxy from manager (pool %s): %v", hkParams.ProxyPoolID.UUID, errPmGet)
				}
			}

			for _, persona := range personas {
				if batchCtx.Err() != nil {
					log.Printf("Batch context cancelled during HTTP persona processing for %s (persona %s)", currentDNSRecord.DomainName, persona.ID)
					finalHTTPValResult = &httpvalidator.ValidationResult{Domain: currentDNSRecord.DomainName, Status: "ErrorCancelled", Error: fmt.Sprintf("Context cancelled during persona %s processing", persona.ID)}
					goto StoreResultGoroutine
				}
				attemptCount++
				httpValRes, httpErr := s.httpValidator.Validate(batchCtx, currentDNSRecord.DomainName, currentDNSRecord.DomainName, persona, proxyForValidator) // Use batchCtx

				if httpErr == nil && httpValRes.IsSuccess {
					finalHTTPValResult = httpValRes
					successPersonaID = uuid.NullUUID{UUID: persona.ID, Valid: true}
					break
				}
				finalHTTPValResult = httpValRes // Keep last result
				rotationIntervalVal := 0
				if hkParams.RotationIntervalSeconds != nil {
					rotationIntervalVal = *hkParams.RotationIntervalSeconds
				}
				if len(personas) > 1 && rotationIntervalVal > 0 && attemptCount < len(personas) {
					select {
					case <-batchCtx.Done(): // Use batchCtx
						log.Printf("Batch context cancelled during HTTP persona rotation for %s", currentDNSRecord.DomainName)
						finalHTTPValResult = &httpvalidator.ValidationResult{Domain: currentDNSRecord.DomainName, Status: "ErrorCancelled", Error: "Context cancelled during rotation"}
						goto StoreResultGoroutine
					case <-time.After(time.Duration(rotationIntervalVal) * time.Second):
					}
				}
			} // End persona loop

			if batchCtx.Err() != nil && finalHTTPValResult == nil {
				log.Printf("Batch context cancelled after all HTTP persona attempts for %s", currentDNSRecord.DomainName)
				finalHTTPValResult = &httpvalidator.ValidationResult{Domain: currentDNSRecord.DomainName, Status: "ErrorCancelled", Error: "Context cancelled after all attempts"}
			}

		StoreResultGoroutine:
			if finalHTTPValResult == nil {
				log.Printf("CRITICAL: finalHTTPValResult is nil for domain %s (HTTP) before storing. Setting to generic error.", currentDNSRecord.DomainName)
				finalHTTPValResult = &httpvalidator.ValidationResult{
					Domain: currentDNSRecord.DomainName, Status: "ErrorProcessing", Error: "Internal processing error: validation result not captured.",
				}
			}

			dbRes := &models.HTTPKeywordResult{
				ID:                    uuid.New(),
				HTTPKeywordCampaignID: campaignID,
				DNSResultID:           uuid.NullUUID{UUID: currentDNSRecord.ID, Valid: true},
				DomainName:            currentDNSRecord.DomainName,
				Attempts:              models.IntPtr(attemptCount),
				ValidatedByPersonaID:  successPersonaID,
				UsedProxyID:           usedProxyID,
				LastCheckedAt:         &nowTime,
			}

			if finalHTTPValResult != nil {
				if finalHTTPValResult.StatusCode > 0 {
					statusCode := int32(finalHTTPValResult.StatusCode)
					dbRes.HTTPStatusCode = &statusCode
				}

				if finalHTTPValResult.ResponseHeaders != nil {
					hBytes, _ := json.Marshal(finalHTTPValResult.ResponseHeaders)
					dbRes.ResponseHeaders = models.JSONRawMessagePtr(json.RawMessage(hBytes))
				}

				if finalHTTPValResult.ContentHash != "" {
					dbRes.ContentHash = models.StringPtr(finalHTTPValResult.ContentHash)
				}

				if finalHTTPValResult.ExtractedTitle != "" {
					dbRes.PageTitle = models.StringPtr(finalHTTPValResult.ExtractedTitle)
				}

				if finalHTTPValResult.ExtractedContentSnippet != "" {
					dbRes.ExtractedContentSnippet = models.StringPtr(finalHTTPValResult.ExtractedContentSnippet)
				}

				if finalHTTPValResult.IsSuccess && len(finalHTTPValResult.RawBody) > 0 {
					if len(compiledKeywordRules) > 0 {
						foundPatterns, scanErr := s.keywordScanner.ScanWithRules(batchCtx, finalHTTPValResult.RawBody, compiledKeywordRules) // Use batchCtx
						if scanErr != nil {
							log.Printf("Error scanning keywords from sets for %s: %v", currentDNSRecord.DomainName, scanErr)
						} else if len(foundPatterns) > 0 {
							foundKeywordsFromSetsJSON, _ = json.Marshal(foundPatterns)
						}
					}
					if hkParams.AdHocKeywords != nil && len(*hkParams.AdHocKeywords) > 0 {
						bodyLower := strings.ToLower(string(finalHTTPValResult.RawBody))
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
				} else if finalHTTPValResult.Status == "ErrorCancelled" {
					dbRes.ValidationStatus = "cancelled_during_processing"
				} else if finalHTTPValResult.Error != "" {
					dbRes.ValidationStatus = "invalid_http_response_error"
				} else {
					dbRes.ValidationStatus = "invalid_http_code"
				}
			} else {
				dbRes.ValidationStatus = "processing_failed_before_http"
			}
			muResults.Lock()
			dbResults = append(dbResults, dbRes)
			muResults.Unlock()
		}(*dnsRecord)
	}
	wg.Wait()

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
		campaign.HTTPKeywordValidationParams = hkParams
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

	if *campaign.TotalItems > 0 {
		*campaign.ProgressPercentage = (float64(*campaign.ProcessedItems) / float64(*campaign.TotalItems)) * 100
		if *campaign.ProgressPercentage > 100 {
			*campaign.ProgressPercentage = 100
		}
	} else if *campaign.TotalItems == 0 {
		*campaign.ProgressPercentage = 100
	}

	if *campaign.TotalItems > 0 && *campaign.ProcessedItems >= *campaign.TotalItems {
		// HTTP validation phase is complete - transition to Analysis phase
		analysisPhase := models.CampaignPhaseAnalysis
		pendingStatus := models.CampaignPhaseStatusPending
		campaign.CurrentPhase = &analysisPhase
		campaign.PhaseStatus = &pendingStatus
		campaign.ProgressPercentage = models.Float64Ptr(0.0) // Reset progress for new phase
		done = true
		log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s completed HTTP validation, auto-transitioning to Analysis phase.", campaignID)
	} else if *campaign.TotalItems == 0 {
		// HTTP validation phase is complete - transition to Analysis phase
		analysisPhase := models.CampaignPhaseAnalysis
		pendingStatus := models.CampaignPhaseStatusPending
		campaign.CurrentPhase = &analysisPhase
		campaign.PhaseStatus = &pendingStatus
		campaign.ProgressPercentage = models.Float64Ptr(0.0) // Reset progress for new phase
		done = true
		log.Printf("ProcessHTTPKeywordCampaignBatch: Campaign %s has 0 total items, auto-transitioning to Analysis phase.", campaignID)
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
