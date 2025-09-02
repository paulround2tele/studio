// Stealth-aware HTTP validation service - extends HTTPValidationService with stealth capabilities
package services

import (
	"context"
	"fmt"
	"log"

	legacyservices "github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/google/uuid"
)

// StealthAwareHTTPValidationService extends HTTP validation with stealth capabilities
type StealthAwareHTTPValidationService interface {
	HTTPValidationService

	// ExecuteWithStealth runs HTTP validation with stealth domain randomization
	ExecuteWithStealth(ctx context.Context, campaignID uuid.UUID, stealthConfig *legacyservices.StealthConfig) (<-chan PhaseProgress, error)

	// EnableStealthMode configures the service to use stealth by default
	EnableStealthMode(config *legacyservices.StealthConfig)

	// DisableStealthMode returns to normal sequential validation
	DisableStealthMode()
}

// stealthAwareHTTPService wraps the standard HTTP validation service with stealth capabilities
type stealthAwareHTTPService struct {
	HTTPValidationService // Embed the standard service
	stealthIntegration    StealthIntegration
	stealthEnabled        bool
	defaultStealthConfig  *legacyservices.StealthConfig
}

// NewStealthAwareHTTPValidationService creates an HTTP validation service with stealth capabilities
func NewStealthAwareHTTPValidationService(
	standardService HTTPValidationService,
	stealthIntegration StealthIntegration,
) StealthAwareHTTPValidationService {
	return &stealthAwareHTTPService{
		HTTPValidationService: standardService,
		stealthIntegration:    stealthIntegration,
		stealthEnabled:        false,
	}
}

// ExecuteWithStealth runs HTTP validation with stealth domain randomization
func (s *stealthAwareHTTPService) ExecuteWithStealth(ctx context.Context, campaignID uuid.UUID, stealthConfig *legacyservices.StealthConfig) (<-chan PhaseProgress, error) {
	log.Printf("StealthAwareHTTP: Starting stealth HTTP validation for campaign %s", campaignID)

	// Get domains that need HTTP validation from stealth integration
	// These should be domains that passed DNS validation
	randomizedDomains, err := s.stealthIntegration.RandomizeDomainsForValidation(ctx, campaignID, "http_keyword_validation")
	if err != nil {
		return nil, fmt.Errorf("failed to randomize domains for stealth HTTP validation: %w", err)
	}

	if len(randomizedDomains) == 0 {
		log.Printf("StealthAwareHTTP: No domains available for stealth validation in campaign %s", campaignID)
		// Fall back to standard execution if no domains
		return s.HTTPValidationService.Execute(ctx, campaignID)
	}

	log.Printf("StealthAwareHTTP: Processing %d domains with stealth validation for campaign %s", len(randomizedDomains), campaignID)

	// Process domains with stealth integration (this handles randomization, delays, etc.)
	err = s.stealthIntegration.ProcessValidationWithStealth(ctx, campaignID, randomizedDomains, "http_keyword_validation")
	if err != nil {
		return nil, fmt.Errorf("stealth HTTP validation failed: %w", err)
	}

	// After stealth processing, run the standard validation execution
	// The domains are now in stealth order in the campaign's JSONB data
	return s.HTTPValidationService.Execute(ctx, campaignID)
}

// EnableStealthMode configures the service to use stealth by default
func (s *stealthAwareHTTPService) EnableStealthMode(config *legacyservices.StealthConfig) {
	s.stealthEnabled = true
	s.defaultStealthConfig = config
	log.Printf("StealthAwareHTTP: Stealth mode enabled with strategy: %s", config.ShuffleStrategy)
}

// DisableStealthMode returns to normal sequential validation
func (s *stealthAwareHTTPService) DisableStealthMode() {
	s.stealthEnabled = false
	s.defaultStealthConfig = nil
	log.Printf("StealthAwareHTTP: Stealth mode disabled")
}

// Execute override - uses stealth if enabled, otherwise standard execution
func (s *stealthAwareHTTPService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan PhaseProgress, error) {
	if s.stealthEnabled && s.defaultStealthConfig != nil {
		log.Printf("StealthAwareHTTP: Using stealth mode for campaign %s", campaignID)
		return s.ExecuteWithStealth(ctx, campaignID, s.defaultStealthConfig)
	}

	log.Printf("StealthAwareHTTP: Using standard mode for campaign %s", campaignID)
	return s.HTTPValidationService.Execute(ctx, campaignID)
}
