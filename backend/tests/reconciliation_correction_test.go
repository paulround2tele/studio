package tests

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// simpleTestLogger implements services.Logger for test
type simpleTestLogger struct{}

func (l *simpleTestLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {}
func (l *simpleTestLogger) Info(ctx context.Context, msg string, fields map[string]interface{})  {}
func (l *simpleTestLogger) Warn(ctx context.Context, msg string, fields map[string]interface{})  {}
func (l *simpleTestLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
}

// dummy metrics recorder
type dummyMetrics struct{}

func (m *dummyMetrics) RecordMetric(name string, value float64) error { return nil }
func (m *dummyMetrics) GetMetric(name string) (float64, error)        { return 0, nil }
func (m *dummyMetrics) ListMetrics() ([]string, error)                { return []string{}, nil }

func TestReconciliation_AutoCorrectsDrift(t *testing.T) {
	if testing.Short() {
		t.Skip("short")
	}
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set")
	}
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	ctx := context.Background()

	campID := uuid.New()
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns (id, user_id, name, campaign_type, total_phases, completed_phases, created_at, updated_at) VALUES ($1,'user','recon_test','lead_generation',4,0,NOW(),NOW())`, campID)
	if err != nil {
		t.Fatalf("insert campaign: %v", err)
	}
	// Insert 5 domains (3 ok, 2 error)
	for i := 0; i < 5; i++ {
		status := "ok"
		if i >= 3 {
			status = "error"
		}
		_, err = db.Exec(`INSERT INTO generated_domains (id, campaign_id, domain_name, offset_index, generated_at, created_at, dns_status, http_status, lead_status) VALUES ($1,$2,$3,$4,NOW(),NOW(),$5,'pending','pending')`, uuid.New(), campID, uuid.New().String()+".example.com", i, status)
		if err != nil {
			t.Fatalf("insert domain: %v", err)
		}
	}
	// Wait a moment for any triggers (if present)
	time.Sleep(50 * time.Millisecond)
	// Force drift: set counters to wrong numbers
	_, err = db.Exec(`UPDATE campaign_domain_counters SET total=99, dns_ok=0, dns_error=0 WHERE campaign_id=$1`, campID)
	if err != nil {
		t.Fatalf("force drift: %v", err)
	}

	cfg := services.CounterReconcilerConfig{Interval: time.Minute, DriftThresholdPct: 0.0001, AutoCorrect: true, MaxCorrections: 10}
	services.RunDomainCountersReconciliation(ctx, db, &simpleTestLogger{}, &dummyMetrics{}, nil, cfg)

	// Read back counters
	row := db.QueryRowContext(ctx, `SELECT total, dns_ok, dns_error FROM campaign_domain_counters WHERE campaign_id=$1`, campID)
	var total, dnsOk, dnsErr int
	if err := row.Scan(&total, &dnsOk, &dnsErr); err != nil {
		t.Fatalf("scan: %v", err)
	}
	if total != 5 || dnsOk != 3 || dnsErr != 2 {
		t.Fatalf("expected corrected counts (5,3,2) got (%d,%d,%d)", total, dnsOk, dnsErr)
	}
}
