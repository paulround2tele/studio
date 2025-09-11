package tests

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// Placeholder simplified test: verify counters reflect status diversity; full HTTP aggregates assertion covered in handler-level tests elsewhere.
func TestCampaignDomainsList_Aggregates(t *testing.T) {
	if testing.Short() {
		t.Skip("short")
	}
	if os.Getenv("TEST_DATABASE_DSN") == "" {
		t.Skip("TEST_DATABASE_DSN not set")
	}
	_ = os.Setenv("DOMAINS_LISTING_MODE", "direct")
	dsn := os.Getenv("TEST_DATABASE_DSN")
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	store := postgres.NewCampaignStorePostgres(db)
	campaignID := uuid.New()
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns (id, user_id, name, campaign_type, total_phases, completed_phases, created_at, updated_at) VALUES ($1,'user','agg','lead_generation',4,0,NOW(),NOW())`, campaignID)
	if err != nil {
		t.Fatalf("insert campaign: %v", err)
	}
	insert := func(dns, http, lead string) {
		_, e := db.Exec(`INSERT INTO generated_domains (id, campaign_id, domain_name, offset_index, generated_at, created_at, dns_status, http_status, lead_status) VALUES ($1,$2,$3,$4,NOW(),NOW(),$5,$6,$7)`, uuid.New(), campaignID, uuid.New().String()+".com", 0, dns, http, lead)
		if e != nil {
			t.Fatalf("insert domain: %v", e)
		}
	}
	insert("pending", "pending", "pending")
	insert("ok", "ok", "match")
	insert("error", "error", "no_match")
	time.Sleep(80 * time.Millisecond)
	ctx := context.Background()
	counters, err := store.GetCampaignDomainCounters(ctx, db, campaignID)
	if err != nil {
		t.Fatalf("get counters: %v", err)
	}
	if counters.DNSPending != 1 || counters.DNSOk != 1 || counters.DNSError != 1 {
		t.Fatalf("unexpected dns breakdown: %+v", counters)
	}
}
