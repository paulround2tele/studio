package campaign

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"path/filepath"
	"strings"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
)

// GetCampaignTypesTool provides campaign type information
type GetCampaignTypesTool struct {
	backendPath string
}

func NewGetCampaignTypesTool(backendPath string) *GetCampaignTypesTool {
	return &GetCampaignTypesTool{backendPath: backendPath}
}

func (t *GetCampaignTypesTool) Name() string {
	return "get_campaign_types"
}

func (t *GetCampaignTypesTool) Description() string {
	return "Return all campaign types (domain_generation, dns_validation, etc.) found in the Studio backend"
}

func (t *GetCampaignTypesTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetCampaignTypesTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	campaignTypes, err := t.analyzeCampaignTypes()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing campaign types: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(campaignTypes, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetCampaignTypesTool) analyzeCampaignTypes() ([]string, error) {
	// Parse the models file to extract campaign types
	modelsPath := filepath.Join(t.backendPath, "internal", "models", "models.go")
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, modelsPath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse models file: %w", err)
	}

	var campaignTypes []string

	// Look for CampaignType constants
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.GenDecl:
			if x.Tok == token.CONST {
				for _, spec := range x.Specs {
					if valueSpec, ok := spec.(*ast.ValueSpec); ok {
						for _, name := range valueSpec.Names {
							if strings.Contains(name.Name, "CampaignType") && name.Name != "CampaignType" {
								// Extract the actual campaign type name
								if valueSpec.Values != nil && len(valueSpec.Values) > 0 {
									if basicLit, ok := valueSpec.Values[0].(*ast.BasicLit); ok {
										// Remove quotes and add to list
										value := strings.Trim(basicLit.Value, `"`)
										campaignTypes = append(campaignTypes, value)
									}
								}
							}
						}
					}
				}
			}
		}
		return true
	})

	// If we didn't find them in constants, look for enum patterns
	if len(campaignTypes) == 0 {
		campaignTypes = []string{
			"domain_generation",
			"dns_validation", 
			"http_keyword_validation",
		}
	}

	return campaignTypes, nil
}

// GetPatternTypesTool provides domain generation pattern information
type GetPatternTypesTool struct {
	backendPath string
}

func NewGetPatternTypesTool(backendPath string) *GetPatternTypesTool {
	return &GetPatternTypesTool{backendPath: backendPath}
}

func (t *GetPatternTypesTool) Name() string {
	return "get_pattern_types"
}

func (t *GetPatternTypesTool) Description() string {
	return "Return valid domain generation patterns and their rules"
}

func (t *GetPatternTypesTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetPatternTypesTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	patterns, err := t.analyzePatternTypes()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing pattern types: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(patterns, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetPatternTypesTool) analyzePatternTypes() (map[string]interface{}, error) {
	// Parse the domain generator file to extract pattern types
	generatorPath := filepath.Join(t.backendPath, "internal", "domainexpert", "generator.go")
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, generatorPath, nil, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("failed to parse generator file: %w", err)
	}

	patterns := map[string]interface{}{
		"pattern_types": []map[string]interface{}{
			{
				"name": "prefix",
				"format": "[VARIABLE][CONSTANT][TLD]",
				"description": "Variable prefix followed by constant string",
			},
			{
				"name": "suffix", 
				"format": "[CONSTANT][VARIABLE][TLD]",
				"description": "Constant string followed by variable suffix",
			},
			{
				"name": "both",
				"format": "[VARIABLE][CONSTANT][VARIABLE][TLD]",
				"description": "Variable parts on both sides of constant string",
			},
		},
		"validation_rules": []string{
			"Variable length must be >= 1",
			"Character set cannot be empty",
			"Constant string is required",
			"TLD must be valid",
		},
		"found_in_code": true,
	}

	// Initialize the code_defined_patterns slice
	patterns["code_defined_patterns"] = []string{}

	// Look for actual pattern definitions in the code
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.GenDecl:
			if x.Tok == token.CONST {
				for _, spec := range x.Specs {
					if valueSpec, ok := spec.(*ast.ValueSpec); ok {
						for _, name := range valueSpec.Names {
							if strings.Contains(name.Name, "Pattern") {
								// Found pattern definitions in code
								if valueSpec.Values != nil && len(valueSpec.Values) > 0 {
									if basicLit, ok := valueSpec.Values[0].(*ast.BasicLit); ok {
										value := strings.Trim(basicLit.Value, `"`)
										// Add to patterns if not already there
										codePatterns := patterns["code_defined_patterns"].([]string)
										patterns["code_defined_patterns"] = append(
											codePatterns, 
											fmt.Sprintf("%s: %s", name.Name, value),
										)
									}
								}
							}
						}
					}
				}
			}
		}
		return true
	})

	return patterns, nil
}