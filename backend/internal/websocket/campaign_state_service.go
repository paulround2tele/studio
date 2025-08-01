package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// CampaignStateService provides access to campaign data for WebSocket state sync
type CampaignStateService struct {
	campaignStore store.CampaignStore
	db            store.Querier
}

// CampaignStateData represents the current state of a campaign for WebSocket broadcasting
type CampaignStateData struct {
	CampaignID       string  `json:"campaignId"`
	CurrentPhase     string  `json:"currentPhase"`
	PhaseStatus      string  `json:"phaseStatus"`
	Progress         float64 `json:"progress"`
	ProcessedItems   int64   `json:"processedItems"`
	TotalItems       int64   `json:"totalItems"`
	DomainsGenerated int64   `json:"domainsGenerated"`
	DNSValidated     int64   `json:"dnsValidated"`
	HTTPValidated    int64   `json:"httpValidated"`
	LeadsGenerated   int64   `json:"leadsGenerated"`
	IsCompleted      bool    `json:"isCompleted"`
}

// Global campaign state service instance
var globalCampaignStateService *CampaignStateService

// InitializeCampaignStateService initializes the global campaign state service
func InitializeCampaignStateService(campaignStore store.CampaignStore, db store.Querier) {
	globalCampaignStateService = &CampaignStateService{
		campaignStore: campaignStore,
		db:            db,
	}
	log.Printf("✅ [STATE_SYNC] CampaignStateService initialized with database access")
}

// GetCampaignStateService returns the global campaign state service
func GetCampaignStateService() *CampaignStateService {
	return globalCampaignStateService
}

// GetCampaignState retrieves comprehensive campaign state for WebSocket broadcasting
func (css *CampaignStateService) GetCampaignState(ctx context.Context, campaignID string) (*CampaignStateData, error) {
	if css == nil || css.campaignStore == nil {
		return nil, fmt.Errorf("campaign state service not initialized")
	}

	// Parse campaign ID
	campaignUUID, err := uuid.Parse(campaignID)
	if err != nil {
		return nil, fmt.Errorf("invalid campaign ID: %w", err)
	}

	// Get campaign from database
	campaign, err := css.campaignStore.GetCampaignByID(ctx, css.db, campaignUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	if campaign == nil {
		return nil, fmt.Errorf("campaign not found")
	}

	// Build comprehensive state data
	stateData := &CampaignStateData{
		CampaignID:     campaignID,
		CurrentPhase:   "domain_generation", // Default
		PhaseStatus:    "not_started",       // Default
		Progress:       0.0,
		ProcessedItems: 0,
		TotalItems:     0,
		IsCompleted:    false,
	}

	// Extract current phase and status
	if campaign.CurrentPhase != nil {
		stateData.CurrentPhase = string(*campaign.CurrentPhase)
	}
	if campaign.PhaseStatus != nil {
		stateData.PhaseStatus = string(*campaign.PhaseStatus)
	}

	// Calculate progress based on phase data
	err = css.calculateCampaignProgress(ctx, campaign, stateData)
	if err != nil {
		log.Printf("⚠️ [STATE_SYNC] Failed to calculate progress for campaign %s: %v", campaignID, err)
		// Continue with basic data even if progress calculation fails
	}

	return stateData, nil
}

// calculateCampaignProgress calculates comprehensive progress across all phases
func (css *CampaignStateService) calculateCampaignProgress(ctx context.Context, campaign *models.LeadGenerationCampaign, stateData *CampaignStateData) error {
	campaignUUID := campaign.ID

	// 1. Get domains data (Phase 1: Domain Generation) - Use real-time count instead of stale JSONB data
	domainsCount, err := css.campaignStore.CountGeneratedDomainsByCampaign(ctx, css.db, campaignUUID)
	if err == nil {
		stateData.DomainsGenerated = domainsCount
	} else {
		log.Printf("⚠️ [STATE_SYNC] Failed to get real-time domains count for campaign %s: %v", campaignUUID, err)
		// Fallback to JSONB data if count fails
		domainsData, err := css.campaignStore.GetCampaignDomainsData(ctx, css.db, campaignUUID)
		if err == nil && domainsData != nil {
			var domains []interface{}
			if err := json.Unmarshal(*domainsData, &domains); err == nil {
				stateData.DomainsGenerated = int64(len(domains))
			}
		}
	}

	// 2. Get DNS results (Phase 2: DNS Validation)
	dnsResults, err := css.campaignStore.GetCampaignDNSResults(ctx, css.db, campaignUUID)
	if err == nil && dnsResults != nil {
		var dnsData []interface{}
		if err := json.Unmarshal(*dnsResults, &dnsData); err == nil {
			stateData.DNSValidated = int64(len(dnsData))
		}
	}

	// 3. Get HTTP results (Phase 3: HTTP Validation)
	httpResults, err := css.campaignStore.GetCampaignHTTPResults(ctx, css.db, campaignUUID)
	if err == nil && httpResults != nil {
		var httpData []interface{}
		if err := json.Unmarshal(*httpResults, &httpData); err == nil {
			stateData.HTTPValidated = int64(len(httpData))
		}
	}

	// 4. Get analysis results (Phase 4: Analysis)
	analysisResults, err := css.campaignStore.GetCampaignAnalysisResults(ctx, css.db, campaignUUID)
	if err == nil && analysisResults != nil {
		var analysisData []interface{}
		if err := json.Unmarshal(*analysisResults, &analysisData); err == nil {
			stateData.LeadsGenerated = int64(len(analysisData))
		}
	}

	// 5. Calculate overall progress based on current phase
	css.calculateOverallProgress(campaign, stateData)

	return nil
}

// calculateOverallProgress calculates overall campaign progress percentage
func (css *CampaignStateService) calculateOverallProgress(campaign *models.LeadGenerationCampaign, stateData *CampaignStateData) {
	// Extract target domains from metadata
	targetDomains := int64(1000) // Default
	if campaign.Metadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
			if domainConfig, exists := metadata["domain_generation_config"]; exists {
				if configMap, ok := domainConfig.(map[string]interface{}); ok {
					if numDomains, ok := configMap["num_domains_to_generate"].(float64); ok {
						targetDomains = int64(numDomains)
					}
				}
			}
		}
	}

	stateData.TotalItems = targetDomains

	// Calculate progress based on current phase
	switch stateData.CurrentPhase {
	case "domain_generation":
		stateData.ProcessedItems = stateData.DomainsGenerated
		if targetDomains > 0 {
			stateData.Progress = (float64(stateData.DomainsGenerated) / float64(targetDomains)) * 100.0
		}
		// Check if domain generation is complete
		if stateData.PhaseStatus == "completed" || stateData.DomainsGenerated >= targetDomains {
			stateData.Progress = 100.0
		}

	case "dns_validation":
		stateData.ProcessedItems = stateData.DNSValidated
		if stateData.DomainsGenerated > 0 {
			stateData.Progress = (float64(stateData.DNSValidated) / float64(stateData.DomainsGenerated)) * 100.0
		}
		// Check if DNS validation is complete - same logic as domain generation
		if stateData.PhaseStatus == "completed" {
			stateData.Progress = 100.0
		}

	case "http_keyword_validation":
		stateData.ProcessedItems = stateData.HTTPValidated
		if stateData.DNSValidated > 0 {
			stateData.Progress = (float64(stateData.HTTPValidated) / float64(stateData.DNSValidated)) * 100.0
		}
		// Check if HTTP validation is complete
		if stateData.PhaseStatus == "completed" {
			stateData.Progress = 100.0
		}

	case "analysis":
		stateData.ProcessedItems = stateData.LeadsGenerated
		if stateData.HTTPValidated > 0 {
			stateData.Progress = (float64(stateData.LeadsGenerated) / float64(stateData.HTTPValidated)) * 100.0
		}
		// Check if analysis is complete
		if stateData.PhaseStatus == "completed" {
			stateData.Progress = 100.0
		}
	}

	// Ensure progress doesn't exceed 100%
	if stateData.Progress > 100.0 {
		stateData.Progress = 100.0
	}

	// Check if campaign is completed
	stateData.IsCompleted = (stateData.PhaseStatus == "completed" && stateData.CurrentPhase == "analysis") ||
		(stateData.Progress >= 100.0 && stateData.CurrentPhase == "domain_generation" && stateData.PhaseStatus == "completed")
}
