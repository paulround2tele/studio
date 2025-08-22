//go:build exclude

package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"studio/backend/internal/domain"
	"time"

	"github.com/google/uuid"
)

// ============================================================================
// CONFIGURATION MODELS - File-based configuration only
// ============================================================================

// KeywordConfig represents keyword configuration loaded from file
// This is ONLY for loading static configuration - NOT for runtime data
type KeywordConfig struct {
	KeywordSets []KeywordSetConfig `json:"keywordSets"`
}

// KeywordSetConfig represents a keyword set from configuration file
type KeywordSetConfig struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description,omitempty"`
	Rules       []KeywordRuleConfig `json:"rules"`
}

// KeywordRuleConfig represents a keyword rule from configuration file
type KeywordRuleConfig struct {
	ID            string `json:"id,omitempty"`
	Pattern       string `json:"pattern"`
	Type          string `json:"type"` // "string" or "regex"
	CaseSensitive bool   `json:"caseSensitive"`
	Category      string `json:"category,omitempty"`
	ContextChars  int    `json:"contextChars,omitempty"`

	// Runtime fields (not serialized)
	CompiledRegex *regexp.Regexp `json:"-"`
}

// ToDomain converts config model to domain model
func (ksc *KeywordSetConfig) ToDomain() *domain.KeywordSet {
	keywordSet := &domain.KeywordSet{
		ID:          uuid.New(), // Generate new ID for domain
		Name:        ksc.Name,
		Description: ksc.Description,
		IsEnabled:   true, // Config sets are enabled by default
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Convert rules
	keywordSet.Rules = make([]domain.KeywordRule, len(ksc.Rules))
	for i, rule := range ksc.Rules {
		keywordSet.Rules[i] = domain.KeywordRule{
			ID:              uuid.New(),
			Pattern:         rule.Pattern,
			Type:            domain.KeywordRuleType(rule.Type),
			IsCaseSensitive: rule.CaseSensitive,
			Category:        rule.Category,
			ContextChars:    rule.ContextChars,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}
	}

	return keywordSet
}

// CompileRegexRules compiles regex patterns for rules marked as "regex"
func (ksc *KeywordSetConfig) CompileRegexRules() error {
	for i := range ksc.Rules {
		rule := &ksc.Rules[i]
		if rule.Type == "regex" {
			compiled, err := regexp.Compile(rule.Pattern)
			if err != nil {
				return fmt.Errorf("invalid regex pattern in rule %s: %w", rule.ID, err)
			}
			rule.CompiledRegex = compiled
		}
	}
	return nil
}

// LoadKeywordConfig loads keyword configuration from file
func LoadKeywordConfig(configDir string) (*KeywordConfig, error) {
	filePath := filepath.Join(configDir, "keywords.config.json")

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// Return empty config if file doesn't exist
			return &KeywordConfig{KeywordSets: []KeywordSetConfig{}}, nil
		}
		return nil, fmt.Errorf("failed to read keyword config file '%s': %w", filePath, err)
	}

	var config KeywordConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("error unmarshalling keyword config from '%s': %w", filePath, err)
	}

	// Compile regex patterns
	for i := range config.KeywordSets {
		if err := config.KeywordSets[i].CompileRegexRules(); err != nil {
			return nil, fmt.Errorf("error compiling regex rules for keyword set '%s': %w",
				config.KeywordSets[i].Name, err)
		}
	}

	return &config, nil
}

// ProxyConfig represents proxy configuration loaded from file
type ProxyConfig struct {
	Proxies []ProxyEntry `json:"proxies"`
}

// ProxyEntry represents a single proxy from configuration file
type ProxyEntry struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Address     string `json:"address"`
	Protocol    string `json:"protocol"`
	Username    string `json:"username,omitempty"`
	Password    string `json:"password,omitempty"`
	CountryCode string `json:"countryCode,omitempty"`
	IsEnabled   bool   `json:"isEnabled"`
}

// ToDomain converts config proxy to domain model
func (pe *ProxyEntry) ToDomain() *domain.Proxy {
	return &domain.Proxy{
		ID:          uuid.New(),
		Name:        pe.Name,
		Description: pe.Description,
		Address:     pe.Address,
		Protocol:    domain.ProxyProtocol(pe.Protocol),
		Username:    pe.Username,
		Password:    pe.Password,
		CountryCode: pe.CountryCode,
		IsEnabled:   pe.IsEnabled,
		Status:      domain.ProxyStatusUnknown,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}

// LoadProxyConfig loads proxy configuration from file
func LoadProxyConfig(configDir string) (*ProxyConfig, error) {
	filePath := filepath.Join(configDir, "proxies.config.json")

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return &ProxyConfig{Proxies: []ProxyEntry{}}, nil
		}
		return nil, fmt.Errorf("failed to read proxy config file '%s': %w", filePath, err)
	}

	var config ProxyConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("error unmarshalling proxy config from '%s': %w", filePath, err)
	}

	return &config, nil
}
