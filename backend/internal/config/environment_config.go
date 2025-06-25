package config

// EnvironmentConfig holds environment specific configuration data.
type EnvironmentConfig struct {
	Environment     string                 `json:"environment"`
	ServiceName     string                 `json:"service_name"`
	Version         string                 `json:"version"`
	Configuration   map[string]interface{} `json:"configuration"`
	EncryptedFields []string               `json:"encrypted_fields,omitempty"`
}
