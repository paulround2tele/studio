package jsonrpc

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"mcp/internal/models"
)

// UI context tool handlers

func (s *JSONRPCServer) callGetLatestScreenshot(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	toBase64, _ := args["base64"].(bool)
	shot, err := s.bridge.GetLatestScreenshot(toBase64)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	data, _ := json.Marshal(shot)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(data))}},
	}, nil
}

func (s *JSONRPCServer) callGetUIMetadata(ctx context.Context) (interface{}, error) {
	comps, content, err := s.bridge.GetUIMetadata()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	payload := struct {
		Components []models.UIComponent `json:"components"`
		Content    []models.UIContent   `json:"content"`
	}{comps, content}
	b, _ := json.Marshal(payload)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(b))}},
	}, nil
}

func (s *JSONRPCServer) callGetUICodeMap(ctx context.Context) (interface{}, error) {
	comps, _, err := s.bridge.GetUIMetadata()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	mapping, err := s.bridge.GetUICodeMap(comps)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	data, _ := json.Marshal(mapping)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(data))}},
	}, nil
}

func (s *JSONRPCServer) callGetVisualContext(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	url, ok := args["url"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": "url parameter required"}},
		}, nil
	}
	payload, err := s.bridge.GetVisualContext(url)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	b, _ := json.Marshal(payload)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(b))}},
	}, nil
}

func (s *JSONRPCServer) callGenerateUITestPromptWithActions(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	url, ok := args["url"].(string)
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": "url parameter required"}},
		}, nil
	}
	rawActions, ok := args["actions"]
	if !ok {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": "actions parameter required"}},
		}, nil
	}
	data, err := json.Marshal(rawActions)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	var actions []models.UIAction
	if err := json.Unmarshal(data, &actions); err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	payload, err := s.bridge.GenerateUITestPromptWithActions(url, actions)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	b, _ := json.Marshal(payload)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(b))}},
	}, nil
}

func (s *JSONRPCServer) callGenerateUITestPrompt(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	componentName, _ := args["componentName"].(string)
	testType, _ := args["testType"].(string)
	includeAccessibility, _ := args["includeAccessibility"].(bool)
	includeInteractions, _ := args["includeInteractions"].(bool)

	if componentName == "" {
		componentName = "detected_components"
	}
	if testType == "" {
		testType = "unit"
	}

	// Get UI metadata for component analysis
	comps, content, err := s.bridge.GetUIMetadata()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error getting UI metadata: %v", err)}},
		}, nil
	}

	// Generate test prompts based on component analysis
	prompt := s.generateTestPrompt(componentName, testType, comps, content, includeAccessibility, includeInteractions)

	result := map[string]interface{}{
		"componentName":        componentName,
		"testType":             testType,
		"prompt":               prompt,
		"detectedComponents":   len(comps),
		"contentElements":      len(content),
		"includeAccessibility": includeAccessibility,
		"includeInteractions":  includeInteractions,
	}

	data, _ := json.Marshal(result)
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("```json\n%s\n```", string(data))}},
	}, nil
}

func (s *JSONRPCServer) generateTestPrompt(componentName, testType string, components []models.UIComponent, content []models.UIContent, includeA11y, includeInteractions bool) string {
	var prompt strings.Builder

	prompt.WriteString(fmt.Sprintf("# Generated Test Prompt for %s (%s testing)\n\n", componentName, testType))

	if len(components) > 0 {
		prompt.WriteString("## Detected Components:\n")
		for _, comp := range components {
			name := comp.Name
			if name == "" {
				name = comp.Tag
			}
			if name == "" {
				name = "Unknown"
			}
			prompt.WriteString(fmt.Sprintf("- **%s** (%s)\n", name, comp.Tag))
			if comp.ID != "" {
				prompt.WriteString(fmt.Sprintf("  - ID: %s\n", comp.ID))
			}
			if len(comp.Classes) > 0 {
				prompt.WriteString(fmt.Sprintf("  - Classes: %s\n", strings.Join(comp.Classes, ", ")))
			}
			if comp.Role != "" {
				prompt.WriteString(fmt.Sprintf("  - Role: %s\n", comp.Role))
			}
		}
		prompt.WriteString("\n")
	}

	switch testType {
	case "unit":
		prompt.WriteString("## Unit Test Requirements:\n")
		prompt.WriteString("1. Test component rendering with default props\n")
		prompt.WriteString("2. Test all prop variations and edge cases\n")
		prompt.WriteString("3. Test event handlers and callbacks\n")
		prompt.WriteString("4. Test conditional rendering logic\n")

	case "integration":
		prompt.WriteString("## Integration Test Requirements:\n")
		prompt.WriteString("1. Test component interactions with parent/child components\n")
		prompt.WriteString("2. Test data flow and state management\n")
		prompt.WriteString("3. Test API integration points\n")
		prompt.WriteString("4. Test error handling and recovery\n")

	case "e2e":
		prompt.WriteString("## E2E Test Requirements:\n")
		prompt.WriteString("1. Test complete user workflows\n")
		prompt.WriteString("2. Test cross-browser compatibility\n")
		prompt.WriteString("3. Test responsive behavior\n")
		prompt.WriteString("4. Test performance under load\n")
	}

	if includeA11y {
		prompt.WriteString("\n## Accessibility Testing:\n")
		prompt.WriteString("1. Test keyboard navigation\n")
		prompt.WriteString("2. Test screen reader compatibility\n")
		prompt.WriteString("3. Test ARIA attributes and roles\n")
		prompt.WriteString("4. Test color contrast and visual indicators\n")
	}

	if includeInteractions {
		prompt.WriteString("\n## Interaction Testing:\n")
		prompt.WriteString("1. Test hover states and transitions\n")
		prompt.WriteString("2. Test click/touch interactions\n")
		prompt.WriteString("3. Test drag and drop functionality\n")
		prompt.WriteString("4. Test form validation and submission\n")
	}

	prompt.WriteString("\n## Test Implementation Guide:\n")
	prompt.WriteString("```typescript\n")
	prompt.WriteString(fmt.Sprintf("describe('%s Component', () => {\n", componentName))
	prompt.WriteString("  // Add your test cases here based on the requirements above\n")
	prompt.WriteString("  it('should render correctly', () => {\n")
	prompt.WriteString("    // Test implementation\n")
	prompt.WriteString("  });\n")
	prompt.WriteString("});\n")
	prompt.WriteString("```\n")

	return prompt.String()
}

// callGetFrontendRoutes implements the get_frontend_routes tool
func (s *JSONRPCServer) callGetFrontendRoutes() (interface{}, error) {
	routes, err := s.bridge.GetFrontendRoutes()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Found %d frontend routes", len(routes))}},
	}, nil
}

// callGetComponentTree implements the get_component_tree tool
func (s *JSONRPCServer) callGetComponentTree() (interface{}, error) {
	tree, err := s.bridge.GetComponentTree()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Found %d components", len(tree))}},
	}, nil
}

// callGetComponentPropsAndEvents implements the get_component_props_and_events tool
func (s *JSONRPCServer) callGetComponentPropsAndEvents() (interface{}, error) {
	info, err := s.bridge.GetComponentPropsAndEvents()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Analyzed %d components", len(info))}},
	}, nil
}

// callGetFrontendTestCoverage implements the get_frontend_test_coverage tool
func (s *JSONRPCServer) callGetFrontendTestCoverage() (interface{}, error) {
	cov, err := s.bridge.GetFrontendTestCoverage()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Coverage %.2f%%", cov.OverallPercentage)}},
	}, nil
}

// callGetComponentToTestMap implements the get_component_to_test_map tool
func (s *JSONRPCServer) callGetComponentToTestMap() (interface{}, error) {
	m, err := s.bridge.GetComponentToTestMap()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Error: %v", err)}},
		}, nil
	}
	return map[string]interface{}{
		"content": []map[string]interface{}{{"type": "text", "text": fmt.Sprintf("Mapped %d components", len(m))}},
	}, nil
}
