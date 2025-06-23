package models

import (
	"time"
)

// MCP Message Types

// MCPRequest represents an incoming MCP request
type MCPRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

// MCPResponse represents an outgoing MCP response
type MCPResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *MCPError   `json:"error,omitempty"`
}

// MCPError represents an MCP error
type MCPError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Tool Request/Response Types

// ToolRequest represents a tool invocation request
type ToolRequest struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments,omitempty"`
}

// ToolResponse represents a tool invocation response
type ToolResponse struct {
	Content []ContentBlock `json:"content"`
	IsError bool           `json:"isError,omitempty"`
}

// ContentBlock represents a content block in the response
type ContentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Studio Backend Context Types

// ModelInfo represents information about a Go struct/type
type ModelInfo struct {
	Name        string      `json:"name"`
	Package     string      `json:"package"`
	Type        string      `json:"type"`
	Description string      `json:"description,omitempty"`
	Fields      []FieldInfo `json:"fields,omitempty"`
	Methods     []Method    `json:"methods,omitempty"`
	Tags        []string    `json:"tags,omitempty"`
}

// FieldInfo represents information about a struct field
type FieldInfo struct {
	Name         string            `json:"name"`
	Type         string            `json:"type"`
	JSONTag      string            `json:"jsonTag,omitempty"`
	DBTag        string            `json:"dbTag,omitempty"`
	ValidateTag  string            `json:"validateTag,omitempty"`
	Description  string            `json:"description,omitempty"`
	IsRequired   bool              `json:"isRequired"`
	IsPrimaryKey bool              `json:"isPrimaryKey"`
	IsReference  bool              `json:"isReference"`
	RefModel     string            `json:"refModel,omitempty"`
	ExtraTags    map[string]string `json:"extraTags,omitempty"`
}

// EnumInfo represents information about an enum type
type EnumInfo struct {
	Name        string      `json:"name"`
	Package     string      `json:"package"`
	Type        string      `json:"type"`
	Description string      `json:"description,omitempty"`
	Values      []EnumValue `json:"values"`
}

// EnumValue represents a single enum value
type EnumValue struct {
	Name        string `json:"name"`
	Value       string `json:"value"`
	Description string `json:"description,omitempty"`
}

// InterfaceInfo represents information about an interface
type InterfaceInfo struct {
	Name        string   `json:"name"`
	Package     string   `json:"package"`
	Description string   `json:"description,omitempty"`
	Methods     []Method `json:"methods"`
}

// Method represents a method signature
type Method struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Parameters  []Parameter `json:"parameters,omitempty"`
	Returns     []Parameter `json:"returns,omitempty"`
}

// Parameter represents a method parameter or return value
type Parameter struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// EndpointInfo represents information about an API endpoint
type EndpointInfo struct {
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	Handler     string            `json:"handler"`
	Package     string            `json:"package"`
	Description string            `json:"description,omitempty"`
	Parameters  []EndpointParam   `json:"parameters,omitempty"`
	Response    *ResponseInfo     `json:"response,omitempty"`
	Middleware  []string          `json:"middleware,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Auth        *AuthRequirement  `json:"auth,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// EndpointParam represents an endpoint parameter
type EndpointParam struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	In          string `json:"in"` // query, path, body, header
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
}

// ResponseInfo represents response information
type ResponseInfo struct {
	Type        string `json:"type"`
	Description string `json:"description,omitempty"`
	Example     string `json:"example,omitempty"`
}

// AuthRequirement represents authentication requirements
type AuthRequirement struct {
	Required    bool     `json:"required"`
	Type        string   `json:"type"` // session, api_key, etc.
	Permissions []string `json:"permissions,omitempty"`
}

// TableInfo represents database table information
type TableInfo struct {
	Name        string         `json:"name"`
	Schema      string         `json:"schema"`
	Description string         `json:"description,omitempty"`
	Columns     []ColumnInfo   `json:"columns"`
	Indexes     []IndexInfo    `json:"indexes,omitempty"`
	ForeignKeys []ForeignKey   `json:"foreignKeys,omitempty"`
	Constraints []Constraint   `json:"constraints,omitempty"`
	Triggers    []TriggerInfo  `json:"triggers,omitempty"`
	Stats       *TableStats    `json:"stats,omitempty"`
}

// ColumnInfo represents database column information
type ColumnInfo struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Nullable     bool   `json:"nullable"`
	Default      string `json:"default,omitempty"`
	PrimaryKey   bool   `json:"primaryKey"`
	AutoIncrement bool  `json:"autoIncrement"`
	Description  string `json:"description,omitempty"`
	Length       int    `json:"length,omitempty"`
	Precision    int    `json:"precision,omitempty"`
	Scale        int    `json:"scale,omitempty"`
}

// IndexInfo represents database index information
type IndexInfo struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique"`
	Type    string   `json:"type,omitempty"`
	Method  string   `json:"method,omitempty"`
}

// ForeignKey represents a foreign key relationship
type ForeignKey struct {
	Name              string   `json:"name"`
	Columns           []string `json:"columns"`
	ReferencedTable   string   `json:"referencedTable"`
	ReferencedColumns []string `json:"referencedColumns"`
	OnDelete          string   `json:"onDelete,omitempty"`
	OnUpdate          string   `json:"onUpdate,omitempty"`
}

// Constraint represents a table constraint
type Constraint struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Columns     []string `json:"columns,omitempty"`
	Definition  string   `json:"definition,omitempty"`
	Description string   `json:"description,omitempty"`
}

// TriggerInfo represents a database trigger
type TriggerInfo struct {
	Name        string `json:"name"`
	Event       string `json:"event"`
	Timing      string `json:"timing"`
	Definition  string `json:"definition"`
	Description string `json:"description,omitempty"`
}

// TableStats represents table statistics
type TableStats struct {
	RowCount    int64     `json:"rowCount,omitempty"`
	Size        int64     `json:"size,omitempty"`
	LastUpdated time.Time `json:"lastUpdated,omitempty"`
}

// ServiceInfo represents service layer information
type ServiceInfo struct {
	Name        string     `json:"name"`
	Package     string     `json:"package"`
	Description string     `json:"description,omitempty"`
	Functions   []Function `json:"functions"`
	Interface   string     `json:"interface,omitempty"`
	Dependencies []string  `json:"dependencies,omitempty"`
}

// Function represents a function signature and metadata
type Function struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Parameters  []Parameter `json:"parameters,omitempty"`
	Returns     []Parameter `json:"returns,omitempty"`
	IsExported  bool        `json:"isExported"`
	Package     string      `json:"package"`
	File        string      `json:"file,omitempty"`
	Line        int         `json:"line,omitempty"`
}

// ConfigInfo represents configuration information
type ConfigInfo struct {
	Name        string            `json:"name"`
	Type        string            `json:"type"`
	Description string            `json:"description,omitempty"`
	Fields      []ConfigField     `json:"fields,omitempty"`
	EnvVars     []EnvVar          `json:"envVars,omitempty"`
	File        string            `json:"file,omitempty"`
	Examples    map[string]string `json:"examples,omitempty"`
}

// ConfigField represents a configuration field
type ConfigField struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Default     string `json:"default,omitempty"`
	Description string `json:"description,omitempty"`
	EnvVar      string `json:"envVar,omitempty"`
}

// EnvVar represents an environment variable
type EnvVar struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Default     string `json:"default,omitempty"`
	Description string `json:"description,omitempty"`
	Example     string `json:"example,omitempty"`
}

// DependencyInfo represents module dependency information
type DependencyInfo struct {
	Module      string `json:"module"`
	Version     string `json:"version"`
	Type        string `json:"type"` // direct, indirect
	Description string `json:"description,omitempty"`
	License     string `json:"license,omitempty"`
	Repository  string `json:"repository,omitempty"`
}

// UsageInfo represents where a type/function is used
type UsageInfo struct {
	File     string `json:"file"`
	Line     int    `json:"line"`
	Column   int    `json:"column"`
	Context  string `json:"context"`
	Function string `json:"function,omitempty"`
	Type     string `json:"type"`
}

// Reference represents a cross-reference between components
type Reference struct {
	From         string `json:"from"`
	To           string `json:"to"`
	Type         string `json:"type"` // imports, calls, implements, extends, etc.
	File         string `json:"file"`
	Line         int    `json:"line"`
	Description  string `json:"description,omitempty"`
}

// CallGraph represents function call relationships
type CallGraph struct {
	Function string   `json:"function"`
	Package  string   `json:"package"`
	Calls    []string `json:"calls"`
	CalledBy []string `json:"calledBy"`
	Depth    int      `json:"depth"`
}

// SearchResult represents a search result
type SearchResult struct {
	Type        string      `json:"type"`
	Name        string      `json:"name"`
	Package     string      `json:"package"`
	File        string      `json:"file"`
	Line        int         `json:"line"`
	Description string      `json:"description,omitempty"`
	Context     string      `json:"context,omitempty"`
	Score       float64     `json:"score"`
	Metadata    interface{} `json:"metadata,omitempty"`
}