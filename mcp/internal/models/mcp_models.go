package models

import (
	"encoding/json"
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
	Name     string `json:"name"`
	File     string `json:"file"`
	Line     int    `json:"line"`
	Receiver string `json:"receiver,omitempty"`
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
