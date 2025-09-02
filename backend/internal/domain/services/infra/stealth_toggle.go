package infra

import (
	"context"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/google/uuid"
)

// ToggleableStealthIntegration delegates to real or noop based on a runtime config flag.
type ToggleableStealthIntegration struct {
	real *realStealthIntegration
	noop *NoopStealthIntegration
	cfg  *config.AppConfig
}

func NewToggleableStealthIntegration(real *realStealthIntegration, noop *NoopStealthIntegration, cfg *config.AppConfig) *ToggleableStealthIntegration {
	return &ToggleableStealthIntegration{real: real, noop: noop, cfg: cfg}
}

func (t *ToggleableStealthIntegration) stealthEnabled() bool {
	if t == nil || t.cfg == nil {
		return false
	}
	return t.cfg.Features.EnableStealth
}

func (t *ToggleableStealthIntegration) RandomizeDomainsForValidation(ctx context.Context, campaignID uuid.UUID, validationType string) ([]string, error) {
	if t.stealthEnabled() && t.real != nil {
		return t.real.RandomizeDomainsForValidation(ctx, campaignID, validationType)
	}
	if t.noop != nil {
		return t.noop.RandomizeDomainsForValidation(ctx, campaignID, validationType)
	}
	return nil, nil
}

func (t *ToggleableStealthIntegration) ProcessValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []string, validationType string) error {
	if t.stealthEnabled() && t.real != nil {
		return t.real.ProcessValidationWithStealth(ctx, campaignID, domains, validationType)
	}
	if t.noop != nil {
		return t.noop.ProcessValidationWithStealth(ctx, campaignID, domains, validationType)
	}
	return nil
}
