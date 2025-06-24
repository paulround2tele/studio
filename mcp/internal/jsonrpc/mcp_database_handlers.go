package jsonrpc

import (
	"fmt"
)

// Database tool handlers

// callGetDatabaseSchema implements the get_database_schema tool
func (s *JSONRPCServer) callGetDatabaseSchema() (interface{}, error) {
	tables, err := s.bridge.GetDatabaseSchema()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting database schema: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Database schema retrieved successfully. Found %d tables.", len(tables)),
			},
		},
	}, nil
}

// Additional tool handlers

// callGetDatabaseStats implements the get_database_stats tool
func (s *JSONRPCServer) callGetDatabaseStats() (interface{}, error) {
	stats, err := s.bridge.GetDatabaseStats()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting database stats: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Database statistics: %d connections, %d active queries", stats.Connections, stats.ActiveQueries),
			},
		},
	}, nil
}

// callAnalyzePerformance implements the analyze_performance tool
func (s *JSONRPCServer) callAnalyzePerformance() (interface{}, error) {
	analysis, err := s.bridge.AnalyzePerformance()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error analyzing performance: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Performance analysis: %d bottlenecks found, Score: %.2f", analysis.BottlenecksFound, analysis.Score),
			},
		},
	}, nil
}

// callGetSecurityAnalysis implements the get_security_analysis tool
func (s *JSONRPCServer) callGetSecurityAnalysis() (interface{}, error) {
	analysis, err := s.bridge.GetSecurityAnalysis()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting security analysis: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Security analysis: %d vulnerabilities found, Risk Level: %s", analysis.VulnerabilitiesFound, analysis.RiskLevel),
			},
		},
	}, nil
}

// callValidateAPIContracts implements the validate_api_contracts tool
func (s *JSONRPCServer) callValidateAPIContracts() (interface{}, error) {
	validation, err := s.bridge.ValidateAPIContracts()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error validating API contracts: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("API contract validation: %d contracts validated, %d errors found", validation.ContractsValidated, validation.ErrorsFound),
			},
		},
	}, nil
}

// callGetTestCoverage implements the get_test_coverage tool
func (s *JSONRPCServer) callGetTestCoverage() (interface{}, error) {
	coverage, err := s.bridge.GetTestCoverage()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting test coverage: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Test coverage: %.2f%% overall, %d files covered", coverage.OverallPercentage, coverage.FilesCovered),
			},
		},
	}, nil
}

// callAnalyzeCodeQuality implements the analyze_code_quality tool
func (s *JSONRPCServer) callAnalyzeCodeQuality() (interface{}, error) {
	quality, err := s.bridge.AnalyzeCodeQuality()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error analyzing code quality: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Code quality analysis: Score %.2f/10, %d issues found", quality.Score, quality.IssuesFound),
			},
		},
	}, nil
}
