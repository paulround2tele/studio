package fixtures

import (
	"encoding/json"
	"fmt"
)

// MockBackendRepo provides a dummy backend repository for safe testing
type MockBackendRepo struct {
	Models    []MockModel    `json:"models"`
	Handlers  []MockHandler  `json:"handlers"`
	Services  []MockService  `json:"services"`
	Config    MockConfig     `json:"config"`
}

// MockModel represents a dummy data model
type MockModel struct {
	Name    string      `json:"name"`
	Package string      `json:"package"`
	Fields  []MockField `json:"fields"`
	Tags    []string    `json:"tags"`
}

// MockField represents a dummy model field
type MockField struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Tag  string `json:"tag"`
}

// MockHandler represents a dummy HTTP handler
type MockHandler struct {
	Name       string   `json:"name"`
	Package    string   `json:"package"`
	Route      string   `json:"route"`
	Method     string   `json:"method"`
	Parameters []string `json:"parameters"`
}

// MockService represents a dummy service
type MockService struct {
	Name         string   `json:"name"`
	Package      string   `json:"package"`
	Dependencies []string `json:"dependencies"`
	Methods      []string `json:"methods"`
}

// MockConfig represents dummy configuration
type MockConfig struct {
	DatabaseURL string            `json:"database_url"`
	EnvVars     map[string]string `json:"env_vars"`
	Features    map[string]bool   `json:"features"`
}

// GetMockBackend returns a complete mock backend for testing
func GetMockBackend() *MockBackendRepo {
	return &MockBackendRepo{
		Models: []MockModel{
			{
				Name:    "User",
				Package: "models",
				Fields: []MockField{
					{Name: "ID", Type: "int64", Tag: "`json:\"id\" db:\"id\"`"},
					{Name: "Name", Type: "string", Tag: "`json:\"name\" db:\"name\"`"},
					{Name: "Email", Type: "string", Tag: "`json:\"email\" db:\"email\"`"},
					{Name: "CreatedAt", Type: "time.Time", Tag: "`json:\"created_at\" db:\"created_at\"`"},
				},
				Tags: []string{"json", "database"},
			},
			{
				Name:    "Product",
				Package: "models",
				Fields: []MockField{
					{Name: "ID", Type: "int64", Tag: "`json:\"id\" db:\"id\"`"},
					{Name: "Name", Type: "string", Tag: "`json:\"name\" db:\"name\"`"},
					{Name: "Price", Type: "decimal.Decimal", Tag: "`json:\"price\" db:\"price\"`"},
					{Name: "UserID", Type: "int64", Tag: "`json:\"user_id\" db:\"user_id\"`"},
				},
				Tags: []string{"json", "database"},
			},
			{
				Name:    "APIResponse",
				Package: "api",
				Fields: []MockField{
					{Name: "Success", Type: "bool", Tag: "`json:\"success\"`"},
					{Name: "Data", Type: "interface{}", Tag: "`json:\"data,omitempty\"`"},
					{Name: "Error", Type: "string", Tag: "`json:\"error,omitempty\"`"},
				},
				Tags: []string{"json"},
			},
		},
		Handlers: []MockHandler{
			{
				Name:       "GetUsers",
				Package:    "handlers",
				Route:      "/api/users",
				Method:     "GET",
				Parameters: []string{"w http.ResponseWriter", "r *http.Request"},
			},
			{
				Name:       "CreateUser",
				Package:    "handlers",
				Route:      "/api/users",
				Method:     "POST",
				Parameters: []string{"w http.ResponseWriter", "r *http.Request"},
			},
			{
				Name:       "GetUserByID",
				Package:    "handlers",
				Route:      "/api/users/{id}",
				Method:     "GET",
				Parameters: []string{"w http.ResponseWriter", "r *http.Request"},
			},
			{
				Name:       "GetProducts",
				Package:    "handlers",
				Route:      "/api/products",
				Method:     "GET",
				Parameters: []string{"w http.ResponseWriter", "r *http.Request"},
			},
		},
		Services: []MockService{
			{
				Name:         "UserService",
				Package:      "services",
				Dependencies: []string{"database.DB", "logger.Logger"},
				Methods:      []string{"GetAll", "GetByID", "Create", "Update", "Delete"},
			},
			{
				Name:         "ProductService",
				Package:      "services",
				Dependencies: []string{"database.DB", "UserService"},
				Methods:      []string{"GetAll", "GetByUserID", "Create", "Update"},
			},
			{
				Name:         "AuthService",
				Package:      "auth",
				Dependencies: []string{"jwt.JWT", "bcrypt.Hasher"},
				Methods:      []string{"Login", "Register", "ValidateToken", "RefreshToken"},
			},
		},
		Config: MockConfig{
			DatabaseURL: "postgres://user:pass@localhost:5432/testdb",
			EnvVars: map[string]string{
				"API_PORT":     "8080",
				"LOG_LEVEL":    "debug",
				"JWT_SECRET":   "test-secret",
				"DB_MAX_CONN":  "10",
			},
			Features: map[string]bool{
				"enable_auth":       true,
				"enable_logging":    true,
				"enable_metrics":    false,
				"enable_cors":       true,
			},
		},
	}
}

// JSONRPCTestCases provides test cases for JSON-RPC validation
type JSONRPCTestCase struct {
	Name           string                 `json:"name"`
	Request        map[string]interface{} `json:"request"`
	ExpectedResult interface{}            `json:"expected_result"`
	ExpectedError  *JSONRPCTestError      `json:"expected_error"`
	Description    string                 `json:"description"`
}

// JSONRPCTestError represents expected error in test cases
type JSONRPCTestError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// GetJSONRPCTestCases returns comprehensive test cases for JSON-RPC validation
func GetJSONRPCTestCases() []JSONRPCTestCase {
	return []JSONRPCTestCase{
		{
			Name: "get_models_success",
			Request: map[string]interface{}{
				"jsonrpc": "2.0",
				"method":  "tools/call",
				"params": map[string]interface{}{
					"name": "get_models",
					"arguments": map[string]interface{}{
						"filter":    "",
						"page":      1,
						"page_size": 10,
					},
				},
				"id": 1,
			},
			ExpectedResult: map[string]interface{}{
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": "Found 3 models (page 1, size 10)",
					},
				},
			},
			Description: "Successfully retrieve models with pagination",
		},
		{
			Name: "get_change_impact_success",
			Request: map[string]interface{}{
				"jsonrpc": "2.0",
				"method":  "tools/call",
				"params": map[string]interface{}{
					"name": "get_change_impact",
					"arguments": map[string]interface{}{
						"target": "User",
					},
				},
				"id": 2,
			},
			ExpectedResult: map[string]interface{}{
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": "Change Impact Analysis for: User",
					},
				},
			},
			Description: "Successfully analyze change impact for User model",
		},
		{
			Name: "get_snapshot_success",
			Request: map[string]interface{}{
				"jsonrpc": "2.0",
				"method":  "tools/call",
				"params": map[string]interface{}{
					"name":      "get_snapshot",
					"arguments": map[string]interface{}{},
				},
				"id": 3,
			},
			ExpectedResult: map[string]interface{}{
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": "Context Snapshot Generated",
					},
				},
			},
			Description: "Successfully generate context snapshot",
		},
		{
			Name: "invalid_method_error",
			Request: map[string]interface{}{
				"jsonrpc": "2.0",
				"method":  "invalid/method",
				"params":  map[string]interface{}{},
				"id":      4,
			},
			ExpectedError: &JSONRPCTestError{
				Code:    -32601,
				Message: "Method not found",
			},
			Description: "Should return method not found error for invalid method",
		},
		{
			Name: "missing_target_parameter",
			Request: map[string]interface{}{
				"jsonrpc": "2.0",
				"method":  "tools/call",
				"params": map[string]interface{}{
					"name":      "get_change_impact",
					"arguments": map[string]interface{}{},
				},
				"id": 5,
			},
			ExpectedError: &JSONRPCTestError{
				Code:    -32602,
				Message: "Invalid params",
			},
			Description: "Should return invalid params error when required parameter is missing",
		},
		{
			Name: "pagination_edge_case",
			Request: map[string]interface{}{
				"jsonrpc": "2.0",
				"method":  "tools/call",
				"params": map[string]interface{}{
					"name": "get_models",
					"arguments": map[string]interface{}{
						"page":      999,
						"page_size": 10,
					},
				},
				"id": 6,
			},
			ExpectedResult: map[string]interface{}{
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": "Found 0 models (page 999, size 10)",
					},
				},
			},
			Description: "Should handle pagination edge case gracefully",
		},
	}
}

// CLITestCases provides test cases for CLI argument validation
type CLITestCase struct {
	Name        string            `json:"name"`
	Args        []string          `json:"args"`
	EnvVars     map[string]string `json:"env_vars"`
	ExpectedConfig map[string]interface{} `json:"expected_config"`
	ShouldError bool              `json:"should_error"`
	Description string            `json:"description"`
}

// GetCLITestCases returns test cases for CLI argument overrides
func GetCLITestCases() []CLITestCase {
	return []CLITestCase{
		{
			Name: "default_config",
			Args: []string{},
			EnvVars: map[string]string{},
			ExpectedConfig: map[string]interface{}{
				"port":                8081,
				"log_level":           "info",
				"enable_cors":         false,
				"read_only":           false,
				"allow_unsafe_imports": false,
				"enable_cache":        true,
				"max_cache_size":      100,
			},
			ShouldError: false,
			Description: "Should use default configuration values",
		},
		{
			Name: "cli_overrides",
			Args: []string{
				"--port", "9090",
				"--log-level", "debug",
				"--enable-cors",
				"--read-only",
				"--max-cache-size", "200",
			},
			EnvVars: map[string]string{},
			ExpectedConfig: map[string]interface{}{
				"port":           9090,
				"log_level":      "debug",
				"enable_cors":    true,
				"read_only":      true,
				"max_cache_size": 200,
			},
			ShouldError: false,
			Description: "Should apply CLI argument overrides",
		},
		{
			Name: "env_var_overrides",
			Args: []string{},
			EnvVars: map[string]string{
				"MCP_SERVER_PORT":      "7070",
				"MCP_SERVER_LOG_LEVEL": "warn",
				"MCP_SERVER_ENABLE_CORS": "true",
			},
			ExpectedConfig: map[string]interface{}{
				"port":        7070,
				"log_level":   "warn",
				"enable_cors": true,
			},
			ShouldError: false,
			Description: "Should apply environment variable overrides",
		},
		{
			Name: "cli_precedence_over_env",
			Args: []string{
				"--port", "8888",
			},
			EnvVars: map[string]string{
				"MCP_SERVER_PORT": "7777",
			},
			ExpectedConfig: map[string]interface{}{
				"port": 8888,
			},
			ShouldError: false,
			Description: "CLI arguments should take precedence over environment variables",
		},
		{
			Name: "invalid_port",
			Args: []string{
				"--port", "invalid",
			},
			EnvVars: map[string]string{},
			ExpectedConfig: map[string]interface{}{},
			ShouldError: true,
			Description: "Should error on invalid port value",
		},
	}
}

// GetTestDataJSON returns all test data as JSON for external validation
func GetTestDataJSON() (string, error) {
	testData := map[string]interface{}{
		"mock_backend":      GetMockBackend(),
		"jsonrpc_test_cases": GetJSONRPCTestCases(),
		"cli_test_cases":    GetCLITestCases(),
	}

	jsonData, err := json.MarshalIndent(testData, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal test data: %w", err)
	}

	return string(jsonData), nil
}