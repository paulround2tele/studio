package config

import "fmt"

// ConfigTemplate represents a reusable configuration template.
type ConfigTemplate struct {
	Name            string                 `json:"name"`
	Type            string                 `json:"type"`
	Schema          map[string]interface{} `json:"schema"`
	ValidationRules []ValidationRule       `json:"validation_rules"`
}

// ValidationRule defines a simple key requirement.
type ValidationRule struct {
	Field string
}

// TemplateManager manages config templates.
type TemplateManager struct {
	templates map[string]*ConfigTemplate
}

// NewTemplateManager creates a new TemplateManager.
func NewTemplateManager() *TemplateManager {
	return &TemplateManager{templates: map[string]*ConfigTemplate{}}
}

// RegisterTemplate registers a template.
func (tm *TemplateManager) RegisterTemplate(t *ConfigTemplate) error {
	if t == nil || t.Name == "" {
		return fmt.Errorf("invalid template")
	}
	tm.templates[t.Name] = t
	return nil
}

// GenerateFromTemplate instantiates a configuration from a template.
func (tm *TemplateManager) GenerateFromTemplate(name string, data map[string]interface{}) (*EnvironmentConfig, error) {
	tpl, ok := tm.templates[name]
	if !ok {
		return nil, fmt.Errorf("template not found")
	}
	// rudimentary validation: check that required schema keys are provided
	for k := range tpl.Schema {
		if _, exists := data[k]; !exists {
			return nil, fmt.Errorf("missing field %s", k)
		}
	}
	return &EnvironmentConfig{Configuration: data}, nil
}
