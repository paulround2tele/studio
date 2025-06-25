package config

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/getkin/kin-openapi/openapi3"
)

var (
	appConfigSchema         *openapi3.Schema
	environmentConfigSchema *openapi3.Schema
)

func loadSchema() error {
	if appConfigSchema != nil && environmentConfigSchema != nil {
		return nil
	}
	path := "backend/internal/config/config_schema.json"
	if _, err := os.Stat(path); os.IsNotExist(err) {
		if _, err := os.Stat("internal/config/config_schema.json"); err == nil {
			path = "internal/config/config_schema.json"
		} else {
			path = "config_schema.json"
		}
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read schema: %w", err)
	}
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromData(data)
	if err != nil {
		return fmt.Errorf("parse schema: %w", err)
	}
	ref, ok := doc.Components.Schemas["AppConfig"]
	if !ok || ref.Value == nil {
		return fmt.Errorf("schema does not contain AppConfig definition")
	}
	appConfigSchema = ref.Value

	if ref, ok := doc.Components.Schemas["EnvironmentConfig"]; ok && ref.Value != nil {
		environmentConfigSchema = ref.Value
	}
	if err := doc.Validate(context.Background()); err != nil {
		return fmt.Errorf("schema invalid: %w", err)
	}
	return nil
}

// ValidateConfigBytes validates the provided JSON configuration against the schema.
func ValidateConfigBytes(b []byte) error {
	if err := loadSchema(); err != nil {
		return err
	}
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return fmt.Errorf("invalid json: %w", err)
	}
	if err := appConfigSchema.VisitJSON(v); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}
	return nil
}

// ValidateEnvironmentConfigBytes validates EnvironmentConfig JSON bytes against the schema.
func ValidateEnvironmentConfigBytes(b []byte) error {
	if err := loadSchema(); err != nil {
		return err
	}
	if environmentConfigSchema == nil {
		return fmt.Errorf("environment config schema missing")
	}
	var v interface{}
	if err := json.Unmarshal(b, &v); err != nil {
		return fmt.Errorf("invalid json: %w", err)
	}
	if err := environmentConfigSchema.VisitJSON(v); err != nil {
		return fmt.Errorf("environment configuration validation failed: %w", err)
	}
	return nil
}
