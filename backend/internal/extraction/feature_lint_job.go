package extraction

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// LintResult captures summary of a lint pass.
type LintResult struct {
	Scanned    int
	Violations int
	Timestamp  time.Time
}

// GovernanceScheduler manages periodic feature vector governance and validation
type GovernanceScheduler struct {
	db              *sql.DB
	running         bool
	mu              sync.RWMutex
	stopChan        chan struct{}
	metrics         *GovernanceMetrics
	violationLimit  int
	scheduleInterval time.Duration
}

// GovernanceMetrics tracks governance-related metrics
type GovernanceMetrics struct {
	lintRunsTotal         *prometheus.CounterVec
	lintDuration          *prometheus.HistogramVec
	violationsDetected    *prometheus.CounterVec
	violationCounterTotal *prometheus.GaugeVec
	schedulerStatus       *prometheus.GaugeVec
}

// LintViolation represents a feature vector governance violation
type LintViolation struct {
	DomainName    string                 `json:"domain_name"`
	CampaignID    string                 `json:"campaign_id"`
	ViolationType string                 `json:"violation_type"`
	DisallowedKey string                 `json:"disallowed_key"`
	FeatureVector map[string]interface{} `json:"feature_vector"`
	DetectedAt    time.Time              `json:"detected_at"`
}

// GovernanceReport contains the results of a governance check
type GovernanceReport struct {
	RunID           string          `json:"run_id"`
	StartTime       time.Time       `json:"start_time"`
	EndTime         time.Time       `json:"end_time"`
	DomainsScanned  int             `json:"domains_scanned"`
	ViolationsFound int             `json:"violations_found"`
	Violations      []LintViolation `json:"violations"`
	Status          string          `json:"status"`
}

// NewGovernanceScheduler creates a new governance scheduler
func NewGovernanceScheduler(db *sql.DB) *GovernanceScheduler {
	metrics := &GovernanceMetrics{
		lintRunsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "extraction_governance_lint_runs_total",
				Help: "Total number of governance lint runs",
			},
			[]string{"status"},
		),
		lintDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "extraction_governance_lint_duration_seconds",
				Help:    "Time spent in governance lint operations",
				Buckets: prometheus.ExponentialBuckets(0.1, 2, 10),
			},
			[]string{"campaign_count"},
		),
		violationsDetected: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "extraction_governance_violations_detected_total",
				Help: "Total number of governance violations detected",
			},
			[]string{"violation_type"},
		),
		violationCounterTotal: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "extraction_governance_violation_counter",
				Help: "Current count of governance violations by type",
			},
			[]string{"violation_type", "campaign_id"},
		),
		schedulerStatus: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "extraction_governance_scheduler_status",
				Help: "Status of the governance scheduler (1=running, 0=stopped)",
			},
			[]string{"scheduler_type"},
		),
	}

	// Load configuration from environment
	violationLimit := 100
	if env := os.Getenv("GOVERNANCE_VIOLATION_LIMIT"); env != "" {
		if limit, err := strconv.Atoi(env); err == nil && limit > 0 {
			violationLimit = limit
		}
	}

	scheduleInterval := 1 * time.Hour
	if env := os.Getenv("GOVERNANCE_SCHEDULE_INTERVAL"); env != "" {
		if duration, err := time.ParseDuration(env); err == nil {
			scheduleInterval = duration
		}
	}

	return &GovernanceScheduler{
		db:               db,
		metrics:          metrics,
		violationLimit:   violationLimit,
		scheduleInterval: scheduleInterval,
		stopChan:         make(chan struct{}),
	}
}

// Start begins the periodic governance scheduler
func (gs *GovernanceScheduler) Start(ctx context.Context) error {
	gs.mu.Lock()
	if gs.running {
		gs.mu.Unlock()
		return fmt.Errorf("scheduler is already running")
	}
	gs.running = true
	gs.mu.Unlock()

	gs.metrics.schedulerStatus.WithLabelValues("governance").Set(1)
	log.Printf("Starting governance scheduler with interval: %v", gs.scheduleInterval)

	// Start the main scheduler loop
	go gs.schedulerLoop(ctx)

	return nil
}

// Stop stops the governance scheduler
func (gs *GovernanceScheduler) Stop() error {
	gs.mu.Lock()
	if !gs.running {
		gs.mu.Unlock()
		return fmt.Errorf("scheduler is not running")
	}
	gs.running = false
	gs.mu.Unlock()

	close(gs.stopChan)
	gs.metrics.schedulerStatus.WithLabelValues("governance").Set(0)
	log.Println("Governance scheduler stopped")

	return nil
}

// IsRunning returns true if the scheduler is currently running
func (gs *GovernanceScheduler) IsRunning() bool {
	gs.mu.RLock()
	defer gs.mu.RUnlock()
	return gs.running
}

// schedulerLoop is the main scheduler loop
func (gs *GovernanceScheduler) schedulerLoop(ctx context.Context) {
	ticker := time.NewTicker(gs.scheduleInterval)
	defer ticker.Stop()

	// Run initial governance check
	if err := gs.runGovernanceCheck(ctx); err != nil {
		log.Printf("Initial governance check failed: %v", err)
	}

	for {
		select {
		case <-ctx.Done():
			log.Println("Governance scheduler context cancelled")
			return
		case <-gs.stopChan:
			log.Println("Governance scheduler stop signal received")
			return
		case <-ticker.C:
			if err := gs.runGovernanceCheck(ctx); err != nil {
				log.Printf("Scheduled governance check failed: %v", err)
				gs.metrics.lintRunsTotal.WithLabelValues("error").Inc()
			} else {
				gs.metrics.lintRunsTotal.WithLabelValues("success").Inc()
			}
		}
	}
}

// runGovernanceCheck performs a comprehensive governance check
func (gs *GovernanceScheduler) runGovernanceCheck(ctx context.Context) error {
	start := time.Now()
	runID := fmt.Sprintf("governance-%d", start.UnixNano())
	
	log.Printf("Starting governance check run: %s", runID)
	
	report := &GovernanceReport{
		RunID:       runID,
		StartTime:   start,
		Status:      "running",
		Violations:  make([]LintViolation, 0),
	}

	defer func() {
		report.EndTime = time.Now()
		duration := report.EndTime.Sub(report.StartTime)
		
		campaignCount := "unknown"
		if report.DomainsScanned > 0 {
			// Estimate campaign count for metrics
			campaignCount = fmt.Sprintf("%d", max(1, report.DomainsScanned/1000))
		}
		
		gs.metrics.lintDuration.WithLabelValues(campaignCount).Observe(duration.Seconds())
		
		if report.Status == "completed" {
			log.Printf("Governance check completed: %s (scanned: %d, violations: %d, duration: %v)", 
				runID, report.DomainsScanned, report.ViolationsFound, duration)
		}
	}()

	// Run feature vector lint check using the original function from feature_lint_job.go
	lintResult := RunBasicFeatureVectorLint(ctx, gs.db, gs.violationLimit, func(msg string, fields map[string]any) {
		log.Printf("Governance lint: %s - %+v", msg, fields)
		
		// Convert to violation record
		violation := LintViolation{
			ViolationType: "disallowed_feature_key",
			DetectedAt:    time.Now(),
		}
		
		if domain, ok := fields["domain"].(string); ok {
			violation.DomainName = domain
		}
		if errMsg, ok := fields["error"].(string); ok && errMsg != "" {
			// Extract disallowed key from error message
			if key := extractDisallowedKey(errMsg); key != "" {
				violation.DisallowedKey = key
			}
		}
		
		report.Violations = append(report.Violations, violation)
		
		// Update metrics
		gs.metrics.violationsDetected.WithLabelValues(violation.ViolationType).Inc()
	})

	report.DomainsScanned = lintResult.Scanned
	report.ViolationsFound = lintResult.Violations

	// Update violation counter metrics
	gs.updateViolationCounters(ctx, report.Violations)

	// Check for critical violation levels
	if report.ViolationsFound > gs.violationLimit {
		log.Printf("WARNING: High violation count detected: %d (limit: %d)", 
			report.ViolationsFound, gs.violationLimit)
		report.Status = "high_violations"
	} else {
		report.Status = "completed"
	}

	// Store governance report (optional - could be stored in database)
	if env := os.Getenv("GOVERNANCE_STORE_REPORTS"); env == "true" {
		if err := gs.storeGovernanceReport(ctx, report); err != nil {
			log.Printf("Failed to store governance report: %v", err)
		}
	}

	return nil
}

// updateViolationCounters updates violation counter metrics per campaign
func (gs *GovernanceScheduler) updateViolationCounters(ctx context.Context, violations []LintViolation) {
	// Count violations by type and campaign
	violationCounts := make(map[string]map[string]int)
	
	for _, violation := range violations {
		if violationCounts[violation.ViolationType] == nil {
			violationCounts[violation.ViolationType] = make(map[string]int)
		}
		violationCounts[violation.ViolationType][violation.CampaignID]++
	}

	// Update metrics
	for violationType, campaignCounts := range violationCounts {
		for campaignID, count := range campaignCounts {
			gs.metrics.violationCounterTotal.WithLabelValues(violationType, campaignID).Set(float64(count))
		}
	}
}

// storeGovernanceReport stores a governance report in the database
func (gs *GovernanceScheduler) storeGovernanceReport(ctx context.Context, report *GovernanceReport) error {
	reportJSON, err := json.Marshal(report)
	if err != nil {
		return fmt.Errorf("failed to marshal report: %w", err)
	}

	// Store in a governance_reports table (would need to be created)
	_, err = gs.db.ExecContext(ctx, `
		INSERT INTO governance_reports (run_id, start_time, end_time, domains_scanned, violations_found, status, report_data)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (run_id) DO UPDATE SET
			end_time = EXCLUDED.end_time,
			domains_scanned = EXCLUDED.domains_scanned,
			violations_found = EXCLUDED.violations_found,
			status = EXCLUDED.status,
			report_data = EXCLUDED.report_data`,
		report.RunID, report.StartTime, report.EndTime, report.DomainsScanned, 
		report.ViolationsFound, report.Status, reportJSON)

	return err
}

// extractDisallowedKey extracts the disallowed key from an error message
func extractDisallowedKey(errorMsg string) string {
	// Simple extraction - in practice this could be more sophisticated
	const prefix = "disallowed feature_vector key: "
	if idx := findString(errorMsg, prefix); idx >= 0 {
		return errorMsg[idx+len(prefix):]
	}
	return ""
}

// findString is a helper function to find substring (since strings.Index might not be available)
func findString(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// GetGovernanceStatus returns the current status of the governance scheduler
func (gs *GovernanceScheduler) GetGovernanceStatus() map[string]interface{} {
	gs.mu.RLock()
	defer gs.mu.RUnlock()

	return map[string]interface{}{
		"running":           gs.running,
		"schedule_interval": gs.scheduleInterval.String(),
		"violation_limit":   gs.violationLimit,
	}
}

// SetScheduleInterval updates the governance schedule interval
func (gs *GovernanceScheduler) SetScheduleInterval(interval time.Duration) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	gs.scheduleInterval = interval
}

// SetViolationLimit updates the violation limit threshold
func (gs *GovernanceScheduler) SetViolationLimit(limit int) {
	gs.mu.Lock()
	defer gs.mu.Unlock()
	gs.violationLimit = limit
}

// RunImmediateCheck triggers an immediate governance check
func (gs *GovernanceScheduler) RunImmediateCheck(ctx context.Context) error {
	log.Println("Running immediate governance check")
	return gs.runGovernanceCheck(ctx)
}

// Global governance scheduler instance
var globalGovernanceScheduler *GovernanceScheduler
var governanceSchedulerOnce sync.Once

// GetGlobalGovernanceScheduler returns the global governance scheduler instance
func GetGlobalGovernanceScheduler(db *sql.DB) *GovernanceScheduler {
	governanceSchedulerOnce.Do(func() {
		globalGovernanceScheduler = NewGovernanceScheduler(db)
	})
	return globalGovernanceScheduler
}

// Helper function for max
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// RunBasicFeatureVectorLint scans a sample of feature rows (or all if limit<=0) and logs first violation via provided logger.
func RunBasicFeatureVectorLint(ctx context.Context, db *sql.DB, limit int, logf func(msg string, fields map[string]any)) LintResult {
	res := LintResult{Timestamp: time.Now()}
	if db == nil {
		return res
	}
	q := "SELECT domain_name, feature_vector FROM domain_extraction_features WHERE feature_vector IS NOT NULL"
	if limit > 0 {
		q += " LIMIT $1"
	}
	var rows *sql.Rows
	var err error
	if limit > 0 {
		rows, err = db.QueryContext(ctx, q, limit)
	} else {
		rows, err = db.QueryContext(ctx, q)
	}
	if err != nil {
		return res
	}
	defer rows.Close()
	for rows.Next() {
		var domain string
		var raw json.RawMessage
		if err := rows.Scan(&domain, &raw); err != nil {
			continue
		}
		res.Scanned++
		fv := map[string]any{}
		_ = json.Unmarshal(raw, &fv)
		if vErr := ValidateFeatureVector(fv); vErr != nil {
			res.Violations++
			if logf != nil {
				logf("feature_vector_lint_violation", map[string]any{"domain": domain, "error": vErr.Error()})
			}
		}
	}
	return res
}
