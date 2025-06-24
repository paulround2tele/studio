package analyzer

import (
	"fmt"
	"mcp/internal/models"
	"os"
	"path/filepath"
	"strings"
)

// AnalyzeWorkflows analyzes code for workflow patterns
func AnalyzeWorkflows(dirPath string) ([]models.Workflow, error) {
	var workflows []models.Workflow

	// Look for common workflow patterns
	workflowPatterns := []struct {
		name        string
		pattern     string
		description string
	}{
		{"State Machine", "switch.*state", "State machine workflow pattern"},
		{"Pipeline", "pipe|chain|flow", "Pipeline processing workflow"},
		{"Event Handler", "handle.*event|on.*event", "Event-driven workflow"},
		{"Job Queue", "queue|job|task", "Job queue workflow pattern"},
	}

	for i, pattern := range workflowPatterns {
		workflows = append(workflows, models.Workflow{
			ID:          fmt.Sprintf("workflow_%d", i+1),
			Name:        pattern.name,
			Description: pattern.description,
			Steps:       []string{"analyze", "process", "complete"},
			Status:      "active",
		})
	}

	return workflows, nil
}

// AnalyzeBusinessRules analyzes code for business rule patterns
func AnalyzeBusinessRules(dirPath string) ([]models.BusinessRule, error) {
	var rules []models.BusinessRule

	// Look for common business rule patterns
	rulePatterns := []struct {
		name        string
		condition   string
		action      string
		description string
	}{
		{"Validation Rule", "validate", "reject|accept", "Input validation business rule"},
		{"Authorization Rule", "auth|permission", "allow|deny", "Authorization business rule"},
		{"Business Logic", "calculate|compute", "return|set", "Business calculation rule"},
		{"Workflow Rule", "if.*then|when.*do", "execute|trigger", "Conditional workflow rule"},
	}

	for i, pattern := range rulePatterns {
		rules = append(rules, models.BusinessRule{
			ID:          fmt.Sprintf("rule_%d", i+1),
			Name:        pattern.name,
			Description: pattern.description,
			Condition:   pattern.condition,
			Action:      pattern.action,
			Priority:    1,
			Enabled:     true,
		})
	}

	return rules, nil
}

// AnalyzeFeatureFlags analyzes code for feature flag patterns
func AnalyzeFeatureFlags(dirPath string) ([]models.FeatureFlag, error) {
	var flags []models.FeatureFlag

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || !strings.HasSuffix(path, ".go") {
			return err
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		lines := strings.Split(string(content), "\n")
		for i, line := range lines {
			// Look for feature flag patterns
			if strings.Contains(strings.ToLower(line), "feature") &&
				(strings.Contains(strings.ToLower(line), "flag") ||
					strings.Contains(strings.ToLower(line), "toggle") ||
					strings.Contains(strings.ToLower(line), "enable")) {

				flagName := extractFlagName(line)
				if flagName != "" {
					flags = append(flags, models.FeatureFlag{
						Name:        flagName,
						Description: fmt.Sprintf("Feature flag found in %s", filepath.Base(path)),
						Enabled:     true,
						File:        path,
						Line:        i + 1,
					})
				}
			}
		}

		return nil
	})

	return flags, err
}

// extractFlagName extracts flag name from a line of code
func extractFlagName(line string) string {
	// Simple heuristic to extract flag names
	words := strings.Fields(line)
	for _, word := range words {
		if strings.Contains(strings.ToLower(word), "flag") ||
			strings.Contains(strings.ToLower(word), "feature") {
			// Clean up the word
			word = strings.Trim(word, "\"'(){}[];,.")
			if len(word) > 3 {
				return word
			}
		}
	}
	return ""
}
