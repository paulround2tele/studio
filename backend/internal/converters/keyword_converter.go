package converters

import (
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// KeywordRuleConverter provides methods to convert between config and model types
type KeywordRuleConverter struct{}

// NewKeywordRuleConverter creates a new converter instance
func NewKeywordRuleConverter() *KeywordRuleConverter {
	return &KeywordRuleConverter{}
}

// ConfigToModel converts a config.KeywordRule to models.KeywordRule
func (c *KeywordRuleConverter) ConfigToModel(configRule config.KeywordRule, keywordSetID uuid.UUID) (*models.KeywordRule, error) {
	// Generate new UUID if not provided
	var ruleID uuid.UUID
	if configRule.ID != "" {
		parsedID, err := uuid.Parse(configRule.ID)
		if err != nil {
			// If ID is not a valid UUID, generate a new one
			ruleID = uuid.New()
		} else {
			ruleID = parsedID
		}
	} else {
		ruleID = uuid.New()
	}

	// Convert rule type from string to enum
	var ruleType models.KeywordRuleTypeEnum
	switch strings.ToLower(configRule.Type) {
	case "string":
		ruleType = models.KeywordRuleTypeString
	case "regex":
		ruleType = models.KeywordRuleTypeRegex
	default:
		return nil, fmt.Errorf("invalid rule type '%s', must be 'string' or 'regex'", configRule.Type)
	}

	// Convert category to sql.NullString
	var category sql.NullString
	if configRule.Category != "" {
		category = sql.NullString{String: configRule.Category, Valid: true}
	}

	now := time.Now()

	return &models.KeywordRule{
		ID:              ruleID,
		KeywordSetID:    keywordSetID,
		Pattern:         configRule.Pattern,
		RuleType:        ruleType,
		IsCaseSensitive: configRule.CaseSensitive,
		Category:        category,
		ContextChars:    configRule.ContextChars,
		CreatedAt:       now,
		UpdatedAt:       now,
	}, nil
}

// ModelToConfig converts a models.KeywordRule to config.KeywordRule
func (c *KeywordRuleConverter) ModelToConfig(modelRule models.KeywordRule) (*config.KeywordRule, error) {
	// Convert enum to string
	var ruleType string
	switch modelRule.RuleType {
	case models.KeywordRuleTypeString:
		ruleType = "string"
	case models.KeywordRuleTypeRegex:
		ruleType = "regex"
	default:
		return nil, fmt.Errorf("unknown rule type enum value: %v", modelRule.RuleType)
	}

	// Convert category from sql.NullString
	var category string
	if modelRule.Category.Valid {
		category = modelRule.Category.String
	}

	configRule := &config.KeywordRule{
		ID:            modelRule.ID.String(),
		Pattern:       modelRule.Pattern,
		Type:          ruleType,
		CaseSensitive: modelRule.IsCaseSensitive,
		Category:      category,
		ContextChars:  modelRule.ContextChars,
		// CompiledRegex will be set separately if needed
	}

	// Pre-compile regex if it's a regex rule
	if modelRule.RuleType == models.KeywordRuleTypeRegex && modelRule.Pattern != "" {
		patternToCompile := modelRule.Pattern
		if !modelRule.IsCaseSensitive {
			patternToCompile = "(?i)" + modelRule.Pattern
		}

		compiled, err := regexp.Compile(patternToCompile)
		if err != nil {
			return nil, fmt.Errorf("failed to compile regex pattern '%s': %w", modelRule.Pattern, err)
		}
		configRule.CompiledRegex = compiled
	}

	return configRule, nil
}

// ConfigSetToModel converts a config.KeywordSet to models.KeywordSet
func (c *KeywordRuleConverter) ConfigSetToModel(configSet config.KeywordSet) (*models.KeywordSet, error) {
	// Generate new UUID if not provided
	var setID uuid.UUID
	if configSet.ID != "" {
		parsedID, err := uuid.Parse(configSet.ID)
		if err != nil {
			// If ID is not a valid UUID, generate a new one
			setID = uuid.New()
		} else {
			setID = parsedID
		}
	} else {
		setID = uuid.New()
	}

	// Convert description to sql.NullString
	var description sql.NullString
	if configSet.Description != "" {
		description = sql.NullString{String: configSet.Description, Valid: true}
	}

	now := time.Now()

	modelSet := &models.KeywordSet{
		ID:          setID,
		Name:        configSet.Name,
		Description: description,
		IsEnabled:   true, // Default to enabled for config-loaded sets
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Convert rules
	if len(configSet.Rules) > 0 {
		var rules []models.KeywordRule
		for _, configRule := range configSet.Rules {
			modelRule, err := c.ConfigToModel(configRule, setID)
			if err != nil {
				return nil, fmt.Errorf("failed to convert rule '%s': %w", configRule.ID, err)
			}
			rules = append(rules, *modelRule)
		}
		modelSet.Rules = &rules
	}

	return modelSet, nil
}

// ModelSetToConfig converts a models.KeywordSet to config.KeywordSet
func (c *KeywordRuleConverter) ModelSetToConfig(modelSet models.KeywordSet) (*config.KeywordSet, error) {
	// Convert description from sql.NullString
	var description string
	if modelSet.Description.Valid {
		description = modelSet.Description.String
	}

	configSet := &config.KeywordSet{
		ID:          modelSet.ID.String(),
		Name:        modelSet.Name,
		Description: description,
	}

	// Convert rules
	if modelSet.Rules != nil && len(*modelSet.Rules) > 0 {
		var rules []config.KeywordRule
		for _, modelRule := range *modelSet.Rules {
			configRule, err := c.ModelToConfig(modelRule)
			if err != nil {
				return nil, fmt.Errorf("failed to convert rule '%s': %w", modelRule.ID, err)
			}
			rules = append(rules, *configRule)
		}
		configSet.Rules = rules
	}

	return configSet, nil
}

// BatchConfigToModel converts multiple config rules to model rules
func (c *KeywordRuleConverter) BatchConfigToModel(configRules []config.KeywordRule, keywordSetID uuid.UUID) ([]models.KeywordRule, error) {
	modelRules := make([]models.KeywordRule, 0, len(configRules))
	for i, configRule := range configRules {
		modelRule, err := c.ConfigToModel(configRule, keywordSetID)
		if err != nil {
			return nil, fmt.Errorf("failed to convert rule at index %d: %w", i, err)
		}
		modelRules = append(modelRules, *modelRule)
	}
	return modelRules, nil
}

// BatchModelToConfig converts multiple model rules to config rules
func (c *KeywordRuleConverter) BatchModelToConfig(modelRules []models.KeywordRule) ([]config.KeywordRule, error) {
	configRules := make([]config.KeywordRule, 0, len(modelRules))
	for i, modelRule := range modelRules {
		configRule, err := c.ModelToConfig(modelRule)
		if err != nil {
			return nil, fmt.Errorf("failed to convert rule at index %d: %w", i, err)
		}
		configRules = append(configRules, *configRule)
	}
	return configRules, nil
}

// KeywordRuleFactory creates keyword rules with proper validation
type KeywordRuleFactory struct {
	converter *KeywordRuleConverter
}

// NewKeywordRuleFactory creates a new factory instance
func NewKeywordRuleFactory() *KeywordRuleFactory {
	return &KeywordRuleFactory{
		converter: NewKeywordRuleConverter(),
	}
}

// CreateModelRuleFromConfig creates a model rule from config with validation
func (f *KeywordRuleFactory) CreateModelRuleFromConfig(configRule config.KeywordRule, keywordSetID uuid.UUID) (*models.KeywordRule, error) {
	return f.converter.ConfigToModel(configRule, keywordSetID)
}

// CreateConfigRuleFromModel creates a config rule from model with validation
func (f *KeywordRuleFactory) CreateConfigRuleFromModel(modelRule models.KeywordRule) (*config.KeywordRule, error) {
	return f.converter.ModelToConfig(modelRule)
}

// CreateModelSetFromConfig creates a model set from config with validation
func (f *KeywordRuleFactory) CreateModelSetFromConfig(configSet config.KeywordSet) (*models.KeywordSet, error) {
	return f.converter.ConfigSetToModel(configSet)
}

// CreateConfigSetFromModel creates a config set from model with validation
func (f *KeywordRuleFactory) CreateConfigSetFromModel(modelSet models.KeywordSet) (*config.KeywordSet, error) {
	return f.converter.ModelSetToConfig(modelSet)
}
