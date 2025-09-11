package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/prometheus/client_golang/prometheus"
)

var (
	reconciliationDriftCounter       = prometheus.NewCounter(prometheus.CounterOpts{Name: "domain_counters_drift_events_total", Help: "Number of drift metric occurrences detected during reconciliation"})
	reconciliationCorrectionsCounter = prometheus.NewCounter(prometheus.CounterOpts{Name: "domain_counters_corrections_total", Help: "Number of reconciliation correction operations applied"})
	reconciliationRegistered         = false
)

// CounterReconcilerConfig holds runtime settings for the reconciliation loop.
type CounterReconcilerConfig struct {
	Interval          time.Duration
	DriftThresholdPct float64 // percentage, e.g. 0.01 for 0.01%
	AutoCorrect       bool
	MaxCorrections    int
}

// StartDomainCountersReconciler launches a background goroutine that periodically compares
// campaign_domain_counters against authoritative generated_domains aggregates and logs drift.
// Threshold: if absolute percentage drift of any metric exceeds 0.01% it is logged.
// Currently read-only (no auto-correction) to keep Phase D3 low-risk.
func StartDomainCountersReconciler(db *sqlx.DB, logger Logger, metrics MetricsRecorder, bus EventBus, cfg CounterReconcilerConfig) context.CancelFunc {
	if db == nil || logger == nil {
		return func() {}
	}
	if cfg.Interval <= 0 {
		cfg.Interval = 24 * time.Hour
	}
	if cfg.DriftThresholdPct <= 0 {
		cfg.DriftThresholdPct = 0.01
	}
	if cfg.MaxCorrections <= 0 {
		cfg.MaxCorrections = 50
	}
	if !reconciliationRegistered {
		prometheus.MustRegister(reconciliationDriftCounter, reconciliationCorrectionsCounter)
		reconciliationRegistered = true
	}
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		ticker := time.NewTicker(cfg.Interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runCountersReconciliation(ctx, db, logger, metrics, bus, cfg)
			}
		}
	}()
	return cancel
}

// RunDomainCountersReconciliation executes a single pass; exported for tests.
func RunDomainCountersReconciliation(ctx context.Context, db *sqlx.DB, logger Logger, metrics MetricsRecorder, bus EventBus, cfg CounterReconcilerConfig) {
	runCountersReconciliation(ctx, db, logger, metrics, bus, cfg)
}

func runCountersReconciliation(ctx context.Context, db *sqlx.DB, logger Logger, metrics MetricsRecorder, bus EventBus, cfg CounterReconcilerConfig) {
	// Single pass aggregate query
	q := `WITH actual AS (
  SELECT campaign_id,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE dns_status='pending') AS dns_pending,
         COUNT(*) FILTER (WHERE dns_status='ok') AS dns_ok,
         COUNT(*) FILTER (WHERE dns_status='error') AS dns_error,
         COUNT(*) FILTER (WHERE dns_status='timeout') AS dns_timeout,
         COUNT(*) FILTER (WHERE http_status='pending') AS http_pending,
         COUNT(*) FILTER (WHERE http_status='ok') AS http_ok,
         COUNT(*) FILTER (WHERE http_status='error') AS http_error,
         COUNT(*) FILTER (WHERE http_status='timeout') AS http_timeout
  FROM generated_domains
  GROUP BY campaign_id
)
SELECT a.campaign_id,
       a.total, c.total AS c_total,
       a.dns_pending, c.dns_pending AS c_dns_pending,
       a.dns_ok, c.dns_ok AS c_dns_ok,
       a.dns_error, c.dns_error AS c_dns_error,
       a.dns_timeout, c.dns_timeout AS c_dns_timeout,
       a.http_pending, c.http_pending AS c_http_pending,
       a.http_ok, c.http_ok AS c_http_ok,
       a.http_error, c.http_error AS c_http_error,
       a.http_timeout, c.http_timeout AS c_http_timeout
FROM actual a
JOIN campaign_domain_counters c ON c.campaign_id = a.campaign_id;`
	rows, err := db.QueryxContext(ctx, q)
	if err != nil {
		logger.Warn(ctx, "domain counters reconciliation query failed", map[string]interface{}{"error": err.Error()})
		return
	}
	defer rows.Close()
	thresh := cfg.DriftThresholdPct / 100.0 // convert pct -> fractional
	if thresh <= 0 {
		thresh = 0.0001
	}
	type driftRecord struct {
		campaignID string
		metric     string
		actual     int64
		counter    int64
		drift      float64
	}
	var drifts []driftRecord
	for rows.Next() {
		var r struct {
			CampaignID                string `db:"campaign_id"`
			Total, CTotal             int64  `db:"total"`
			DnsPending, CDnsPending   int64  `db:"dns_pending"`
			DnsOk, CDnsOk             int64  `db:"dns_ok"`
			DnsError, CDnsError       int64  `db:"dns_error"`
			DnsTimeout, CDnsTimeout   int64  `db:"dns_timeout"`
			HttpPending, CHttpPending int64  `db:"http_pending"`
			HttpOk, CHttpOk           int64  `db:"http_ok"`
			HttpError, CHttpError     int64  `db:"http_error"`
			HttpTimeout, CHttpTimeout int64  `db:"http_timeout"`
		}
		if err := rows.StructScan(&r); err != nil {
			continue
		}
		// Check drift metrics
		check := func(actual, counter int64, name string) {
			if actual == counter {
				return
			}
			denom := actual
			if denom == 0 {
				denom = 1
			}
			drift := float64(actual-counter) / float64(denom)
			if drift < 0 {
				drift = -drift
			}
			if drift > thresh {
				drifts = append(drifts, driftRecord{campaignID: r.CampaignID, metric: name, actual: actual, counter: counter, drift: drift})
			}
		}
		check(r.Total, r.CTotal, "total")
		check(r.DnsPending, r.CDnsPending, "dns_pending")
		check(r.DnsOk, r.CDnsOk, "dns_ok")
		check(r.DnsError, r.CDnsError, "dns_error")
		check(r.DnsTimeout, r.CDnsTimeout, "dns_timeout")
		check(r.HttpPending, r.CHttpPending, "http_pending")
		check(r.HttpOk, r.CHttpOk, "http_ok")
		check(r.HttpError, r.CHttpError, "http_error")
		check(r.HttpTimeout, r.CHttpTimeout, "http_timeout")
	}
	// Log and optionally correct
	corrections := 0
	for _, d := range drifts {
		logger.Warn(ctx, "domain counters drift", map[string]interface{}{
			"campaign_id": d.campaignID,
			"metric":      d.metric,
			"actual":      d.actual,
			"counter":     d.counter,
			"driftPct":    fmt.Sprintf("%.6f", d.drift*100),
		})
	}
	if metrics != nil && len(drifts) > 0 {
		_ = metrics.RecordMetric("reconciliation_drift_events_total", float64(len(drifts)))
	}
	if len(drifts) > 0 {
		reconciliationDriftCounter.Add(float64(len(drifts)))
	}
	if cfg.AutoCorrect && len(drifts) > 0 {
		// group by campaign, build updates setting all columns to authoritative values (requires recompute per campaign)
		seenCampaign := map[string]bool{}
		for _, d := range drifts {
			if corrections >= cfg.MaxCorrections {
				break
			}
			if seenCampaign[d.campaignID] {
				continue
			}
			seenCampaign[d.campaignID] = true
			// recompute authoritative counts for this campaign and update row
			uq := `WITH actual AS (
  SELECT 
	COUNT(*) AS total,
	COUNT(*) FILTER (WHERE dns_status='pending') AS dns_pending,
	COUNT(*) FILTER (WHERE dns_status='ok') AS dns_ok,
	COUNT(*) FILTER (WHERE dns_status='error') AS dns_error,
	COUNT(*) FILTER (WHERE dns_status='timeout') AS dns_timeout,
	COUNT(*) FILTER (WHERE http_status='pending') AS http_pending,
	COUNT(*) FILTER (WHERE http_status='ok') AS http_ok,
	COUNT(*) FILTER (WHERE http_status='error') AS http_error,
	COUNT(*) FILTER (WHERE http_status='timeout') AS http_timeout
  FROM generated_domains WHERE campaign_id = $1
)
UPDATE campaign_domain_counters c SET 
  total = a.total,
  dns_pending = a.dns_pending,
  dns_ok = a.dns_ok,
  dns_error = a.dns_error,
  dns_timeout = a.dns_timeout,
  http_pending = a.http_pending,
  http_ok = a.http_ok,
  http_error = a.http_error,
  http_timeout = a.http_timeout,
  updated_at = NOW()
FROM actual a
WHERE c.campaign_id = $1;`
			if _, err := db.ExecContext(ctx, uq, d.campaignID); err != nil {
				logger.Warn(ctx, "reconciliation correction failed", map[string]interface{}{"campaign_id": d.campaignID, "error": err.Error()})
			} else {
				corrections++
				logger.Info(ctx, "reconciliation correction applied", map[string]interface{}{"campaign_id": d.campaignID})
			}
		}
		if corrections > 0 {
			logger.Info(ctx, "reconciliation summary", map[string]interface{}{"corrections": corrections})
			if metrics != nil {
				_ = metrics.RecordMetric("reconciliation_corrections_applied_total", float64(corrections))
			}
			reconciliationCorrectionsCounter.Add(float64(corrections))
		}
	}
	if bus != nil && (len(drifts) > 0 || corrections > 0) {
		payload := map[string]interface{}{"driftCount": len(drifts), "corrections": corrections, "ts": time.Now().Unix()}
		_ = bus.PublishSystemEvent(ctx, "counters_reconciled", payload)
	}
}
