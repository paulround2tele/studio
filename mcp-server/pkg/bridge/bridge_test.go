package bridge

import (
	"testing"

	"github.com/fntelecomllc/studio/mcp-server/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMCPBridge_NewMCPBridge(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp" // Use a path that exists for testing
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	require.NotNil(t, bridge)
	
	assert.Equal(t, cfg, bridge.config)
}

func TestMCPBridge_GetAvailableTools(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp"
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	
	tools := bridge.GetAvailableTools()
	
	// Should have tools when all categories are enabled
	assert.Greater(t, len(tools), 15, "Should have at least 15 tools")
	
	// Check for expected tool names
	toolNames := make(map[string]bool)
	for _, tool := range tools {
		toolNames[tool.Name] = true
	}
	
	// Schema tools
	assert.True(t, toolNames["get_models"])
	assert.True(t, toolNames["get_database_schema"])
	assert.True(t, toolNames["get_api_schema"])
	
	// API tools
	assert.True(t, toolNames["get_endpoints"])
	assert.True(t, toolNames["get_routes"])
	assert.True(t, toolNames["get_middleware"])
	
	// Service tools
	assert.True(t, toolNames["get_services"])
	assert.True(t, toolNames["get_dependencies"])
	assert.True(t, toolNames["get_call_graph"])
	
	// Business logic tools
	assert.True(t, toolNames["get_workflows"])
	assert.True(t, toolNames["get_business_rules"])
	assert.True(t, toolNames["get_handlers"])
	
	// Configuration tools
	assert.True(t, toolNames["get_env_vars"])
	assert.True(t, toolNames["get_config"])
	assert.True(t, toolNames["get_feature_flags"])
	
	// Navigation tools
	assert.True(t, toolNames["find_by_type"])
	assert.True(t, toolNames["search_code"])
	assert.True(t, toolNames["get_package_structure"])
}

func TestMCPBridge_GetAvailableTools_DisabledCategories(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp"
	
	// Disable all tool categories
	cfg.Tools.EnableSchemaTools = false
	cfg.Tools.EnableAPITools = false
	cfg.Tools.EnableServiceTools = false
	cfg.Tools.EnableBusinessLogicTools = false
	cfg.Tools.EnableConfigurationTools = false
	cfg.Tools.EnableNavigationTools = false
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	
	tools := bridge.GetAvailableTools()
	assert.Empty(t, tools, "Should have no tools when all categories are disabled")
}

func TestMCPBridge_ExecuteTool_PlaceholderImplementations(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp"
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	
	// Test placeholder implementations
	testCases := []struct {
		toolName string
		args     map[string]interface{}
	}{
		{"get_models", map[string]interface{}{}},
		{"get_database_schema", map[string]interface{}{}},
		{"get_package_structure", map[string]interface{}{}},
		{"find_by_type", map[string]interface{}{"type_name": "Config"}},
		{"search_code", map[string]interface{}{"query": "test"}},
	}
	
	for _, tc := range testCases {
		t.Run(tc.toolName, func(t *testing.T) {
			result, err := bridge.ExecuteTool(tc.toolName, tc.args)
			require.NoError(t, err)
			require.NotNil(t, result)
			
			assert.False(t, result.IsError)
			assert.Greater(t, len(result.Content), 0)
			assert.Equal(t, "text", result.Content[0].Type)
			assert.Contains(t, result.Content[0].Text, "not yet implemented")
		})
	}
}

func TestMCPBridge_ExecuteTool_InvalidTool(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp"
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	
	result, err := bridge.ExecuteTool("invalid_tool", map[string]interface{}{})
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "unknown tool")
}

func TestMCPBridge_ExecuteTool_DisabledCategory(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp"
	cfg.Tools.EnableSchemaTools = false
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	
	result, err := bridge.ExecuteTool("get_models", map[string]interface{}{})
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "schema tools are disabled")
}

func TestMCPBridge_ExecuteTool_MissingRequiredParams(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp"
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	
	// Test tools that require parameters
	testCases := []struct {
		toolName    string
		args        map[string]interface{}
		expectedErr string
	}{
		{"find_by_type", map[string]interface{}{}, "type_name parameter is required"},
		{"search_code", map[string]interface{}{}, "query parameter is required"},
	}
	
	for _, tc := range testCases {
		t.Run(tc.toolName, func(t *testing.T) {
			result, err := bridge.ExecuteTool(tc.toolName, tc.args)
			assert.Error(t, err)
			assert.Nil(t, result)
			assert.Contains(t, err.Error(), tc.expectedErr)
		})
	}
}

func TestMCPBridge_Close(t *testing.T) {
	cfg := config.DefaultConfig()
	cfg.BackendPath = "/tmp"
	
	bridge, err := NewMCPBridge(cfg)
	require.NoError(t, err)
	
	err = bridge.Close()
	assert.NoError(t, err)
}