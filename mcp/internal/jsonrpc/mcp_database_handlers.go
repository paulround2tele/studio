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

// callGetAPISchema implements the get_api_schema MCP tool
func (s *JSONRPCServer) callGetAPISchema() (interface{}, error) {
	if s.bridge == nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Bridge not initialized",
				},
			},
		}, nil
	}

	schema, err := s.bridge.GetAPISchema()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting API schema: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("API schema retrieved successfully. Found %d endpoints.", len(schema.Endpoints)),
			},
		},
		"schema": schema,
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
				"text": fmt.Sprintf("Database statistics: %d connections, %d tables, %d columns", stats.ConnectionCount, stats.TotalTables, stats.TotalColumns),
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
				"text": fmt.Sprintf("Performance analysis: Response Time: %.2fms, CPU: %.1f%%, Memory: %dMB", analysis.ResponseTime, analysis.CPUUsage, analysis.MemoryUsage/(1024*1024)),
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
				"text": fmt.Sprintf("Security analysis: %d issues, Risk Level: %s, Score: %.1f", analysis.VulnerabilitiesFound, analysis.RiskLevel, analysis.SecurityScore),
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
				"text": fmt.Sprintf("Test coverage: %.2f%% (%d/%d lines across %d/%d files)", coverage.OverallPercentage, coverage.LinesCovered, coverage.TotalLines, coverage.FilesCovered, coverage.TotalFiles),
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
				"text": fmt.Sprintf("Code quality analysis: Score %.2f/100, %d issues found", quality.Score, quality.IssuesFound),
			},
		},
	}, nil
}

// callAnalyzeComplexity implements the analyze_complexity tool
func (s *JSONRPCServer) callAnalyzeComplexity() (interface{}, error) {
	reports, err := s.bridge.AnalyzeComplexity()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error analyzing complexity: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Complexity analysis completed: %d functions analyzed", len(reports)),
			},
		},
	}, nil
}

// callGetLintDiagnostics implements the get_lint_diagnostics tool
func (s *JSONRPCServer) callGetLintDiagnostics() (interface{}, error) {
	diags, err := s.bridge.GetLintDiagnostics()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Error getting lint diagnostics: %v", err),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": fmt.Sprintf("Lint diagnostics with %s: %d issues, %d compile errors", diags.Linter, len(diags.Issues), len(diags.CompileErrors)),
			},
		},
	}, nil
}
