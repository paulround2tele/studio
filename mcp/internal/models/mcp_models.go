package models

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
}

// Dependency represents a single Go module dependency.
type Dependency struct {
	Path    string `json:"path"`
	Version string `json:"version"`
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

// Workflow represents a potential business workflow identified in the code.
type Workflow struct {
	Name         string   `json:"name"`
	File         string   `json:"file"`
	ServiceCalls []string `json:"service_calls"`
	Description  string   `json:"description"`
}

// BusinessRule represents a function or method that appears to contain business logic.
type BusinessRule struct {
	Name        string `json:"name"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Description string `json:"description"`
}

// FeatureFlag represents a usage of a feature flag.
type FeatureFlag struct {
	Name        string `json:"name"`
	File        string `json:"file"`
	Line        int    `json:"line"`
	Description string `json:"description"`
}

// MiddlewareUsage represents an instance of a middleware being used by a route.
type MiddlewareUsage struct {
	MiddlewareName string `json:"middleware_name"`
	Route          Route  `json:"route"`
}

// Reference represents a single reference to a symbol.
type Reference struct {
	File string `json:"file"`
	Line int    `json:"line"`
	Text string `json:"text"`
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
}

// CommandResult represents the result of a terminal command
type CommandResult struct {
	Command  string `json:"command"`
	ExitCode int    `json:"exitCode"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	Duration string `json:"duration"`
}
