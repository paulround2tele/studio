package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
)

// loadPersonasFromFile is a generic helper to load persona configurations from JSON files
func loadPersonasFromFile[T any](configDir, filename, personaType string) ([]T, error) {
	filePath := filepath.Join(configDir, filename)
	var personas []T
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("Config: %s Personas config file '%s' not found. No %s personas will be loaded.", personaType, filePath, personaType)
			return personas, nil // Return empty list, not an error, if file simply doesn't exist
		}
		return nil, fmt.Errorf("failed to read %s Personas config file '%s': %w", personaType, filePath, err)
	}

	if err := json.Unmarshal(data, &personas); err != nil {
		return nil, fmt.Errorf("error unmarshalling %s Personas from '%s': %w", personaType, filePath, err)
	}
	log.Printf("Config: Loaded %d %s Personas from '%s'", len(personas), personaType, filePath)
	return personas, nil
}

// savePersonasToFile is a generic helper to save persona configurations to JSON files
func savePersonasToFile[T any](personas []T, configDir, filename, personaType string) error {
	filePath := filepath.Join(configDir, filename)
	data, err := json.MarshalIndent(personas, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshalling %s personas: %w", personaType, err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("error writing %s personas file '%s': %w", personaType, filePath, err)
	}

	log.Printf("Config: Saved %d %s Personas to '%s'", len(personas), personaType, filePath)
	return nil
}
