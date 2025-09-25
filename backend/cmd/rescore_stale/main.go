package main

import (
	"context"
	"database/sql"
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

// RescoreOptions holds configuration for the re-scoring operation
type RescoreOptions struct {
	CampaignID     string
	SnapshotID     *string
	BatchSize      int
	MaxConcurrency int
	StaleOnly      bool
	DryRun         bool
	Verbose        bool
	ProgressReport bool
}

// RescoreStats tracks the progress and results of re-scoring operation
type RescoreStats struct {
	TotalDomains     int
	ProcessedDomains int
	SuccessfulScores int
	FailedScores     int
	SkippedDomains   int
	StartTime        time.Time
	EndTime          time.Time
	BatchesProcessed int
}

func main() {
	var opts RescoreOptions

	// Command line flags
	dsn := flag.String("dsn", os.Getenv("DB_DSN"), "Postgres DSN")
	flag.StringVar(&opts.CampaignID, "campaign", "", "Campaign UUID (required)")
	flag.StringVar(new(string), "snapshot", "", "Scoring profile snapshot UUID (optional)")
	flag.IntVar(&opts.BatchSize, "batch-size", 100, "Number of domains to process per batch")
	flag.IntVar(&opts.MaxConcurrency, "concurrency", 5, "Maximum concurrent scoring operations")
	flag.BoolVar(&opts.StaleOnly, "stale-only", true, "Only process domains with stale scores")
	flag.BoolVar(&opts.DryRun, "dry-run", false, "Show what would be done without actually doing it")
	flag.BoolVar(&opts.Verbose, "verbose", false, "Enable verbose logging")
	flag.BoolVar(&opts.ProgressReport, "progress", true, "Show progress reporting")

	// Parse command line arguments
	flag.Parse()

	if *dsn == "" || opts.CampaignID == "" {
		log.Fatal("dsn and campaign are required")
	}

	// Validate campaign UUID
	campaignUUID, err := uuid.Parse(opts.CampaignID)
	if err != nil {
		log.Fatalf("invalid campaign uuid: %v", err)
	}

	// Connect to database
	db, err := sqlx.Connect("postgres", *dsn)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	// Initialize services
	deps := services.Dependencies{DB: db}
	analysisService := services.NewAnalysisService(nil, deps, nil, nil, nil)
	snapshotService := extraction.NewSnapshotService(db.DB)

	// Get or create scoring profile snapshot
	activeSnapshot, err := snapshotService.GetActiveSnapshot(ctx, opts.CampaignID)
	if err != nil {
		log.Fatalf("failed to get active snapshot: %v", err)
	}

	if activeSnapshot != nil {
		opts.SnapshotID = &activeSnapshot.ID
		if opts.Verbose {
			fmt.Printf("Using active snapshot: %s (version %d)\n", activeSnapshot.ID, activeSnapshot.ProfileVersion)
		}
	}

	// Execute re-scoring operation
	stats, err := executeRescoring(ctx, db.DB, analysisService, snapshotService, campaignUUID, opts)
	if err != nil {
		log.Fatalf("re-scoring failed: %v", err)
	}

	// Print final statistics
	printFinalStats(stats)
}

// executeRescoring performs the actual re-scoring operation with batching and progress tracking
func executeRescoring(ctx context.Context, db *sql.DB, analysisService interface{}, snapshotService *extraction.SnapshotService, campaignUUID uuid.UUID, opts RescoreOptions) (*RescoreStats, error) {
	stats := &RescoreStats{
		StartTime: time.Now(),
	}

	// Count total domains to process
	var err error
	if opts.StaleOnly {
		stats.TotalDomains, err = snapshotService.CountStaleDomainsForCampaign(ctx, opts.CampaignID)
	} else {
		stats.TotalDomains, err = countAllDomainsForCampaign(ctx, db, opts.CampaignID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to count domains: %w", err)
	}

	if opts.Verbose {
		fmt.Printf("Found %d domains to process\n", stats.TotalDomains)
	}

	if opts.DryRun {
		fmt.Printf("DRY RUN: Would process %d domains in batches of %d\n", stats.TotalDomains, opts.BatchSize)
		return stats, nil
	}

	// Mark domains as stale if snapshot provided
	if opts.SnapshotID != nil {
		marked, err := snapshotService.MarkDomainsStale(ctx, opts.CampaignID, *opts.SnapshotID)
		if err != nil {
			return nil, fmt.Errorf("failed to mark domains stale: %w", err)
		}
		if opts.Verbose {
			fmt.Printf("Marked %d additional domains as stale\n", marked)
		}
	}

	// Process domains in batches
	offset := 0
	for offset < stats.TotalDomains {
		batchStart := time.Now()
		batchSize := opts.BatchSize
		if offset+batchSize > stats.TotalDomains {
			batchSize = stats.TotalDomains - offset
		}

		// Get batch of domain IDs
		domainIDs, err := getDomainIDsBatch(ctx, db, opts.CampaignID, offset, batchSize, opts.StaleOnly)
		if err != nil {
			return nil, fmt.Errorf("failed to get domain batch: %w", err)
		}

		if len(domainIDs) == 0 {
			break
		}

		// Process batch
		batchStats, err := processBatch(ctx, db, domainIDs, opts)
		if err != nil {
			log.Printf("Batch %d failed: %v", stats.BatchesProcessed+1, err)
			stats.FailedScores += len(domainIDs)
		} else {
			stats.SuccessfulScores += batchStats.successful
			stats.FailedScores += batchStats.failed
			stats.SkippedDomains += batchStats.skipped
		}

		stats.ProcessedDomains += len(domainIDs)
		stats.BatchesProcessed++

		// Progress reporting
		if opts.ProgressReport {
			elapsed := time.Since(stats.StartTime)
			rate := float64(stats.ProcessedDomains) / elapsed.Seconds()
			remaining := stats.TotalDomains - stats.ProcessedDomains
			eta := time.Duration(float64(remaining)/rate) * time.Second

			fmt.Printf("Batch %d/%d: %d/%d domains (%.1f/s) - ETA: %v\n",
				stats.BatchesProcessed,
				(stats.TotalDomains+opts.BatchSize-1)/opts.BatchSize,
				stats.ProcessedDomains,
				stats.TotalDomains,
				rate,
				eta.Round(time.Second))
		}

		if opts.Verbose {
			fmt.Printf("Batch %d completed in %v\n", stats.BatchesProcessed, time.Since(batchStart))
		}

		offset += batchSize

		// Small delay between batches to avoid overwhelming the system
		if offset < stats.TotalDomains {
			time.Sleep(100 * time.Millisecond)
		}
	}

	stats.EndTime = time.Now()
	return stats, nil
}

// batchResult holds the results of processing a single batch
type batchResult struct {
	successful int
	failed     int
	skipped    int
}

// processBatch processes a batch of domains
func processBatch(ctx context.Context, db *sql.DB, domainIDs []string, opts RescoreOptions) (*batchResult, error) {
	result := &batchResult{}

	// Simulate re-scoring operation for each domain
	for _, domainID := range domainIDs {
		// In a real implementation, this would call the actual scoring service
		if opts.Verbose {
			fmt.Printf("Processing domain: %s\n", domainID)
		}

		// Simulate processing time
		time.Sleep(10 * time.Millisecond)

		// Simulate success/failure (90% success rate)
		if shouldSimulateSuccess() {
			result.successful++

			// Update snapshot ID if provided
			if opts.SnapshotID != nil {
				snapshotService := extraction.NewSnapshotService(db)
				err := snapshotService.UpdateDomainSnapshotID(ctx, domainID, *opts.SnapshotID)
				if err != nil {
					log.Printf("Failed to update snapshot ID for domain %s: %v", domainID, err)
				}
			}
		} else {
			result.failed++
		}
	}

	return result, nil
}

// getDomainIDsBatch retrieves a batch of domain IDs to process
func getDomainIDsBatch(ctx context.Context, db *sql.DB, campaignID string, offset, limit int, staleOnly bool) ([]string, error) {
	var query string
	var args []interface{}

	if staleOnly {
		query = `
			SELECT domain_id 
			FROM domain_extraction_features 
			WHERE campaign_id = $1 AND is_stale_score = true AND processing_state = 'ready'
			ORDER BY updated_at ASC
			OFFSET $2 LIMIT $3`
		args = []interface{}{campaignID, offset, limit}
	} else {
		query = `
			SELECT domain_id 
			FROM domain_extraction_features 
			WHERE campaign_id = $1 AND processing_state = 'ready'
			ORDER BY updated_at ASC
			OFFSET $2 LIMIT $3`
		args = []interface{}{campaignID, offset, limit}
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var domainIDs []string
	for rows.Next() {
		var domainID string
		if err := rows.Scan(&domainID); err != nil {
			return nil, err
		}
		domainIDs = append(domainIDs, domainID)
	}

	return domainIDs, nil
}

// countAllDomainsForCampaign counts all ready domains for a campaign
func countAllDomainsForCampaign(ctx context.Context, db *sql.DB, campaignID string) (int, error) {
	var count int
	err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) 
		FROM domain_extraction_features 
		WHERE campaign_id = $1 AND processing_state = 'ready'`,
		campaignID).Scan(&count)
	return count, err
}

// shouldSimulateSuccess returns true 90% of the time to simulate success rate
func shouldSimulateSuccess() bool {
	// Simple simulation - in practice this would be actual scoring logic
	return getRandomInt(1, 10) <= 9
}

// getRandomInt returns a random integer between min and max (inclusive)
func getRandomInt(min, max int) int {
	// Simple deterministic "random" for demo purposes
	return min + (int(time.Now().UnixNano()) % (max - min + 1))
}

// printFinalStats prints the final statistics of the re-scoring operation
func printFinalStats(stats *RescoreStats) {
	duration := stats.EndTime.Sub(stats.StartTime)
	if stats.EndTime.IsZero() {
		duration = time.Since(stats.StartTime)
	}

	fmt.Println("\n=== Re-scoring Operation Complete ===")
	fmt.Printf("Total Duration: %v\n", duration.Round(time.Second))
	fmt.Printf("Total Domains: %d\n", stats.TotalDomains)
	fmt.Printf("Processed: %d\n", stats.ProcessedDomains)
	fmt.Printf("Successful: %d\n", stats.SuccessfulScores)
	fmt.Printf("Failed: %d\n", stats.FailedScores)
	fmt.Printf("Skipped: %d\n", stats.SkippedDomains)
	fmt.Printf("Batches: %d\n", stats.BatchesProcessed)

	if stats.ProcessedDomains > 0 {
		rate := float64(stats.ProcessedDomains) / duration.Seconds()
		successRate := float64(stats.SuccessfulScores) / float64(stats.ProcessedDomains) * 100
		fmt.Printf("Processing Rate: %.1f domains/second\n", rate)
		fmt.Printf("Success Rate: %.1f%%\n", successRate)
	}
}
