package search

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
)

// SearchByCampaignTypeTool searches for campaign-related code
type SearchByCampaignTypeTool struct {
	backendPath string
}

func NewSearchByCampaignTypeTool(backendPath string) *SearchByCampaignTypeTool {
	return &SearchByCampaignTypeTool{backendPath: backendPath}
}

func (t *SearchByCampaignTypeTool) Name() string {
	return "search_by_campaign_type"
}

func (t *SearchByCampaignTypeTool) Description() string {
	return "Find code related to specific campaign types"
}

func (t *SearchByCampaignTypeTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type: "object",
		Properties: map[string]interface{}{
			"campaign_type": map[string]interface{}{
				"type":        "string",
				"description": "Campaign type to search for (e.g., 'domain_generation', 'dns_validation')",
			},
		},
		Required: []string{"campaign_type"},
	}
}

func (t *SearchByCampaignTypeTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	campaignType, ok := args["campaign_type"].(string)
	if !ok {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: "campaign_type parameter is required",
			}},
			IsError: true,
		}, fmt.Errorf("missing campaign_type parameter")
	}

	results, err := t.searchByCampaignType(campaignType)
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error searching for campaign type: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(results, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *SearchByCampaignTypeTool) searchByCampaignType(campaignType string) (map[string]interface{}, error) {
	results := map[string]interface{}{
		"campaign_type": campaignType,
		"matches": []map[string]interface{}{},
		"files": []string{},
	}

	// Search patterns based on campaign type
	var searchPatterns []string
	switch campaignType {
	case "domain_generation":
		searchPatterns = []string{
			"DomainGeneration",
			"domain_generation",
			"GenerateDomainsFromCampaign",
			"CreateDomainGenerationCampaign",
		}
	case "dns_validation":
		searchPatterns = []string{
			"DNSValidation",
			"dns_validation",
			"CreateDNSValidationCampaign",
			"ProcessDNSValidation",
		}
	case "http_keyword_validation":
		searchPatterns = []string{
			"HTTPKeyword",
			"http_keyword_validation",
			"CreateHTTPKeywordCampaign",
			"ProcessHTTPKeyword",
		}
	default:
		searchPatterns = []string{campaignType}
	}

	// Search in service files
	serviceDir := filepath.Join(t.backendPath, "internal", "services")
	err := t.searchInDirectory(serviceDir, searchPatterns, results)
	if err != nil {
		return nil, err
	}

	// Search in models
	modelsDir := filepath.Join(t.backendPath, "internal", "models")
	err = t.searchInDirectory(modelsDir, searchPatterns, results)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (t *SearchByCampaignTypeTool) searchInDirectory(dir string, patterns []string, results map[string]interface{}) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue on errors
		}

		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		matches, err := t.searchInFile(path, patterns)
		if err != nil {
			return nil // Continue on errors
		}

		if len(matches) > 0 {
			files := results["files"].([]string)
			results["files"] = append(files, path)
			
			allMatches := results["matches"].([]map[string]interface{})
			for _, match := range matches {
				allMatches = append(allMatches, map[string]interface{}{
					"file": path,
					"line": match["line"],
					"content": match["content"],
					"pattern": match["pattern"],
				})
			}
			results["matches"] = allMatches
		}

		return nil
	})
}

func (t *SearchByCampaignTypeTool) searchInFile(filename string, patterns []string) ([]map[string]interface{}, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var matches []map[string]interface{}
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		
		for _, pattern := range patterns {
			if strings.Contains(line, pattern) {
				matches = append(matches, map[string]interface{}{
					"line": lineNum,
					"content": strings.TrimSpace(line),
					"pattern": pattern,
				})
			}
		}
	}

	return matches, scanner.Err()
}

// SearchPerformanceCodeTool searches for performance-related code
type SearchPerformanceCodeTool struct {
	backendPath string
}

func NewSearchPerformanceCodeTool(backendPath string) *SearchPerformanceCodeTool {
	return &SearchPerformanceCodeTool{backendPath: backendPath}
}

func (t *SearchPerformanceCodeTool) Name() string {
	return "search_performance_code"
}

func (t *SearchPerformanceCodeTool) Description() string {
	return "Find performance-related optimizations and patterns"
}

func (t *SearchPerformanceCodeTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *SearchPerformanceCodeTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	results, err := t.searchPerformanceCode()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error searching performance code: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(results, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *SearchPerformanceCodeTool) searchPerformanceCode() (map[string]interface{}, error) {
	results := map[string]interface{}{
		"performance_patterns": []map[string]interface{}{},
		"concurrency_patterns": []map[string]interface{}{},
		"optimization_patterns": []map[string]interface{}{},
	}

	// Performance-related search patterns
	performancePatterns := []string{
		"Batch", "batch", "pool", "Pool",
		"goroutine", "channel", "sync\\.",
		"context\\.WithTimeout", "context\\.WithCancel",
		"time\\.Sleep", "time\\.After",
	}

	// Search in services directory
	serviceDir := filepath.Join(t.backendPath, "internal", "services")
	err := t.searchPerformanceInDirectory(serviceDir, performancePatterns, results)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (t *SearchPerformanceCodeTool) searchPerformanceInDirectory(dir string, patterns []string, results map[string]interface{}) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		lineNum := 0

		for scanner.Scan() {
			lineNum++
			line := scanner.Text()
			
			for _, pattern := range patterns {
				matched, _ := regexp.MatchString(pattern, line)
				if matched {
					category := t.categorizePerformancePattern(pattern, line)
					categoryMatches := results[category].([]map[string]interface{})
					results[category] = append(categoryMatches, map[string]interface{}{
						"file": path,
						"line": lineNum,
						"content": strings.TrimSpace(line),
						"pattern": pattern,
					})
				}
			}
		}

		return nil
	})
}

func (t *SearchPerformanceCodeTool) categorizePerformancePattern(pattern, line string) string {
	if strings.Contains(pattern, "Batch") || strings.Contains(pattern, "batch") {
		return "performance_patterns"
	}
	if strings.Contains(pattern, "goroutine") || strings.Contains(pattern, "channel") || strings.Contains(pattern, "sync") {
		return "concurrency_patterns"
	}
	return "optimization_patterns"
}