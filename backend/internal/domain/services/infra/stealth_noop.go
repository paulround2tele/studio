package infra

import (
	"context"
	"log"

	"github.com/google/uuid"
)

// NoopStealthIntegration implements StealthIntegration but performs no randomization.
// It exists to decouple domain services from legacy stealth services while preserving behavior.
type NoopStealthIntegration struct{}

func NewNoopStealthIntegration() *NoopStealthIntegration { return &NoopStealthIntegration{} }

// RandomizeDomainsForValidation returns no domains, causing callers to fall back to standard execution.
func (n *NoopStealthIntegration) RandomizeDomainsForValidation(ctx context.Context, campaignID uuid.UUID, validationType string) ([]string, error) {
	log.Printf("NoopStealthIntegration: no randomization for %s on campaign %s", validationType, campaignID)
	return nil, nil
}

// ProcessValidationWithStealth is a no-op.
func (n *NoopStealthIntegration) ProcessValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []string, validationType string) error {
	// Intentionally do nothing.
	return nil
}
