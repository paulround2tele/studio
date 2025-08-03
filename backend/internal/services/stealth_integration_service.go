// File: backend/internal/services/stealth_integration_service.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// StealthIntegrationService integrates stealth capabilities with existing validation services
type StealthIntegrationService interface {
	// RandomizeDomainsForValidation prepares domains for stealth DNS/HTTP validation
	RandomizeDomainsForValidation(ctx context.Context, campaignID uuid.UUID, validationType string) ([]*RandomizedDomain, error)

	// GetStealthConfigForCampaign gets appropriate stealth config based on campaign settings
	GetStealthConfigForCampaign(ctx context.Context, campaignID uuid.UUID) (*StealthConfig, error)

	// ProcessValidationWithStealth validates domains using stealth techniques
	ProcessValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []*RandomizedDomain, validationType string) error

	// UpdateDomainGenerationWithStealth modifies domain generation to support stealth validation
	UpdateDomainGenerationWithStealth(ctx context.Context, campaignID uuid.UUID) error
}

type stealthIntegrationServiceImpl struct {
	db                 *sqlx.DB
	campaignStore      store.CampaignStore
	stealthService     DomainStealthService
	dnsCampaignService DNSCampaignService
	httpKeywordService HTTPKeywordCampaignService
}

// NewStealthIntegrationService creates a stealth integration service
func NewStealthIntegrationService(
	db *sqlx.DB,
	campaignStore store.CampaignStore,
	dnsCampaignService DNSCampaignService,
	httpKeywordService HTTPKeywordCampaignService,
) StealthIntegrationService {
	stealthService := NewDomainStealthService(db, campaignStore)

	return &stealthIntegrationServiceImpl{
		db:                 db,
		campaignStore:      campaignStore,
		stealthService:     stealthService,
		dnsCampaignService: dnsCampaignService,
		httpKeywordService: httpKeywordService,
	}
}

// RandomizeDomainsForValidation prepares domains for stealth validation
func (s *stealthIntegrationServiceImpl) RandomizeDomainsForValidation(ctx context.Context, campaignID uuid.UUID, validationType string) ([]*RandomizedDomain, error) {
	log.Printf("StealthIntegration: Preparing stealth validation for campaign %s, type: %s", campaignID, validationType)

	// Get stealth config for this campaign
	config, err := s.GetStealthConfigForCampaign(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stealth config: %w", err)
	}

	// Get domains to validate based on validation type
	var domains []*models.GeneratedDomain
	switch validationType {
	case "dns_validation":
		domains, err = s.getDomainsForDNSValidation(ctx, campaignID)
	case "http_keyword_validation":
		domains, err = s.getDomainsForHTTPValidation(ctx, campaignID)
	default:
		return nil, fmt.Errorf("unsupported validation type: %s", validationType)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get domains for validation: %w", err)
	}

	if len(domains) == 0 {
		log.Printf("StealthIntegration: No domains found for %s validation in campaign %s", validationType, campaignID)
		return []*RandomizedDomain{}, nil
	}

	// Apply stealth randomization
	randomizedDomains, err := s.stealthService.RandomizeDomainOrder(ctx, domains, config)
	if err != nil {
		return nil, fmt.Errorf("failed to randomize domains: %w", err)
	}

	log.Printf("StealthIntegration: Randomized %d domains for %s validation using strategy: %s",
		len(randomizedDomains), validationType, config.ShuffleStrategy)

	return randomizedDomains, nil
}

// GetStealthConfigForCampaign determines appropriate stealth config
func (s *stealthIntegrationServiceImpl) GetStealthConfigForCampaign(ctx context.Context, campaignID uuid.UUID) (*StealthConfig, error) {
	// Get campaign details to determine stealth requirements
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Determine stealth level based on campaign characteristics
	var config *StealthConfig

	// Check if campaign has explicit stealth settings (would be added to campaign params)
	// For now, use intelligent defaults based on campaign size and type

	switch {
	case campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeDNSValidation:
		// DNS validation is more sensitive to detection
		config = AggressiveStealthConfig()

	case campaign.CurrentPhase != nil && *campaign.CurrentPhase == models.PhaseTypeHTTPKeywordValidation:
		// HTTP validation needs moderate stealth
		config = DefaultStealthConfig()

	default:
		// Conservative stealth for other types
		config = ConservativeStealthConfig()
	}

	// Adjust based on campaign size
	if campaign.TotalItems != nil && *campaign.TotalItems > 10000 {
		// Large campaigns need more aggressive stealth
		config.ShuffleStrategy = StealthStrategyInterleaved
		config.SubsetValidation = true
		config.SubsetPercentage = 0.7 // Only validate 70% to avoid exhaustive patterns
		log.Printf("StealthIntegration: Using aggressive stealth for large campaign %s (%d domains)",
			campaignID, *campaign.TotalItems)
	}

	log.Printf("StealthIntegration: Selected stealth config for campaign %s: strategy=%s, jitter=%d-%dms, subset=%t",
		campaignID, config.ShuffleStrategy, config.TemporalJitterMin, config.TemporalJitterMax, config.SubsetValidation)

	return config, nil
}

// ProcessValidationWithStealth validates domains using stealth techniques
func (s *stealthIntegrationServiceImpl) ProcessValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []*RandomizedDomain, validationType string) error {
	if len(domains) == 0 {
		return nil
	}

	log.Printf("StealthIntegration: Starting stealth validation of %d domains for campaign %s", len(domains), campaignID)

	// Get stealth config
	config, err := s.GetStealthConfigForCampaign(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get stealth config: %w", err)
	}

	// Process domains with stealth delays
	for i, domain := range domains {
		// Calculate stealth delay for this domain
		delay := s.stealthService.CalculateStealthDelay(domain, config)

		// Apply delay before validation (except for first domain)
		if i > 0 {
			log.Printf("StealthIntegration: Applying stealth delay of %dms before validating domain %s",
				delay.Milliseconds(), domain.DomainName)
			time.Sleep(delay)
		}

		// Perform actual validation based on type
		switch validationType {
		case "dns_validation":
			if err := s.performStealthDNSValidation(ctx, campaignID, domain); err != nil {
				log.Printf("StealthIntegration: DNS validation failed for domain %s: %v", domain.DomainName, err)
				// Continue with other domains even if one fails
			}

		case "http_keyword_validation":
			if err := s.performStealthHTTPValidation(ctx, campaignID, domain); err != nil {
				log.Printf("StealthIntegration: HTTP validation failed for domain %s: %v", domain.DomainName, err)
				// Continue with other domains even if one fails
			}
		}

		// Log progress periodically
		if (i+1)%100 == 0 || i == len(domains)-1 {
			log.Printf("StealthIntegration: Validated %d/%d domains for campaign %s", i+1, len(domains), campaignID)
		}
	}

	log.Printf("StealthIntegration: Completed stealth validation of %d domains for campaign %s", len(domains), campaignID)
	return nil
}

// getDomainsForDNSValidation gets domains that need DNS validation
func (s *stealthIntegrationServiceImpl) getDomainsForDNSValidation(ctx context.Context, campaignID uuid.UUID) ([]*models.GeneratedDomain, error) {
	// PHASE-CENTRIC: Get domains from this campaign's DomainsData JSONB field
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Extract domains from DomainsData JSONB field
	if campaign.DomainsData == nil {
		log.Printf("StealthIntegration: No domains data found for DNS validation in campaign %s", campaignID)
		return []*models.GeneratedDomain{}, nil
	}

	var domainsData map[string]interface{}
	if err := json.Unmarshal(*campaign.DomainsData, &domainsData); err != nil {
		return nil, fmt.Errorf("failed to parse domains data: %w", err)
	}

	// Convert domains data to GeneratedDomain structs
	var domains []*models.GeneratedDomain
	if domainsSlice, ok := domainsData["domains"].([]interface{}); ok {
		for i, domainItem := range domainsSlice {
			if domainMap, ok := domainItem.(map[string]interface{}); ok {
				if domainName, ok := domainMap["domain_name"].(string); ok {
					domain := &models.GeneratedDomain{
						ID:          uuid.New(), // Generate temporary ID for stealth processing
						DomainName:  domainName,
						CampaignID:  campaignID,
						OffsetIndex: int64(i),
					}
					domains = append(domains, domain)
				}
			}
		}
	}

	if len(domains) > 1000 {
		domains = domains[:1000] // Limit for stealth processing
	}

	return domains, nil
}

// getDomainsForHTTPValidation gets domains that need HTTP validation
func (s *stealthIntegrationServiceImpl) getDomainsForHTTPValidation(ctx context.Context, campaignID uuid.UUID) ([]*models.GeneratedDomain, error) {
	// PHASE-CENTRIC: Get domains from this campaign's DNSResults JSONB field
	campaign, err := s.campaignStore.GetCampaignByID(ctx, s.db, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Extract successful DNS validation results from DNSResults JSONB field
	if campaign.DNSResults == nil {
		log.Printf("StealthIntegration: No DNS results found for HTTP validation in campaign %s", campaignID)
		return []*models.GeneratedDomain{}, nil
	}

	var dnsResults map[string]interface{}
	if err := json.Unmarshal(*campaign.DNSResults, &dnsResults); err != nil {
		return nil, fmt.Errorf("failed to parse DNS results: %w", err)
	}

	// Extract validated domains that passed DNS validation
	var domains []*models.GeneratedDomain
	if validatedDomains, ok := dnsResults["validated_domains"].([]interface{}); ok {
		for i, domainItem := range validatedDomains {
			if domainMap, ok := domainItem.(map[string]interface{}); ok {
				if domainName, ok := domainMap["domain_name"].(string); ok {
					// Only include domains that passed DNS validation
					if status, ok := domainMap["status"].(string); ok && status == "ok" {
						domain := &models.GeneratedDomain{
							ID:          uuid.New(), // Generate temporary ID for stealth processing
							DomainName:  domainName,
							CampaignID:  campaignID,
							OffsetIndex: int64(i),
						}
						domains = append(domains, domain)
					}
				}
			}
		}
	}

	if len(domains) > 1000 {
		domains = domains[:1000] // Limit for stealth processing
	}

	return domains, nil
}

// performStealthDNSValidation performs DNS validation with stealth considerations
func (s *stealthIntegrationServiceImpl) performStealthDNSValidation(ctx context.Context, campaignID uuid.UUID, domain *RandomizedDomain) error {
	log.Printf("StealthIntegration: Performing stealth DNS validation for domain %s (original offset: %d, validation order: %d)",
		domain.DomainName, domain.OriginalOffset, domain.ValidationOrder)

	// TODO: Call the actual DNS validation engine here
	// This would convert the RandomizedDomain back to a format the engine can process
	// and call something like: s.dnsValidator.ValidateDomain(ctx, domain.GeneratedDomain, persona, config)
	// For now, we simulate validation

	// The actual integration would call the DNS validation engine and store results
	// in the campaign's DNSResults JSONB field

	return nil
}

// performStealthHTTPValidation performs HTTP validation with stealth considerations
func (s *stealthIntegrationServiceImpl) performStealthHTTPValidation(ctx context.Context, campaignID uuid.UUID, domain *RandomizedDomain) error {
	log.Printf("StealthIntegration: Performing stealth HTTP validation for domain %s (original offset: %d, validation order: %d)",
		domain.DomainName, domain.OriginalOffset, domain.ValidationOrder)

	// TODO: Call the actual HTTP validation engine here
	// This would convert the RandomizedDomain back to a format the engine can process
	// and call something like: s.httpValidator.ValidateDomain(ctx, domain.GeneratedDomain, persona, keywords, config)
	// For now, we simulate validation

	// The actual integration would call the HTTP validation engine and store results
	// in the campaign's HTTPResults JSONB field

	return nil
}

// UpdateDomainGenerationWithStealth modifies domain generation to support stealth validation
func (s *stealthIntegrationServiceImpl) UpdateDomainGenerationWithStealth(ctx context.Context, campaignID uuid.UUID) error {
	log.Printf("StealthIntegration: Updating domain generation for stealth support in campaign %s", campaignID)

	// This could involve:
	// 1. Adding metadata to generated domains to support randomization
	// 2. Pre-generating randomization seeds
	// 3. Setting up stealth configuration in campaign params

	// For now, just log that stealth support is enabled
	log.Printf("StealthIntegration: Stealth support enabled for campaign %s", campaignID)

	return nil
}

// Integration helper functions for existing services

// IntegrateDNSValidationWithStealth modifies DNS validation to use stealth techniques
// PHASE-CENTRIC: Works with single campaign's JSONB data flow
func IntegrateDNSValidationWithStealth(ctx context.Context, dnsCampaignService DNSCampaignService, stealthIntegration StealthIntegrationService, campaignID uuid.UUID) error {
	log.Printf("StealthIntegration: Integrating DNS validation with stealth for campaign %s (phase-centric)", campaignID)

	// PHASE-CENTRIC: Get randomized domains from this campaign's DomainsData
	randomizedDomains, err := stealthIntegration.RandomizeDomainsForValidation(ctx, campaignID, "dns_validation")
	if err != nil {
		return fmt.Errorf("failed to randomize domains for DNS validation: %w", err)
	}

	if len(randomizedDomains) == 0 {
		log.Printf("StealthIntegration: No domains available for DNS validation in campaign %s", campaignID)
		return nil
	}

	// Process validation with stealth techniques - results will be stored in campaign's DNSResults JSONB
	return stealthIntegration.ProcessValidationWithStealth(ctx, campaignID, randomizedDomains, "dns_validation")
}

// IntegrateHTTPValidationWithStealth modifies HTTP validation to use stealth techniques
// PHASE-CENTRIC: Works with single campaign's JSONB data flow
func IntegrateHTTPValidationWithStealth(ctx context.Context, httpKeywordService HTTPKeywordCampaignService, stealthIntegration StealthIntegrationService, campaignID uuid.UUID) error {
	log.Printf("StealthIntegration: Integrating HTTP validation with stealth for campaign %s (phase-centric)", campaignID)

	// PHASE-CENTRIC: Get randomized domains from this campaign's DNSResults
	randomizedDomains, err := stealthIntegration.RandomizeDomainsForValidation(ctx, campaignID, "http_keyword_validation")
	if err != nil {
		return fmt.Errorf("failed to randomize domains for HTTP validation: %w", err)
	}

	if len(randomizedDomains) == 0 {
		log.Printf("StealthIntegration: No domains available for HTTP validation in campaign %s", campaignID)
		return nil
	}

	// Process validation with stealth techniques - results will be stored in campaign's HTTPResults JSONB
	return stealthIntegration.ProcessValidationWithStealth(ctx, campaignID, randomizedDomains, "http_keyword_validation")
}
