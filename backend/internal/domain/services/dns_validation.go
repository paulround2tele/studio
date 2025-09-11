// DNS Validation Service - orchestrates dnsvalidator.DNSValidator engine
package services

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	"github.com/fntelecomllc/studio/backend/internal/domain/services/infra"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// DNSValidationConfig represents the configuration for DNS validation
type DNSValidationConfig struct {
	PersonaIDs      []uuid.UUID `json:"persona_ids"`
	BatchSize       int         `json:"batch_size"`
	Timeout         int         `json:"timeout_seconds"`
	MaxRetries      int         `json:"max_retries"`
	ValidationTypes []string    `json:"validation_types"` // A, AAAA, CNAME, etc.
	RequiredRecords []string    `json:"required_records,omitempty"`
}

// dnsValidationService implements DNSValidationService
// Orchestrates the existing dnsvalidator.DNSValidator engine
type dnsValidationService struct {
	dnsValidator *dnsvalidator.DNSValidator
	store        store.CampaignStore
	deps         Dependencies

	// Infrastructure Adapters
	auditLogger   AuditLogger
	metrics       MetricsRecorder
	txManager     TxManager
	workerPool    WorkerPool
	cache         Cache
	configManager ConfigManager

	// Execution state tracking
	mu         sync.RWMutex
	executions map[uuid.UUID]*dnsExecution
}

// dnsExecution tracks the state of a DNS validation execution
type dnsExecution struct {
	campaignID        uuid.UUID
	config            DNSValidationConfig
	status            models.PhaseStatusEnum
	startedAt         time.Time
	completedAt       *time.Time
	progressCh        chan PhaseProgress
	cancelCtx         context.Context
	cancelFunc        context.CancelFunc
	domainsToValidate []string
	itemsTotal        int64
	itemsProcessed    int64
	validDomains      []string
	invalidDomains    []string
	lastError         string
}

// NewDNSValidationService creates a new DNS validation service
func NewDNSValidationService(
	dnsValidator *dnsvalidator.DNSValidator,
	store store.CampaignStore,
	deps Dependencies,
) DNSValidationService {
	svc := &dnsValidationService{
		dnsValidator: dnsValidator,
		store:        store,
		deps:         deps,
		executions:   make(map[uuid.UUID]*dnsExecution),
	}
	// Prefer injected deps, fall back to minimal adapters
	if deps.AuditLogger != nil {
		svc.auditLogger = deps.AuditLogger
	} else {
		svc.auditLogger = infra.NewAuditService()
	}
	if deps.MetricsRecorder != nil {
		svc.metrics = deps.MetricsRecorder
	} else {
		svc.metrics = infra.NewMetricsSQLX(nil)
	}
	if deps.TxManager != nil {
		svc.txManager = deps.TxManager
	} else {
		svc.txManager = infra.NewTxSQLX(nil)
	}
	if deps.WorkerPool != nil {
		svc.workerPool = deps.WorkerPool
	}
	if deps.Cache != nil {
		svc.cache = deps.Cache
	} else {
		svc.cache = infra.NewCacheRedis(nil)
	}
	if deps.ConfigManager != nil {
		svc.configManager = deps.ConfigManager
	} else {
		svc.configManager = infra.NewConfigManagerAdapter()
	}
	return svc
}

// GetPhaseType returns the phase type this service handles
func (s *dnsValidationService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeDNSValidation
}

// Configure sets up the DNS validation phase
func (s *dnsValidationService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.deps.Logger.Info(ctx, "Configuring DNS validation phase", map[string]interface{}{
		"campaign_id": campaignID,
	})

	// Audit the configuration event
	if s.auditLogger != nil {
		s.auditLogger.LogEvent(fmt.Sprintf("DNS validation phase configured for campaign %s", campaignID))
	}

	// Accept either typed config or generic map
	var dnsConfig DNSValidationConfig
	switch v := config.(type) {
	case DNSValidationConfig:
		dnsConfig = v
	case *DNSValidationConfig:
		dnsConfig = *v
	case map[string]interface{}:
		// Minimal coercion for handler-provided map
		if raw, ok := v["personaIds"]; ok {
			switch ids := raw.(type) {
			case []uuid.UUID:
				dnsConfig.PersonaIDs = ids
			case []interface{}:
				for _, elem := range ids {
					if s, ok := elem.(string); ok {
						if id, err := uuid.Parse(s); err == nil {
							dnsConfig.PersonaIDs = append(dnsConfig.PersonaIDs, id)
						}
					}
				}
			case []string:
				for _, s := range ids {
					if id, err := uuid.Parse(s); err == nil {
						dnsConfig.PersonaIDs = append(dnsConfig.PersonaIDs, id)
					}
				}
			}
		}
		if bs, ok := v["batch_size"].(int); ok {
			dnsConfig.BatchSize = bs
		}
		if bs2, ok := v["batchSize"].(int); ok && dnsConfig.BatchSize == 0 {
			dnsConfig.BatchSize = bs2
		}
		if to, ok := v["timeout"].(int); ok {
			dnsConfig.Timeout = to
		}
		if mr, ok := v["maxRetries"].(int); ok {
			dnsConfig.MaxRetries = mr
		}
		if mr2, ok := v["max_retries"].(int); ok && dnsConfig.MaxRetries == 0 {
			dnsConfig.MaxRetries = mr2
		}
		if vt, ok := v["validation_types"].([]string); ok {
			dnsConfig.ValidationTypes = vt
		}
		if rr, ok := v["required_records"].([]string); ok {
			dnsConfig.RequiredRecords = rr
		}
	default:
		// Fallback: attempt JSON round-trip into DNSValidationConfig to tolerate
		// structurally compatible but different concrete types (e.g. generated models).
		if b, err := json.Marshal(v); err == nil {
			if uErr := json.Unmarshal(b, &dnsConfig); uErr == nil {
				// Success; proceed with populated dnsConfig (may still validate below)
				break
			} else {
				return fmt.Errorf("invalid configuration type for DNS validation (unmarshal failed: %v)", uErr)
			}
		} else {
			return fmt.Errorf("invalid configuration type for DNS validation (marshal failed: %v)", err)
		}
	}

	// Validate configuration
	if err := s.Validate(ctx, dnsConfig); err != nil {
		return fmt.Errorf("invalid DNS validation configuration: %w (personas=%d batch=%d timeout=%d maxRetries=%d)", err, len(dnsConfig.PersonaIDs), dnsConfig.BatchSize, dnsConfig.Timeout, dnsConfig.MaxRetries)
	}

	// Get domains to validate from previous phase (domain generation)
	domains, err := s.getDomainsToValidate(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get domains for validation: %w", err)
	}

	if len(domains) == 0 {
		return fmt.Errorf("no domains found to validate for campaign %s", campaignID)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Store execution state
	s.executions[campaignID] = &dnsExecution{
		campaignID:        campaignID,
		config:            dnsConfig,
		status:            models.PhaseStatusConfigured,
		domainsToValidate: domains,
		itemsTotal:        int64(len(domains)),
		itemsProcessed:    0,
		validDomains:      make([]string, 0),
		invalidDomains:    make([]string, 0),
	}

	s.deps.Logger.Info(ctx, "DNS validation phase configured successfully", map[string]interface{}{
		"campaign_id":   campaignID,
		"domains_count": len(domains),
		"persona_count": len(dnsConfig.PersonaIDs),
	})

	// Persist configuration in campaign phases
	if s.store != nil {
		if raw, mErr := json.Marshal(dnsConfig); mErr == nil {
			var exec store.Querier
			if q, ok := s.deps.DB.(store.Querier); ok {
				exec = q
			}
			_ = s.store.UpdatePhaseConfiguration(ctx, exec, campaignID, models.PhaseTypeDNSValidation, raw)
		}
	}

	return nil
}

// Execute runs the DNS validation phase
func (s *dnsValidationService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return nil, fmt.Errorf("DNS validation not configured for campaign %s", campaignID)
	}

	// Allow execute after configured; guard against double start
	if execution.status == models.PhaseStatusInProgress {
		return nil, fmt.Errorf("DNS validation already in progress for campaign %s", campaignID)
	}

	// Create cancellable context for execution
	execution.cancelCtx, execution.cancelFunc = context.WithCancel(ctx)
	execution.progressCh = make(chan PhaseProgress, 100)
	execution.status = models.PhaseStatusInProgress
	execution.startedAt = time.Now()

	if s.deps.Logger != nil {
		s.deps.Logger.Info(execution.cancelCtx, "Starting DNS validation execution", map[string]interface{}{
			"campaign_id":   campaignID,
			"domains_count": len(execution.domainsToValidate),
			"sample_domains": func() []string {
				if len(execution.domainsToValidate) > 5 {
					return execution.domainsToValidate[:5]
				}
				return execution.domainsToValidate
			}(),
			"configured_batch_size": execution.config.BatchSize,
		})
	}

	// Mark phase started
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		_ = s.store.StartPhase(ctx, exec, campaignID, models.PhaseTypeDNSValidation)
	}

	// Start execution in goroutine
	go s.executeValidation(execution)

	return execution.progressCh, nil
}

// executeValidation performs the actual DNS validation using dnsvalidator engine
func (s *dnsValidationService) executeValidation(execution *dnsExecution) {
	defer close(execution.progressCh)

	ctx := execution.cancelCtx
	campaignID := execution.campaignID
	config := execution.config

	batchSize := config.BatchSize
	if batchSize <= 0 {
		batchSize = 50 // Default batch size for DNS validation
	}

	domains := execution.domainsToValidate

	// Load optional stealth runtime config and order from campaign domains data
	jitterMin, jitterMax := 0, 0
	if order, jMin, jMax, ok := s.loadStealthForDNS(execution.cancelCtx, execution.campaignID); ok {
		if len(order) > 0 {
			domains = order
		}
		jitterMin, jitterMax = jMin, jMax
	}
	var processedCount int64

	// Process domains in batches
	for i := 0; i < len(domains); i += batchSize {
		select {
		case <-ctx.Done():
			s.updateExecutionStatus(campaignID, models.PhaseStatusPaused, "Execution cancelled by caller context")
			return
		default:
		}

		// Calculate batch end
		end := i + batchSize
		if end > len(domains) {
			end = len(domains)
		}

		batch := domains[i:end]

		// Validate batch using dnsvalidator engine
		results, err := s.validateDomainBatch(ctx, batch, config)
		if err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("DNS validation failed: %v", err))
			return
		}

		// Process results
		for domain, outcome := range results {
			s.mu.Lock()
			if outcome.ok {
				execution.validDomains = append(execution.validDomains, domain)
			} else {
				execution.invalidDomains = append(execution.invalidDomains, domain)
			}
			execution.itemsProcessed++
			processedCount = execution.itemsProcessed
			s.mu.Unlock()

			// Record metrics for validation results
			if s.metrics != nil {
				if outcome.ok {
					s.metrics.RecordMetric("dns_validation_valid_domains", 1.0)
				} else {
					s.metrics.RecordMetric("dns_validation_invalid_domains", 1.0)
				}
			}
		}

		// Store validation results
		if err := s.storeValidationResults(ctx, campaignID, results); err != nil {
			s.updateExecutionStatus(campaignID, models.PhaseStatusFailed, fmt.Sprintf("Failed to store validation results: %v", err))
			return
		}

		// Send progress update
		progress := PhaseProgress{
			CampaignID:     campaignID,
			Phase:          models.PhaseTypeDNSValidation,
			Status:         models.PhaseStatusInProgress,
			ProgressPct:    float64(processedCount) / float64(len(domains)) * 100,
			ItemsTotal:     int64(len(domains)),
			ItemsProcessed: processedCount,
			Message:        fmt.Sprintf("Validated %d domains", processedCount),
			Timestamp:      time.Now(),
		}
		// Persist progress
		if s.store != nil {
			var exec store.Querier
			if q, ok := s.deps.DB.(store.Querier); ok {
				exec = q
			}
			total := int64(len(domains))
			processed := processedCount
			_ = s.store.UpdatePhaseProgress(ctx, exec, campaignID, models.PhaseTypeDNSValidation, float64(processed)/float64(total)*100, &total, &processed, nil, nil)
		}

		select {
		case execution.progressCh <- progress:
		case <-ctx.Done():
			return
		}

		// Publish progress event (guard EventBus)
		if s.deps.EventBus != nil {
			if err := s.deps.EventBus.PublishProgress(ctx, progress); err != nil {
				if s.deps.Logger != nil {
					s.deps.Logger.Warn(ctx, "Failed to publish progress event", map[string]interface{}{
						"campaign_id": campaignID,
						"error":       err.Error(),
					})
				}

				// Apply stealth jitter between batches if configured
				if jitterMax > 0 {
					delay := calcJitterMillis(jitterMin, jitterMax)
					time.Sleep(time.Duration(delay) * time.Millisecond)
				}
			}
		}
	}

	// Mark as completed
	s.mu.RLock()
	validCount := len(execution.validDomains)
	invalidCount := len(execution.invalidDomains)
	s.mu.RUnlock()

	s.updateExecutionStatus(campaignID, models.PhaseStatusCompleted, "DNS validation completed successfully")

	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "DNS validation completed", map[string]interface{}{
			"campaign_id":     campaignID,
			"domains_total":   len(domains),
			"domains_valid":   validCount,
			"domains_invalid": invalidCount,
		})
	}
}

// validateDomainBatch validates a batch of domains using the dnsvalidator engine
// dnsResultOutcome captures normalized status + reason
type dnsResultOutcome struct {
	ok     bool
	status string // ok|error|timeout
	reason *string
}

func (s *dnsValidationService) validateDomainBatch(ctx context.Context, domains []string, config DNSValidationConfig) (map[string]dnsResultOutcome, error) {
	results := make(map[string]dnsResultOutcome)

	// Use existing dnsvalidator engine for bulk validation
	validationResults := s.dnsValidator.ValidateDomainsBulk(domains, ctx, config.BatchSize)

	for _, vr := range validationResults {
		var status = "error"
		var reason *string
		lowerErr := strings.ToLower(vr.Error)
		switch {
		case (vr.Status == "Resolved" || vr.Status == "resolved") && len(vr.IPs) > 0:
			status = "ok"
		case strings.EqualFold(vr.Status, "Timeout"):
			status = "timeout"
			r := "TIMEOUT"
			reason = &r
		case strings.Contains(lowerErr, "timeout"):
			status = "timeout"
			r := "TIMEOUT"
			reason = &r
		case vr.Status == "Not Found" || vr.Status == "unresolved" || strings.Contains(lowerErr, "no such host"):
			status = "error"
			r := "NXDOMAIN"
			reason = &r
		default:
			if vr.Error != "" {
				// Generic error code bucket
				if strings.Contains(lowerErr, "refused") {
					r := "REFUSED"
					reason = &r
				}
				if reason == nil {
					r := "ERROR"
					reason = &r
				}
			}
		}
		results[vr.Domain] = dnsResultOutcome{ok: status == "ok", status: status, reason: reason}
	}
	return results, nil
}

// GetStatus returns the current status of DNS validation
func (s *dnsValidationService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return &PhaseStatus{
			CampaignID:    campaignID,
			Phase:         models.PhaseTypeDNSValidation,
			Status:        models.PhaseStatusNotStarted,
			Configuration: map[string]interface{}{},
		}, nil
	}

	// Only set StartedAt pointer if actual start time recorded (non-zero)
	var startedPtr *time.Time
	if !execution.startedAt.IsZero() {
		startedPtr = &execution.startedAt
	}
	// Build configuration snapshot
	cfgMap := map[string]interface{}{}
	if b, err := json.Marshal(execution.config); err == nil {
		_ = json.Unmarshal(b, &cfgMap)
	}
	status := &PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeDNSValidation,
		Status:         execution.status,
		StartedAt:      startedPtr,
		CompletedAt:    execution.completedAt,
		ItemsTotal:     execution.itemsTotal,
		ItemsProcessed: execution.itemsProcessed,
		LastError:      execution.lastError,
		Configuration:  cfgMap,
	}

	if execution.itemsTotal > 0 {
		status.ProgressPct = float64(execution.itemsProcessed) / float64(execution.itemsTotal) * 100
	}

	return status, nil
}

// Cancel stops the DNS validation execution
func (s *dnsValidationService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return fmt.Errorf("no DNS validation execution found for campaign %s", campaignID)
	}

	if execution.cancelFunc != nil {
		execution.cancelFunc()
	}

	s.deps.Logger.Info(ctx, "DNS validation cancelled", map[string]interface{}{
		"campaign_id": campaignID,
	})

	return nil
}

// Validate validates the DNS validation configuration
func (s *dnsValidationService) Validate(ctx context.Context, config interface{}) error {
	dnsConfig, ok := config.(DNSValidationConfig)
	if !ok {
		return fmt.Errorf("invalid configuration type")
	}

	if len(dnsConfig.PersonaIDs) == 0 {
		return fmt.Errorf("at least one persona must be specified")
	}

	if dnsConfig.BatchSize < 0 {
		return fmt.Errorf("batch size cannot be negative")
	}

	if dnsConfig.Timeout <= 0 {
		return fmt.Errorf("timeout must be positive")
	}

	if dnsConfig.MaxRetries < 0 {
		return fmt.Errorf("max retries cannot be negative")
	}

	return nil
}

// Helper methods

func (s *dnsValidationService) updateExecutionStatus(campaignID uuid.UUID, status models.PhaseStatusEnum, errorMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	execution, exists := s.executions[campaignID]
	if !exists {
		return
	}

	execution.status = status
	if status == models.PhaseStatusCompleted || status == models.PhaseStatusFailed {
		now := time.Now()
		execution.completedAt = &now
	}

	if errorMsg != "" {
		execution.lastError = errorMsg
	}

	// Publish status change event
	phaseStatus := PhaseStatus{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeDNSValidation,
		Status:         status,
		StartedAt:      &execution.startedAt,
		CompletedAt:    execution.completedAt,
		ItemsTotal:     execution.itemsTotal,
		ItemsProcessed: execution.itemsProcessed,
		LastError:      errorMsg,
	}

	if execution.itemsTotal > 0 {
		phaseStatus.ProgressPct = float64(execution.itemsProcessed) / float64(execution.itemsTotal) * 100
	}

	ctx := context.Background()
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		switch status {
		case models.PhaseStatusCompleted:
			_ = s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeDNSValidation)
		case models.PhaseStatusFailed:
			_ = s.store.FailPhase(ctx, exec, campaignID, models.PhaseTypeDNSValidation, errorMsg)
		case models.PhaseStatusPaused:
			_ = s.store.PausePhase(ctx, exec, campaignID, models.PhaseTypeDNSValidation)
		}
	}
	if s.deps.EventBus != nil {
		if err := s.deps.EventBus.PublishStatusChange(ctx, phaseStatus); err != nil {
			if s.deps.Logger != nil {
				s.deps.Logger.Warn(ctx, "Failed to publish status change event", map[string]interface{}{
					"campaign_id": campaignID,
					"error":       err.Error(),
				})
			}
		}
	}
}

func (s *dnsValidationService) getDomainsToValidate(ctx context.Context, campaignID uuid.UUID) ([]string, error) {
	s.deps.Logger.Debug(ctx, "Getting domains for DNS validation", map[string]interface{}{
		"campaign_id": campaignID,
	})

	if s.store == nil {
		return nil, fmt.Errorf("campaign store not available")
	}
	// Prefer a Querier if provided
	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}

	// If a stealth order is present in domains data, use it first
	if order, _, _, ok := s.loadStealthForDNS(ctx, campaignID); ok && len(order) > 0 {
		return order, nil
	}

	// Fetch all pages using cursor pagination
	var after string
	all := make([]string, 0, 2048)
	for {
		page, err := s.store.GetGeneratedDomainsWithCursor(ctx, exec, store.ListGeneratedDomainsFilter{
			CursorPaginationFilter: store.CursorPaginationFilter{First: 1000, After: after, SortBy: "offset_index", SortOrder: "ASC"},
			CampaignID:             campaignID,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to fetch generated domains: %w", err)
		}
		for _, gd := range page.Data {
			if gd != nil && gd.DomainName != "" {
				all = append(all, gd.DomainName)
			}
		}
		if !page.PageInfo.HasNextPage || page.PageInfo.EndCursor == "" {
			break
		}
		after = page.PageInfo.EndCursor
	}
	return all, nil
}

// loadStealthForDNS reads stealth order and jitter from campaign domains data
func (s *dnsValidationService) loadStealthForDNS(ctx context.Context, campaignID uuid.UUID) (order []string, jitterMin int, jitterMax int, ok bool) {
	// Phase C: domains_data deprecated; stealth config persistence removed. Return no-op.
	return nil, 0, 0, false
}

// calcJitterMillis returns a random millisecond value in [min,max]
func calcJitterMillis(min, max int) int {
	if max <= 0 || max < min {
		return 0
	}
	if min < 0 {
		min = 0
	}
	delta := max - min
	if delta <= 0 {
		return max
	}
	n, err := rand.Int(rand.Reader, big.NewInt(int64(delta+1)))
	if err != nil {
		return max
	}
	return min + int(n.Int64())
}

func (s *dnsValidationService) storeValidationResults(ctx context.Context, campaignID uuid.UUID, results map[string]dnsResultOutcome) error {
	if s.store == nil {
		return fmt.Errorf("campaign store not available")
	}
	// Prepare bulk results for efficient persistence
	bulk := make([]models.DNSValidationResult, 0, len(results))
	validCount := 0
	invalidCount := 0
	for domain, outcome := range results {
		status := outcome.status
		if status == "ok" {
			validCount++
		} else if status == "error" {
			invalidCount++
		}
		// Normalize / enrich DNS reason taxonomy
		if outcome.reason != nil {
			lr := strings.ToUpper(strings.TrimSpace(*outcome.reason))
			switch {
			case strings.Contains(lr, "SERVFAIL"):
				val := "SERVFAIL"
				outcome.reason = &val
			case strings.Contains(lr, "REFUSED"):
				val := "REFUSED"
				outcome.reason = &val
			case strings.Contains(lr, "NOANSWER") || strings.Contains(lr, "NO_ANSWER"):
				val := "NOANSWER"
				outcome.reason = &val
			case strings.Contains(lr, "NXDOMAIN"):
				val := "NXDOMAIN"
				outcome.reason = &val
			case strings.Contains(lr, "TIMEOUT"):
				val := "TIMEOUT"
				outcome.reason = &val
			}
		}
		bulk = append(bulk, models.DNSValidationResult{
			DNSCampaignID:    campaignID,
			DomainName:       domain,
			ValidationStatus: status,
			LastCheckedAt:    func() *time.Time { t := time.Now(); return &t }(),
			Reason:           outcome.reason,
		})
	}

	if s.deps.Logger != nil {
		// Provide a deterministic mini-sample of first few domains for traceability
		sample := make([]string, 0, 5)
		for _, r := range bulk {
			if len(sample) < 5 {
				reas := ""
				if r.Reason != nil {
					reas = *r.Reason
				}
				sample = append(sample, fmt.Sprintf("%s:%s:%s", r.DomainName, r.ValidationStatus, reas))
			}
		}
		s.deps.Logger.Debug(ctx, "Storing DNS validation results", map[string]interface{}{
			"campaign_id":     campaignID,
			"total_domains":   len(results),
			"valid_domains":   validCount,
			"invalid_domains": invalidCount,
			"sample":          sample,
		})
	}

	var exec store.Querier
	if q, ok := s.deps.DB.(store.Querier); ok {
		exec = q
	}
	if err := s.store.UpdateDomainsBulkDNSStatus(ctx, exec, bulk); err != nil {
		return fmt.Errorf("failed to persist DNS results: %w", err)
	}
	// Broadcast SSE domain_validated batch event if available
	if s.deps.EventBus == nil && s.deps.SSE != nil { // direct SSE if no event bus adapter
		// Build lightweight payload slice
		top := 50
		if len(bulk) < top {
			top = len(bulk)
		}
		payload := make([]map[string]interface{}, 0, top)
		for i := 0; i < top; i++ {
			b := bulk[i]
			m := map[string]interface{}{"domain": b.DomainName, "status": b.ValidationStatus}
			if b.Reason != nil {
				m["reason"] = *b.Reason
			}
			payload = append(payload, m)
		}
		// NOTE: s.deps.SSE interface only exposes Send(event string); can't send structured JSON → minimal JSON marshal string
		// Provide count metrics encoded as JSON text
		// Future: extend SSE interface to accept structured events.
		if len(payload) > 0 {
			b, _ := json.Marshal(map[string]interface{}{"event": "dns_batch_validated", "campaignId": campaignID.String(), "sample": payload, "count": len(bulk)})
			s.deps.SSE.Send(string(b))
		}
	}
	// Publish structured domain delta event via EventBus if available
	if s.deps.EventBus != nil && len(bulk) > 0 {
		limit := len(bulk)
		if limit > 200 {
			limit = 200
		}
		items := make([]map[string]interface{}, 0, limit)
		for i := 0; i < limit; i++ {
			b := bulk[i]
			m := map[string]interface{}{"domain": b.DomainName, "dns_status": b.ValidationStatus}
			if b.Reason != nil {
				m["dns_reason"] = *b.Reason
			}
			items = append(items, m)
		}
		_ = s.deps.EventBus.PublishSystemEvent(ctx, "domain_status_delta", map[string]interface{}{
			"campaignId": campaignID.String(),
			"phase":      "dns_validation",
			"count":      len(bulk),
			"items":      items,
		})
	}
	return nil
}
