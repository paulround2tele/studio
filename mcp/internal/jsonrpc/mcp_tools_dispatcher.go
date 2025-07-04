package jsonrpc

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"mcp/internal/models"
)

// handleListTools handles MCP tools/list request
func (s *JSONRPCServer) handleListTools(ctx context.Context, params json.RawMessage) (interface{}, error) {
	tools := []models.MCPTool{
		// Database Tools (1)
		{
			Name:        "get_database_schema",
			Description: "Get the database schema including tables, columns, and indexes",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_backend_openapi_schema",
			Description: "Get OpenAPI schema including specifications and route definitions",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Code Analysis Tools (7)
		{
			Name:        "get_backend_data_models",
			Description: "Get all backend data models and their structures",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_backend_api_routes",
			Description: "Get all API routes and endpoints",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_backend_api_endpoints",
			Description: "Get all API endpoints (alias for get_backend_api_routes)",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_backend_request_handlers",
			Description: "Get all backend request handlers",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_backend_services",
			Description: "Get all backend service definitions and interfaces",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_interfaces",
			Description: "Get all interfaces and their methods",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "find_implementations",
			Description: "Find implementations of interfaces",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"interface": map[string]interface{}{
						"type":        "string",
						"description": "Interface name to find implementations for",
					},
				},
			},
		},
		{
			Name:        "get_call_graph",
			Description: "Get call graph analysis of functions",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"function": map[string]interface{}{
						"type":        "string",
						"description": "Function name to analyze (optional, defaults to 'main')",
					},
				},
			},
		},

		// Configuration Tools (3)
		{
			Name:        "get_config",
			Description: "Get application configuration structure",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_middleware",
			Description: "Get middleware configuration and usage",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_env_vars",
			Description: "Get environment variables used in the application",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Search Tools (4)
		{
			Name:        "search_code",
			Description: "Search for code patterns and implementations",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "Search query for code",
					},
				},
				"required": []string{"query"},
			},
		},
		{
			Name:        "get_package_structure",
			Description: "Get the package and module structure",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_dependencies",
			Description: "Get project dependencies and their relationships",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_dependency_graph",
			Description: "Get project package dependency graph",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// WebSocket Tools (3)
		{
			Name:        "get_websocket_endpoints",
			Description: "Get WebSocket endpoints and their configurations",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_websocket_handlers",
			Description: "Get WebSocket message handlers",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_websocket_messages",
			Description: "Get WebSocket message types and structures",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_websocket_lifecycle",
			Description: "Get WebSocket connection lifecycle and state management",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "test_websocket_flow",
			Description: "Test WebSocket message flow and connectivity",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Business Logic Tools (4)
		{
			Name:        "get_middleware_usage",
			Description: "Get middleware usage patterns and analysis",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "trace_middleware_flow",
			Description: "Trace middleware execution flow and pipeline",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_workflows",
			Description: "Get business workflows and processes",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_business_rules",
			Description: "Get business rules and validation logic",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_feature_flags",
			Description: "Get feature flags and their configurations",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_campaign_pipeline",
			Description: "Get the pipeline status for a campaign",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"campaignId": map[string]interface{}{
						"type":        "string",
						"description": "Campaign UUID",
					},
				},
				"required": []string{"campaignId"},
			},
		},

		// Advanced Tools (5)
		{
			Name:        "find_by_type",
			Description: "Find code elements by type",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"type": map[string]interface{}{
						"type":        "string",
						"description": "Type to search for",
					},
				},
				"required": []string{"type"},
			},
		},
		{
			Name:        "get_references",
			Description: "Get references and usages of code elements",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"symbol": map[string]interface{}{
						"type":        "string",
						"description": "Symbol to find references for",
					},
					"filePath": map[string]interface{}{
						"type":        "string",
						"description": "File path context (optional)",
					},
				},
				"required": []string{"symbol"},
			},
		},
		{
			Name:        "get_change_impact",
			Description: "Analyze the impact of code changes",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"file": map[string]interface{}{
						"type":        "string",
						"description": "File to analyze impact for",
					},
				},
				"required": []string{"file"},
			},
		},
		{
			Name:        "snapshot",
			Description: "Create a snapshot of the current codebase state",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "contract_drift_check",
			Description: "Check for API contract drift and inconsistencies",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Interactive Tools (2)
		{
			Name:        "run_terminal_command",
			Description: "Execute terminal commands in the project context",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"command": map[string]interface{}{
						"type":        "string",
						"description": "Command to execute",
					},
					"workingDir": map[string]interface{}{
						"type":        "string",
						"description": "Working directory for command execution (optional)",
					},
				},
				"required": []string{"command"},
			},
		},
		{
			Name:        "apply_code_change",
			Description: "Apply a code change using diff/patch",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"diff": map[string]interface{}{
						"type":        "string",
						"description": "The diff to apply",
					},
				},
				"required": []string{"diff"},
			},
		},
		{
			Name:        "browse_with_playwright",
			Description: "Fetch a URL in a headless browser and capture a screenshot",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"url": map[string]interface{}{
						"type":        "string",
						"description": "URL to visit",
					},
				},
				"required": []string{"url"},
			},
		},
		{
			Name:        "browse_with_playwright_incremental",
			Description: "Browse with incremental UI state streaming for optimized token usage",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"url": map[string]interface{}{
						"type":        "string",
						"description": "URL to visit",
					},
					"sessionId": map[string]interface{}{
						"type":        "string",
						"description": "Session ID for incremental state tracking (optional)",
					},
					"streamingMode": map[string]interface{}{
						"type":        "string",
						"description": "Streaming mode: 'full', 'incremental', or 'adaptive'",
						"enum":        []string{"full", "incremental", "adaptive"},
					},
				},
				"required": []string{"url"},
			},
		},
		{
			Name:        "process_ui_action_incremental",
			Description: "Process UI action with incremental state updates",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"sessionId": map[string]interface{}{
						"type":        "string",
						"description": "Session ID for incremental state tracking",
					},
					"action": map[string]interface{}{
						"type":        "string",
						"description": "Type of action to perform",
						"enum":        []string{"click", "type", "hover", "scroll", "navigate", "wait"},
					},
					"selector": map[string]interface{}{
						"type":        "string",
						"description": "CSS selector for the target element",
					},
					"text": map[string]interface{}{
						"type":        "string",
						"description": "Text to type (for type action)",
					},
					"url": map[string]interface{}{
						"type":        "string",
						"description": "URL to navigate to (for navigate action)",
					},
					"x": map[string]interface{}{
						"type":        "number",
						"description": "X coordinate for action",
					},
					"y": map[string]interface{}{
						"type":        "number",
						"description": "Y coordinate for action",
					},
					"timeout": map[string]interface{}{
						"type":        "integer",
						"description": "Timeout in milliseconds",
						"minimum":     0,
					},
				},
				"required": []string{"sessionId", "action"},
			},
		},
		{
			Name:        "get_incremental_ui_state",
			Description: "Get current incremental UI state for a session",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"sessionId": map[string]interface{}{
						"type":        "string",
						"description": "Session ID for incremental state tracking",
					},
					"includeScreenshot": map[string]interface{}{
						"type":        "boolean",
						"description": "Include screenshot in response",
					},
					"includeDeltas": map[string]interface{}{
						"type":        "boolean",
						"description": "Include DOM deltas in response",
					},
				},
				"required": []string{"sessionId"},
			},
		},
		{
			Name:        "set_streaming_mode",
			Description: "Set streaming mode for incremental UI updates",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"sessionId": map[string]interface{}{
						"type":        "string",
						"description": "Session ID for incremental state tracking",
					},
					"mode": map[string]interface{}{
						"type":        "string",
						"description": "Streaming mode to set",
						"enum":        []string{"full", "incremental", "adaptive"},
					},
					"adaptiveThreshold": map[string]interface{}{
						"type":        "number",
						"description": "Token usage threshold for adaptive mode (optional)",
						"minimum":     0,
					},
				},
				"required": []string{"sessionId", "mode"},
			},
		},
		{
			Name:        "get_stream_stats",
			Description: "Get streaming statistics and performance metrics",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"sessionId": map[string]interface{}{
						"type":        "string",
						"description": "Session ID for incremental state tracking (optional)",
					},
				},
			},
		},
		{
			Name:        "cleanup_incremental_session",
			Description: "Clean up incremental session and free resources",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"sessionId": map[string]interface{}{
						"type":        "string",
						"description": "Session ID to clean up",
					},
				},
				"required": []string{"sessionId"},
			},
		},
		{
			Name:        "get_incremental_debug_info",
			Description: "Get debug information for incremental streaming session",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"sessionId": map[string]interface{}{
						"type":        "string",
						"description": "Session ID for debug information",
					},
					"includeDetailedState": map[string]interface{}{
						"type":        "boolean",
						"description": "Include detailed internal state information",
					},
				},
				"required": []string{"sessionId"},
			},
		},
		{
			Name:        "get_latest_screenshot",
			Description: "Return the most recent Playwright screenshot",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"base64": map[string]interface{}{
						"type":        "boolean",
						"description": "Return base64 encoded data",
					},
				},
			},
		},
		{
			Name:        "get_ui_metadata",
			Description: "Extract component metadata from the last HTML capture",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_ui_code_map",
			Description: "Map captured components to React source files",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_visual_context",
			Description: "Run Playwright and assemble screenshot, metadata and code mapping",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"url": map[string]interface{}{
						"type":        "string",
						"description": "URL to visit",
					},
				},
				"required": []string{"url"},
			},
		},
		{
			Name:        "generate_ui_test_prompt_with_actions",
			Description: "Run Playwright with scripted actions and return visual context",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"url": map[string]interface{}{
						"type":        "string",
						"description": "Initial URL",
					},
					"actions": map[string]interface{}{
						"type":        "array",
						"description": "List of UI actions",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								// Existing fields (backward compatibility)
								"action": map[string]interface{}{
									"type":        "string",
									"description": "Type of action to perform",
									"enum": []string{
										"click", "type", "hover", "scroll", "navigate", "wait",
										"moveto", "clickat", "doubleclickat", "rightclickat",
										"dragfrom", "hoverat", "scrollat", "gesture",
									},
								},
								"selector": map[string]interface{}{
									"type":        "string",
									"description": "CSS selector for the target element",
								},
								"text": map[string]interface{}{
									"type":        "string",
									"description": "Text to type or search for",
								},
								"url": map[string]interface{}{
									"type":        "string",
									"description": "URL to navigate to",
								},
								"timeout": map[string]interface{}{
									"type":        "integer",
									"description": "Timeout in milliseconds",
									"minimum":     0,
								},
								
								// Coordinate fields for precise positioning
								"x": map[string]interface{}{
									"type":        "number",
									"description": "X coordinate for action",
								},
								"y": map[string]interface{}{
									"type":        "number",
									"description": "Y coordinate for action",
								},
								"toX": map[string]interface{}{
									"type":        "number",
									"description": "Target X coordinate for drag operations",
								},
								"toY": map[string]interface{}{
									"type":        "number",
									"description": "Target Y coordinate for drag operations",
								},
								
								// Mouse configuration
								"button": map[string]interface{}{
									"type":        "string",
									"description": "Mouse button to use",
									"enum":        []string{"left", "right", "middle"},
								},
								"clicks": map[string]interface{}{
									"type":        "integer",
									"description": "Number of clicks to perform",
									"minimum":     1,
								},
								"delay": map[string]interface{}{
									"type":        "integer",
									"description": "Delay between actions in milliseconds",
									"minimum":     0,
								},
								
								// Coordinate system options
								"coordSystem": map[string]interface{}{
									"type":        "string",
									"description": "Coordinate system to use",
									"enum":        []string{"viewport", "element", "page"},
								},
								"relativeTo": map[string]interface{}{
									"type":        "string",
									"description": "Element selector to use as coordinate reference",
								},
								
								// Gesture support
								"points": map[string]interface{}{
									"type":        "array",
									"description": "Array of points for gesture actions",
									"items": map[string]interface{}{
										"type": "object",
										"properties": map[string]interface{}{
											"x": map[string]interface{}{
												"type":        "number",
												"description": "X coordinate of the point",
											},
											"y": map[string]interface{}{
												"type":        "number",
												"description": "Y coordinate of the point",
											},
											"delay": map[string]interface{}{
												"type":        "integer",
												"description": "Delay before this point in milliseconds",
												"minimum":     0,
											},
											"pressure": map[string]interface{}{
												"type":        "number",
												"description": "Pressure level for touch actions (0-1)",
												"minimum":     0,
												"maximum":     1,
											},
										},
										"required": []string{"x", "y"},
									},
								},
								"pressure": map[string]interface{}{
									"type":        "number",
									"description": "Default pressure level for gesture actions (0-1)",
									"minimum":     0,
									"maximum":     1,
								},
								"smooth": map[string]interface{}{
									"type":        "boolean",
									"description": "Whether to smooth gesture movements",
								},
								
								// Scroll configuration
								"scrollX": map[string]interface{}{
									"type":        "number",
									"description": "Horizontal scroll amount in pixels",
								},
								"scrollY": map[string]interface{}{
									"type":        "number",
									"description": "Vertical scroll amount in pixels",
								},
								"scrollDelta": map[string]interface{}{
									"type":        "integer",
									"description": "Scroll wheel delta amount",
								},
							},
							"required": []string{"action"},
						},
					},
				},
				"required": []string{"url", "actions"},
			},
		},
		{
			Name:        "generate_ui_test_prompt",
			Description: "Generate automated test prompts for UI components based on visual context and metadata",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"componentName": map[string]interface{}{
						"type":        "string",
						"description": "Name of the component to generate tests for",
					},
					"testType": map[string]interface{}{
						"type":        "string",
						"description": "Type of test to generate (unit, integration, e2e)",
					},
					"includeAccessibility": map[string]interface{}{
						"type":        "boolean",
						"description": "Include accessibility testing requirements",
					},
					"includeInteractions": map[string]interface{}{
						"type":        "boolean",
						"description": "Include interaction testing requirements",
					},
				},
			},
		},

		// New Tools (6 additional to reach 34)
		{
			Name:        "get_database_stats",
			Description: "Get database performance statistics and metrics",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "analyze_performance",
			Description: "Analyze application performance bottlenecks",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_security_analysis",
			Description: "Perform security analysis of the codebase",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "validate_api_contracts",
			Description: "Validate API contracts and OpenAPI specifications",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_test_coverage",
			Description: "Get test coverage analysis and metrics",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "analyze_code_quality",
			Description: "Analyze code quality metrics and technical debt",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "analyze_complexity",
			Description: "Run gocyclo to report function complexity",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_lint_diagnostics",
			Description: "Run golangci-lint or staticcheck and go build",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Frontend Tools
		{
			Name:        "frontend_nextjs_app_routes",
			Description: "[Frontend] List Next.js app router routes",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "frontend_react_component_tree",
			Description: "[Frontend] Get React component import tree and dependencies",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "frontend_react_component_props",
			Description: "[Frontend] Extract props and event handlers for React components",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "frontend_test_coverage",
			Description: "[Frontend] Run frontend tests and return coverage",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "frontend_react_component_tests",
			Description: "[Frontend] Map React components to their test files",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// New Frontend Analysis Tools
		{
			Name:        "frontend_api_client_analysis",
			Description: "[Frontend] Analyze sophisticated TypeScript API client structure and capabilities",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// New Backend Business Domain Tools
		{
			Name:        "get_business_domains",
			Description: "Analyze business domains within the backend architecture",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_advanced_tooling",
			Description: "Analyze advanced development and database tooling",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_keyword_extraction_services",
			Description: "Analyze keyword extraction service implementations and patterns",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_keyword_scanning_services",
			Description: "Analyze keyword scanning service implementations and patterns",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_proxy_management_services",
			Description: "Analyze proxy management service implementations and patterns",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_keyword_set_api_specs",
			Description: "Analyze keyword-sets API specifications and endpoints",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_proxy_pool_api_specs",
			Description: "Analyze proxy-pools API specifications and endpoints",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_database_tooling_analysis",
			Description: "Analyze advanced database tooling including migration verifiers and schema validators",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_business_domain_routes",
			Description: "Analyze API routes categorized by business domains",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Enhanced Dependency and Security Analysis Tools
		{
			Name:        "get_enhanced_dependencies",
			Description: "Get enhanced dependency analysis with business domain mapping",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_enhanced_security_analysis",
			Description: "Get enhanced security analysis for business domains",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_enhanced_api_schema",
			Description: "Get enhanced API schema analysis with business domain awareness",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},

		// Business Domain Middleware and Dependencies
		{
			Name:        "get_business_domain_middleware",
			Description: "Analyze middleware specific to business domains",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_internal_service_dependencies",
			Description: "Analyze dependencies between internal services",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "get_business_domain_cross_dependencies",
			Description: "Analyze cross-dependencies between business domains",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
	}

	log.Printf("Returning %d MCP tools", len(tools))

	return map[string]interface{}{
		"tools": tools,
	}, nil
}

// handleCallTool handles MCP tools/call request
func (s *JSONRPCServer) handleCallTool(ctx context.Context, params json.RawMessage) (interface{}, error) {
	var toolCall models.MCPToolCall
	if err := json.Unmarshal(params, &toolCall); err != nil {
		return nil, err
	}

	log.Printf("MCP tool call: %s", toolCall.Name)

	switch toolCall.Name {
	// Database Tools
	case "get_database_schema":
		return s.callGetDatabaseSchema()
	case "get_backend_openapi_schema":
		return s.callGetAPISchema()
	case "get_database_stats":
		return s.callGetDatabaseStats()

	// Code Analysis Tools
	case "get_backend_data_models":
		return s.callGetModels()
	case "get_backend_api_routes", "get_backend_api_endpoints":
		return s.callGetRoutes()
	case "get_backend_request_handlers":
		return s.callGetHandlers()
	case "get_backend_services":
		return s.callGetServices()
	case "get_interfaces":
		return s.callGetInterfaces()
	case "find_implementations":
		return s.callFindImplementations(toolCall.Arguments)
	case "get_call_graph":
		return s.callGetCallGraph(toolCall.Arguments)

	// Configuration Tools
	case "get_config":
		return s.callGetConfig()
	case "get_middleware":
		return s.callGetMiddleware()
	case "get_env_vars":
		return s.callGetEnvVars()
	case "trace_middleware_flow":
		return s.callTraceMiddlewareFlow()

	// Search Tools
	case "search_code":
		return s.callSearchCode(ctx, toolCall.Arguments)
	case "get_package_structure":
		return s.callGetPackageStructure(ctx)
	case "get_dependencies":
		return s.callGetDependencies(ctx)
	case "get_dependency_graph":
		return s.callGetDependencyGraph(ctx)

	// WebSocket Tools
	case "get_websocket_endpoints":
		return s.callGetWebSocketEndpoints(ctx)
	case "get_websocket_handlers":
		return s.callGetWebSocketHandlers(ctx)
	case "get_websocket_messages":
		return s.callGetWebSocketMessages(ctx)
	case "get_websocket_lifecycle":
		return s.callGetWebSocketLifecycle(ctx)
	case "test_websocket_flow":
		return s.callTestWebSocketFlow(ctx)

	// Business Logic Tools
	case "get_middleware_usage":
		return s.callGetMiddlewareUsage()
	case "get_workflows":
		return s.callGetWorkflows()
	case "get_business_rules":
		return s.callGetBusinessRules()
	case "get_feature_flags":
		return s.callGetFeatureFlags()
	case "get_campaign_pipeline":
		return s.callGetCampaignPipeline(toolCall.Arguments)

	// Advanced Tools
	case "find_by_type":
		return s.callFindByType(toolCall.Arguments)
	case "get_references":
		return s.callGetReferences(toolCall.Arguments)
	case "get_change_impact":
		return s.callGetChangeImpact(toolCall.Arguments)
	case "snapshot":
		return s.callCreateSnapshot()
	case "contract_drift_check":
		return s.callCheckContractDrift()

		// Interactive Tools
	case "run_terminal_command":
		return s.callRunTerminalCommand(ctx, toolCall.Arguments)
	case "apply_code_change":
		return s.callApplyCodeChange(ctx, toolCall.Arguments)
	case "browse_with_playwright":
		return s.callBrowseWithPlaywright(ctx, toolCall.Arguments)
	case "browse_with_playwright_incremental":
		return s.callBrowseWithPlaywrightIncremental(ctx, toolCall.Arguments)
	case "process_ui_action_incremental":
		return s.callProcessUIActionIncremental(ctx, toolCall.Arguments)
	case "get_incremental_ui_state":
		return s.callGetIncrementalUIState(ctx, toolCall.Arguments)
	case "set_streaming_mode":
		return s.callSetStreamingMode(ctx, toolCall.Arguments)
	case "get_stream_stats":
		return s.callGetStreamStats(ctx, toolCall.Arguments)
	case "cleanup_incremental_session":
		return s.callCleanupIncrementalSession(ctx, toolCall.Arguments)
	case "get_incremental_debug_info":
		return s.callGetIncrementalDebugInfo(ctx, toolCall.Arguments)
	case "get_latest_screenshot":
		return s.callGetLatestScreenshot(ctx, toolCall.Arguments)
	case "get_ui_metadata":
		return s.callGetUIMetadata(ctx)
	case "get_ui_code_map":
		return s.callGetUICodeMap(ctx)
	case "get_visual_context":
		return s.callGetVisualContext(ctx, toolCall.Arguments)
	case "generate_ui_test_prompt_with_actions":
		return s.callGenerateUITestPromptWithActions(ctx, toolCall.Arguments)

	case "generate_ui_test_prompt":
		return s.callGenerateUITestPrompt(ctx, toolCall.Arguments)

	// New Tools
	case "analyze_performance":
		return s.callAnalyzePerformance()
	case "get_security_analysis":
		return s.callGetSecurityAnalysis()
	case "validate_api_contracts":
		return s.callValidateAPIContracts()
	case "get_test_coverage":
		return s.callGetTestCoverage()
	case "analyze_code_quality":
		return s.callAnalyzeCodeQuality()
	case "analyze_complexity":
		return s.callAnalyzeComplexity()
	case "get_lint_diagnostics":
		return s.callGetLintDiagnostics()

	// Frontend Tools
	case "frontend_nextjs_app_routes":
		return s.callGetFrontendRoutes()
	case "frontend_react_component_tree":
		return s.callGetComponentTree()
	case "frontend_react_component_props":
		return s.callGetComponentPropsAndEvents()
	case "frontend_test_coverage":
		return s.callGetFrontendTestCoverage()
	case "frontend_react_component_tests":
		return s.callGetComponentToTestMap()

	// New Frontend Analysis Tools
	case "frontend_api_client_analysis":
		return s.callGetFrontendAPIClientAnalysis()

	// New Backend Business Domain Tools
	case "get_business_domains":
		return s.callGetBusinessDomains()
	case "get_advanced_tooling":
		return s.callGetAdvancedTooling()
	case "get_keyword_extraction_services":
		return s.callGetKeywordExtractionServices()
	case "get_keyword_scanning_services":
		return s.callGetKeywordScanningServices()
	case "get_proxy_management_services":
		return s.callGetProxyManagementServices()
	case "get_keyword_set_api_specs":
		return s.callGetKeywordSetAPISpecs()
	case "get_proxy_pool_api_specs":
		return s.callGetProxyPoolAPISpecs()
	case "get_database_tooling_analysis":
		return s.callGetDatabaseToolingAnalysis()
	case "get_business_domain_routes":
		return s.callGetBusinessDomainRoutes()

	// Enhanced Dependency and Security Analysis Tools
	case "get_enhanced_dependencies":
		return s.callGetEnhancedDependencies()
	case "get_enhanced_security_analysis":
		return s.callGetEnhancedSecurityAnalysis()
	case "get_enhanced_api_schema":
		return s.callGetEnhancedAPISchema()

	// Business Domain Middleware and Dependencies
	case "get_business_domain_middleware":
		return s.callGetBusinessDomainMiddleware()
	case "get_internal_service_dependencies":
		return s.callGetInternalServiceDependencies()
	case "get_business_domain_cross_dependencies":
		return s.callGetBusinessDomainCrossDependencies()

	default:
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Unknown tool: %s", toolCall.Name),
				},
			},
		}, nil
	}
}
