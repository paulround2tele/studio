package architecture

import "encoding/json"

// ServiceContract defines the interface contract for a service.
type ServiceContract struct {
	ServiceName  string               `json:"service_name"`
	Version      string               `json:"version"`
	Endpoints    []EndpointContract   `json:"endpoints"`
	Dependencies []DependencyContract `json:"dependencies"`
	HealthCheck  HealthCheckContract  `json:"health_check"`
	Metrics      MetricsContract      `json:"metrics"`
}

type EndpointContract struct {
	Path           string           `json:"path"`
	Method         string           `json:"method"`
	RequestSchema  json.RawMessage  `json:"request_schema"`
	ResponseSchema json.RawMessage  `json:"response_schema"`
	ErrorCodes     []int            `json:"error_codes"`
	RateLimit      *RateLimitConfig `json:"rate_limit,omitempty"`
	Authorization  []string         `json:"authorization"`
}

type RateLimitConfig struct {
	Requests int    `json:"requests"`
	Window   string `json:"window"`
}

type DependencyContract struct {
	Service string `json:"service"`
	Type    string `json:"type"`
}

type HealthCheckContract struct {
	Path string `json:"path"`
}

type MetricsContract struct {
	Enabled bool `json:"enabled"`
}
