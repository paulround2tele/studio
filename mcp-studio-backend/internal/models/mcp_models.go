package models

import (
	"encoding/json"
	"time"
)

// MCP Protocol Messages

type MCPRequest struct {
	Jsonrpc string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type MCPResponse struct {
	Jsonrpc string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *MCPError   `json:"error,omitempty"`
}

type MCPError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// Tool definitions
type Tool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema ToolSchema  `json:"inputSchema"`
}

type ToolSchema struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
	Required   []string               `json:"required,omitempty"`
}

// Tool execution
type ToolCallRequest struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments,omitempty"`
}

type ToolCallResponse struct {
	Content []ToolContent `json:"content"`
	IsError bool          `json:"isError,omitempty"`
}

type ToolContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// Studio Backend Analysis Models

type CampaignAnalysis struct {
	Types      []string              `json:"types"`
	States     []string              `json:"states"`
	Patterns   []string              `json:"patterns"`
	Workflows  []WorkflowStep        `json:"workflows"`
	Validation []ValidationRule      `json:"validation"`
}

type WorkflowStep struct {
	Name         string            `json:"name"`
	Description  string            `json:"description"`
	Dependencies []string          `json:"dependencies"`
	Actions      []string          `json:"actions"`
	Metadata     map[string]string `json:"metadata"`
}

type ValidationRule struct {
	Field       string `json:"field"`
	Type        string `json:"type"`
	Constraints string `json:"constraints"`
	Message     string `json:"message"`
}

type PerformanceMetrics struct {
	OptimizationPatterns []OptimizationPattern `json:"optimization_patterns"`
	ConcurrencyPatterns  []ConcurrencyPattern  `json:"concurrency_patterns"`
	CachingStrategies    []CachingStrategy     `json:"caching_strategies"`
	Bottlenecks          []Bottleneck          `json:"bottlenecks"`
}

type OptimizationPattern struct {
	Name        string            `json:"name"`
	Type        string            `json:"type"`
	Location    string            `json:"location"`
	Impact      string            `json:"impact"`
	Description string            `json:"description"`
	Metadata    map[string]string `json:"metadata"`
}

type ConcurrencyPattern struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Location    string   `json:"location"`
	Goroutines  int      `json:"goroutines"`
	Channels    []string `json:"channels"`
	Mutexes     []string `json:"mutexes"`
	Description string   `json:"description"`
}

type CachingStrategy struct {
	Name        string        `json:"name"`
	Type        string        `json:"type"`
	Location    string        `json:"location"`
	TTL         time.Duration `json:"ttl"`
	KeyPattern  string        `json:"key_pattern"`
	Description string        `json:"description"`
}

type Bottleneck struct {
	Location    string            `json:"location"`
	Type        string            `json:"type"`
	Severity    string            `json:"severity"`
	Description string            `json:"description"`
	Suggestions []string          `json:"suggestions"`
	Metadata    map[string]string `json:"metadata"`
}

type StateTransition struct {
	From        string            `json:"from"`
	To          string            `json:"to"`
	Trigger     string            `json:"trigger"`
	Conditions  []string          `json:"conditions"`
	Actions     []string          `json:"actions"`
	Metadata    map[string]string `json:"metadata"`
}

type DatabasePattern struct {
	Name         string   `json:"name"`
	Type         string   `json:"type"`
	Location     string   `json:"location"`
	Tables       []string `json:"tables"`
	Queries      []string `json:"queries"`
	Transactions []string `json:"transactions"`
	Description  string   `json:"description"`
}

type TestPattern struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Location    string   `json:"location"`
	Coverage    float64  `json:"coverage"`
	Fixtures    []string `json:"fixtures"`
	Mocks       []string `json:"mocks"`
	Description string   `json:"description"`
}

type ResiliencePattern struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Location    string   `json:"location"`
	Retries     int      `json:"retries"`
	Timeouts    []string `json:"timeouts"`
	Fallbacks   []string `json:"fallbacks"`
	Description string   `json:"description"`
}