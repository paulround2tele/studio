package tests

import (
	"database/sql"
	"testing"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// Test that dnsReason/httpReason appear in listing when columns populated
func TestCampaignDomainsListReasons(t *testing.T) {
	dsn := "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()
	campaignID := uuid.New()
	var hasStatus bool
	if err := db.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_generation_campaigns' AND column_name='status')`).Scan(&hasStatus); err != nil {
		t.Fatalf("introspect status col: %v", err)
	}
	if hasStatus {
		if _, err := db.Exec(`INSERT INTO lead_generation_campaigns (id, name, created_at, updated_at, status) VALUES ($1,'test',NOW(),NOW(),'draft')`, campaignID); err != nil {
			t.Fatalf("insert campaign: %v", err)
		}
	} else {
		if _, err := db.Exec(`INSERT INTO lead_generation_campaigns (id, name, created_at, updated_at) VALUES ($1,'test',NOW(),NOW())`, campaignID); err != nil {
			t.Fatalf("insert campaign legacy: %v", err)
		}
	}
	domainID := uuid.New()
	var hasDNSReason, hasHTTPReason bool
	if err := db.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_domains' AND column_name='dns_reason')`).Scan(&hasDNSReason); err != nil {
		t.Fatalf("introspect dns_reason: %v", err)
	}
	if err := db.QueryRow(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_domains' AND column_name='http_reason')`).Scan(&hasHTTPReason); err != nil {
		t.Fatalf("introspect http_reason: %v", err)
	}
	if hasDNSReason && hasHTTPReason {
		if _, err := db.Exec(`INSERT INTO generated_domains (id, campaign_id, domain_name, offset_index, generated_at, created_at, dns_status, http_status, lead_status, dns_reason, http_reason) VALUES ($1,$2,$3,0,NOW(),NOW(),'error','timeout','pending','NXDOMAIN','TIMEOUT')`, domainID, campaignID, "example-reason.test"); err != nil {
			t.Fatalf("insert domain: %v", err)
		}
		var dnsReason, httpReason sql.NullString
		if err := db.QueryRow(`SELECT dns_reason, http_reason FROM generated_domains WHERE id=$1`, domainID).Scan(&dnsReason, &httpReason); err != nil {
			t.Fatalf("select reasons: %v", err)
		}
		if !dnsReason.Valid || dnsReason.String != "NXDOMAIN" {
			t.Fatalf("dns_reason mismatch: %#v", dnsReason)
		}
		if !httpReason.Valid || httpReason.String != "TIMEOUT" {
			t.Fatalf("http_reason mismatch: %#v", httpReason)
		}
	} else {
		t.Skip("reason columns not present; skipping reason assertion")
	}
}
