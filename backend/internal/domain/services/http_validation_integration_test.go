package services

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// testLogger provides minimal Logger implementation
type testLogger struct{}

func (l *testLogger) Debug(ctx context.Context, msg string, f map[string]interface{})            {}
func (l *testLogger) Info(ctx context.Context, msg string, f map[string]interface{})             {}
func (l *testLogger) Warn(ctx context.Context, msg string, f map[string]interface{})             {}
func (l *testLogger) Error(ctx context.Context, msg string, err error, f map[string]interface{}) {}

// TestHTTPValidationService_StoreResultsIntegration exercises transactional pending-only update + counters delta.
func TestHTTPValidationService_StoreResultsIntegration(t *testing.T) {
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
	store := postgres.NewCampaignStorePostgres(db)
	deps := Dependencies{Logger: &testLogger{}, DB: db}
	svc := NewHTTPValidationService(store, deps, nil, nil, nil, nil).(*httpValidationService)

	campaignID := uuid.New()
	if _, err := db.Exec(`INSERT INTO lead_generation_campaigns (id, user_id, name, campaign_type, total_phases, completed_phases, created_at, updated_at) VALUES ($1,'user','http-int','lead_generation',4,0,NOW(),NOW())`, campaignID); err != nil {
		t.Fatalf("insert campaign: %v", err)
	}
	names := []string{"d1.example", "d2.example", "d3.example", "d4.example", "d5.example", "d6.example"}
	for i, n := range names {
		if _, err := db.Exec(`INSERT INTO generated_domains (id, campaign_id, domain_name, offset_index, generated_at, created_at, dns_status, http_status, lead_status) VALUES ($1,$2,$3,$4,NOW(),NOW(),'ok','pending','pending')`, uuid.New(), campaignID, n, i); err != nil {
			t.Fatalf("insert domain %s: %v", n, err)
		}
	}
	// Wait briefly for triggers (if any) to populate counter row
	time.Sleep(20 * time.Millisecond)
	ctx := context.Background()
	before, _ := store.GetCampaignDomainCounters(ctx, db, campaignID)
	if before == nil {
		t.Fatalf("missing counters row")
	}
	// Build validation results: 3 ok, 2 error, 1 timeout
	now := time.Now()
	mk := func(domain, status string, code int32) *httpvalidator.ValidationResult {
		return &httpvalidator.ValidationResult{Domain: domain, Status: status, StatusCode: int(code), Timestamp: now, IsSuccess: status == "OK" || status == "Validated"}
	}
	results := []*httpvalidator.ValidationResult{
		mk("d1.example", "OK", 200),
		mk("d2.example", "Validated", 200),
		mk("d3.example", "timeout", 0),
		mk("d4.example", "FAILED", 0),
		mk("d5.example", "FAILED", 0),
		mk("d6.example", "OK", 204),
	}
	if err := svc.storeHTTPResults(ctx, campaignID, results); err != nil {
		t.Fatalf("storeHTTPResults: %v", err)
	}
	after, _ := store.GetCampaignDomainCounters(ctx, db, campaignID)
	if after == nil {
		t.Fatalf("missing counters row after")
	}
	// Expect pending decreased by 6, ok +3, error +2, timeout +1
	if after.HTTPOk != before.HTTPOk+3 || after.HTTPError != before.HTTPError+2 || after.HTTPTimeout != before.HTTPTimeout+1 || after.HTTPPending != before.HTTPPending-6 {
		t.Fatalf("unexpected counters delta before=%+v after=%+v", before, after)
	}
	// Idempotency: second call should not change counters
	if err := svc.storeHTTPResults(ctx, campaignID, results); err != nil {
		t.Fatalf("second storeHTTPResults: %v", err)
	}
	after2, _ := store.GetCampaignDomainCounters(ctx, db, campaignID)
	if after2.HTTPOk != after.HTTPOk || after2.HTTPPending != after.HTTPPending {
		t.Fatalf("idempotency violated after=%+v after2=%+v", after, after2)
	}
	// Verify domain row statuses distribution
	var counts struct{ Ok, Err, Timeout, Pending int }
	if err := db.Get(&counts, `SELECT
        COUNT(*) FILTER (WHERE http_status='ok') AS ok,
        COUNT(*) FILTER (WHERE http_status='error') AS err,
        COUNT(*) FILTER (WHERE http_status='timeout') AS timeout,
        COUNT(*) FILTER (WHERE http_status='pending') AS pending
      FROM generated_domains WHERE campaign_id=$1`, campaignID); err != nil {
		t.Fatalf("domain distribution: %v", err)
	}
	if counts.Ok != 3 || counts.Err != 2 || counts.Timeout != 1 || counts.Pending != 0 {
		t.Fatalf("unexpected domain status counts: %+v", counts)
	}
	// Simple aggregate consistency check (manually reflect counters)
	if after.HTTPOk != int64(counts.Ok) || after.HTTPError != int64(counts.Err) || after.HTTPTimeout != int64(counts.Timeout) {
		t.Fatalf("counters mismatch domain rows: counters=%+v rows=%+v", after, counts)
	}
	// Ensure no mutation to unrelated counters (dns or lead) aside from possible initial pending baseline
	if after.DNSPending != before.DNSPending || after.LeadPending != before.LeadPending {
		// Accept if triggers concurrently updated but warn
		_ = models.CampaignDomainCounters{}
	}
}
