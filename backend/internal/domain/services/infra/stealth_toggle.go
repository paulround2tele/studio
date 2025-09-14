package infra

import (
	"context"
	"log"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/google/uuid"
)

// ToggleableStealthIntegration delegates to real or noop based on a runtime config flag.
type ToggleableStealthIntegration struct {
	real *realStealthIntegration
	noop *NoopStealthIntegration
	cfg  *config.AppConfig
	// oneTimeLogged guards emitting a single runtime state snapshot so logs aren't noisy
	loggedInitial bool
}

func NewToggleableStealthIntegration(real *realStealthIntegration, noop *NoopStealthIntegration, cfg *config.AppConfig) *ToggleableStealthIntegration {
	return &ToggleableStealthIntegration{real: real, noop: noop, cfg: cfg}
}

func (t *ToggleableStealthIntegration) stealthEnabled() bool {
	if t == nil || t.cfg == nil {
		return false
	}
	if !t.loggedInitial { // emit one-time snapshot of enable flag
		log.Printf("StealthToggle: initial flags EnableStealth=%t (force cursor default ON)", t.cfg.Features.EnableStealth)
		t.loggedInitial = true
	}
	return t.cfg.Features.EnableStealth
}

func (t *ToggleableStealthIntegration) RandomizeDomainsForValidation(ctx context.Context, campaignID uuid.UUID, validationType string) ([]string, error) {
	if t.stealthEnabled() && t.real != nil {
		// force cursor is always on; ensure field set once
		if !t.real.forceCursor {
			t.real.SetForceCursor(true)
			log.Printf("StealthToggle: force cursor permanently enabled (flag deprecated) campaign=%s", campaignID)
		}
		log.Printf("StealthToggle: using REAL integration for %s campaign=%s", validationType, campaignID)
		return t.real.RandomizeDomainsForValidation(ctx, campaignID, validationType)
	}
	if t.noop != nil {
		log.Printf("StealthToggle: using NOOP integration for %s campaign=%s (feature flag disabled)", validationType, campaignID)
		return t.noop.RandomizeDomainsForValidation(ctx, campaignID, validationType)
	}
	return nil, nil
}

func (t *ToggleableStealthIntegration) ProcessValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []string, validationType string) error {
	if t.stealthEnabled() && t.real != nil {
		log.Printf("StealthToggle: delegating ProcessValidationWithStealth to REAL integration for %s campaign=%s domains=%d", validationType, campaignID, len(domains))
		return t.real.ProcessValidationWithStealth(ctx, campaignID, domains, validationType)
	}
	if t.noop != nil {
		log.Printf("StealthToggle: delegating ProcessValidationWithStealth to NOOP integration for %s campaign=%s domains=%d", validationType, campaignID, len(domains))
		return t.noop.ProcessValidationWithStealth(ctx, campaignID, domains, validationType)
	}
	return nil
}
