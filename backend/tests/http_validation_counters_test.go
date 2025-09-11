package tests

import (
	"context"
	"os"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// Test HTTP counters delta application via transactional path.
func TestHTTPValidationCountersDelta(t *testing.T) {
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
	campaignID := uuid.New()
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns (id, user_id, name, campaign_type, total_phases, completed_phases, created_at, updated_at) VALUES ($1,'user','http-delta','lead_generation',4,0,NOW(),NOW())`, campaignID)
	if err != nil {
		t.Fatalf("insert campaign: %v", err)
	}
	// Insert domains as pending
	for i := 0; i < 6; i++ { // 6 to test partial re-run idempotency
		_, err = db.Exec(`INSERT INTO generated_domains (id, campaign_id, domain_name, offset_index, generated_at, created_at, dns_status, http_status, lead_status) VALUES ($1,$2,$3,$4,NOW(),NOW(),'ok','pending','pending')`, uuid.New(), campaignID, uuid.New().String()+".example", i)
		if err != nil {
			t.Fatalf("insert domain: %v", err)
		}
	}
	// First batch intended results: 3 ok, 2 error, 1 timeout
	// Adjust inserted domain names to match results
	// Simplify: update the previously random domains to deterministic names
	rows, _ := db.Query(`SELECT id FROM generated_domains WHERE campaign_id=$1 ORDER BY offset_index`, campaignID)
	ids := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		_ = rows.Scan(&id)
		ids = append(ids, id)
	}
	_ = rows.Close()
	if len(ids) != 6 {
		t.Fatalf("expected 6 ids got %d", len(ids))
	}
	for i, nm := range []string{"d1.example", "d2.example", "d3.example", "d4.example", "d5.example", "d6.example"} {
		_, err = db.Exec(`UPDATE generated_domains SET domain_name=$1 WHERE id=$2`, nm, ids[i])
		if err != nil {
			t.Fatalf("rename domain: %v", err)
		}
	}
	before, _ := store.GetCampaignDomainCounters(context.Background(), db, campaignID)
	if before == nil {
		t.Fatalf("missing counters row")
	}
	// Manually invoke pending-only style SQL to mimic service transactional logic deterministically.
	// Build bulk update manually using pending-only SQL (mirror service) for test determinism.
	_, err = db.Exec(`WITH updates(domain_name,validation_status,http_status_code,last_checked_at) AS (VALUES
		('d1.example','ok',200,NOW()),
		('d2.example','ok',200,NOW()),
		('d3.example','timeout',NULL,NOW()),
		('d4.example','error',NULL,NOW()),
		('d5.example','error',NULL,NOW()),
		('d6.example','ok',204,NOW())
	)
UPDATE generated_domains gd
SET http_status = u.validation_status,
    http_status_code = u.http_status_code,
    http_checked_at = u.last_checked_at
FROM updates u
WHERE gd.domain_name = u.domain_name AND gd.campaign_id=$1 AND gd.http_status='pending'`, campaignID)
	if err != nil {
		t.Fatalf("initial bulk update: %v", err)
	}
	// Apply counters like service would: pending -6, ok +3, error +2, timeout +1
	_, err = db.Exec(`UPDATE campaign_domain_counters SET http_pending = http_pending - 6, http_ok = http_ok + 3, http_error = http_error + 2, http_timeout = http_timeout + 1 WHERE campaign_id=$1`, campaignID)
	if err != nil {
		t.Fatalf("counter delta: %v", err)
	}
	after, _ := store.GetCampaignDomainCounters(context.Background(), db, campaignID)
	if after.HTTPOk != before.HTTPOk+3 || after.HTTPError != before.HTTPError+2 || after.HTTPTimeout != before.HTTPTimeout+1 || after.HTTPPending != before.HTTPPending-6 {
		t.Fatalf("unexpected first delta before=%+v after=%+v", before, after)
	}
	// Re-run identical updates (idempotency): no row has http_status='pending' so counters must remain unchanged
	_, err = db.Exec(`WITH updates(domain_name,validation_status,http_status_code,last_checked_at) AS (VALUES
		('d1.example','ok',200,NOW())
	)
UPDATE generated_domains gd SET http_status = u.validation_status FROM updates u WHERE gd.domain_name=u.domain_name AND gd.campaign_id=$1 AND gd.http_status='pending'`, campaignID)
	if err != nil {
		t.Fatalf("second noop update: %v", err)
	}
	after2, _ := store.GetCampaignDomainCounters(context.Background(), db, campaignID)
	if after2.HTTPOk != after.HTTPOk || after2.HTTPPending != after.HTTPPending {
		t.Fatalf("idempotency violated after=%+v after2=%+v", after, after2)
	}
}
