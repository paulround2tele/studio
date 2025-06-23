package database

import (
	"encoding/json"
	"fmt"

	"github.com/fntelecomllc/studio/mcp-studio-backend/internal/models"
)

// GetTransactionPatternsTool analyzes database transaction patterns
type GetTransactionPatternsTool struct {
	backendPath string
}

func NewGetTransactionPatternsTool(backendPath string) *GetTransactionPatternsTool {
	return &GetTransactionPatternsTool{backendPath: backendPath}
}

func (t *GetTransactionPatternsTool) Name() string {
	return "get_transaction_patterns"
}

func (t *GetTransactionPatternsTool) Description() string {
	return "Document transaction management and rollback strategies"
}

func (t *GetTransactionPatternsTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetTransactionPatternsTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	patterns, err := t.analyzeTransactionPatterns()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing transaction patterns: %v", err),
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

func (t *GetTransactionPatternsTool) analyzeTransactionPatterns() ([]models.DatabasePattern, error) {
	var patterns []models.DatabasePattern

	// Common transaction patterns found in the Studio backend
	patterns = append(patterns, models.DatabasePattern{
		Name:     "Campaign Creation Transaction",
		Type:     "creation_transaction",
		Location: "internal/services/domain_generation_service.go",
		Tables:   []string{"campaigns", "domain_generation_campaign_params", "audit_logs"},
		Queries:  []string{"INSERT campaigns", "INSERT domain_generation_params", "INSERT audit_log"},
		Transactions: []string{"BEGIN", "CREATE campaign", "CREATE params", "Log audit", "COMMIT"},
		Description: "Transactional campaign creation with audit logging and parameter setup",
	})

	patterns = append(patterns, models.DatabasePattern{
		Name:     "Batch Domain Generation",
		Type:     "batch_processing",
		Location: "internal/services/domain_generation_service.go",
		Tables:   []string{"generated_domains", "campaigns"},
		Queries:  []string{"INSERT generated_domains (batch)", "UPDATE campaigns SET processed_items"},
		Transactions: []string{"BEGIN", "Batch insert domains", "Update progress", "COMMIT"},
		Description: "Batch processing with progress tracking and atomic updates",
	})

	patterns = append(patterns, models.DatabasePattern{
		Name:     "State Transition Updates",
		Type:     "state_management",
		Location: "internal/services/campaign_state_machine.go",
		Tables:   []string{"campaigns", "audit_logs"},
		Queries:  []string{"UPDATE campaigns SET status", "INSERT audit_log"},
		Transactions: []string{"BEGIN", "Update status", "Log transition", "COMMIT"},
		Description: "Atomic state transitions with audit trail",
	})

	return patterns, nil
}

// GetConnectionPoolingTool analyzes database connection management
type GetConnectionPoolingTool struct {
	backendPath string
}

func NewGetConnectionPoolingTool(backendPath string) *GetConnectionPoolingTool {
	return &GetConnectionPoolingTool{backendPath: backendPath}
}

func (t *GetConnectionPoolingTool) Name() string {
	return "get_connection_pooling"
}

func (t *GetConnectionPoolingTool) Description() string {
	return "Return database connection management patterns"
}

func (t *GetConnectionPoolingTool) Schema() models.ToolSchema {
	return models.ToolSchema{
		Type:       "object",
		Properties: map[string]interface{}{},
		Required:   []string{},
	}
}

func (t *GetConnectionPoolingTool) Execute(args map[string]interface{}) (*models.ToolCallResponse, error) {
	pooling, err := t.analyzeConnectionPooling()
	if err != nil {
		return &models.ToolCallResponse{
			Content: []models.ToolContent{{
				Type: "text",
				Text: fmt.Sprintf("Error analyzing connection pooling: %v", err),
			}},
			IsError: true,
		}, err
	}

	result, _ := json.MarshalIndent(pooling, "", "  ")
	
	return &models.ToolCallResponse{
		Content: []models.ToolContent{{
			Type: "text",
			Text: string(result),
		}},
	}, nil
}

func (t *GetConnectionPoolingTool) analyzeConnectionPooling() (map[string]interface{}, error) {
	pooling := map[string]interface{}{
		"drivers": []map[string]interface{}{
			{
				"name": "pgx/v5",
				"type": "PostgreSQL",
				"location": "go.mod dependencies",
				"features": []string{"connection pooling", "prepared statements", "async support"},
				"configuration": map[string]interface{}{
					"max_conns": "configurable",
					"min_conns": "configurable", 
					"max_idle_time": "configurable",
					"health_check": "built-in",
				},
			},
			{
				"name": "jmoiron/sqlx",
				"type": "SQL extensions",
				"location": "go.mod dependencies",
				"features": []string{"struct scanning", "named queries", "transaction support"},
			},
		},
		"patterns": []map[string]interface{}{
			{
				"name": "Store Pattern",
				"description": "Database access through store interfaces",
				"location": "internal/store",
				"benefits": []string{"abstraction", "testability", "connection reuse"},
			},
			{
				"name": "Querier Interface",
				"description": "Abstract database operations for transaction support",
				"implementation": "store.Querier interface",
				"allows": []string{"transaction reuse", "connection sharing", "mock testing"},
			},
		},
		"best_practices": []string{
			"Use connection pooling for all database operations",
			"Implement proper connection lifecycle management",
			"Monitor connection pool metrics",
			"Configure appropriate pool sizes for workload",
			"Use prepared statements for repeated queries",
		},
	}

	return pooling, nil
}