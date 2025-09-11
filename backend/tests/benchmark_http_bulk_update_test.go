package tests

import (
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// BenchmarkHTTPBulkPendingUpdate measures transactional pending-only HTTP update performance.
func BenchmarkHTTPBulkPendingUpdate(b *testing.B) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		b.Skip("TEST_DATABASE_DSN not set")
	}
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		b.Fatalf("connect: %v", err)
	}
	// Prepare one campaign with N domains per iteration reused (reset statuses each loop)
	campaignID := uuid.New()
	if _, err := db.Exec(`INSERT INTO lead_generation_campaigns (id, user_id, name, campaign_type, total_phases, completed_phases, created_at, updated_at) VALUES ($1,'user','bench','lead_generation',4,0,NOW(),NOW())`, campaignID); err != nil {
		b.Fatalf("insert campaign: %v", err)
	}
	domainCount := 500
	for i := 0; i < domainCount; i++ {
		_, err = db.Exec(`INSERT INTO generated_domains (id, campaign_id, domain_name, offset_index, generated_at, created_at, dns_status, http_status, lead_status) VALUES ($1,$2,$3,$4,NOW(),NOW(),'ok','pending','pending')`, uuid.New(), campaignID, uuid.New().String()+".bench", i)
		if err != nil {
			b.Fatalf("insert domain: %v", err)
		}
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Reset statuses back to pending for reuse
		if _, err := db.Exec(`UPDATE generated_domains SET http_status='pending', http_status_code=NULL WHERE campaign_id=$1`, campaignID); err != nil {
			b.Fatalf("reset: %v", err)
		}
		// Execute transactional update (mimic service SQL) marking half ok, quarter error, quarter timeout
		if _, err := db.Exec(`WITH sel AS (
              SELECT domain_name,
                     CASE WHEN row_number() OVER () <= $2 THEN 'ok'
                          WHEN row_number() OVER () <= $3 THEN 'error'
                          ELSE 'timeout' END AS validation_status
              FROM generated_domains WHERE campaign_id=$1 AND http_status='pending' ORDER BY offset_index
            ), updates(domain_name,validation_status,http_status_code,last_checked_at) AS (
              SELECT domain_name, validation_status, NULL::INT, NOW() FROM sel
            )
            UPDATE generated_domains gd
            SET http_status = u.validation_status,
                http_status_code = u.http_status_code,
                http_checked_at = u.last_checked_at
            FROM updates u
            WHERE gd.domain_name = u.domain_name AND gd.campaign_id=$1 AND gd.http_status='pending'`, campaignID, domainCount/2, (domainCount*3)/4); err != nil {
			b.Fatalf("bulk update: %v", err)
		}
	}
}
