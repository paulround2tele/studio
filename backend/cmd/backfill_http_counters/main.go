package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// backfill_http_counters scans generated_domains grouped by campaign to recompute HTTP status counters
// Idempotent: uses UPDATE with computed values, not incremental arithmetic.
func main() {
	dsn := os.Getenv("DATABASE_DSN")
	if dsn == "" {
		log.Fatal("DATABASE_DSN not set")
	}
	dryRun := flag.Bool("dry", false, "dry run - only print planned updates")
	batch := flag.Int("batch", 500, "domains fetch batch size (not critical - full table aggregation)")
	flag.Parse()

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	store := postgres.NewCampaignStorePostgres(db)

	// Enumerate campaigns from campaign_domain_counters (ensures row exists) falling back to campaigns table
	campaignIDs := []struct{ ID string }{}
	if err := db.Select(&campaignIDs, `SELECT id FROM lead_generation_campaigns`); err != nil {
		log.Fatalf("list campaigns: %v", err)
	}
	log.Printf("Found %d campaigns to backfill (batch=%d)", len(campaignIDs), *batch)
	updated := 0
	for _, row := range campaignIDs {
		var counts struct {
			Pending int64 `db:"pending"`
			Ok      int64 `db:"ok"`
			Error   int64 `db:"error"`
			Timeout int64 `db:"timeout"`
		}
		if err := db.Get(&counts, `SELECT
            COUNT(*) FILTER (WHERE http_status='pending') AS pending,
            COUNT(*) FILTER (WHERE http_status='ok') AS ok,
            COUNT(*) FILTER (WHERE http_status='error') AS error,
            COUNT(*) FILTER (WHERE http_status='timeout') AS timeout
          FROM generated_domains WHERE campaign_id=$1`, row.ID); err != nil {
			log.Printf("campaign %s aggregation error: %v", row.ID, err)
			continue
		}
		if *dryRun {
			log.Printf("DRY campaign=%s http_pending=%d http_ok=%d http_error=%d http_timeout=%d", row.ID, counts.Pending, counts.Ok, counts.Error, counts.Timeout)
			continue
		}
		res, err := db.Exec(`UPDATE campaign_domain_counters SET http_pending=$2, http_ok=$3, http_error=$4, http_timeout=$5, updated_at=NOW() WHERE campaign_id=$1`, row.ID, counts.Pending, counts.Ok, counts.Error, counts.Timeout)
		if err != nil {
			log.Printf("campaign %s update failed: %v", row.ID, err)
			continue
		}
		if n, _ := res.RowsAffected(); n > 0 {
			updated++
		}
	}
	log.Printf("HTTP counters backfill complete. Updated %d campaign rows.", updated)
	_ = store              // keep for potential future composite operations
	_ = config.AppConfig{} // reference to avoid removal if imported later for env parsing
	time.Sleep(10 * time.Millisecond)
	fmt.Println("Done")
}
