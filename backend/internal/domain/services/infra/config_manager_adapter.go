package infra

import (
	"context"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// ConfigManager exposes domain generation config state management.
type ConfigManager interface {
	GetDomainGenerationStateByHash(ctx context.Context, exec store.Querier, hash string) (*models.DomainGenerationPhaseConfigState, error)
	UpsertDomainGenerationState(ctx context.Context, exec store.Querier, state *models.DomainGenerationPhaseConfigState) error
	// Generic interface parity with services.ConfigManager
	Get(key string) (interface{}, error)
	Set(key string, value interface{}) error
}

type StoreBackedConfigManager struct{ cs store.CampaignStore }

func NewStoreBackedConfigManager(cs store.CampaignStore) *StoreBackedConfigManager {
	return &StoreBackedConfigManager{cs: cs}
}

// NewConfigManagerAdapter is a convenience to satisfy existing constructors; returns a nil-backed adapter.
func NewConfigManagerAdapter() *StoreBackedConfigManager { return &StoreBackedConfigManager{cs: nil} }

func (m *StoreBackedConfigManager) GetDomainGenerationStateByHash(ctx context.Context, exec store.Querier, hash string) (*models.DomainGenerationPhaseConfigState, error) {
	if m == nil || m.cs == nil {
		return nil, nil
	}
	return m.cs.GetDomainGenerationPhaseConfigStateByHash(ctx, exec, hash)
}

func (m *StoreBackedConfigManager) UpsertDomainGenerationState(ctx context.Context, exec store.Querier, state *models.DomainGenerationPhaseConfigState) error {
	if m == nil || m.cs == nil {
		return nil
	}
	return m.cs.CreateOrUpdateDomainGenerationPhaseConfigState(ctx, exec, state)
}

func (m *StoreBackedConfigManager) Get(key string) (interface{}, error)     { return nil, nil }
func (m *StoreBackedConfigManager) Set(key string, value interface{}) error { return nil }
