// Stealth-aware DNS validation service - extends DNSValidationService with stealth capabilities
package services

import (
	"context"
	"fmt"
	"log"

	legacyservices "github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/google/uuid"
)

// StealthAwareDNSValidationService extends DNS validation with stealth capabilities
type StealthAwareDNSValidationService interface {
	DNSValidationService

	// ExecuteWithStealth runs DNS validation with stealth domain randomization
	ExecuteWithStealth(ctx context.Context, campaignID uuid.UUID, stealthConfig *legacyservices.StealthConfig) (<-chan PhaseProgress, error)

	// EnableStealthMode configures the service to use stealth by default
	EnableStealthMode(config *legacyservices.StealthConfig)

	// DisableStealthMode returns to normal sequential validation
	DisableStealthMode()
}

// stealthAwareDNSService wraps the standard DNS validation service with stealth capabilities
type stealthAwareDNSService struct {
	DNSValidationService // Embed the standard service
	stealthIntegration   StealthIntegration
	stealthEnabled       bool
	defaultStealthConfig *legacyservices.StealthConfig
}

// NewStealthAwareDNSValidationService creates a DNS validation service with stealth capabilities
func NewStealthAwareDNSValidationService(
	standardService DNSValidationService,
	stealthIntegration StealthIntegration,
) StealthAwareDNSValidationService {
	return &stealthAwareDNSService{
		DNSValidationService: standardService,
		stealthIntegration:   stealthIntegration,
		stealthEnabled:       false,
	}
}

// ExecuteWithStealth runs DNS validation with stealth domain randomization
func (s *stealthAwareDNSService) ExecuteWithStealth(ctx context.Context, campaignID uuid.UUID, stealthConfig *legacyservices.StealthConfig) (<-chan PhaseProgress, error) {
	log.Printf("StealthAwareDNS: Starting stealth DNS validation for campaign %s", campaignID)

	// Get domains that need DNS validation from stealth integration
	randomizedDomains, err := s.stealthIntegration.RandomizeDomainsForValidation(ctx, campaignID, "dns_validation")
	if err != nil {
		return nil, fmt.Errorf("failed to randomize domains for stealth DNS validation: %w", err)
	}

	if len(randomizedDomains) == 0 {
		log.Printf("StealthAwareDNS: No domains available for stealth validation in campaign %s", campaignID)
		// Fall back to standard execution if no domains
		return s.DNSValidationService.Execute(ctx, campaignID)
	}

	log.Printf("StealthAwareDNS: Processing %d domains with stealth validation for campaign %s", len(randomizedDomains), campaignID)

	// Process domains with stealth integration (this handles randomization, delays, etc.)
	err = s.stealthIntegration.ProcessValidationWithStealth(ctx, campaignID, randomizedDomains, "dns_validation")
	if err != nil {
		return nil, fmt.Errorf("stealth DNS validation failed: %w", err)
	}

	// After stealth processing, run the standard validation execution
	// The domains are now in stealth order in the campaign's JSONB data
	return s.DNSValidationService.Execute(ctx, campaignID)
}

// EnableStealthMode configures the service to use stealth by default
func (s *stealthAwareDNSService) EnableStealthMode(config *legacyservices.StealthConfig) {
	s.stealthEnabled = true
	s.defaultStealthConfig = config
	log.Printf("StealthAwareDNS: Stealth mode enabled with strategy: %s", config.ShuffleStrategy)
}

// DisableStealthMode returns to normal sequential validation
func (s *stealthAwareDNSService) DisableStealthMode() {
	s.stealthEnabled = false
	s.defaultStealthConfig = nil
	log.Printf("StealthAwareDNS: Stealth mode disabled")
}

// Execute override - uses stealth if enabled, otherwise standard execution
func (s *stealthAwareDNSService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	if s.stealthEnabled && s.defaultStealthConfig != nil {
		log.Printf("StealthAwareDNS: Using stealth mode for campaign %s", campaignID)
		return s.ExecuteWithStealth(ctx, campaignID, s.defaultStealthConfig)
	}

	log.Printf("StealthAwareDNS: Using standard mode for campaign %s", campaignID)
	return s.DNSValidationService.Execute(ctx, campaignID)
}
