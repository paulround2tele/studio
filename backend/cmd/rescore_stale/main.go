package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/extraction"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func main() {
	dsn := flag.String("dsn", os.Getenv("DB_DSN"), "Postgres DSN")
	campaign := flag.String("campaign", "", "Campaign UUID (required)")
	profile := flag.String("snapshot", "", "Scoring profile snapshot UUID (optional)")
	flag.Parse()
	if *dsn == "" || *campaign == "" {
		log.Fatal("dsn and campaign are required")
	}
	db, err := sqlx.Connect("postgres", *dsn)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	ctx := context.Background()
	var snapPtr *string
	if *profile != "" {
		snapPtr = profile
	}
	marked, err := extraction.MarkStaleScores(ctx, db.DB, *campaign, snapPtr)
	if err != nil {
		log.Fatalf("mark stale: %v", err)
	}
	fmt.Printf("Marked %d rows stale\n", marked)
	// Trigger scoring service to rescore campaign (legacy path ScoreDomains)
	deps := services.Dependencies{DB: db}
	analysis := services.NewAnalysisService(nil, deps, nil, nil, nil)
	start := time.Now()
	cid, err := uuid.Parse(*campaign)
	if err != nil {
		log.Fatalf("invalid campaign uuid: %v", err)
	}
	if err := analysis.ScoreDomains(ctx, cid); err != nil {
		log.Fatalf("rescore failed: %v", err)
	}
	fmt.Printf("Rescore completed in %s\n", time.Since(start))
}

// (uuidFrom helper removed; using uuid.Parse)
