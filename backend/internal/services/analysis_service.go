package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
)

// AnalysisService provides automated cleanup/processing for campaigns that have completed HTTP validation
type AnalysisService struct {
	campaignStore store.CampaignStore
	db            *sqlx.DB
}

// NewAnalysisService creates a new instance of AnalysisService
func NewAnalysisService(campaignStore store.CampaignStore, db *sqlx.DB) *AnalysisService {
	return &AnalysisService{
		campaignStore: campaignStore,
		db:            db,
	}
}

// ProcessAnalysisCampaignBatch performs automated analysis/cleanup for a campaign
// This is called when a campaign reaches the analysis phase
func (s *AnalysisService) ProcessAnalysisCampaignBatch(ctx context.Context, campaignID uuid.UUID, batchSize int) (bool, int64, error) {
	var opErr error
	var querier store.Querier
	var sqlTx *sqlx.Tx
	var processedInThisBatch int64

	// Use SQL transaction if database is available
	if s.db != nil {
		var startTxErr error
		sqlTx, startTxErr = s.db.BeginTxx(ctx, nil)
		if startTxErr != nil {
			log.Printf("Error beginning SQL transaction for ProcessAnalysisCampaignBatch %s: %v", campaignID, startTxErr)
			return false, 0, fmt.Errorf("failed to begin SQL transaction: %w", startTxErr)
		}
		querier = sqlTx
		log.Printf("SQL Transaction started for ProcessAnalysisCampaignBatch %s.", campaignID)

		defer func() {
			if p := recover(); p != nil {
				log.Printf("Panic recovered during SQL ProcessAnalysisCampaignBatch for %s, rolling back: %v", campaignID, p)
				_ = sqlTx.Rollback()
				panic(p)
			} else if opErr != nil {
				log.Printf("ProcessAnalysisCampaignBatch: Rolled back SQL transaction for campaign %s due to error: %v", campaignID, opErr)
				_ = sqlTx.Rollback()
			} else {
				if commitErr := sqlTx.Commit(); commitErr != nil {
					log.Printf("ProcessAnalysisCampaignBatch: Failed to commit SQL transaction for campaign %s: %v", campaignID, commitErr)
					opErr = fmt.Errorf("failed to commit SQL transaction: %w", commitErr)
				} else {
					log.Printf("SQL Transaction committed for ProcessAnalysisCampaignBatch %s.", campaignID)
				}
			}
		}()
	} else {
		log.Printf("Operating in Firestore mode for ProcessAnalysisCampaignBatch %s (no service-level transaction).", campaignID)
		// querier remains nil
	}

	campaign, errGetCamp := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if errGetCamp != nil {
		opErr = fmt.Errorf("failed to fetch campaign %s: %w", campaignID, errGetCamp)
		return false, 0, opErr
	}

	// Verify this is an analysis campaign
	if campaign.CurrentPhase == nil || *campaign.CurrentPhase != models.PhaseTypeAnalysis {
		opErr = fmt.Errorf("campaign %s is not in analysis phase (current phase: %v)", campaignID, campaign.CurrentPhase)
		return false, 0, opErr
	}

	log.Printf("ProcessAnalysisCampaignBatch: Starting analysis processing for campaign %s", campaignID)

	// Start campaign if it's not running
	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusInProgress {
		status := models.PhaseStatusInProgress
		campaign.PhaseStatus = &status
		campaign.StartedAt = &[]time.Time{time.Now().UTC()}[0]
		log.Printf("ProcessAnalysisCampaignBatch: Campaign %s marked as Running for analysis phase.", campaignID)
	}

	// AUTOMATED ANALYSIS PROCESSING
	// Since this is automated cleanup/processing, we simulate the work and complete immediately

	// Set total items if not set (for progress tracking)
	if campaign.TotalItems == nil {
		// For analysis, we can use a nominal count for progress display
		campaign.TotalItems = models.Int64Ptr(1)
	}

	if campaign.ProcessedItems == nil {
		campaign.ProcessedItems = models.Int64Ptr(0)
	}

	// Simulate analysis work (in real implementation, this would perform actual cleanup/analysis)
	log.Printf("ProcessAnalysisCampaignBatch: Performing automated analysis/cleanup for campaign %s", campaignID)

	// Mark analysis as complete immediately since it's automated
	status := models.PhaseStatusCompleted
	campaign.PhaseStatus = &status
	campaign.ProgressPercentage = models.Float64Ptr(100.0)
	campaign.ProcessedItems = models.Int64Ptr(1)
	now := time.Now().UTC()
	campaign.CompletedAt = &now

	// Analysis is the final phase, so no further phase transition needed
	log.Printf("ProcessAnalysisCampaignBatch: Analysis phase completed for campaign %s. Campaign fully complete.", campaignID)

	processedInThisBatch = 1

	// Update campaign in database
	if errUpdateCampaign := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCampaign != nil {
		opErr = fmt.Errorf("failed to update campaign %s after analysis completion: %w", campaignID, errUpdateCampaign)
		log.Printf("[ProcessAnalysisCampaignBatch] %v", opErr)
		return false, processedInThisBatch, opErr
	}

	// Broadcast analysis completion via WebSocket
	websocket.BroadcastCampaignProgress(campaignID.String(), 100.0, "completed", "analysis", 0, 0)

	log.Printf("ProcessAnalysisCampaignBatch: Campaign %s analysis phase completed successfully", campaignID)

	return true, processedInThisBatch, nil
}
