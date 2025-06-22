// File: backend/internal/config/centralized_config_manager.go
package config

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"
)

// CentralizedConfigManager provides unified configuration management for all configuration sources
// It builds upon the existing ConfigManager pattern but extends it to handle all configuration types
type CentralizedConfigManager struct {
	// Configuration cache with atomic access
	configCache atomic.Value // holds *CachedConfig
	cacheMutex  sync.RWMutex

	// Configuration file paths
	configPaths ConfigPaths

	// Configuration validation
	validators map[string]ConfigValidator

	// Hot-reload support
	watchMode    bool
	lastModified map[string]time.Time
	reloadMutex  sync.RWMutex

	// Metrics
	loadCount       int64
	validationCount int64
	reloadCount     int64
	cacheHits       int64
	cacheMisses     int64

	// Environment override support
	enableEnvOverrides bool
}

// CachedConfig holds the complete unified configuration with metadata
type CachedConfig struct {
	Config       *UnifiedAppConfig `json:"config"`
	LoadedAt     time.Time         `json:"loadedAt"`
	Version      int64             `json:"version"`
	Sources      ConfigSources     `json:"sources"`
	Checksum     string            `json:"checksum"`
	LastAccessed time.Time         `json:"lastAccessed"`
}

// UnifiedAppConfig extends AppConfig to include all configuration sources in a unified structure
type UnifiedAppConfig struct {
	// Core application configuration (existing)
	*AppConfig

	// Unified configuration sections
	DNSPersonas     []DNSPersona           `json:"dnsPersonas"`
	HTTPPersonas    []HTTPPersona          `json:"httpPersonas"`
	Proxies         []ProxyConfigEntry     `json:"proxies"`
	KeywordSets     []KeywordSet           `json:"keywordSets"`
	ErrorManagement *ErrorManagementConfig `json:"errorManagement"`

	// Configuration metadata
	ConfigVersion string            `json:"configVersion"`
	LoadedFrom    ConfigSources     `json:"loadedFrom"`
	Environment   map[string]string `json:"environment,omitempty"`
}

// ConfigPaths defines the file paths for all configuration sources
type ConfigPaths struct {
	MainConfig      string `json:"mainConfig"`
	DNSPersonas     string `json:"dnsPersonas"`
	HTTPPersonas    string `json:"httpPersonas"`
	Proxies         string `json:"proxies"`
	Keywords        string `json:"keywords"`
	ErrorManagement string `json:"errorManagement"`
	ConfigDir       string `json:"configDir"`
}

// ConfigSources tracks which sources were used to load configuration
type ConfigSources struct {
	MainConfigFile      bool              `json:"mainConfigFile"`
	DNSPersonasFile     bool              `json:"dnsPersonasFile"`
	HTTPPersonasFile    bool              `json:"httpPersonasFile"`
	ProxiesFile         bool              `json:"proxiesFile"`
	KeywordsFile        bool              `json:"keywordsFile"`
	ErrorManagementFile bool              `json:"errorManagementFile"`
	Environment         bool              `json:"environment"`
	Defaults            bool              `json:"defaults"`
	LoadedFiles         map[string]string `json:"loadedFiles"`
}

// ConfigValidator defines the interface for configuration validation
type ConfigValidator interface {
	Validate(config interface{}) error
	GetSchemaVersion() string
}

// CentralizedConfigManagerConfig holds configuration for the centralized config manager
type CentralizedConfigManagerConfig struct {
	ConfigDir                  string        `json:"configDir"`
	MainConfigPath             string        `json:"mainConfigPath"`
	EnableCaching              bool          `json:"enableCaching"`
	EnableHotReload            bool          `json:"enableHotReload"`
	EnableEnvironmentOverrides bool          `json:"enableEnvironmentOverrides"`
	CacheEvictionTime          time.Duration `json:"cacheEvictionTime"`
	ValidationMode             string        `json:"validationMode"` // "strict", "warn", "disabled"
	ReloadCheckInterval        time.Duration `json:"reloadCheckInterval"`
}

// NewCentralizedConfigManager creates a new centralized configuration manager
func NewCentralizedConfigManager(config CentralizedConfigManagerConfig) (*CentralizedConfigManager, error) {
	if config.ConfigDir == "" {
		config.ConfigDir = "."
	}
	if config.MainConfigPath == "" {
		config.MainConfigPath = filepath.Join(config.ConfigDir, "config.json")
	}
	if config.CacheEvictionTime == 0 {
		config.CacheEvictionTime = 1 * time.Hour
	}
	if config.ReloadCheckInterval == 0 {
		config.ReloadCheckInterval = 30 * time.Second
	}

	cm := &CentralizedConfigManager{
		configPaths: ConfigPaths{
			MainConfig:      config.MainConfigPath,
			DNSPersonas:     filepath.Join(config.ConfigDir, dnsPersonasConfigFilename),
			HTTPPersonas:    filepath.Join(config.ConfigDir, httpPersonasConfigFilename),
			Proxies:         filepath.Join(config.ConfigDir, proxiesConfigFilename),
			Keywords:        filepath.Join(config.ConfigDir, keywordsConfigFilename),
			ErrorManagement: filepath.Join(config.ConfigDir, "error_management.json"),
			ConfigDir:       config.ConfigDir,
		},
		validators:         make(map[string]ConfigValidator),
		watchMode:          config.EnableHotReload,
		lastModified:       make(map[string]time.Time),
		enableEnvOverrides: config.EnableEnvironmentOverrides,
	}

	// Initialize configuration validators
	cm.initializeValidators()

	log.Printf("CentralizedConfigManager: Initialized with config_dir=%s, hot_reload=%v, env_overrides=%v",
		config.ConfigDir, config.EnableHotReload, config.EnableEnvironmentOverrides)

	return cm, nil
}

// LoadConfiguration loads and merges all configuration sources into a unified configuration
func (cm *CentralizedConfigManager) LoadConfiguration(ctx context.Context) (*UnifiedAppConfig, error) {
	atomic.AddInt64(&cm.loadCount, 1)

	// Check cache first
	if cached := cm.getCachedConfig(); cached != nil {
		atomic.AddInt64(&cm.cacheHits, 1)
		cached.LastAccessed = time.Now().UTC()
		return cm.deepCopyUnifiedConfig(cached.Config), nil
	}

	atomic.AddInt64(&cm.cacheMisses, 1)

	log.Printf("CentralizedConfigManager: Loading configuration from multiple sources...")

	// Create unified configuration starting with defaults
	unifiedConfig := &UnifiedAppConfig{
		AppConfig:       DefaultConfig(),
		ConfigVersion:   "1.0.0",
		LoadedFrom:      ConfigSources{Defaults: true, LoadedFiles: make(map[string]string)},
		Environment:     make(map[string]string),
		ErrorManagement: GetDefaultErrorManagementConfig(),
	}

	// Load main configuration file
	if err := cm.loadMainConfig(unifiedConfig); err != nil {
		log.Printf("CentralizedConfigManager: Warning loading main config: %v", err)
	}

	// Load supplemental configuration files
	if err := cm.loadSupplementalConfigs(unifiedConfig); err != nil {
		log.Printf("CentralizedConfigManager: Warning loading supplemental configs: %v", err)
	}

	// Apply environment overrides if enabled
	if cm.enableEnvOverrides {
		cm.applyEnvironmentOverrides(unifiedConfig)
		unifiedConfig.LoadedFrom.Environment = true
	}

	// Validate configuration
	if err := cm.validateConfiguration(unifiedConfig); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	// Cache the configuration
	cm.setCachedConfig(unifiedConfig)

	log.Printf("CentralizedConfigManager: Successfully loaded unified configuration from %d sources",
		cm.countLoadedSources(unifiedConfig.LoadedFrom))

	return cm.deepCopyUnifiedConfig(unifiedConfig), nil
}

// GetConfiguration returns the current configuration, loading it if not cached
func (cm *CentralizedConfigManager) GetConfiguration(ctx context.Context) (*UnifiedAppConfig, error) {
	// Check if hot reload is enabled and configuration needs reloading
	if cm.watchMode {
		if needsReload, err := cm.checkForConfigChanges(); err != nil {
			log.Printf("CentralizedConfigManager: Error checking for config changes: %v", err)
		} else if needsReload {
			log.Printf("CentralizedConfigManager: Configuration changes detected, reloading...")
			atomic.AddInt64(&cm.reloadCount, 1)
			cm.invalidateCache()
		}
	}

	return cm.LoadConfiguration(ctx)
}

// ValidateConfiguration validates the current configuration against all validators
func (cm *CentralizedConfigManager) ValidateConfiguration(ctx context.Context) error {
	config, err := cm.GetConfiguration(ctx)
	if err != nil {
		return fmt.Errorf("failed to get configuration for validation: %w", err)
	}

	return cm.validateConfiguration(config)
}

// InvalidateCache clears the configuration cache, forcing a reload on next access
func (cm *CentralizedConfigManager) InvalidateCache() {
	cm.configCache.Store((*CachedConfig)(nil))
	log.Printf("CentralizedConfigManager: Configuration cache invalidated")
}

// GetMetrics returns configuration manager metrics
func (cm *CentralizedConfigManager) GetMetrics() map[string]int64 {
	return map[string]int64{
		"load_count":       atomic.LoadInt64(&cm.loadCount),
		"validation_count": atomic.LoadInt64(&cm.validationCount),
		"reload_count":     atomic.LoadInt64(&cm.reloadCount),
		"cache_hits":       atomic.LoadInt64(&cm.cacheHits),
		"cache_misses":     atomic.LoadInt64(&cm.cacheMisses),
	}
}

// Internal methods

func (cm *CentralizedConfigManager) loadMainConfig(unifiedConfig *UnifiedAppConfig) error {
	if _, err := os.Stat(cm.configPaths.MainConfig); os.IsNotExist(err) {
		log.Printf("CentralizedConfigManager: Main config file not found: %s", cm.configPaths.MainConfig)
		return nil
	}

	data, err := os.ReadFile(cm.configPaths.MainConfig)
	if err != nil {
		return fmt.Errorf("failed to read main config file: %w", err)
	}

	// Parse as AppConfigJSON first
	var appConfigJSON AppConfigJSON
	if err := json.Unmarshal(data, &appConfigJSON); err != nil {
		return fmt.Errorf("failed to parse main config JSON: %w", err)
	}

	// Convert to AppConfig and replace the default
	unifiedConfig.AppConfig = ConvertJSONToAppConfig(appConfigJSON)
	unifiedConfig.LoadedFrom.MainConfigFile = true
	unifiedConfig.LoadedFrom.LoadedFiles[cm.configPaths.MainConfig] = "main"

	log.Printf("CentralizedConfigManager: Loaded main configuration from %s", cm.configPaths.MainConfig)
	return nil
}

func (cm *CentralizedConfigManager) loadSupplementalConfigs(unifiedConfig *UnifiedAppConfig) error {
	// Load DNS personas
	if dnsPersonas, err := LoadDNSPersonas(cm.configPaths.ConfigDir); err != nil {
		log.Printf("CentralizedConfigManager: Warning loading DNS personas: %v", err)
	} else {
		unifiedConfig.DNSPersonas = dnsPersonas
		unifiedConfig.LoadedFrom.DNSPersonasFile = true
		unifiedConfig.LoadedFrom.LoadedFiles[cm.configPaths.DNSPersonas] = "dns_personas"
	}

	// Load HTTP personas
	if httpPersonas, err := LoadHTTPPersonas(cm.configPaths.ConfigDir); err != nil {
		log.Printf("CentralizedConfigManager: Warning loading HTTP personas: %v", err)
	} else {
		unifiedConfig.HTTPPersonas = httpPersonas
		unifiedConfig.LoadedFrom.HTTPPersonasFile = true
		unifiedConfig.LoadedFrom.LoadedFiles[cm.configPaths.HTTPPersonas] = "http_personas"
	}

	// Load proxies
	if proxies, err := LoadProxies(cm.configPaths.ConfigDir); err != nil {
		log.Printf("CentralizedConfigManager: Warning loading proxies: %v", err)
	} else {
		unifiedConfig.Proxies = proxies
		unifiedConfig.LoadedFrom.ProxiesFile = true
		unifiedConfig.LoadedFrom.LoadedFiles[cm.configPaths.Proxies] = "proxies"
	}

	// Load keyword sets
	if keywordSets, err := LoadKeywordSets(cm.configPaths.ConfigDir); err != nil {
		log.Printf("CentralizedConfigManager: Warning loading keyword sets: %v", err)
	} else {
		unifiedConfig.KeywordSets = keywordSets
		unifiedConfig.LoadedFrom.KeywordsFile = true
		unifiedConfig.LoadedFrom.LoadedFiles[cm.configPaths.Keywords] = "keywords"
	}

	// Load error management configuration
	if err := cm.loadErrorManagementConfig(unifiedConfig); err != nil {
		log.Printf("CentralizedConfigManager: Warning loading error management config: %v", err)
	}

	return nil
}

func (cm *CentralizedConfigManager) loadErrorManagementConfig(unifiedConfig *UnifiedAppConfig) error {
	if _, err := os.Stat(cm.configPaths.ErrorManagement); os.IsNotExist(err) {
		log.Printf("CentralizedConfigManager: Error management config file not found: %s, using defaults", cm.configPaths.ErrorManagement)
		return nil
	}

	data, err := os.ReadFile(cm.configPaths.ErrorManagement)
	if err != nil {
		return fmt.Errorf("failed to read error management config file: %w", err)
	}

	var errorConfig ErrorManagementConfig
	if err := json.Unmarshal(data, &errorConfig); err != nil {
		return fmt.Errorf("failed to parse error management config JSON: %w", err)
	}

	// Validate the loaded configuration
	if err := ValidateErrorManagementConfig(&errorConfig); err != nil {
		return fmt.Errorf("invalid error management configuration: %w", err)
	}

	unifiedConfig.ErrorManagement = &errorConfig
	unifiedConfig.LoadedFrom.ErrorManagementFile = true
	unifiedConfig.LoadedFrom.LoadedFiles[cm.configPaths.ErrorManagement] = "error_management"

	log.Printf("CentralizedConfigManager: Loaded error management configuration from %s", cm.configPaths.ErrorManagement)
	return nil
}

func (cm *CentralizedConfigManager) applyEnvironmentOverrides(unifiedConfig *UnifiedAppConfig) {
	// Apply environment overrides using existing logic
	applyEnvironmentOverrides(unifiedConfig.AppConfig)

	// Store environment variables that were used
	envVars := []string{
		"SERVER_PORT", "GIN_MODE", "WORKER_COUNT", "WORKER_POLL_INTERVAL",
		"LOG_LEVEL", "DNS_RATE_LIMIT_DPS", "DNS_RATE_LIMIT_BURST",
		"HTTP_RATE_LIMIT_DPS", "HTTP_RATE_LIMIT_BURST", "HTTP_TIMEOUT_SECONDS",
	}

	for _, envVar := range envVars {
		if value := os.Getenv(envVar); value != "" {
			unifiedConfig.Environment[envVar] = value
		}
	}

	log.Printf("CentralizedConfigManager: Applied environment overrides for %d variables", len(unifiedConfig.Environment))
}

func (cm *CentralizedConfigManager) validateConfiguration(config *UnifiedAppConfig) error {
	atomic.AddInt64(&cm.validationCount, 1)

	// Validate main application configuration
	if err := cm.validateAppConfig(config.AppConfig); err != nil {
		return fmt.Errorf("main app config validation failed: %w", err)
	}

	// Validate DNS personas
	if err := cm.validateDNSPersonas(config.DNSPersonas); err != nil {
		return fmt.Errorf("DNS personas validation failed: %w", err)
	}

	// Validate HTTP personas
	if err := cm.validateHTTPPersonas(config.HTTPPersonas); err != nil {
		return fmt.Errorf("HTTP personas validation failed: %w", err)
	}

	// Validate proxies
	if err := cm.validateProxies(config.Proxies); err != nil {
		return fmt.Errorf("proxies validation failed: %w", err)
	}

	// Validate keyword sets
	if err := cm.validateKeywordSets(config.KeywordSets); err != nil {
		return fmt.Errorf("keyword sets validation failed: %w", err)
	}

	// Validate error management configuration
	if err := cm.validateErrorManagementConfig(config.ErrorManagement); err != nil {
		return fmt.Errorf("error management validation failed: %w", err)
	}

	log.Printf("CentralizedConfigManager: Configuration validation completed successfully")
	return nil
}

func (cm *CentralizedConfigManager) validateAppConfig(config *AppConfig) error {
	if config == nil {
		return fmt.Errorf("app config is nil")
	}

	// Validate server configuration
	if config.Server.Port == "" {
		return fmt.Errorf("server port is required")
	}

	// Validate worker configuration
	if config.Worker.NumWorkers <= 0 {
		return fmt.Errorf("worker count must be positive")
	}

	// Validate database configuration if present
	if config.Server.DatabaseConfig != nil {
		if config.Server.DatabaseConfig.Host == "" {
			return fmt.Errorf("database host is required")
		}
		if config.Server.DatabaseConfig.Name == "" {
			return fmt.Errorf("database name is required")
		}
	}

	return nil
}

func (cm *CentralizedConfigManager) validateDNSPersonas(personas []DNSPersona) error {
	seenIDs := make(map[string]bool)
	for i, persona := range personas {
		if persona.ID == "" {
			return fmt.Errorf("DNS persona at index %d has empty ID", i)
		}
		if seenIDs[persona.ID] {
			return fmt.Errorf("duplicate DNS persona ID: %s", persona.ID)
		}
		seenIDs[persona.ID] = true

		if persona.Name == "" {
			return fmt.Errorf("DNS persona %s has empty name", persona.ID)
		}
	}
	return nil
}

func (cm *CentralizedConfigManager) validateHTTPPersonas(personas []HTTPPersona) error {
	seenIDs := make(map[string]bool)
	for i, persona := range personas {
		if persona.ID == "" {
			return fmt.Errorf("HTTP persona at index %d has empty ID", i)
		}
		if seenIDs[persona.ID] {
			return fmt.Errorf("duplicate HTTP persona ID: %s", persona.ID)
		}
		seenIDs[persona.ID] = true

		if persona.Name == "" {
			return fmt.Errorf("HTTP persona %s has empty name", persona.ID)
		}
	}
	return nil
}

func (cm *CentralizedConfigManager) validateProxies(proxies []ProxyConfigEntry) error {
	seenIDs := make(map[string]bool)
	for i, proxy := range proxies {
		if proxy.ID == "" {
			return fmt.Errorf("proxy at index %d has empty ID", i)
		}
		if seenIDs[proxy.ID] {
			return fmt.Errorf("duplicate proxy ID: %s", proxy.ID)
		}
		seenIDs[proxy.ID] = true

		if proxy.Address == "" {
			return fmt.Errorf("proxy %s has empty address", proxy.ID)
		}
	}
	return nil
}

func (cm *CentralizedConfigManager) validateKeywordSets(keywordSets []KeywordSet) error {
	seenIDs := make(map[string]bool)
	for i, keywordSet := range keywordSets {
		if keywordSet.ID == "" {
			return fmt.Errorf("keyword set at index %d has empty ID", i)
		}
		if seenIDs[keywordSet.ID] {
			return fmt.Errorf("duplicate keyword set ID: %s", keywordSet.ID)
		}
		seenIDs[keywordSet.ID] = true

		if keywordSet.Name == "" {
			return fmt.Errorf("keyword set %s has empty name", keywordSet.ID)
		}
	}
	return nil
}

func (cm *CentralizedConfigManager) validateErrorManagementConfig(config *ErrorManagementConfig) error {
	if config == nil {
		return fmt.Errorf("error management config is nil")
	}

	return ValidateErrorManagementConfig(config)
}

func (cm *CentralizedConfigManager) checkForConfigChanges() (bool, error) {
	configFiles := []string{
		cm.configPaths.MainConfig,
		cm.configPaths.DNSPersonas,
		cm.configPaths.HTTPPersonas,
		cm.configPaths.Proxies,
		cm.configPaths.Keywords,
		cm.configPaths.ErrorManagement,
	}

	for _, file := range configFiles {
		if info, err := os.Stat(file); err == nil {
			lastMod := cm.lastModified[file]
			if lastMod.IsZero() || info.ModTime().After(lastMod) {
				cm.reloadMutex.Lock()
				cm.lastModified[file] = info.ModTime()
				cm.reloadMutex.Unlock()
				return true, nil
			}
		}
	}

	return false, nil
}

func (cm *CentralizedConfigManager) getCachedConfig() *CachedConfig {
	if cached := cm.configCache.Load(); cached != nil {
		return cached.(*CachedConfig)
	}
	return nil
}

func (cm *CentralizedConfigManager) setCachedConfig(config *UnifiedAppConfig) {
	cached := &CachedConfig{
		Config:       config,
		LoadedAt:     time.Now().UTC(),
		Version:      time.Now().UnixNano(),
		Sources:      config.LoadedFrom,
		LastAccessed: time.Now().UTC(),
	}

	cm.configCache.Store(cached)
}

func (cm *CentralizedConfigManager) invalidateCache() {
	cm.configCache.Store((*CachedConfig)(nil))
}

func (cm *CentralizedConfigManager) deepCopyUnifiedConfig(config *UnifiedAppConfig) *UnifiedAppConfig {
	if config == nil {
		return nil
	}

	// Create a deep copy by marshaling and unmarshaling
	data, err := json.Marshal(config)
	if err != nil {
		log.Printf("CentralizedConfigManager: Error creating deep copy: %v", err)
		return config // Return original if copy fails
	}

	var copy UnifiedAppConfig
	if err := json.Unmarshal(data, &copy); err != nil {
		log.Printf("CentralizedConfigManager: Error creating deep copy: %v", err)
		return config // Return original if copy fails
	}

	return &copy
}

func (cm *CentralizedConfigManager) countLoadedSources(sources ConfigSources) int {
	count := 0
	if sources.MainConfigFile {
		count++
	}
	if sources.DNSPersonasFile {
		count++
	}
	if sources.HTTPPersonasFile {
		count++
	}
	if sources.ProxiesFile {
		count++
	}
	if sources.KeywordsFile {
		count++
	}
	if sources.ErrorManagementFile {
		count++
	}
	if sources.Environment {
		count++
	}
	if sources.Defaults {
		count++
	}
	return count
}

func (cm *CentralizedConfigManager) initializeValidators() {
	// Initialize configuration validators
	// This can be extended to add specific validators for each configuration section
	log.Printf("CentralizedConfigManager: Configuration validators initialized")
}
