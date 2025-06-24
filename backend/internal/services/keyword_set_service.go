package services

import (
	"context"
	"fmt"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/converters"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// KeywordSetService provides unified access to keyword sets from both config and database
type KeywordSetService struct {
	db           *sqlx.DB
	keywordStore store.KeywordStore
	appConfig    *config.AppConfig
	converter    *converters.KeywordRuleConverter
}

// NewKeywordSetService creates a new keyword set service
func NewKeywordSetService(db *sqlx.DB, keywordStore store.KeywordStore, appConfig *config.AppConfig) *KeywordSetService {
	return &KeywordSetService{
		db:           db,
		keywordStore: keywordStore,
		appConfig:    appConfig,
		converter:    converters.NewKeywordRuleConverter(),
	}
}

// GetKeywordSetByID retrieves a keyword set by ID, checking both database and config
func (s *KeywordSetService) GetKeywordSetByID(ctx context.Context, id uuid.UUID) (*models.KeywordSet, error) {
	// First try to get from database (user-created sets)
	keywordSet, err := s.keywordStore.GetKeywordSetByID(ctx, s.db, id)
	if err == nil {
		return keywordSet, nil
	}

	// If not found in database, try to find in config and convert
	configSet, configErr := s.getConfigKeywordSetByID(id.String())
	if configErr != nil {
		// Return the original database error if config lookup also fails
		return nil, fmt.Errorf("keyword set %s not found in database or config: %w", id, err)
	}

	// Convert config set to model set
	modelSet, convertErr := s.converter.ConfigSetToModel(*configSet)
	if convertErr != nil {
		return nil, fmt.Errorf("failed to convert config keyword set %s: %w", id, convertErr)
	}

	return modelSet, nil
}

// GetKeywordSetByName retrieves a keyword set by name, checking both database and config
func (s *KeywordSetService) GetKeywordSetByName(ctx context.Context, name string) (*models.KeywordSet, error) {
	// First try to get from database
	keywordSet, err := s.keywordStore.GetKeywordSetByName(ctx, s.db, name)
	if err == nil {
		return keywordSet, nil
	}

	// If not found in database, try to find in config by name
	for _, configSet := range s.appConfig.KeywordSets {
		if configSet.Name == name {
			modelSet, convertErr := s.converter.ConfigSetToModel(configSet)
			if convertErr != nil {
				return nil, fmt.Errorf("failed to convert config keyword set %s: %w", name, convertErr)
			}
			return modelSet, nil
		}
	}

	return nil, fmt.Errorf("keyword set with name '%s' not found in database or config", name)
}

// ListKeywordSets returns keyword sets from both database and config
func (s *KeywordSetService) ListKeywordSets(ctx context.Context, filter store.ListKeywordSetsFilter) ([]*models.KeywordSet, error) {
	var allSets []*models.KeywordSet

	// Get database sets
	dbSets, err := s.keywordStore.ListKeywordSets(ctx, s.db, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list database keyword sets: %w", err)
	}
	allSets = append(allSets, dbSets...)

	// Get config sets and convert them
	for _, configSet := range s.appConfig.KeywordSets {
		// Apply filter if specified (basic enabled check)
		if filter.IsEnabled != nil && !*filter.IsEnabled {
			// Config sets are always considered enabled
			continue
		}

		modelSet, convertErr := s.converter.ConfigSetToModel(configSet)
		if convertErr != nil {
			// Log the error but continue with other sets
			fmt.Printf("Warning: failed to convert config keyword set %s: %v\n", configSet.Name, convertErr)
			continue
		}

		// Mark as config-sourced by setting a special flag or metadata
		// This helps distinguish between database and config sets
		modelSet.Description.String += " [Config-sourced]"
		modelSet.Description.Valid = true

		allSets = append(allSets, modelSet)
	}

	return allSets, nil
}

// CreateKeywordSet creates a new keyword set in the database
func (s *KeywordSetService) CreateKeywordSet(ctx context.Context, keywordSet *models.KeywordSet) error {
	return s.keywordStore.CreateKeywordSet(ctx, s.db, keywordSet)
}

// UpdateKeywordSet updates an existing keyword set in the database
func (s *KeywordSetService) UpdateKeywordSet(ctx context.Context, keywordSet *models.KeywordSet) error {
	return s.keywordStore.UpdateKeywordSet(ctx, s.db, keywordSet)
}

// DeleteKeywordSet deletes a keyword set from the database
func (s *KeywordSetService) DeleteKeywordSet(ctx context.Context, id uuid.UUID) error {
	return s.keywordStore.DeleteKeywordSet(ctx, s.db, id)
}

// SyncConfigToDatabase synchronizes config-based keyword sets to database
// This is useful for making config sets persistent and searchable
func (s *KeywordSetService) SyncConfigToDatabase(ctx context.Context) error {
	for _, configSet := range s.appConfig.KeywordSets {
		// Check if this config set already exists in database
		existingSet, err := s.keywordStore.GetKeywordSetByName(ctx, s.db, configSet.Name)
		if err == nil && existingSet != nil {
			// Already exists, skip
			continue
		}

		// Convert and create in database
		modelSet, convertErr := s.converter.ConfigSetToModel(configSet)
		if convertErr != nil {
			return fmt.Errorf("failed to convert config set %s for sync: %w", configSet.Name, convertErr)
		}

		// Mark as config-originated
		if !modelSet.Description.Valid {
			modelSet.Description.String = "Synced from configuration"
			modelSet.Description.Valid = true
		} else {
			modelSet.Description.String += " (Synced from configuration)"
		}

		if err := s.keywordStore.CreateKeywordSet(ctx, s.db, modelSet); err != nil {
			return fmt.Errorf("failed to sync config set %s to database: %w", configSet.Name, err)
		}
	}

	return nil
}

// getConfigKeywordSetByID is a helper to find config keyword set by ID
func (s *KeywordSetService) getConfigKeywordSetByID(id string) (*config.KeywordSet, error) {
	return s.appConfig.GetKeywordSetByID(id)
}

// GetKeywordRulesBySetID retrieves keyword rules for a given set ID
func (s *KeywordSetService) GetKeywordRulesBySetID(ctx context.Context, setID uuid.UUID) ([]models.KeywordRule, error) {
	// First try database
	rules, err := s.keywordStore.GetKeywordRulesBySetID(ctx, s.db, setID)
	if err == nil {
		return rules, nil
	}

	// Try config
	configSet, configErr := s.getConfigKeywordSetByID(setID.String())
	if configErr != nil {
		return nil, fmt.Errorf("keyword set %s not found: %w", setID, err)
	}

	// Convert config rules to model rules
	modelRules, convertErr := s.converter.BatchConfigToModel(configSet.Rules, setID)
	if convertErr != nil {
		return nil, fmt.Errorf("failed to convert config rules for set %s: %w", setID, convertErr)
	}

	return modelRules, nil
}
