package tests

import (
	"context"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// NOTE: This is a lightweight integration-style test skeleton. It assumes a test DB
// and environment wiring already exist. Adjust DSN / setup as needed for project.
func TestCampaignDomainsList_UsesCountersWhenDirectMode(t *testing.T) {
	if testing.Short() {
		t.Skip("short")
	}
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set")
	}
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatalf("connect db: %v", err)
	}
	store := postgres.NewCampaignStorePostgres(db)
	ctx := context.Background()

	campaignID := uuid.New()
	// Insert minimal campaign row
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns (id, user_id, name, campaign_type, total_phases, completed_phases, created_at, updated_at) VALUES ($1,'user','test','lead_generation',4,0,NOW(),NOW())`, campaignID)
	if err != nil {
		t.Fatalf("insert campaign: %v", err)
	}

	// Insert a few generated domains
	for i := 0; i < 3; i++ {
		_, err = db.Exec(`INSERT INTO generated_domains (id, campaign_id, domain_name, offset_index, generated_at, created_at, dns_status, http_status, lead_status) VALUES ($1,$2,$3,$4,NOW(),NOW(),'pending','pending','pending')`, uuid.New(), campaignID, "example"+uuid.New().String()+".com", i)
		if err != nil {
			t.Fatalf("insert generated_domain: %v", err)
		}
	}

	// Allow triggers to update counters (sleep small if needed)
	time.Sleep(50 * time.Millisecond)

	counters, err := store.GetCampaignDomainCounters(ctx, db, campaignID)
	if err != nil {
		t.Fatalf("get counters: %v", err)
	}
	if counters.Total < 3 {
		t.Fatalf("expected at least 3 total, got %d", counters.Total)
	}

	// Simulate handler path: in real code we'd call the HTTP layer; here just verify counters path logic assumptions.
	// Ensure CountGeneratedDomainsByCampaign matches counters.Total
	count, err := store.CountGeneratedDomainsByCampaign(ctx, db, campaignID)
	if err != nil {
		t.Fatalf("count domains: %v", err)
	}
	if count != counters.Total {
		t.Fatalf("count %d != counters.Total %d", count, counters.Total)
	}

	// Placeholder for future: once OpenAPI regen adds aggregates field, perform HTTP request and assert JSON contains aggregates.
	_ = httptest.NewRecorder()
}
