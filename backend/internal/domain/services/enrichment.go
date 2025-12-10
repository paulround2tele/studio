package services

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

type enrichmentService struct {
	store    store.CampaignStore
	deps     Dependencies
	mu       sync.RWMutex
	statuses map[uuid.UUID]*PhaseStatus
	controls map[uuid.UUID]*pauseControl
	ctrlMu   sync.Mutex
}

func (s *enrichmentService) getControl(campaignID uuid.UUID) *pauseControl {
	s.ctrlMu.Lock()
	defer s.ctrlMu.Unlock()
	if ctrl, ok := s.controls[campaignID]; ok {
		return ctrl
	}
	ctrl := newPauseControl()
	s.controls[campaignID] = ctrl
	return ctrl
}

func (s *enrichmentService) waitIfPaused(ctrl *pauseControl) {
	if ctrl == nil {
		return
	}
	ctrl.wait()
}

type pauseControl struct {
	mu     sync.Mutex
	cond   *sync.Cond
	paused bool
}

func newPauseControl() *pauseControl {
	pc := &pauseControl{}
	pc.cond = sync.NewCond(&pc.mu)
	return pc
}

func (pc *pauseControl) setPaused(paused bool) {
	pc.mu.Lock()
	pc.paused = paused
	if !paused {
		pc.cond.Broadcast()
	}
	pc.mu.Unlock()
}

func (pc *pauseControl) wait() {
	pc.mu.Lock()
	for pc.paused {
		pc.cond.Wait()
	}
	pc.mu.Unlock()
}

const (
	enrichmentBatchSize              = 200
	enrichmentProgressEmitInterval   = 25
	enrichmentDefaultMatchScore      = 0.27
	enrichmentDefaultLowScoreGrace   = 0.24
	enrichmentDefaultMinContentBytes = 1024
	enrichmentDefaultParkedFloor     = 0.45
	enrichmentMatchScoreMin          = 0.05
	enrichmentMatchScoreMax          = 0.95
	enrichmentGraceMin               = 0.0
	enrichmentGraceMax               = 0.6
	enrichmentMinContentBytesFloor   = 256
	enrichmentMinContentBytesCeil    = 2 * 1024 * 1024
	enrichmentParkedFloorMin         = 0.0
	enrichmentParkedFloorMax         = 1.0
)

type enrichmentConfig struct {
	MatchScoreThreshold      float64
	LowScoreGraceThreshold   float64
	MinContentBytes          int
	ParkedConfidenceFloor    float64
	RequireStructuralSignals bool
}

type enrichmentConfigOverrides struct {
	MatchScoreThreshold      *float64 `json:"matchScoreThreshold,omitempty"`
	LowScoreGraceThreshold   *float64 `json:"lowScoreGraceThreshold,omitempty"`
	MinContentBytes          *int     `json:"minContentBytes,omitempty"`
	ParkedConfidenceFloor    *float64 `json:"parkedConfidenceFloor,omitempty"`
	RequireStructuralSignals *bool    `json:"requireStructuralSignals,omitempty"`
}

type enrichmentCandidate struct {
	ID               uuid.UUID                    `db:"id"`
	DomainName       string                       `db:"domain_name"`
	HTTPStatus       models.DomainHTTPStatusEnum  `db:"http_status"`
	LeadStatus       *models.DomainLeadStatusEnum `db:"lead_status"`
	LeadScore        sql.NullFloat64              `db:"lead_score"`
	DomainScore      sql.NullFloat64              `db:"domain_score"`
	FeatureVector    models.NullJSONRaw           `db:"feature_vector"`
	IsParked         sql.NullBool                 `db:"is_parked"`
	ParkedConfidence sql.NullFloat64              `db:"parked_confidence"`
}

type evaluationResult struct {
	status          models.DomainLeadStatusEnum
	leadScore       *float64
	skipPersistence bool
}

type featureVectorMetrics struct {
	ContentBytes         float64
	ParkedConfidence     float64
	HasStructuralSignals bool
	LinkExternalCount    float64
	LinkInternalCount    float64
	HeadingOneCount      float64
	KeywordUnique        float64
	KeywordHitsTotal     float64
	KeywordSignalsSeen   bool
}

// NewEnrichmentService constructs the enrichment phase controller. The initial
// implementation emits immediate completion progress so the orchestrator can
// chain into analysis while the full enrichment engine is brought online.
func NewEnrichmentService(store store.CampaignStore, deps Dependencies) EnrichmentService {
	return &enrichmentService{
		store:    store,
		deps:     deps,
		statuses: make(map[uuid.UUID]*PhaseStatus),
		controls: make(map[uuid.UUID]*pauseControl),
	}
}

func (s *enrichmentService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeEnrichment
}

func (s *enrichmentService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "Configuring enrichment service", map[string]interface{}{"campaign_id": campaignID})
	}

	raw, err := marshalEnrichmentConfig(config)
	if err != nil {
		return fmt.Errorf("failed to marshal enrichment config: %w", err)
	}
	sanitized, snapshot, sanitizeErr := sanitizeEnrichmentConfigPayload(raw)
	if sanitizeErr != nil {
		return fmt.Errorf("invalid enrichment config: %w", sanitizeErr)
	}
	raw = sanitized

	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		// Best-effort persistence; errors are surfaced to the caller.
		if err := s.store.UpdatePhaseConfiguration(ctx, exec, campaignID, models.PhaseTypeEnrichment, raw); err != nil {
			return fmt.Errorf("failed to persist enrichment config: %w", err)
		}
	}

	s.updateStatus(campaignID, func(st *PhaseStatus) {
		if st.Status == models.PhaseStatusNotStarted {
			st.Status = models.PhaseStatusConfigured
		}
		st.Configuration = snapshot
	})

	return nil
}
func (s *enrichmentService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "Starting enrichment execution", map[string]interface{}{"campaign_id": campaignID})
	}

	exec := s.getQuerier()
	if exec == nil {
		return nil, fmt.Errorf("enrichment requires database access: no querier available")
	}

	cfg := s.loadEnrichmentConfig(ctx, exec, campaignID)

	total, err := s.countEnrichmentCandidates(ctx, exec, campaignID)
	if err != nil {
		return nil, fmt.Errorf("count enrichment candidates: %w", err)
	}

	started := time.Now()
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusInProgress
		st.StartedAt = &started
		st.CompletedAt = nil
		st.ProgressPct = 0
		st.ItemsTotal = int64(total)
		st.ItemsProcessed = 0
		st.LastError = ""
	})

	progressCh := make(chan PhaseProgress, 4)
	go s.runEnrichment(ctx, campaignID, exec, cfg, total, progressCh)

	return progressCh, nil
}

func (s *enrichmentService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*PhaseStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if st, ok := s.statuses[campaignID]; ok {
		cp := *st
		if cp.Configuration == nil {
			cp.Configuration = map[string]interface{}{}
		}
		cp.Configuration["runtime_controls"] = s.Capabilities()
		return &cp, nil
	}
	return &PhaseStatus{
		CampaignID:    campaignID,
		Phase:         models.PhaseTypeEnrichment,
		Status:        models.PhaseStatusNotStarted,
		Configuration: map[string]interface{}{"runtime_controls": s.Capabilities()},
	}, nil
}

func (s *enrichmentService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	if s.deps.Logger != nil {
		s.deps.Logger.Warn(ctx, "Enrichment execution cancelled", map[string]interface{}{"campaign_id": campaignID})
	}
	ctrl := s.getControl(campaignID)
	ctrl.setPaused(false)
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusFailed
		st.LastError = "enrichment cancelled"
	})
	return nil
}

func (s *enrichmentService) Validate(ctx context.Context, config interface{}) error {
	raw, err := marshalEnrichmentConfig(config)
	if err != nil {
		return fmt.Errorf("invalid enrichment config: %w", err)
	}
	if _, _, err := sanitizeEnrichmentConfigPayload(raw); err != nil {
		return fmt.Errorf("invalid enrichment config: %w", err)
	}
	return nil
}

func (s *enrichmentService) Capabilities() PhaseControlCapabilities {
	return PhaseControlCapabilities{
		CanPause:   true,
		CanResume:  true,
		CanStop:    true,
		CanRestart: true,
	}
}

func (s *enrichmentService) Pause(ctx context.Context, campaignID uuid.UUID) error {
	ctrl := s.getControl(campaignID)
	s.mu.RLock()
	status, ok := s.statuses[campaignID]
	s.mu.RUnlock()
	if !ok || status.Status != models.PhaseStatusInProgress {
		return ErrPhaseNotRunning
	}
	ctrl.setPaused(true)
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusPaused
	})
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		_ = s.store.PausePhase(ctx, exec, campaignID, models.PhaseTypeEnrichment)
	}
	return nil
}

func (s *enrichmentService) Resume(ctx context.Context, campaignID uuid.UUID) error {
	ctrl := s.getControl(campaignID)
	s.mu.RLock()
	status, ok := s.statuses[campaignID]
	s.mu.RUnlock()
	if !ok || status.Status != models.PhaseStatusPaused {
		return ErrPhaseNotPaused
	}
	ctrl.setPaused(false)
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusInProgress
	})
	if s.store != nil {
		var exec store.Querier
		if q, ok := s.deps.DB.(store.Querier); ok {
			exec = q
		}
		_ = s.store.UpdatePhaseStatus(ctx, exec, campaignID, models.PhaseTypeEnrichment, models.PhaseStatusInProgress)
	}
	return nil
}

func (s *enrichmentService) runEnrichment(ctx context.Context, campaignID uuid.UUID, exec store.Querier, cfg enrichmentConfig, total int, progressCh chan<- PhaseProgress) {
	defer close(progressCh)

	ctrl := s.getControl(campaignID)

	examined := 0
	updated := 0
	matches := 0
	noMatches := 0
	errorsCount := 0
	timeouts := 0

	s.emitProgress(ctx, campaignID, models.PhaseStatusInProgress, examined, total, "Starting enrichment pass", progressCh)

	if total == 0 {
		completed := time.Now()
		s.updateStatus(campaignID, func(st *PhaseStatus) {
			st.Status = models.PhaseStatusCompleted
			st.CompletedAt = &completed
			st.ProgressPct = 100
			st.ItemsProcessed = 0
		})
		s.emitProgress(ctx, campaignID, models.PhaseStatusCompleted, examined, total, "No HTTP-validated domains pending lead evaluation", progressCh)
		if s.store != nil {
			if err := s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeEnrichment); err != nil && s.deps.Logger != nil {
				s.deps.Logger.Warn(ctx, "Failed to mark enrichment phase complete", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
			}
		}
		return
	}

	var runErr error

	for offset := 0; offset < total && runErr == nil; offset += enrichmentBatchSize {
		s.waitIfPaused(ctrl)
		if err := ctx.Err(); err != nil {
			s.failWithContextError(campaignID, err)
			s.emitProgress(ctx, campaignID, models.PhaseStatusFailed, examined, total, "Enrichment cancelled", progressCh)
			return
		}

		batch, err := s.fetchEnrichmentBatch(ctx, exec, campaignID, enrichmentBatchSize, offset)
		if err != nil {
			runErr = fmt.Errorf("fetch enrichment batch offset=%d: %w", offset, err)
			break
		}
		if len(batch) == 0 {
			break
		}

		for _, candidate := range batch {
			s.waitIfPaused(ctrl)
			if err := ctx.Err(); err != nil {
				s.failWithContextError(campaignID, err)
				s.emitProgress(ctx, campaignID, models.PhaseStatusFailed, examined, total, "Enrichment cancelled", progressCh)
				return
			}

			examined++
			result := s.evaluateCandidate(cfg, candidate)
			if result.skipPersistence {
				if examined%enrichmentProgressEmitInterval == 0 || examined == total {
					s.emitProgress(ctx, campaignID, models.PhaseStatusInProgress, examined, total, fmt.Sprintf("Evaluated %d/%d domains", examined, total), progressCh)
				}
				continue
			}

			if err := s.store.UpdateDomainLeadStatus(ctx, nil, candidate.ID, result.status, result.leadScore); err != nil {
				runErr = fmt.Errorf("update lead status for domain %s: %w", candidate.DomainName, err)
				break
			}

			updated++
			switch result.status {
			case models.DomainLeadStatusMatch:
				matches++
			case models.DomainLeadStatusNoMatch:
				noMatches++
			case models.DomainLeadStatusError:
				errorsCount++
			case models.DomainLeadStatusTimeout:
				timeouts++
			}

			if examined%enrichmentProgressEmitInterval == 0 || examined == total {
				s.emitProgress(ctx, campaignID, models.PhaseStatusInProgress, examined, total, fmt.Sprintf("Evaluated %d/%d domains", examined, total), progressCh)
			}
		}
	}

	if runErr != nil {
		s.failWithError(campaignID, runErr)
		s.emitProgress(ctx, campaignID, models.PhaseStatusFailed, examined, total, runErr.Error(), progressCh)
		if s.deps.Logger != nil {
			s.deps.Logger.Error(ctx, "Enrichment execution failed", runErr, map[string]interface{}{"campaign_id": campaignID})
		}
		return
	}

	completed := time.Now()
	summary := fmt.Sprintf("evaluated=%d updated=%d match=%d no_match=%d error=%d timeout=%d", examined, updated, matches, noMatches, errorsCount, timeouts)

	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusCompleted
		st.CompletedAt = &completed
		st.ProgressPct = 100
		st.ItemsProcessed = int64(examined)
	})

	s.emitProgress(ctx, campaignID, models.PhaseStatusCompleted, examined, total, summary, progressCh)

	if s.deps.Logger != nil {
		s.deps.Logger.Info(ctx, "Enrichment execution completed", map[string]interface{}{
			"campaign_id": campaignID,
			"evaluated":   examined,
			"updated":     updated,
			"matches":     matches,
			"no_matches":  noMatches,
			"errors":      errorsCount,
			"timeouts":    timeouts,
		})
	}

	if s.store != nil {
		if err := s.store.CompletePhase(ctx, exec, campaignID, models.PhaseTypeEnrichment); err != nil && s.deps.Logger != nil {
			s.deps.Logger.Warn(ctx, "Failed to mark enrichment phase complete", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
		}
	}
}

func (s *enrichmentService) emitProgress(ctx context.Context, campaignID uuid.UUID, status models.PhaseStatusEnum, processed, total int, message string, progressCh chan<- PhaseProgress) {
	var progress float64
	if total > 0 {
		ratio := float64(processed) / float64(total)
		if ratio < 0 {
			ratio = 0
		}
		if ratio > 1 {
			ratio = 1
		}
		progress = math.Round(ratio*1000) / 10
	} else if status == models.PhaseStatusCompleted {
		progress = 100
	} else {
		progress = 0
	}

	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = status
		st.ProgressPct = progress
		st.ItemsTotal = int64(total)
		st.ItemsProcessed = int64(processed)
	})

	progressMsg := PhaseProgress{
		CampaignID:     campaignID,
		Phase:          models.PhaseTypeEnrichment,
		Status:         status,
		ProgressPct:    progress,
		ItemsProcessed: int64(processed),
		ItemsTotal:     int64(total),
		Message:        message,
		Timestamp:      time.Now(),
	}

	select {
	case <-ctx.Done():
		return
	case progressCh <- progressMsg:
	default:
	}

	if s.deps.EventBus != nil {
		_ = s.deps.EventBus.PublishProgress(ctx, progressMsg)
	}
}

func (s *enrichmentService) loadEnrichmentConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID) enrichmentConfig {
	cfg := defaultEnrichmentConfig()
	if s.store == nil {
		return cfg
	}

	raw, err := s.store.GetPhaseConfig(ctx, exec, campaignID, models.PhaseTypeEnrichment)
	if err != nil {
		if s.deps.Logger != nil {
			s.deps.Logger.Warn(ctx, "Failed to load enrichment config, using defaults", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
		}
		return cfg
	}
	if raw == nil {
		return cfg
	}

	payload := bytes.TrimSpace([]byte(*raw))
	if len(payload) == 0 || bytes.Equal(payload, []byte("null")) {
		return cfg
	}

	var overrides enrichmentConfigOverrides
	if err := json.Unmarshal(payload, &overrides); err != nil {
		if s.deps.Logger != nil {
			s.deps.Logger.Warn(ctx, "Invalid enrichment config payload, using defaults", map[string]interface{}{"campaign_id": campaignID, "error": err.Error()})
		}
		return cfg
	}

	cfg.applyOverrides(overrides)
	return cfg
}

func defaultEnrichmentConfig() enrichmentConfig {
	return enrichmentConfig{
		MatchScoreThreshold:      enrichmentDefaultMatchScore,
		LowScoreGraceThreshold:   enrichmentDefaultLowScoreGrace,
		MinContentBytes:          enrichmentDefaultMinContentBytes,
		ParkedConfidenceFloor:    enrichmentDefaultParkedFloor,
		RequireStructuralSignals: true,
	}
}

func (cfg *enrichmentConfig) applyOverrides(overrides enrichmentConfigOverrides) {
	if overrides.MatchScoreThreshold != nil {
		cfg.MatchScoreThreshold = clampFloat(*overrides.MatchScoreThreshold, enrichmentMatchScoreMin, enrichmentMatchScoreMax)
	}
	if overrides.LowScoreGraceThreshold != nil {
		cfg.LowScoreGraceThreshold = clampFloat(*overrides.LowScoreGraceThreshold, enrichmentGraceMin, enrichmentGraceMax)
	}
	if overrides.MinContentBytes != nil {
		cfg.MinContentBytes = clampInt(*overrides.MinContentBytes, enrichmentMinContentBytesFloor, enrichmentMinContentBytesCeil)
	}
	if overrides.ParkedConfidenceFloor != nil {
		cfg.ParkedConfidenceFloor = clampFloat(*overrides.ParkedConfidenceFloor, enrichmentParkedFloorMin, enrichmentParkedFloorMax)
	}
	if overrides.RequireStructuralSignals != nil {
		cfg.RequireStructuralSignals = *overrides.RequireStructuralSignals
	}
	if cfg.LowScoreGraceThreshold > cfg.MatchScoreThreshold {
		cfg.LowScoreGraceThreshold = cfg.MatchScoreThreshold
	}
}

func (s *enrichmentService) countEnrichmentCandidates(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int, error) {
	var total int
	query := `SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1 AND http_status IS NOT NULL AND http_status <> $2`
	if err := exec.GetContext(ctx, &total, query, campaignID, models.DomainHTTPStatusPending); err != nil {
		return 0, err
	}
	return total, nil
}

func (s *enrichmentService) fetchEnrichmentBatch(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit, offset int) ([]enrichmentCandidate, error) {
	batch := []enrichmentCandidate{}
	query := `SELECT id, domain_name, http_status, lead_status, lead_score, domain_score, feature_vector, is_parked, parked_confidence
			FROM generated_domains
			WHERE campaign_id = $1
			  AND http_status IS NOT NULL
			  AND http_status <> $2
			ORDER BY offset_index ASC
			LIMIT $3 OFFSET $4`
	if err := exec.SelectContext(ctx, &batch, query, campaignID, models.DomainHTTPStatusPending, limit, offset); err != nil {
		return nil, err
	}
	return batch, nil
}

func (s *enrichmentService) evaluateCandidate(cfg enrichmentConfig, candidate enrichmentCandidate) evaluationResult {
	scorePtr := func() *float64 {
		if candidate.DomainScore.Valid {
			v := candidate.DomainScore.Float64
			return &v
		}
		return nil
	}
	switch candidate.HTTPStatus {
	case models.DomainHTTPStatusTimeout:
		return evaluationResult{status: models.DomainLeadStatusTimeout}
	case models.DomainHTTPStatusError:
		return evaluationResult{status: models.DomainLeadStatusError}
	case models.DomainHTTPStatusPending:
		return evaluationResult{status: models.DomainLeadStatusPending, skipPersistence: true}
	case models.DomainHTTPStatusOK:
		// continue
	default:
		return evaluationResult{status: models.DomainLeadStatusPending, skipPersistence: true}
	}

	metrics := featureVectorMetrics{}
	if candidate.FeatureVector.Valid {
		metrics = parseFeatureVector(candidate.FeatureVector.Raw)
	}

	parkedConfidence := metrics.ParkedConfidence
	if candidate.ParkedConfidence.Valid {
		parkedConfidence = candidate.ParkedConfidence.Float64
	}
	if (candidate.IsParked.Valid && candidate.IsParked.Bool) || parkedConfidence >= cfg.ParkedConfidenceFloor {
		return evaluationResult{status: models.DomainLeadStatusNoMatch, leadScore: scorePtr()}
	}

	if cfg.RequireStructuralSignals && !metrics.HasStructuralSignals {
		return evaluationResult{status: models.DomainLeadStatusNoMatch, leadScore: scorePtr()}
	}

	if metrics.KeywordSignalsSeen && metrics.KeywordUnique <= 0 && metrics.KeywordHitsTotal <= 0 {
		return evaluationResult{status: models.DomainLeadStatusNoMatch, leadScore: scorePtr()}
	}

	if !candidate.DomainScore.Valid {
		return evaluationResult{status: models.DomainLeadStatusNoMatch}
	}

	scoreVal := candidate.DomainScore.Float64
	result := evaluationResult{status: models.DomainLeadStatusNoMatch}
	result.leadScore = &scoreVal

	if scoreVal >= cfg.MatchScoreThreshold {
		result.status = models.DomainLeadStatusMatch
		return result
	}

	if metrics.ContentBytes < float64(cfg.MinContentBytes) {
		return result
	}

	if scoreVal >= cfg.LowScoreGraceThreshold {
		result.status = models.DomainLeadStatusMatch
	}
	return result
}

func parseFeatureVector(raw json.RawMessage) featureVectorMetrics {
	metrics := featureVectorMetrics{}
	if len(raw) == 0 {
		return metrics
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	payload := map[string]interface{}{}
	if err := decoder.Decode(&payload); err != nil {
		return metrics
	}

	metrics.ContentBytes = floatFrom(payload["content_bytes"])
	metrics.ParkedConfidence = floatFrom(payload["parked_confidence"])
	metrics.HasStructuralSignals = boolFrom(payload["has_structural_signals"])
	metrics.LinkExternalCount = floatFrom(payload["link_external_count"])
	metrics.LinkInternalCount = floatFrom(payload["link_internal_count"])
	metrics.HeadingOneCount = floatFrom(payload["h1_count"])
	if _, ok := payload["kw_unique"]; ok {
		metrics.KeywordSignalsSeen = true
		metrics.KeywordUnique = floatFrom(payload["kw_unique"])
	}
	if _, ok := payload["kw_hits_total"]; ok {
		metrics.KeywordSignalsSeen = true
		metrics.KeywordHitsTotal = floatFrom(payload["kw_hits_total"])
	}
	return metrics
}

func floatFrom(value interface{}) float64 {
	switch v := value.(type) {
	case json.Number:
		if f, err := v.Float64(); err == nil {
			return f
		}
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case uint64:
		return float64(v)
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return 0
}

func boolFrom(value interface{}) bool {
	switch v := value.(type) {
	case bool:
		return v
	case json.Number:
		if i, err := v.Int64(); err == nil {
			return i != 0
		}
	case float64:
		return v != 0
	case string:
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return false
}

func (s *enrichmentService) getQuerier() store.Querier {
	if q, ok := s.deps.DB.(store.Querier); ok && q != nil {
		return q
	}
	if s.store != nil {
		if db := s.store.UnderlyingDB(); db != nil {
			return db
		}
	}
	return nil
}

func (s *enrichmentService) failWithContextError(campaignID uuid.UUID, err error) {
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusFailed
		st.LastError = err.Error()
	})
}

func (s *enrichmentService) failWithError(campaignID uuid.UUID, err error) {
	s.updateStatus(campaignID, func(st *PhaseStatus) {
		st.Status = models.PhaseStatusFailed
		st.LastError = err.Error()
	})
}

func (s *enrichmentService) updateStatus(campaignID uuid.UUID, mutate func(*PhaseStatus)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := s.statuses[campaignID]
	if !ok {
		st = &PhaseStatus{CampaignID: campaignID, Phase: models.PhaseTypeEnrichment, Status: models.PhaseStatusNotStarted}
		s.statuses[campaignID] = st
	}
	if mutate != nil {
		mutate(st)
	}
}

func marshalEnrichmentConfig(config interface{}) (json.RawMessage, error) {
	switch v := config.(type) {
	case nil:
		return json.RawMessage("null"), nil
	case json.RawMessage:
		cp := make([]byte, len(v))
		copy(cp, v)
		return json.RawMessage(cp), nil
	case []byte:
		cp := make([]byte, len(v))
		copy(cp, v)
		return json.RawMessage(cp), nil
	default:
		raw, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		return json.RawMessage(raw), nil
	}
}

func sanitizeEnrichmentConfigPayload(raw json.RawMessage) (json.RawMessage, map[string]interface{}, error) {
	cfg := defaultEnrichmentConfig()
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) > 0 && !bytes.Equal(trimmed, []byte("null")) {
		var overrides enrichmentConfigOverrides
		if err := json.Unmarshal(trimmed, &overrides); err != nil {
			return nil, nil, err
		}
		cfg.applyOverrides(overrides)
	}

	snapshot := buildEnrichmentSnapshot(cfg)
	sanitized, err := json.Marshal(snapshot)
	if err != nil {
		return nil, nil, err
	}
	return json.RawMessage(sanitized), snapshot, nil
}

func buildEnrichmentSnapshot(cfg enrichmentConfig) map[string]interface{} {
	return map[string]interface{}{
		"matchScoreThreshold":      cfg.MatchScoreThreshold,
		"lowScoreGraceThreshold":   cfg.LowScoreGraceThreshold,
		"minContentBytes":          cfg.MinContentBytes,
		"parkedConfidenceFloor":    cfg.ParkedConfidenceFloor,
		"requireStructuralSignals": cfg.RequireStructuralSignals,
	}
}

func clampFloat(value, min, max float64) float64 {
	if math.IsNaN(value) {
		return min
	}
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func clampInt(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
