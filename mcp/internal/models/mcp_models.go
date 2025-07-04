package models

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Table represents a database table.
type Table struct {
	Name    string   `json:"name"`
	Columns []Column `json:"columns"`
	Indexes []Index  `json:"indexes"`
}

// Column represents a column in a database table.
type Column struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	IsNullable   bool   `json:"is_nullable"`
	DefaultValue string `json:"default_value,omitempty"`
}

// Index represents a database index.
type Index struct {
	Name     string   `json:"name"`
	Columns  []string `json:"columns"`
	IsUnique bool     `json:"is_unique"`
}

// Route represents an API route.
type Route struct {
	Method  string `json:"method"`
	Path    string `json:"path"`
	Handler string `json:"handler"`
}

// Handler represents an API handler function.
type Handler struct {
	Name string `json:"name"`
	File string `json:"file"`
}

// Service represents a service definition.
type Service struct {
	Name      string   `json:"name"`
	File      string   `json:"file"`
	Methods   []string `json:"methods"`
	Interface string   `json:"interface,omitempty"`
	Category  string   `json:"category,omitempty"`
}

// ConfigField represents a single field in the application's configuration.
type ConfigField struct {
	Name      string        `json:"name"`
	Type      string        `json:"type"`
	JSONTag   string        `json:"jsonTag"`
	SubFields []ConfigField `json:"subFields,omitempty"`
}

// Middleware represents a single middleware function.
type Middleware struct {
	Name           string `json:"name"`
	File           string `json:"file"`
	Line           int    `json:"line"`
	Receiver       string `json:"receiver,omitempty"`
	Type           string `json:"type,omitempty"`
	BusinessDomain string `json:"businessDomain,omitempty"`
}

// WebSocketEndpoint represents a route that establishes a WebSocket connection.
type WebSocketEndpoint struct {
	Method  string `json:"method"`
	Path    string `json:"path"`
	Handler string `json:"handler"`
}

// WebSocketHandler represents a function that handles WebSocket connections.
type WebSocketHandler struct {
	Name string `json:"name"`
	File string `json:"file"`
}

// WebSocketMessage represents a message sent or received over a WebSocket.
type WebSocketMessage struct {
	Name string `json:"name"`
	File string `json:"file"`
	Type string `json:"type"` // "sent" or "received"
}

// InterfaceDefinition represents a Go interface.
type InterfaceDefinition struct {
	Name    string   `json:"name"`
	File    string   `json:"file"`
	Methods []string `json:"methods"`
}

// Implementation represents a type that implements an interface.
type Implementation struct {
	TypeName      string `json:"type_name"`
	InterfaceName string `json:"interface_name"`
	File          string `json:"file"`
}

// CallGraphNode represents a function and its outgoing calls.
type CallGraphNode struct {
	FunctionName string   `json:"function_name"`
	Package      string   `json:"package"`
	File         string   `json:"file"`
	Calls        []string `json:"calls"`
	CallCount    int      `json:"callCount"`
}

// Dependency represents a single Go module dependency.
type Dependency struct {
	Path    string `json:"path"`
	Version string `json:"version"`
}

// DependencyEdge represents a directed edge between two packages.
type DependencyEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// DependencyGraph represents the package dependency graph.
// DOT contains an optional Graphviz representation.
type DependencyGraph struct {
	Nodes []string         `json:"nodes"`
	Edges []DependencyEdge `json:"edges"`
	DOT   string           `json:"dot,omitempty"`
}

// PackageStructureNode represents a node in the package structure tree.
type PackageStructureNode struct {
	Name     string                 `json:"name"`
	Path     string                 `json:"path"`
	Type     string                 `json:"type"` // "directory" or "file"
	Children []PackageStructureNode `json:"children,omitempty"`
}

// ApiSchema represents the schema of an API request or response object.
type ApiSchema struct {
	Name   string  `json:"name"`
	File   string  `json:"file"`
	Fields []Field `json:"fields"`
}

// Field represents a field in an API schema.
type Field struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Tag  string `json:"tag"`
}

// MiddlewareUsage represents an instance of a middleware being used by a route.
type MiddlewareUsage struct {
	MiddlewareName string `json:"middleware_name"`
	Route          Route  `json:"route"`
}

// Reference represents a code reference
type Reference struct {
	Name string `json:"name"`
	File string `json:"file"`
	Line int    `json:"line"`
	Type string `json:"type"`
}

// Workflow represents a business workflow
type Workflow struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Steps       []string `json:"steps"`
	Status      string   `json:"status"`
}

// BusinessRule represents a business rule
type BusinessRule struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Condition   string `json:"condition"`
	Action      string `json:"action"`
	Priority    int    `json:"priority"`
	Enabled     bool   `json:"enabled"`
}

// FeatureFlag represents a feature flag
type FeatureFlag struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
	File        string `json:"file"`
	Line        int    `json:"line"`
}

// GetReferencesRequest is the request for the get_references tool.
type GetReferencesRequest struct {
	Identifier string `json:"identifier"`
	File       string `json:"file,omitempty"`
	Line       int    `json:"line,omitempty"`
}

// GetChangeImpactRequest is the request for the get_change_impact tool.
type GetChangeImpactRequest struct {
	File string `json:"file"`
	Line int    `json:"line"`
}

// SnapshotResponse is the response for the snapshot tool.
type SnapshotResponse struct {
	StashID string `json:"stash_id"`
	Message string `json:"message"`
}

// ContractDriftCheckResponse is the response for the contract_drift_check tool.
type ContractDriftCheckResponse struct {
	Drift   bool     `json:"drift"`
	Details []string `json:"details"`
}

// RunTerminalCommandRequest is the request for the run_terminal_command tool.
type RunTerminalCommandRequest struct {
	Command string `json:"command"`
}

// RunTerminalCommandResponse is the response for the run_terminal_command tool.
type RunTerminalCommandResponse struct {
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
}

// ApplyCodeChangeRequest is the request for the apply_code_change tool.
type ApplyCodeChangeRequest struct {
	File string `json:"file"`
	Diff string `json:"diff"`
}

// GoModel represents a Go struct model
type GoModel struct {
	Name   string  `json:"name"`
	File   string  `json:"file"`
	Fields []Field `json:"fields"`
}

// SearchResult represents a code search result
type SearchResult struct {
	File    string `json:"file"`
	Line    int    `json:"line"`
	Column  int    `json:"column"`
	Content string `json:"content"`
	Context string `json:"context"`
}

// PackageStructure represents the complete package structure
type PackageStructure struct {
	Root     PackageStructureNode   `json:"root"`
	Packages []PackageStructureNode `json:"packages"`
}

// EnvVar represents an environment variable
type EnvVar struct {
	Name         string `json:"name"`
	DefaultValue string `json:"defaultValue,omitempty"`
	Required     bool   `json:"required"`
	Description  string `json:"description,omitempty"`
	File         string `json:"file"`
	Line         int    `json:"line"`
}

// ChangeImpact represents the impact of a code change
type ChangeImpact struct {
	File              string      `json:"file"`
	AffectedFunctions []Reference `json:"affectedFunctions"`
	AffectedTypes     []Reference `json:"affectedTypes"`
	AffectedTests     []Reference `json:"affectedTests"`
	RiskLevel         string      `json:"riskLevel"`
	FilesAffected     int         `json:"filesAffected"`
	Severity          string      `json:"severity"`
}

// Snapshot represents a code snapshot
type Snapshot struct {
	ID          string   `json:"id"`
	Description string   `json:"description"`
	Timestamp   string   `json:"timestamp"`
	Files       []string `json:"files"`
}

// ContractDrift represents API contract drift information
type ContractDrift struct {
	HasDrift      bool     `json:"hasDrift"`
	ChangedRoutes []string `json:"changedRoutes"`
	AddedRoutes   []string `json:"addedRoutes"`
	RemovedRoutes []string `json:"removedRoutes"`
	Details       []string `json:"details"`
	IssuesFound   int      `json:"issuesFound"`
	Status        string   `json:"status"`
}

// CommandResult represents the result of a terminal command
type CommandResult struct {
	Command  string `json:"command"`
	ExitCode int    `json:"exitCode"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	Duration string `json:"duration"`
}

// PlaywrightResult represents the output of a Playwright browser run
type PlaywrightResult struct {
	URL        string `json:"url"`
	HTML       string `json:"html"`
	Screenshot string `json:"screenshot"`
	HTMLPath   string `json:"html_path,omitempty"`
}

// UIComponent represents a single UI element extracted from the DOM
type UIComponent struct {
	Name    string   `json:"name,omitempty"`
	Tag     string   `json:"tag,omitempty"`
	ID      string   `json:"id,omitempty"`
	Role    string   `json:"role,omitempty"`
	Classes []string `json:"classes,omitempty"`
	Styles  []string `json:"styles,omitempty"`
}

// UIContent holds visible text and accessibility information for a component
type UIContent struct {
	Component string            `json:"component"`
	Text      string            `json:"text,omitempty"`
	Alt       string            `json:"alt,omitempty"`
	ARIA      map[string]string `json:"aria,omitempty"`
}

// CodeMap maps a UI component to a source file snippet
type CodeMap struct {
	Component string `json:"component"`
	File      string `json:"file"`
	Snippet   string `json:"snippet"`
}

// Point represents a coordinate point with optional timing and pressure for gestures
type Point struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Delay    int     `json:"delay,omitempty"`
	Pressure float64 `json:"pressure,omitempty"`
}

// UIAction describes an automated browser action for Playwright
type UIAction struct {
	// Existing fields (maintained for backward compatibility)
	Action   string `json:"action"`
	Selector string `json:"selector,omitempty"`
	Text     string `json:"text,omitempty"`
	URL      string `json:"url,omitempty"`
	Timeout  int    `json:"timeout,omitempty"`
	
	// Coordinate fields for precise positioning
	X    *float64 `json:"x,omitempty"`
	Y    *float64 `json:"y,omitempty"`
	ToX  *float64 `json:"toX,omitempty"`
	ToY  *float64 `json:"toY,omitempty"`
	
	// Mouse configuration
	Button string `json:"button,omitempty"`
	Clicks int    `json:"clicks,omitempty"`
	Delay  int    `json:"delay,omitempty"`
	
	// Coordinate system options
	CoordSystem string `json:"coordSystem,omitempty"`
	RelativeTo  string `json:"relativeTo,omitempty"`
	
	// Gesture support
	Points   []Point `json:"points,omitempty"`
	Pressure float64 `json:"pressure,omitempty"`
	Smooth   bool    `json:"smooth,omitempty"`
	
	// Scroll configuration
	ScrollX     *float64 `json:"scrollX,omitempty"`
	ScrollY     *float64 `json:"scrollY,omitempty"`
	ScrollDelta int      `json:"scrollDelta,omitempty"`
}

// ValidateCoordinateAction validates coordinate-based actions in UIAction
func (ua *UIAction) ValidateCoordinateAction() error {
	// Check for coordinate-based actions
	coordinateActions := map[string]bool{
		"click":       true,
		"hover":       true,
		"drag":        true,
		"scroll":      true,
		"gesture":     true,
		"mouse_move":  true,
		"mouse_down":  true,
		"mouse_up":    true,
	}
	
	if !coordinateActions[ua.Action] {
		return nil // Non-coordinate actions don't need validation
	}
	
	// Validate coordinate requirements
	switch ua.Action {
	case "click", "hover", "mouse_move", "mouse_down", "mouse_up":
		if ua.X == nil || ua.Y == nil {
			return fmt.Errorf("action '%s' requires X and Y coordinates", ua.Action)
		}
	case "drag":
		if ua.X == nil || ua.Y == nil || ua.ToX == nil || ua.ToY == nil {
			return fmt.Errorf("action '%s' requires X, Y, ToX, and ToY coordinates", ua.Action)
		}
	case "scroll":
		if ua.ScrollX == nil && ua.ScrollY == nil && ua.ScrollDelta == 0 {
			return fmt.Errorf("action '%s' requires scrollX, scrollY, or scrollDelta", ua.Action)
		}
	case "gesture":
		if len(ua.Points) < 2 {
			return fmt.Errorf("action '%s' requires at least 2 points", ua.Action)
		}
	}
	
	// Validate coordinate system if specified
	if ua.CoordSystem != "" {
		validSystems := map[string]bool{
			"viewport": true,
			"element":  true,
			"page":     true,
		}
		if !validSystems[ua.CoordSystem] {
			return fmt.Errorf("invalid coordinate system: %s", ua.CoordSystem)
		}
	}
	
	return nil
}

// UIScreenshot represents the screenshot location or encoded data
type UIScreenshot struct {
	Path   string `json:"path,omitempty"`
	Base64 string `json:"base64,omitempty"`
}

// UIPromptPayload aggregates visual context for LLM consumption
type UIPromptPayload struct {
	Screenshot UIScreenshot  `json:"screenshot"`
	Metadata   []UIComponent `json:"metadata"`
	CodeMap    []CodeMap     `json:"code_connect"`
	Content    []UIContent   `json:"content"`
	HTML       string        `json:"html,omitempty"`
	URL        string        `json:"url,omitempty"`
}

// MCP Protocol Types

// MCPRequest represents a generic MCP request
type MCPRequest struct {
	Method string          `json:"method"`
	Params json.RawMessage `json:"params,omitempty"`
}

// MCPResponse represents a generic MCP response
type MCPResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// MCPInitializeParams represents MCP initialize parameters
type MCPInitializeParams struct {
	ProtocolVersion string                 `json:"protocolVersion"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	ClientInfo      struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"clientInfo"`
}

// MCPInitializeResult represents MCP initialize result
type MCPInitializeResult struct {
	ProtocolVersion string                 `json:"protocolVersion"`
	Capabilities    map[string]interface{} `json:"capabilities"`
	ServerInfo      struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"serverInfo"`
	Tools []MCPTool `json:"tools"`
}

// MCPTool represents an MCP tool definition
type MCPTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"inputSchema"`
}

// MCPToolCall represents an MCP tool call
type MCPToolCall struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// GoFile represents a Go source file for analysis
type GoFile struct {
	Name        string   `json:"name"`
	Path        string   `json:"path"`
	Package     string   `json:"package"`
	PackageName string   `json:"packageName"`
	Imports     []string `json:"imports"`
	Functions   []string `json:"functions"`
	Types       []string `json:"types"`
	Structs     []string `json:"structs"`
	Interfaces  []string `json:"interfaces"`
}

// ValidationRule represents a data validation rule
type ValidationRule struct {
	Field       string `json:"field"`
	Rule        string `json:"rule"`
	Message     string `json:"message"`
	File        string `json:"file"`
	LineNumber  int    `json:"line_number"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Pattern     string `json:"pattern"`
	Severity    string `json:"severity"`
}

// ErrorHandler represents an error handling pattern
type ErrorHandler struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	File        string `json:"file"`
	Middleware  string `json:"middleware,omitempty"`
	Description string `json:"description"`
	Pattern     string `json:"pattern"`
	Location    string `json:"location"`
}

// SecurityPolicy represents a security policy or access control
type SecurityPolicy struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Rules       []string `json:"rules"`
	File        string   `json:"file"`
	Enabled     bool     `json:"enabled"`
	Description string   `json:"description"`
	Pattern     string   `json:"pattern"`
	Location    string   `json:"location"`
}

// PerformanceMetrics represents performance analysis results
type PerformanceMetrics struct {
	ResponseTime    float64 `json:"responseTime"`
	Throughput      float64 `json:"throughput"`
	MemoryUsage     int64   `json:"memoryUsage"`
	CPUUsage        float64 `json:"cpuUsage"`
	DatabaseQueries int     `json:"databaseQueries"`
	CacheHits       int     `json:"cacheHits"`
	Name            string  `json:"name"`
	Type            string  `json:"type"`
	File            string  `json:"file"`
	Description     string  `json:"description"`
	Pattern         string  `json:"pattern"`
	Location        string  `json:"location"`
	Value           string  `json:"value"`
	Threshold       string  `json:"threshold"`
	Status          string  `json:"status"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID          string `json:"id"`
	Timestamp   string `json:"timestamp"`
	Action      string `json:"action"`
	User        string `json:"user"`
	UserID      string `json:"userID"`
	Resource    string `json:"resource"`
	Details     string `json:"details"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	File        string `json:"file"`
	Description string `json:"description"`
	Pattern     string `json:"pattern"`
	Location    string `json:"location"`
}

// DatabaseStats represents database statistics
type DatabaseStats struct {
	TotalTables      int     `json:"totalTables"`
	TotalColumns     int     `json:"totalColumns"`
	TotalIndexes     int     `json:"totalIndexes"`
	DatabaseSize     int64   `json:"databaseSize"`
	ConnectionCount  int     `json:"connectionCount"`
	QueryPerformance float64 `json:"queryPerformance"`
}

// SecurityAnalysis represents security analysis results
type SecurityAnalysis struct {
	VulnerabilitiesFound int      `json:"vulnerabilitiesFound"`
	SecurityScore        float64  `json:"securityScore"`
	Recommendations      []string `json:"recommendations"`
	CriticalIssues       []string `json:"criticalIssues"`
	RiskLevel            string   `json:"riskLevel"`
}

// APIContractValidation represents API contract validation results
type APIContractValidation struct {
	ContractsValidated int    `json:"contractsValidated"`
	ErrorsFound        int    `json:"errorsFound"`
	WarningsFound      int    `json:"warningsFound"`
	Status             string `json:"status"`
}

// TestCoverage represents test coverage metrics
type TestCoverage struct {
	OverallPercentage float64 `json:"overallPercentage"`
	FilesCovered      int     `json:"filesCovered"`
	TotalFiles        int     `json:"totalFiles"`
	LinesCovered      int     `json:"linesCovered"`
	TotalLines        int     `json:"totalLines"`
}

// CodeQuality represents code quality analysis
type CodeQuality struct {
	Score           float64  `json:"score"`
	IssuesFound     int      `json:"issuesFound"`
	TechnicalDebt   string   `json:"technicalDebt"`
	Maintainability string   `json:"maintainability"`
	Complexity      string   `json:"complexity"`
	LinterIssues    []string `json:"linterIssues"`
}

// ComplexityReport represents cyclomatic complexity results for a function
type ComplexityReport struct {
	Function   string `json:"function"`
	File       string `json:"file"`
	Line       int    `json:"line"`
	Complexity int    `json:"complexity"`
}

// FrontendRoute represents a Next.js frontend route
type FrontendRoute struct {
	Path string `json:"path"`
	File string `json:"file"`
}

// ComponentTreeNode represents a React component and its children
type ComponentTreeNode struct {
	Name     string   `json:"name"`
	File     string   `json:"file"`
	Children []string `json:"children,omitempty"`
}

// ComponentPropsAndEvents captures props and events for a component
type ComponentPropsAndEvents struct {
	Component string   `json:"component"`
	File      string   `json:"file"`
	Props     []string `json:"props,omitempty"`
	Events    []string `json:"events,omitempty"`
}

// ComponentTestMap links a component to the test files that reference it
type ComponentTestMap struct {
	Component string   `json:"component"`
	File      string   `json:"file"`
	Tests     []string `json:"tests"`
}

// API Schema models
type APISchema struct {
	OpenAPIVersion  string                 `json:"openapi_version"`
	Endpoints       []string               `json:"endpoints"`
	Methods         []string               `json:"methods"`
	SchemaFiles     []string               `json:"schema_files"`
	ValidationRules map[string]interface{} `json:"validation_rules"`
}

// Middleware Flow models
type MiddlewareStep struct {
	Name          string `json:"name"`
	Order         int    `json:"order"`
	ExecutionTime string `json:"execution_time"`
	Status        string `json:"status"`
}

type MiddlewareFlow struct {
	Pipeline           []MiddlewareStep `json:"pipeline"`
	TotalExecutionTime string           `json:"total_execution_time"`
	BottleneckDetected bool             `json:"bottleneck_detected"`
	Recommendations    []string         `json:"recommendations"`
}

// WebSocket Lifecycle models
type WSConnectionState struct {
	State    string `json:"state"`
	Count    int    `json:"count"`
	Duration string `json:"duration"`
}

type WSEvent struct {
	Type     string `json:"type"`
	Count    int    `json:"count"`
	LastSeen string `json:"last_seen"`
}

type WebSocketLifecycle struct {
	ConnectionStates  []WSConnectionState `json:"connection_states"`
	Events            []WSEvent           `json:"events"`
	ActiveConnections int                 `json:"active_connections"`
	TotalConnections  int                 `json:"total_connections"`
	MessageThroughput string              `json:"message_throughput"`
}

// WebSocket Test models
type WSTestStep struct {
	Name     string `json:"name"`
	Status   string `json:"status"`
	Duration string `json:"duration"`
	Details  string `json:"details"`
}

type WebSocketTestResult struct {
	ConnectionTest  WSTestStep   `json:"connection_test"`
	MessageTests    []WSTestStep `json:"message_tests"`
	OverallStatus   string       `json:"overall_status"`
	TotalDuration   string       `json:"total_duration"`
	Recommendations []string     `json:"recommendations"`
	Errors          []string     `json:"errors"`
}

// LintDiagnostics represents lint and build diagnostics
type LintDiagnostics struct {
	Linter        string   `json:"linter"`
	Issues        []string `json:"issues"`
	CompileErrors []string `json:"compileErrors"`
}

// PipelineStep represents a single step in a campaign pipeline
type PipelineStep struct {
	Name       string    `json:"name"`
	Status     string    `json:"status"`
	StartedAt  time.Time `json:"startedAt"`
	FinishedAt time.Time `json:"finishedAt"`
}

// CampaignPipeline visualizes the steps of a campaign
type CampaignPipeline struct {
	CampaignID uuid.UUID      `json:"campaignId"`
	Steps      []PipelineStep `json:"steps"`
}

// Campaign type constants for pipeline steps
const (
	CampaignTypeDomainGeneration      = "domain_generation"
	CampaignTypeDNSValidation         = "dns_validation"
	CampaignTypeHTTPKeywordValidation = "http_keyword_validation"
)

// BusinessDomain represents a business domain within the application
type BusinessDomain struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Path        string   `json:"path"`
	Services    []string `json:"services"`
	APIs        []string `json:"apis"`
}

// AdvancedTool represents advanced development and database tooling
type AdvancedTool struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Description string `json:"description"`
	Path        string `json:"path"`
	Category    string `json:"category"`
}

// ===== INCREMENTAL UI STATE STREAMING MODELS =====

// DOMOperation represents the type of DOM change
type DOMOperation string

const (
	DOMOpAdd        DOMOperation = "add"        // Node added
	DOMOpRemove     DOMOperation = "remove"     // Node removed
	DOMOpModify     DOMOperation = "modify"     // Node modified
	DOMOpAttribute  DOMOperation = "attribute"  // Attribute changed
	DOMOpText       DOMOperation = "text"       // Text content changed
	DOMOpStyle      DOMOperation = "style"      // Style changed
	DOMOpClass      DOMOperation = "class"      // Class list changed
)

// ChangeType represents the category of UI change
type ChangeType string

const (
	ChangeTypeDOM        ChangeType = "dom"        // DOM structure change
	ChangeTypeVisual     ChangeType = "visual"     // Visual/style change
	ChangeTypeContent    ChangeType = "content"    // Text/content change
	ChangeTypeInteraction ChangeType = "interaction" // Interactive element change
	ChangeTypeLayout     ChangeType = "layout"     // Layout/positioning change
)

// ChangePriority represents the importance of a change for AI decision-making
type ChangePriority int

const (
	PriorityLow      ChangePriority = 1 // Style changes, animations
	PriorityMedium   ChangePriority = 2 // Content updates, form changes
	PriorityHigh     ChangePriority = 3 // Navigation, modal dialogs
	PriorityCritical ChangePriority = 4 // Error states, security prompts
)

// StreamingMode controls how UI state is captured and transmitted
type StreamingMode string

const (
	StreamingModeFull        StreamingMode = "full"        // Current full capture behavior
	StreamingModeIncremental StreamingMode = "incremental" // Delta-based streaming
	StreamingModeAdaptive    StreamingMode = "adaptive"    // Smart switching based on change size
)

// CompressionType specifies the compression algorithm used for data
type CompressionType string

const (
	CompressionNone   CompressionType = "none"
	CompressionGzip   CompressionType = "gzip"
	CompressionBrotli CompressionType = "brotli"
	CompressionDelta  CompressionType = "delta"  // Binary delta compression
	CompressionWebP   CompressionType = "webp"   // WebP image compression
)

// MessageType represents the type of streaming message
type MessageType string

const (
	MsgTypeIncremental MessageType = "incremental"
	MsgTypeSnapshot    MessageType = "snapshot"
	MsgTypeHeartbeat   MessageType = "heartbeat"
	MsgTypeResync      MessageType = "resync"
)

// MessagePriority controls message delivery order
type MessagePriority int

const (
	MsgPriorityLow    MessagePriority = 1
	MsgPriorityNormal MessagePriority = 2
	MsgPriorityHigh   MessagePriority = 3
	MsgPriorityUrgent MessagePriority = 4
)

// Rectangle represents a bounding box for screenshots and element positioning
type Rectangle struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// DOMDelta represents a single change to the DOM structure
type DOMDelta struct {
	OperationType DOMOperation          `json:"operation"`
	TargetPath    string                `json:"target_path"`    // CSS selector path
	ElementID     string                `json:"element_id,omitempty"`
	OldValue      interface{}           `json:"old_value,omitempty"`
	NewValue      interface{}           `json:"new_value,omitempty"`
	Attributes    map[string]string     `json:"attributes,omitempty"`
	BoundingRect  *Rectangle            `json:"bounding_rect,omitempty"`
	ChildNodes    []string              `json:"child_nodes,omitempty"`  // For add/remove operations
	TextContent   string                `json:"text_content,omitempty"`
	Timestamp     int64                 `json:"timestamp"`              // Microsecond precision
}

// ScreenshotRegion represents a selective screenshot of a page region
type ScreenshotRegion struct {
	RegionID     string     `json:"region_id"`
	BoundingBox  Rectangle  `json:"bounding_box"`
	ImageData    []byte     `json:"image_data"`          // Compressed image data
	Encoding     string     `json:"encoding"`            // "webp", "jpeg", "png"
	ChangeHash   string     `json:"change_hash"`         // For deduplication
	Compression  float64    `json:"compression_ratio"`   // Achieved compression ratio
	IsDiff       bool       `json:"is_diff"`             // True if this is a diff image
	BaseRegionID string     `json:"base_region_id,omitempty"` // For diff images
}

// ChangeMetadata provides context about what triggered the change
type ChangeMetadata struct {
	TriggerAction     string         `json:"trigger_action"`      // Action that caused the change
	AffectedAreas     []string       `json:"affected_areas"`      // CSS selectors of affected elements
	ComponentTypes    []string       `json:"component_types"`     // Types of components affected
	Priority          ChangePriority `json:"priority"`
	CompressedSize    int            `json:"compressed_size"`     // Size after compression
	OriginalSize      int            `json:"original_size"`       // Size before compression
	ProcessingTime    int64          `json:"processing_time_us"`  // Time to process changes (microseconds)
	DetectionLatency  int64          `json:"detection_latency_us"` // Time from action to detection
	NetworkLatency    int64          `json:"network_latency_us,omitempty"` // Network transmission time
}

// IncrementalState represents a single incremental update to UI state
type IncrementalState struct {
	SessionID      string                 `json:"session_id"`
	SequenceNum    int64                  `json:"sequence_num"`
	Timestamp      time.Time              `json:"timestamp"`
	ChangeType     ChangeType             `json:"change_type"`
	DOMDeltas      []DOMDelta             `json:"dom_deltas,omitempty"`
	ScreenRegions  []ScreenshotRegion     `json:"screen_regions,omitempty"`
	ComponentState map[string]interface{} `json:"component_state,omitempty"`
	Metadata       ChangeMetadata         `json:"metadata"`
	PreviousState  string                 `json:"previous_state_id,omitempty"` // Reference to previous state
	Checksum       string                 `json:"checksum"`                    // Integrity verification
}

// DOMSnapshot represents a complete DOM state for reconstruction
type DOMSnapshot struct {
	ElementTree  map[string]DOMElement `json:"element_tree"`
	VisibleNodes []string              `json:"visible_nodes"`
	Checksum     string                `json:"checksum"`
	CapturedAt   time.Time             `json:"captured_at"`
	ViewportSize Rectangle             `json:"viewport_size"`
}

// DOMElement represents a DOM element in the snapshot
type DOMElement struct {
	TagName      string                `json:"tag_name"`
	Attributes   map[string]string     `json:"attributes,omitempty"`
	TextContent  string                `json:"text_content,omitempty"`
	BoundingRect Rectangle             `json:"bounding_rect"`
	Children     []string              `json:"children,omitempty"`
	Parent       string                `json:"parent,omitempty"`
	IsVisible    bool                  `json:"is_visible"`
	ComputedStyle map[string]string    `json:"computed_style,omitempty"`
}

// StateCache manages the current UI state for incremental updates
type StateCache struct {
	CurrentDOM      *DOMSnapshot           `json:"current_dom"`
	ScreenshotCache map[string][]byte      `json:"screenshot_cache"`
	ComponentStates map[string]interface{} `json:"component_states"`
	LastUpdate      time.Time              `json:"last_update"`
	Version         int64                  `json:"version"`
	SessionID       string                 `json:"session_id"`
	MaxCacheSize    int                    `json:"max_cache_size"`
	CacheHitRate    float64                `json:"cache_hit_rate"`
}

// StreamMessage represents a message in the incremental streaming protocol
type StreamMessage struct {
	Type         MessageType      `json:"type"`
	SessionID    string           `json:"session_id"`
	SequenceNum  int64            `json:"sequence_num"`
	Payload      interface{}      `json:"payload"`
	Compression  CompressionType  `json:"compression"`
	Priority     MessagePriority  `json:"priority"`
	Timestamp    time.Time        `json:"timestamp"`
	Size         int              `json:"size"`          // Message size in bytes
	Checksum     string           `json:"checksum"`      // Message integrity check
}

// CompressedDelta represents a compressed set of changes
type CompressedDelta struct {
	DOMDiff         []byte  `json:"dom_diff"`          // Compressed DOM changes
	ImageDiffs      []byte  `json:"image_diffs"`       // Compressed image changes
	StateDiff       []byte  `json:"state_diff"`        // Compressed state changes
	CompressionType string  `json:"compression_type"`
	CompressionRatio float64 `json:"compression_ratio"`
	OriginalSize    int     `json:"original_size"`
	CompressedSize  int     `json:"compressed_size"`
}

// IncrementalUIAction extends UIAction with incremental streaming capabilities
type IncrementalUIAction struct {
	UIAction                               // Embed existing action
	
	// Incremental-specific fields
	ExpectedChanges   []string        `json:"expected_changes"`   // CSS selectors of elements expected to change
	RegionsOfInterest []Rectangle     `json:"regions_of_interest"` // Specific regions to monitor
	StreamingMode     StreamingMode   `json:"streaming_mode"`
	FeedbackInterval  time.Duration   `json:"feedback_interval"`   // How often to send updates
	MaxDeltaSize      int             `json:"max_delta_size"`      // Switch to snapshot if delta exceeds this
	RequireVisual     bool            `json:"require_visual"`      // Whether visual confirmation is needed
	Priority          ChangePriority  `json:"priority"`            // Priority for processing
}

// IncrementalSession manages a streaming session
type IncrementalSession struct {
	SessionID      string                    `json:"session_id"`
	StartURL       string                    `json:"start_url"`
	Mode           StreamingMode             `json:"mode"`
	StateCache     *StateCache               `json:"state_cache"`
	ChangeStream   chan *IncrementalState    `json:"-"`                  // Not serialized
	StartTime      time.Time                 `json:"start_time"`
	LastActivity   time.Time                 `json:"last_activity"`
	TotalChanges   int64                     `json:"total_changes"`
	BytesSaved     int64                     `json:"bytes_saved"`        // Bytes saved vs full capture
	CompressionAvg float64                   `json:"compression_avg"`    // Average compression ratio
	IsActive       bool                      `json:"is_active"`
}

// StreamingThresholds defines when to switch between streaming modes
type StreamingThresholds struct {
	MaxDeltaSize        int           `json:"max_delta_size"`        // Switch to snapshot if delta too large
	MaxRegionCount      int           `json:"max_region_count"`      // Limit screenshot regions
	CompressionRatio    float64       `json:"compression_ratio"`     // Minimum compression efficiency
	LatencyThreshold    time.Duration `json:"latency_threshold"`     // Maximum acceptable delay
	MemoryThreshold     int64         `json:"memory_threshold"`      // Maximum memory usage
	CacheHitThreshold   float64       `json:"cache_hit_threshold"`   // Minimum cache hit rate
}

// PerformanceTracker monitors streaming performance
type PerformanceTracker struct {
	NetworkLatency     time.Duration `json:"network_latency"`
	CompressionLatency time.Duration `json:"compression_latency"`
	DetectionLatency   time.Duration `json:"detection_latency"`
	MemoryUsage        int64         `json:"memory_usage"`
	CacheHitRate       float64       `json:"cache_hit_rate"`
	ThroughputMbps     float64       `json:"throughput_mbps"`
	ErrorRate          float64       `json:"error_rate"`
	LastUpdated        time.Time     `json:"last_updated"`
}

// EnhancedUIPromptPayload extends UIPromptPayload with incremental data
type EnhancedUIPromptPayload struct {
	UIPromptPayload                    // Embed existing payload
	
	// Incremental enhancements
	IncrementalState *IncrementalState `json:"incremental_state,omitempty"`
	SessionID        string            `json:"session_id"`
	SequenceNum      int64             `json:"sequence_num"`
	IsIncremental    bool              `json:"is_incremental"`
	TokenReduction   float64           `json:"token_reduction"`    // Percentage reduction vs full capture
	ProcessingTime   time.Duration     `json:"processing_time"`
	QualityScore     float64           `json:"quality_score"`      // Visual fidelity score (0-1)
}

// ValidateIncrementalAction validates incremental-specific action parameters
func (iua *IncrementalUIAction) ValidateIncrementalAction() error {
	// Validate base UIAction first
	if err := iua.UIAction.ValidateCoordinateAction(); err != nil {
		return err
	}
	
	// Validate streaming mode
	validModes := map[StreamingMode]bool{
		StreamingModeFull:        true,
		StreamingModeIncremental: true,
		StreamingModeAdaptive:    true,
	}
	if !validModes[iua.StreamingMode] {
		return fmt.Errorf("invalid streaming mode: %s", iua.StreamingMode)
	}
	
	// Validate feedback interval
	if iua.FeedbackInterval < 0 {
		return fmt.Errorf("feedback interval cannot be negative")
	}
	
	// Validate max delta size
	if iua.MaxDeltaSize < 0 {
		return fmt.Errorf("max delta size cannot be negative")
	}
	
	// Validate regions of interest
	for i, region := range iua.RegionsOfInterest {
		if region.Width <= 0 || region.Height <= 0 {
			return fmt.Errorf("region %d has invalid dimensions", i)
		}
	}
	
	return nil
}

// CalculateTokenReduction estimates the token reduction compared to full capture
func (payload *EnhancedUIPromptPayload) CalculateTokenReduction() float64 {
	if payload.IncrementalState == nil {
		return 0.0
	}
	
	// Estimate tokens for full payload
	fullTokens := len(payload.HTML) + len(payload.Screenshot.Base64)
	for _, comp := range payload.Metadata {
		fullTokens += len(comp.Name) + len(comp.Tag) + len(comp.ID)
	}
	
	// Estimate tokens for incremental payload
	incrementalTokens := 0
	for _, delta := range payload.IncrementalState.DOMDeltas {
		incrementalTokens += len(delta.TargetPath) + len(delta.TextContent)
	}
	for _, region := range payload.IncrementalState.ScreenRegions {
		incrementalTokens += len(region.ImageData)
	}
	
	if fullTokens == 0 {
		return 0.0
	}
	
	reduction := 1.0 - (float64(incrementalTokens) / float64(fullTokens))
	if reduction < 0 {
		reduction = 0.0
	}
	
	return reduction
}

// GetCompressionRatio returns the achieved compression ratio
func (delta *CompressedDelta) GetCompressionRatio() float64 {
	if delta.OriginalSize == 0 {
		return 0.0
	}
	return float64(delta.CompressedSize) / float64(delta.OriginalSize)
}

// IsExpired checks if the session has expired based on activity
func (session *IncrementalSession) IsExpired(timeout time.Duration) bool {
	return time.Since(session.LastActivity) > timeout
}

// UpdateActivity updates the last activity timestamp
func (session *IncrementalSession) UpdateActivity() {
	session.LastActivity = time.Now()
}

// EstimateBandwidthSavings calculates bandwidth savings compared to full capture
func (session *IncrementalSession) EstimateBandwidthSavings(fullCaptureSize int64) float64 {
	if session.BytesSaved == 0 || fullCaptureSize == 0 {
		return 0.0
	}
	
	estimatedFullSize := fullCaptureSize * session.TotalChanges
	return float64(session.BytesSaved) / float64(estimatedFullSize)
}

// === BRIDGE INTEGRATION MODELS ===

// IncrementalBrowseResult represents the result of incremental browsing
type IncrementalBrowseResult struct {
	Type          string                `json:"type"`             // "initial" or "delta"
	SessionID     string                `json:"session_id"`
	URL           string                `json:"url"`
	HTML          string                `json:"html,omitempty"`   // Full HTML for initial, empty for delta
	Screenshot    string                `json:"screenshot,omitempty"` // Full screenshot for initial, empty for delta
	Delta         *DOMDelta             `json:"delta,omitempty"`
	Regions       []ScreenshotRegion    `json:"regions,omitempty"`
	CompressedData *CompressedDelta     `json:"compressed_data,omitempty"`
	TokenSavings  int                   `json:"token_savings"`
}

// IncrementalActionResult represents the result of an incremental action
type IncrementalActionResult struct {
	SessionID     string                `json:"session_id"`
	ActionType    string                `json:"action_type"`
	Success       bool                  `json:"success"`
	Delta         *DOMDelta             `json:"delta,omitempty"`
	Regions       []ScreenshotRegion    `json:"regions,omitempty"`
	CompressedData *CompressedDelta     `json:"compressed_data,omitempty"`
	TokenSavings  int                   `json:"token_savings"`
	Timestamp     time.Time             `json:"timestamp"`
}

// StreamingStats represents performance and usage statistics for streaming
type StreamingStats struct {
	SessionID       string            `json:"session_id"`
	URL             string            `json:"url"`
	StreamingMode   StreamingMode     `json:"streaming_mode"`
	TotalActions    int64             `json:"total_actions"`
	TotalDeltas     int64             `json:"total_deltas"`
	TokensSaved     int64             `json:"tokens_saved"`
	CompressionRatio float64          `json:"compression_ratio"`
	SessionDuration time.Duration     `json:"session_duration"`
	LastUpdate      time.Time         `json:"last_update"`
}
