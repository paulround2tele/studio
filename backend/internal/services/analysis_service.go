package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
)

// analysisServiceImpl provides automated cleanup/processing for campaigns that have completed HTTP validation
type analysisServiceImpl struct {
	campaignStore store.CampaignStore
	db            *sqlx.DB
	// PHASE 4 REDIS CACHING: Add Redis cache and optimization config
	redisCache         cache.RedisCache
	optimizationConfig *config.OptimizationConfig
}

// NewAnalysisService creates a new instance of AnalysisService
func NewAnalysisService(campaignStore store.CampaignStore, db *sqlx.DB) AnalysisService {
	return &analysisServiceImpl{
		campaignStore: campaignStore,
		db:            db,
	}
}

// NewAnalysisServiceWithCache creates a new instance of AnalysisService with Redis cache integration
func NewAnalysisServiceWithCache(campaignStore store.CampaignStore, db *sqlx.DB, redisCache cache.RedisCache, optimizationConfig *config.OptimizationConfig) AnalysisService {
	return &analysisServiceImpl{
		campaignStore:      campaignStore,
		db:                 db,
		redisCache:         redisCache,
		optimizationConfig: optimizationConfig,
	}
}

// ProcessAnalysisCampaignBatch performs automated analysis/cleanup for a campaign
// This is called when a campaign reaches the analysis phase
func (s *analysisServiceImpl) ProcessAnalysisCampaignBatch(ctx context.Context, campaignID uuid.UUID, batchSize int) (bool, int64, error) {
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
		// Use phase-first approach: Start analysis phase
		// The database trigger will automatically sync the campaign table
		err := s.campaignStore.UpdatePhaseStatus(ctx, querier, campaignID, models.PhaseTypeAnalysis, models.PhaseStatusInProgress)
		if err != nil {
			opErr = fmt.Errorf("failed to start analysis phase for campaign %s: %w", campaignID, err)
			return false, 0, opErr
		}

		// Update started_at timestamp directly on campaign (doesn't conflict with trigger)
		campaign.StartedAt = &[]time.Time{time.Now().UTC()}[0]
		log.Printf("ProcessAnalysisCampaignBatch: Campaign %s marked as Running for analysis phase.", campaignID)
	}

	// NEW: Read HTTP results from Phase 3 (HTTP validation) stored in campaign.HTTPResults JSONB
	httpResultsData, err := s.campaignStore.GetCampaignHTTPResults(ctx, querier, campaignID)
	if err != nil {
		opErr = fmt.Errorf("failed to get HTTP results for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	if httpResultsData == nil {
		opErr = fmt.Errorf("no HTTP results found for campaign %s - ensure HTTP validation phase completed", campaignID)
		return false, 0, opErr
	}

	// Parse HTTP results from JSONB
	var httpResults []*models.HTTPKeywordResult
	if err := json.Unmarshal(*httpResultsData, &httpResults); err != nil {
		opErr = fmt.Errorf("failed to parse HTTP results for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	log.Printf("ProcessAnalysisCampaignBatch: Found %d HTTP results for analysis in campaign %s", len(httpResults), campaignID)

	// Set total items for progress tracking
	totalResults := len(httpResults)
	if campaign.TotalItems == nil {
		campaign.TotalItems = models.Int64Ptr(int64(totalResults))
	}

	if campaign.ProcessedItems == nil {
		campaign.ProcessedItems = models.Int64Ptr(0)
	}

	// Perform content analysis on HTTP results
	log.Printf("ProcessAnalysisCampaignBatch: Performing content analysis for campaign %s on %d HTTP results", campaignID, totalResults)

	// Analyze and extract content from HTTP results
	analysisResults := s.performContentAnalysis(httpResults, campaignID)

	// Store analysis results in campaign.AnalysisResults JSONB
	analysisResultsJSON, err := json.Marshal(analysisResults)
	if err != nil {
		opErr = fmt.Errorf("failed to marshal analysis results for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	analysisResultsRaw := json.RawMessage(analysisResultsJSON)
	if err := s.campaignStore.UpdateCampaignAnalysisResults(ctx, querier, campaignID, &analysisResultsRaw); err != nil {
		opErr = fmt.Errorf("failed to store analysis results for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	log.Printf("ProcessAnalysisCampaignBatch: Stored %d analysis results for campaign %s", len(analysisResults.ExtractedContent), campaignID)

	// Mark analysis as complete
	// Use phase-first approach: Complete analysis phase
	// The database trigger will automatically sync the campaign table
	err = s.campaignStore.CompletePhase(ctx, querier, campaignID, models.PhaseTypeAnalysis)
	if err != nil {
		opErr = fmt.Errorf("failed to complete analysis phase for campaign %s: %w", campaignID, err)
		return false, 0, opErr
	}

	// Update progress and completion data directly on campaign (doesn't conflict with trigger)
	campaign.ProgressPercentage = models.Float64Ptr(100.0)
	campaign.ProcessedItems = models.Int64Ptr(int64(totalResults))
	now := time.Now().UTC()
	campaign.CompletedAt = &now

	// Analysis is the final phase, so no further phase transition needed
	log.Printf("ProcessAnalysisCampaignBatch: Analysis phase completed for campaign %s. Campaign fully complete.", campaignID)

	processedInThisBatch = int64(totalResults)

	// Update campaign in database
	if errUpdateCampaign := s.campaignStore.UpdateCampaign(ctx, querier, campaign); errUpdateCampaign != nil {
		opErr = fmt.Errorf("failed to update campaign %s after analysis completion: %w", campaignID, errUpdateCampaign)
		log.Printf("[ProcessAnalysisCampaignBatch] %v", opErr)
		return false, processedInThisBatch, opErr
	}

	// Broadcast analysis completion via WebSocket
	// Optional non-blocking websocket notification for completion
	go func() {
		if broadcaster := websocket.GetBroadcaster(); broadcaster != nil {
			message := websocket.CreateCampaignProgressMessage(campaignID.String(), 100.0, "completed", "analysis")
			broadcaster.BroadcastToCampaign(campaignID.String(), message)
		}
	}()

	log.Printf("ProcessAnalysisCampaignBatch: Campaign %s analysis phase completed successfully", campaignID)

	return true, processedInThisBatch, nil
}

// ContentAnalysisResult represents the result of content analysis phase
type ContentAnalysisResult struct {
	ExtractedContent []models.ExtractedContentItem `json:"extractedContent"`
	LeadItems        []models.LeadItem             `json:"leadItems"`
	Summary          AnalysisSummary               `json:"summary"`
	ProcessedAt      time.Time                     `json:"processedAt"`
}

// AnalysisSummary provides summary statistics for the analysis
type AnalysisSummary struct {
	TotalURLsAnalyzed      int     `json:"totalUrlsAnalyzed"`
	URLsWithKeywords       int     `json:"urlsWithKeywords"`
	URLsWithoutKeywords    int     `json:"urlsWithoutKeywords"`
	TotalKeywordMatches    int     `json:"totalKeywordMatches"`
	UniqueKeywordsFound    int     `json:"uniqueKeywordsFound"`
	AvgKeywordsPerURL      float64 `json:"avgKeywordsPerUrl"`
	URLsWithScreenshots    int     `json:"urlsWithScreenshots"`
	URLsWithoutScreenshots int     `json:"urlsWithoutScreenshots"`
}

// performContentAnalysis analyzes HTTP keyword validation results to extract leads and content
func (s *analysisServiceImpl) performContentAnalysis(httpResults []*models.HTTPKeywordResult, campaignID uuid.UUID) ContentAnalysisResult {
	log.Printf("performContentAnalysis: Starting content analysis for campaign %s with %d HTTP results", campaignID, len(httpResults))

	var extractedContent []models.ExtractedContentItem
	var leadItems []models.LeadItem
	keywordFrequency := make(map[string]int)
	urlsWithKeywords := 0
	totalKeywordMatches := 0

	for _, result := range httpResults {
		// Check if result has keywords (either from sets or ad-hoc)
		var allKeywords []string

		// Extract keywords from sets
		if result.FoundKeywordsFromSets != nil {
			var keywordsFromSets []string
			if err := json.Unmarshal(*result.FoundKeywordsFromSets, &keywordsFromSets); err == nil {
				allKeywords = append(allKeywords, keywordsFromSets...)
			}
		}

		// Add ad-hoc keywords
		if result.FoundAdHocKeywords != nil {
			allKeywords = append(allKeywords, *result.FoundAdHocKeywords...)
		}

		// Only process results that had keyword matches
		if len(allKeywords) == 0 {
			continue
		}

		urlsWithKeywords++
		urlKeywordMatches := len(allKeywords)
		totalKeywordMatches += urlKeywordMatches

		// Create domain URL for analysis
		domainURL := "https://" + result.DomainName

		// Extract content item using available fields
		contentText := ""
		if result.ExtractedContentSnippet != nil {
			contentText = *result.ExtractedContentSnippet
		}
		if result.PageTitle != nil {
			if contentText != "" {
				contentText = *result.PageTitle + " - " + contentText
			} else {
				contentText = *result.PageTitle
			}
		}

		campaignIDStr := campaignID.String()
		contentItem := models.ExtractedContentItem{
			ID:                 uuid.New().String(),
			Text:               contentText,
			SourceURL:          &domainURL,
			PreviousCampaignID: &campaignIDStr,
		}

		// Calculate similarity score based on keyword matches
		similarityScore := int((float64(urlKeywordMatches) / 10.0) * 100)
		if similarityScore > 100 {
			similarityScore = 100
		}
		contentItem.SimilarityScore = &similarityScore

		// Add advanced analysis with keywords found
		advancedAnalysis := &models.ExtractedContentAnalysis{
			AdvancedKeywords: &allKeywords,
		}

		// Set sentiment based on HTTP status
		sentiment := "Neutral"
		if result.HTTPStatusCode != nil {
			if *result.HTTPStatusCode >= 200 && *result.HTTPStatusCode < 300 {
				sentiment = "Positive"
			} else if *result.HTTPStatusCode >= 400 {
				sentiment = "Negative"
			}
		}
		advancedAnalysis.Sentiment = &sentiment

		// Set categories based on validation status
		categories := []string{"web_validation", result.ValidationStatus}
		advancedAnalysis.Categories = &categories

		// Create summary
		summary := fmt.Sprintf("Domain %s analyzed with %d keyword matches. Status: %s",
			result.DomainName, urlKeywordMatches, result.ValidationStatus)
		advancedAnalysis.Summary = &summary

		contentItem.AdvancedAnalysis = advancedAnalysis
		extractedContent = append(extractedContent, contentItem)

		// Count keyword frequency
		for _, keyword := range allKeywords {
			keywordFrequency[strings.ToLower(keyword)]++
		}

		// Create lead item if this looks promising (has keywords and is accessible)
		if result.HTTPStatusCode != nil && *result.HTTPStatusCode >= 200 && *result.HTTPStatusCode < 300 {
			campaignIDStr := campaignID.String()
			leadItem := models.LeadItem{
				ID:                 uuid.New().String(),
				SourceURL:          &domainURL,
				PreviousCampaignID: &campaignIDStr,
			}

			// Extract potential company name from domain
			company := result.DomainName
			leadItem.Company = &company

			// Calculate similarity score based on multiple factors
			leadScore := calculateLeadScore(result)
			leadSimilarityScore := int(leadScore)
			leadItem.SimilarityScore = &leadSimilarityScore

			leadItems = append(leadItems, leadItem)
		}
	}

	// Calculate summary statistics
	avgKeywordsPerURL := 0.0
	if urlsWithKeywords > 0 {
		avgKeywordsPerURL = float64(totalKeywordMatches) / float64(urlsWithKeywords)
	}

	summary := AnalysisSummary{
		TotalURLsAnalyzed:      len(httpResults),
		URLsWithKeywords:       urlsWithKeywords,
		URLsWithoutKeywords:    len(httpResults) - urlsWithKeywords,
		TotalKeywordMatches:    totalKeywordMatches,
		UniqueKeywordsFound:    len(keywordFrequency),
		AvgKeywordsPerURL:      avgKeywordsPerURL,
		URLsWithScreenshots:    0, // HTTPKeywordResult doesn't include screenshot data
		URLsWithoutScreenshots: len(httpResults),
	}

	log.Printf("performContentAnalysis: Analysis complete for campaign %s - %d content items, %d leads, %d unique keywords",
		campaignID, len(extractedContent), len(leadItems), len(keywordFrequency))

	return ContentAnalysisResult{
		ExtractedContent: extractedContent,
		LeadItems:        leadItems,
		Summary:          summary,
		ProcessedAt:      time.Now().UTC(),
	}
}

// Helper functions for content analysis

func extractDomainFromURL(url string) string {
	// Simple domain extraction - in production would use proper URL parsing
	if strings.HasPrefix(url, "http://") {
		url = url[7:]
	} else if strings.HasPrefix(url, "https://") {
		url = url[8:]
	}

	if slashIndex := strings.Index(url, "/"); slashIndex != -1 {
		url = url[:slashIndex]
	}

	return url
}

func calculateLeadScore(result *models.HTTPKeywordResult) float64 {
	score := 0.0

	// Base score for successful HTTP response
	if result.HTTPStatusCode != nil && *result.HTTPStatusCode >= 200 && *result.HTTPStatusCode < 300 {
		score += 30.0
	}

	// Score for keyword matches from sets
	if result.FoundKeywordsFromSets != nil {
		var keywordsFromSets []string
		if err := json.Unmarshal(*result.FoundKeywordsFromSets, &keywordsFromSets); err == nil {
			score += float64(len(keywordsFromSets)) * 15.0
		}
	}

	// Score for ad-hoc keyword matches
	if result.FoundAdHocKeywords != nil {
		score += float64(len(*result.FoundAdHocKeywords)) * 10.0
	}

	// Score for having page title
	if result.PageTitle != nil && len(*result.PageTitle) > 0 {
		score += 10.0
	}

	// Score for having extracted content
	if result.ExtractedContentSnippet != nil && len(*result.ExtractedContentSnippet) > 0 {
		score += 15.0
	}

	// Score for validation status
	if result.ValidationStatus == "valid" {
		score += 10.0
	}

	// Score for multiple attempts (shows persistence/importance)
	if result.Attempts != nil && *result.Attempts == 1 {
		score += 5.0 // Bonus for succeeding on first try
	}

	// Cap score at 100
	if score > 100.0 {
		score = 100.0
	}

	return score
}
