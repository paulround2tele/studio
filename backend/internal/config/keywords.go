package config

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// KeywordRule defines a single rule for extracting keywords.
// Ensure Type is either "string" or "regex".
// CompiledRegex is populated internally if Type is "regex", not from JSON.
type KeywordRule struct {
	ID            string         `json:"id,omitempty"`
	Pattern       string         `json:"pattern"`
	Type          string         `json:"type"` // "string" or "regex"
	CaseSensitive bool           `json:"caseSensitive"`
	Category      string         `json:"category,omitempty"`
	ContextChars  int            `json:"contextChars,omitempty"` // Characters for context snippet
	CompiledRegex *regexp.Regexp `json:"-"`                      // Not stored in JSON, compiled at load time
}

// KeywordSet groups related keyword rules.
type KeywordSet struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description,omitempty"`
	Rules       []KeywordRule `json:"rules"`
}

// LoadKeywordSets loads keyword definitions from the configuration file.
func LoadKeywordSets(configDir string) ([]KeywordSet, error) {
	filePath := filepath.Join(configDir, keywordsConfigFilename) // Uses constant from defaults.go
	var keywordSets []KeywordSet
	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("Config: Keyword Sets config file '%s' not found. No keyword sets will be loaded.", filePath)
			return keywordSets, nil
		}
		return nil, fmt.Errorf("failed to read Keyword Sets config file '%s': %w", filePath, err)
	}

	if err := json.Unmarshal(data, &keywordSets); err != nil {
		return nil, fmt.Errorf("error unmarshalling Keyword Sets from '%s': %w", filePath, err)
	}

	// Pre-compile regex patterns
	for i, ks := range keywordSets {
		for j, rule := range ks.Rules {
			if strings.ToLower(rule.Type) == "regex" {
				if rule.Pattern == "" {
					log.Printf("Config Warning: Keyword set '%s' ('%s'), Rule ID '%s' (or index %d) is of type regex but has empty pattern. Skipping compilation.", ks.ID, ks.Name, rule.ID, j)
					continue
				}
				patternToCompile := rule.Pattern
				if !rule.CaseSensitive {
					patternToCompile = "(?i)" + rule.Pattern // Apply case-insensitivity flag directly to regex
				}
				compiled, err := regexp.Compile(patternToCompile)
				if err != nil {
					log.Printf("Config Warning: Failed to compile regex for keyword set '%s' ('%s'), Rule ID '%s' (pattern: '%s'): %v. This rule will be skipped.", ks.ID, ks.Name, rule.ID, rule.Pattern, err)
					keywordSets[i].Rules[j].CompiledRegex = nil
				} else {
					keywordSets[i].Rules[j].CompiledRegex = compiled
				}
			} else if strings.ToLower(rule.Type) != "string" {
				log.Printf("Config Warning: Keyword set '%s' ('%s'), Rule ID '%s' (or index %d) has unknown type '%s'. It should be 'string' or 'regex'. This rule may not function as expected.", ks.ID, ks.Name, rule.ID, j, rule.Type)
			}
		}
	}

	log.Printf("Config: Loaded %d Keyword Sets from '%s'", len(keywordSets), filePath)
	return keywordSets, nil
}

// SaveKeywordSets saves the provided keyword sets to the configuration file.
// It validates regex rules (when Type == "regex") and writes a pretty JSON file.
// The CompiledRegex field is never persisted.
func SaveKeywordSets(configDir string, keywordSets []KeywordSet) error {
	if configDir == "" {
		return fmt.Errorf("configDir is required")
	}
	// Validate rules: compile regex patterns to ensure correctness (case sensitivity applied via inline flag)
	for i := range keywordSets {
		ks := &keywordSets[i]
		if ks.ID == "" || ks.Name == "" {
			return fmt.Errorf("keyword set at index %d must have non-empty id and name", i)
		}
		for j := range ks.Rules {
			rule := &ks.Rules[j]
			typ := strings.ToLower(rule.Type)
			if typ != "string" && typ != "regex" {
				return fmt.Errorf("keyword set '%s' rule index %d has invalid type '%s' (must be 'string' or 'regex')", ks.ID, j, rule.Type)
			}
			if typ == "regex" {
				if rule.Pattern == "" {
					return fmt.Errorf("keyword set '%s' rule index %d is regex but has empty pattern", ks.ID, j)
				}
				patternToCompile := rule.Pattern
				if !rule.CaseSensitive {
					patternToCompile = "(?i)" + rule.Pattern
				}
				if _, err := regexp.Compile(patternToCompile); err != nil {
					return fmt.Errorf("keyword set '%s' rule index %d invalid regex '%s': %w", ks.ID, j, rule.Pattern, err)
				}
			}
			// Ensure CompiledRegex isn't accidentally serialized
			rule.CompiledRegex = nil
		}
	}

	// Marshal with indentation
	data, err := json.MarshalIndent(keywordSets, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal keyword sets: %w", err)
	}

	// Ensure directory exists
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		return fmt.Errorf("failed to ensure config dir '%s': %w", configDir, err)
	}

	filePath := filepath.Join(configDir, keywordsConfigFilename)

	// Best-effort backup of existing file
	if _, statErr := os.Stat(filePath); statErr == nil {
		backupPath := filePath + ".bak"
		if copyErr := copyFile(filePath, backupPath); copyErr != nil {
			log.Printf("Config: Warning: failed to create backup '%s': %v", backupPath, copyErr)
		}
	}

	// Write atomically: write to temp and then rename
	tmpFile, err := os.CreateTemp(configDir, "keywords.config.json.tmp.*")
	if err != nil {
		return fmt.Errorf("failed to create temp file in '%s': %w", configDir, err)
	}
	tmpName := tmpFile.Name()
	if _, err := tmpFile.Write(data); err != nil {
		_ = tmpFile.Close()
		_ = os.Remove(tmpName)
		return fmt.Errorf("failed to write temp keyword sets file: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		_ = os.Remove(tmpName)
		return fmt.Errorf("failed to close temp keyword sets file: %w", err)
	}
	if err := os.Rename(tmpName, filePath); err != nil {
		_ = os.Remove(tmpName)
		return fmt.Errorf("failed to replace '%s': %w", filePath, err)
	}
	log.Printf("Config: Saved %d Keyword Sets to '%s'", len(keywordSets), filePath)
	return nil
}

// copyFile copies a file from src to dst path, replacing dst if it exists.
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() {
		_ = out.Close()
	}()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}
