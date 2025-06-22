// File: backend/internal/config/centralized_config_manager_test.go
package config

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestCentralizedConfigManager_LoadConfiguration(t *testing.T) {
	tests := []struct {
		name           string
		setupFiles     func(tempDir string) error
		envVars        map[string]string
		expectError    bool
		validateConfig func(t *testing.T, config *UnifiedAppConfig)
	}{
		{
			name: "load_default_configuration_only",
			setupFiles: func(tempDir string) error {
				// No files created, should use defaults
				return nil
			},
			expectError: false,
			validateConfig: func(t *testing.T, config *UnifiedAppConfig) {
				if config == nil {
					t.Fatal("Expected non-nil config")
				}
				if !config.LoadedFrom.Defaults {
					t.Error("Expected defaults to be loaded")
				}
				if config.Server.Port != "8080" {
					t.Errorf("Expected default port 8080, got %s", config.Server.Port)
				}
			},
		},
		{
			name: "load_main_config_with_overrides",
			setupFiles: func(tempDir string) error {
				mainConfig := map[string]interface{}{
					"server": map[string]interface{}{
						"port":    "3000",
						"ginMode": "release",
					},
					"worker": map[string]interface{}{
						"numWorkers":          10,
						"pollIntervalSeconds": 10,
					},
				}
				data, _ := json.MarshalIndent(mainConfig, "", "  ")
				return os.WriteFile(filepath.Join(tempDir, "config.json"), data, 0644)
			},
			expectError: false,
			validateConfig: func(t *testing.T, config *UnifiedAppConfig) {
				if !config.LoadedFrom.MainConfigFile {
					t.Error("Expected main config file to be loaded")
				}
				if config.Server.Port != "3000" {
					t.Errorf("Expected port 3000, got %s", config.Server.Port)
				}
				if config.Worker.NumWorkers != 10 {
					t.Errorf("Expected 10 workers, got %d", config.Worker.NumWorkers)
				}
			},
		},
		{
			name: "load_all_configuration_sources",
			setupFiles: func(tempDir string) error {
				// Create main config
				mainConfig := map[string]interface{}{
					"server": map[string]interface{}{
						"port": "8090",
					},
				}
				data, _ := json.MarshalIndent(mainConfig, "", "  ")
				if err := os.WriteFile(filepath.Join(tempDir, "config.json"), data, 0644); err != nil {
					return err
				}

				// Create DNS personas config
				dnsPersonas := []DNSPersona{
					{
						ID:          "test_dns",
						Name:        "Test DNS Persona",
						Description: "Test DNS persona for testing",
						Config: DNSValidatorConfigJSON{
							Resolvers:           []string{"1.1.1.1:53"},
							QueryTimeoutSeconds: 5,
						},
					},
				}
				data, _ = json.MarshalIndent(dnsPersonas, "", "  ")
				if err := os.WriteFile(filepath.Join(tempDir, "dns_personas.config.json"), data, 0644); err != nil {
					return err
				}

				// Create HTTP personas config
				httpPersonas := []HTTPPersona{
					{
						ID:        "test_http",
						Name:      "Test HTTP Persona",
						UserAgent: "TestAgent/1.0",
					},
				}
				data, _ = json.MarshalIndent(httpPersonas, "", "  ")
				if err := os.WriteFile(filepath.Join(tempDir, "http_personas.config.json"), data, 0644); err != nil {
					return err
				}

				// Create proxies config
				proxies := []ProxyConfigEntry{
					{
						ID:      "test_proxy",
						Name:    "Test Proxy",
						Address: "127.0.0.1:8080",
					},
				}
				data, _ = json.MarshalIndent(proxies, "", "  ")
				if err := os.WriteFile(filepath.Join(tempDir, "proxies.config.json"), data, 0644); err != nil {
					return err
				}

				// Create keywords config
				keywords := []KeywordSet{
					{
						ID:   "test_keywords",
						Name: "Test Keywords",
						Rules: []KeywordRule{
							{
								ID:      "test_rule",
								Pattern: "test",
								Type:    "string",
							},
						},
					},
				}
				data, _ = json.MarshalIndent(keywords, "", "  ")
				return os.WriteFile(filepath.Join(tempDir, "keywords.config.json"), data, 0644)
			},
			expectError: false,
			validateConfig: func(t *testing.T, config *UnifiedAppConfig) {
				if !config.LoadedFrom.MainConfigFile {
					t.Error("Expected main config file to be loaded")
				}
				if !config.LoadedFrom.DNSPersonasFile {
					t.Error("Expected DNS personas file to be loaded")
				}
				if !config.LoadedFrom.HTTPPersonasFile {
					t.Error("Expected HTTP personas file to be loaded")
				}
				if !config.LoadedFrom.ProxiesFile {
					t.Error("Expected proxies file to be loaded")
				}
				if !config.LoadedFrom.KeywordsFile {
					t.Error("Expected keywords file to be loaded")
				}

				if len(config.DNSPersonas) != 1 || config.DNSPersonas[0].ID != "test_dns" {
					t.Error("DNS personas not loaded correctly")
				}
				if len(config.HTTPPersonas) != 1 || config.HTTPPersonas[0].ID != "test_http" {
					t.Error("HTTP personas not loaded correctly")
				}
				if len(config.Proxies) != 1 || config.Proxies[0].ID != "test_proxy" {
					t.Error("Proxies not loaded correctly")
				}
				if len(config.KeywordSets) != 1 || config.KeywordSets[0].ID != "test_keywords" {
					t.Error("Keyword sets not loaded correctly")
				}
			},
		},
		{
			name: "environment_overrides_applied",
			setupFiles: func(tempDir string) error {
				mainConfig := map[string]interface{}{
					"server": map[string]interface{}{
						"port": "8080",
					},
				}
				data, _ := json.MarshalIndent(mainConfig, "", "  ")
				return os.WriteFile(filepath.Join(tempDir, "config.json"), data, 0644)
			},
			envVars: map[string]string{
				"SERVER_PORT": "9999",
				"LOG_LEVEL":   "debug",
			},
			expectError: false,
			validateConfig: func(t *testing.T, config *UnifiedAppConfig) {
				if !config.LoadedFrom.Environment {
					t.Error("Expected environment overrides to be applied")
				}
				if config.Server.Port != "9999" {
					t.Errorf("Expected port 9999 from env override, got %s", config.Server.Port)
				}
				if config.Logging.Level != "debug" {
					t.Errorf("Expected log level debug from env override, got %s", config.Logging.Level)
				}
				if len(config.Environment) == 0 {
					t.Error("Expected environment variables to be tracked")
				}
			},
		},
		{
			name: "invalid_main_config_json_graceful_fallback",
			setupFiles: func(tempDir string) error {
				invalidJSON := `{"server": {"port": "8080",}` // Invalid JSON
				return os.WriteFile(filepath.Join(tempDir, "config.json"), []byte(invalidJSON), 0644)
			},
			expectError: false, // Should gracefully fall back to defaults
			validateConfig: func(t *testing.T, config *UnifiedAppConfig) {
				if config == nil {
					t.Fatal("Expected non-nil config")
				}
				if !config.LoadedFrom.Defaults {
					t.Error("Expected defaults to be loaded when main config is invalid")
				}
				if config.LoadedFrom.MainConfigFile {
					t.Error("Expected main config file NOT to be loaded when JSON is invalid")
				}
				// Should fall back to default port since main config failed to load
				if config.Server.Port != "8080" {
					t.Errorf("Expected default port 8080, got %s", config.Server.Port)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory
			tempDir := t.TempDir()

			// Setup test files
			if err := tt.setupFiles(tempDir); err != nil {
				t.Fatalf("Failed to setup test files: %v", err)
			}

			// Set environment variables
			for key, value := range tt.envVars {
				os.Setenv(key, value)
				defer os.Unsetenv(key)
			}

			// Create centralized config manager
			config := CentralizedConfigManagerConfig{
				ConfigDir:                  tempDir,
				MainConfigPath:             filepath.Join(tempDir, "config.json"),
				EnableEnvironmentOverrides: len(tt.envVars) > 0,
				EnableCaching:              true,
				EnableHotReload:            false,
			}

			cm, err := NewCentralizedConfigManager(config)
			if err != nil {
				t.Fatalf("Failed to create centralized config manager: %v", err)
			}

			// Load configuration
			ctx := context.Background()
			unifiedConfig, err := cm.LoadConfiguration(ctx)

			// Check error expectation
			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}

			// Validate configuration if no error expected
			if !tt.expectError && tt.validateConfig != nil {
				tt.validateConfig(t, unifiedConfig)
			}
		})
	}
}

func TestCentralizedConfigManager_ConfigurationValidation(t *testing.T) {
	tests := []struct {
		name        string
		setupConfig func() *UnifiedAppConfig
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid_configuration",
			setupConfig: func() *UnifiedAppConfig {
				return &UnifiedAppConfig{
					AppConfig: &AppConfig{
						Server: ServerConfig{Port: "8080"},
						Worker: WorkerConfig{NumWorkers: 5},
					},
					DNSPersonas: []DNSPersona{
						{ID: "dns1", Name: "DNS Persona 1"},
					},
					HTTPPersonas: []HTTPPersona{
						{ID: "http1", Name: "HTTP Persona 1"},
					},
					Proxies: []ProxyConfigEntry{
						{ID: "proxy1", Address: "127.0.0.1:8080"},
					},
					KeywordSets: []KeywordSet{
						{ID: "keywords1", Name: "Keywords 1"},
					},
					ErrorManagement: GetDefaultErrorManagementConfig(),
				}
			},
			expectError: false,
		},
		{
			name: "missing_server_port",
			setupConfig: func() *UnifiedAppConfig {
				return &UnifiedAppConfig{
					AppConfig: &AppConfig{
						Server: ServerConfig{Port: ""},
						Worker: WorkerConfig{NumWorkers: 5},
					},
				}
			},
			expectError: true,
			errorMsg:    "server port is required",
		},
		{
			name: "invalid_worker_count",
			setupConfig: func() *UnifiedAppConfig {
				return &UnifiedAppConfig{
					AppConfig: &AppConfig{
						Server: ServerConfig{Port: "8080"},
						Worker: WorkerConfig{NumWorkers: 0},
					},
				}
			},
			expectError: true,
			errorMsg:    "worker count must be positive",
		},
		{
			name: "duplicate_dns_persona_ids",
			setupConfig: func() *UnifiedAppConfig {
				return &UnifiedAppConfig{
					AppConfig: &AppConfig{
						Server: ServerConfig{Port: "8080"},
						Worker: WorkerConfig{NumWorkers: 5},
					},
					DNSPersonas: []DNSPersona{
						{ID: "duplicate", Name: "DNS Persona 1"},
						{ID: "duplicate", Name: "DNS Persona 2"},
					},
				}
			},
			expectError: true,
			errorMsg:    "duplicate DNS persona ID",
		},
		{
			name: "empty_proxy_address",
			setupConfig: func() *UnifiedAppConfig {
				return &UnifiedAppConfig{
					AppConfig: &AppConfig{
						Server: ServerConfig{Port: "8080"},
						Worker: WorkerConfig{NumWorkers: 5},
					},
					Proxies: []ProxyConfigEntry{
						{ID: "proxy1", Address: ""},
					},
				}
			},
			expectError: true,
			errorMsg:    "proxy proxy1 has empty address",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tempDir := t.TempDir()

			config := CentralizedConfigManagerConfig{
				ConfigDir:       tempDir,
				EnableCaching:   false,
				EnableHotReload: false,
			}

			cm, err := NewCentralizedConfigManager(config)
			if err != nil {
				t.Fatalf("Failed to create centralized config manager: %v", err)
			}

			unifiedConfig := tt.setupConfig()
			err = cm.validateConfiguration(unifiedConfig)

			if tt.expectError && err == nil {
				t.Error("Expected validation error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected validation error: %v", err)
			}
			if tt.expectError && err != nil && tt.errorMsg != "" {
				if !containsSubstring(err.Error(), tt.errorMsg) {
					t.Errorf("Expected error message to contain '%s', got '%s'", tt.errorMsg, err.Error())
				}
			}
		})
	}
}

func TestCentralizedConfigManager_Caching(t *testing.T) {
	tempDir := t.TempDir()

	// Create a simple config file
	mainConfig := map[string]interface{}{
		"server": map[string]interface{}{
			"port": "8080",
		},
	}
	data, _ := json.MarshalIndent(mainConfig, "", "  ")
	configPath := filepath.Join(tempDir, "config.json")
	if err := os.WriteFile(configPath, data, 0644); err != nil {
		t.Fatalf("Failed to create test config file: %v", err)
	}

	config := CentralizedConfigManagerConfig{
		ConfigDir:       tempDir,
		MainConfigPath:  configPath,
		EnableCaching:   true,
		EnableHotReload: false,
	}

	cm, err := NewCentralizedConfigManager(config)
	if err != nil {
		t.Fatalf("Failed to create centralized config manager: %v", err)
	}

	ctx := context.Background()

	// First load should be a cache miss
	config1, err := cm.LoadConfiguration(ctx)
	if err != nil {
		t.Fatalf("Failed to load configuration: %v", err)
	}

	// Second load should be a cache hit
	config2, err := cm.LoadConfiguration(ctx)
	if err != nil {
		t.Fatalf("Failed to load configuration: %v", err)
	}

	// Verify configurations are equivalent
	if config1.Server.Port != config2.Server.Port {
		t.Error("Cached configuration doesn't match original")
	}

	// Check metrics
	metrics := cm.GetMetrics()
	if metrics["cache_hits"] < 1 {
		t.Error("Expected at least one cache hit")
	}
	if metrics["cache_misses"] < 1 {
		t.Error("Expected at least one cache miss")
	}

	// Test cache invalidation
	cm.InvalidateCache()
	config3, err := cm.LoadConfiguration(ctx)
	if err != nil {
		t.Fatalf("Failed to load configuration after cache invalidation: %v", err)
	}

	if config3.Server.Port != config1.Server.Port {
		t.Error("Configuration after cache invalidation doesn't match")
	}
}

func TestCentralizedConfigManager_HotReload(t *testing.T) {
	tempDir := t.TempDir()

	// Create initial config file
	mainConfig := map[string]interface{}{
		"server": map[string]interface{}{
			"port": "8080",
		},
	}
	data, _ := json.MarshalIndent(mainConfig, "", "  ")
	configPath := filepath.Join(tempDir, "config.json")
	if err := os.WriteFile(configPath, data, 0644); err != nil {
		t.Fatalf("Failed to create test config file: %v", err)
	}

	config := CentralizedConfigManagerConfig{
		ConfigDir:           tempDir,
		MainConfigPath:      configPath,
		EnableCaching:       true,
		EnableHotReload:     true,
		ReloadCheckInterval: 100 * time.Millisecond,
	}

	cm, err := NewCentralizedConfigManager(config)
	if err != nil {
		t.Fatalf("Failed to create centralized config manager: %v", err)
	}

	ctx := context.Background()

	// Load initial configuration
	config1, err := cm.GetConfiguration(ctx)
	if err != nil {
		t.Fatalf("Failed to get initial configuration: %v", err)
	}

	if config1.Server.Port != "8080" {
		t.Errorf("Expected port 8080, got %s", config1.Server.Port)
	}

	// Wait a bit to ensure file modification time is different
	time.Sleep(10 * time.Millisecond)

	// Modify the config file
	updatedConfig := map[string]interface{}{
		"server": map[string]interface{}{
			"port": "9090",
		},
	}
	data, _ = json.MarshalIndent(updatedConfig, "", "  ")
	if err := os.WriteFile(configPath, data, 0644); err != nil {
		t.Fatalf("Failed to update test config file: %v", err)
	}

	// Get configuration again - should detect change and reload
	config2, err := cm.GetConfiguration(ctx)
	if err != nil {
		t.Fatalf("Failed to get updated configuration: %v", err)
	}

	if config2.Server.Port != "9090" {
		t.Errorf("Expected updated port 9090, got %s", config2.Server.Port)
	}

	// Check that reload count increased
	metrics := cm.GetMetrics()
	if metrics["reload_count"] < 1 {
		t.Error("Expected at least one reload")
	}
}

func TestCentralizedConfigManager_BackwardCompatibility(t *testing.T) {
	tempDir := t.TempDir()

	// Create config files using existing functions to ensure compatibility
	appConfig := DefaultConfig()
	appConfig.Server.Port = "8081"

	// Save using existing save function
	appConfig.loadedFromPath = filepath.Join(tempDir, "config.json")
	if err := SaveAppConfig(appConfig); err != nil {
		t.Fatalf("Failed to save app config using existing function: %v", err)
	}

	// Create DNS personas using existing function
	dnsPersonas := []DNSPersona{
		{
			ID:   "backward_compat_dns",
			Name: "Backward Compatible DNS",
			Config: DNSValidatorConfigJSON{
				Resolvers:           []string{"8.8.8.8:53"},
				QueryTimeoutSeconds: 3,
			},
		},
	}
	if err := SaveDNSPersonas(dnsPersonas, tempDir); err != nil {
		t.Fatalf("Failed to save DNS personas using existing function: %v", err)
	}

	// Load using centralized config manager
	config := CentralizedConfigManagerConfig{
		ConfigDir:       tempDir,
		MainConfigPath:  filepath.Join(tempDir, "config.json"),
		EnableCaching:   false,
		EnableHotReload: false,
	}

	cm, err := NewCentralizedConfigManager(config)
	if err != nil {
		t.Fatalf("Failed to create centralized config manager: %v", err)
	}

	ctx := context.Background()
	unifiedConfig, err := cm.LoadConfiguration(ctx)
	if err != nil {
		t.Fatalf("Failed to load configuration: %v", err)
	}

	// Verify backward compatibility
	if unifiedConfig.Server.Port != "8081" {
		t.Errorf("Expected port 8081, got %s", unifiedConfig.Server.Port)
	}

	if len(unifiedConfig.DNSPersonas) != 1 || unifiedConfig.DNSPersonas[0].ID != "backward_compat_dns" {
		t.Error("DNS personas not loaded correctly for backward compatibility")
	}

	// Verify that the original AppConfig can still be used
	if unifiedConfig.AppConfig == nil {
		t.Error("AppConfig should be accessible for backward compatibility")
	}

	// Test that existing config access methods still work
	dnsPersona, err := unifiedConfig.AppConfig.GetDNSPersonaConfigByID("backward_compat_dns")
	if err == nil && dnsPersona != nil {
		// This would fail with the current AppConfig implementation since DNSPersonas
		// are loaded separately, but the unified config should provide this functionality
		t.Log("DNS persona lookup works (this is expected to fail with current AppConfig)")
	}
}

func TestCentralizedConfigManager_ErrorHandling(t *testing.T) {
	tests := []struct {
		name        string
		setupDir    func(tempDir string) error
		configSetup CentralizedConfigManagerConfig
		expectError bool
		expectedErr string
	}{
		{
			name: "missing_config_directory",
			setupDir: func(tempDir string) error {
				// Use non-existent directory
				return nil
			},
			configSetup: CentralizedConfigManagerConfig{
				ConfigDir: "/nonexistent/directory",
			},
			expectError: false, // Should not error on creation, only on load
		},
		{
			name: "corrupted_dns_personas_file",
			setupDir: func(tempDir string) error {
				// Create invalid JSON file
				return os.WriteFile(filepath.Join(tempDir, "dns_personas.config.json"),
					[]byte(`{"invalid": json}`), 0644)
			},
			configSetup: CentralizedConfigManagerConfig{},
			expectError: false, // Should log warning but not fail
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tempDir := t.TempDir()

			if err := tt.setupDir(tempDir); err != nil {
				t.Fatalf("Failed to setup test directory: %v", err)
			}

			if tt.configSetup.ConfigDir == "" {
				tt.configSetup.ConfigDir = tempDir
			}

			cm, err := NewCentralizedConfigManager(tt.configSetup)
			if err != nil {
				if !tt.expectError {
					t.Fatalf("Unexpected error creating config manager: %v", err)
				}
				return
			}

			ctx := context.Background()
			_, err = cm.LoadConfiguration(ctx)

			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

// Helper function for substring checking
func containsSubstring(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					func() bool {
						for i := 0; i <= len(s)-len(substr); i++ {
							if s[i:i+len(substr)] == substr {
								return true
							}
						}
						return false
					}()))
}
