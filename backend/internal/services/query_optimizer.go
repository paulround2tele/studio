// File: backend/internal/services/query_optimizer.go
package services

import (
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// QueryOptimizer provides query optimization recommendations and analysis
type QueryOptimizer struct {
	db                    *sqlx.DB
	performanceMonitor    *QueryPerformanceMonitor
	optimizationRules     []OptimizationRule
	autoOptimizeEnabled   bool
	indexSuggestionEngine *IndexSuggestionEngine
}

// OptimizationRule defines a rule for query optimization
type OptimizationRule struct {
	Name        string
	Pattern     *regexp.Regexp
	Severity    string
	Description string
	Suggestion  string
	CheckFunc   func(querySQL string) bool
}

// IndexSuggestionEngine suggests database indexes based on query patterns
type IndexSuggestionEngine struct {
	tableAnalysis map[string]*TableAnalysis
}

// TableAnalysis holds analysis data for a specific table
type TableAnalysis struct {
	TableName          string
	FrequentColumns    []string
	WhereClauseColumns []string
	JoinColumns        []string
	OrderByColumns     []string
	MissingIndexes     []string
}

// OptimizationResult represents the result of query optimization analysis
type OptimizationResult struct {
	QueryHash            string                                   `json:"queryHash"`
	OriginalQuery        string                                   `json:"originalQuery"`
	OptimizationScore    float64                                  `json:"optimizationScore"`
	Issues               []QueryIssue                             `json:"issues"`
	Recommendations      []models.QueryOptimizationRecommendation `json:"recommendations"`
	SuggestedIndexes     []string                                 `json:"suggestedIndexes"`
	RewrittenQuery       *string                                  `json:"rewrittenQuery,omitempty"`
	EstimatedImprovement float64                                  `json:"estimatedImprovement"`
}

// QueryIssue represents a specific issue found in a query
type QueryIssue struct {
	Type        string  `json:"type"`
	Severity    string  `json:"severity"`
	Description string  `json:"description"`
	Location    string  `json:"location"`
	Impact      float64 `json:"impact"`
}

// NewQueryOptimizer creates a new query optimizer
func NewQueryOptimizer(db *sqlx.DB, performanceMonitor *QueryPerformanceMonitor) *QueryOptimizer {
	optimizer := &QueryOptimizer{
		db:                  db,
		performanceMonitor:  performanceMonitor,
		autoOptimizeEnabled: false,
		indexSuggestionEngine: &IndexSuggestionEngine{
			tableAnalysis: make(map[string]*TableAnalysis),
		},
	}

	optimizer.initializeOptimizationRules()
	return optimizer
}

// AnalyzeQuery performs comprehensive analysis of a query
func (qo *QueryOptimizer) AnalyzeQuery(querySQL string) (*OptimizationResult, error) {
	// Validate input
	if strings.TrimSpace(querySQL) == "" {
		return nil, fmt.Errorf("query cannot be empty")
	}

	queryHash := qo.generateQueryHash(querySQL)

	// Get existing performance data
	analysis, err := qo.performanceMonitor.GetQueryAnalysis(queryHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get query analysis: %w", err)
	}

	// Analyze query structure
	issues := qo.analyzeQueryStructure(querySQL)

	// Generate index suggestions
	suggestedIndexes := qo.suggestIndexes(querySQL)

	// Check for query rewrite opportunities
	rewrittenQuery := qo.suggestQueryRewrite(querySQL)

	// Calculate estimated improvement
	estimatedImprovement := qo.calculateEstimatedImprovement(analysis, issues)

	result := &OptimizationResult{
		QueryHash:            queryHash,
		OriginalQuery:        querySQL,
		OptimizationScore:    analysis.OptimizationScore,
		Issues:               issues,
		Recommendations:      analysis.Recommendations,
		SuggestedIndexes:     suggestedIndexes,
		RewrittenQuery:       rewrittenQuery,
		EstimatedImprovement: estimatedImprovement,
	}

	return result, nil
}

// OptimizeSlowQueries analyzes and optimizes slow queries
func (qo *QueryOptimizer) OptimizeSlowQueries(limit int) ([]OptimizationResult, error) {
	slowQueries, err := qo.performanceMonitor.GetSlowQueries(limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get slow queries: %w", err)
	}

	var results []OptimizationResult
	for _, slowQuery := range slowQueries {
		result, err := qo.AnalyzeQuery(slowQuery.QuerySQL)
		if err != nil {
			log.Printf("Error analyzing slow query %s: %v", slowQuery.QueryHash, err)
			continue
		}
		results = append(results, *result)
	}

	return results, nil
}

// CreateOptimizationRecommendation creates a new optimization recommendation
func (qo *QueryOptimizer) CreateOptimizationRecommendation(
	queryHash string,
	recommendationType string,
	currentPerformanceMs float64,
	strategy json.RawMessage,
	suggestedIndexes []string,
	priority string,
) (uuid.UUID, error) {

	// Validate input
	if strings.TrimSpace(queryHash) == "" {
		return uuid.Nil, fmt.Errorf("query hash cannot be empty")
	}
	if currentPerformanceMs < 0 {
		return uuid.Nil, fmt.Errorf("current performance cannot be negative")
	}
	validPriorities := []string{"low", "medium", "high", "critical"}
	validPriority := false
	for _, vp := range validPriorities {
		if priority == vp {
			validPriority = true
			break
		}
	}
	if !validPriority {
		return uuid.Nil, fmt.Errorf("invalid priority: %s", priority)
	}

	recommendation := &models.QueryOptimizationRecommendation{
		ID:                       uuid.New(),
		QueryHash:                queryHash,
		RecommendationType:       recommendationType,
		CurrentPerformanceMs:     currentPerformanceMs,
		EstimatedImprovementPct:  qo.estimateImprovementPercentage(recommendationType, currentPerformanceMs),
		OptimizationStrategy:     strategy,
		SuggestedIndexes:         suggestedIndexes,
		ImplementationComplexity: qo.calculateComplexity(recommendationType),
		ImplementationPriority:   priority,
		Implemented:              false,
		ValidationResults:        json.RawMessage("{}"),
		CreatedAt:                time.Now(),
	}

	query := `
		INSERT INTO query_optimization_recommendations 
		(id, query_hash, recommendation_type, current_performance_ms, 
		 estimated_improvement_pct, optimization_strategy, suggested_indexes,
		 implementation_complexity, implementation_priority, implemented, 
		 validation_results, created_at)
		VALUES (:id, :query_hash, :recommendation_type, :current_performance_ms,
		        :estimated_improvement_pct, :optimization_strategy, :suggested_indexes,
		        :implementation_complexity, :implementation_priority, :implemented,
		        :validation_results, :created_at)`

	_, err := qo.db.NamedExec(query, recommendation)
	return recommendation.ID, err
}

// ImplementRecommendation marks a recommendation as implemented
func (qo *QueryOptimizer) ImplementRecommendation(recommendationID uuid.UUID, validationResults json.RawMessage) error {
	_, err := qo.db.Exec(`
		UPDATE query_optimization_recommendations 
		SET implemented = true, implemented_at = NOW(), validation_results = $2
		WHERE id = $1`,
		recommendationID, validationResults,
	)
	return err
}

// initializeOptimizationRules sets up the optimization rules
func (qo *QueryOptimizer) initializeOptimizationRules() {
	qo.optimizationRules = []OptimizationRule{
		{
			Name:        "missing_where_clause",
			Pattern:     regexp.MustCompile(`(?i)SELECT.*FROM\s+\w+\s*(?:;|$)`),
			Severity:    "high",
			Description: "Query lacks WHERE clause, may scan entire table",
			Suggestion:  "Add appropriate WHERE clause to filter results",
		},
		{
			Name:        "select_star",
			Pattern:     regexp.MustCompile(`(?i)SELECT\s+\*\s+FROM`),
			Severity:    "medium",
			Description: "SELECT * returns all columns, potentially unnecessary data",
			Suggestion:  "Specify only required columns in SELECT clause",
		},
		{
			Name:        "missing_limit",
			Pattern:     regexp.MustCompile(`(?i)SELECT.*FROM.*WHERE`),
			Severity:    "medium",
			Description: "Query without LIMIT may return excessive rows",
			Suggestion:  "Consider adding LIMIT clause for large result sets",
			CheckFunc: func(querySQL string) bool {
				return !strings.Contains(strings.ToUpper(querySQL), "LIMIT")
			},
		},
		{
			Name:        "or_conditions",
			Pattern:     regexp.MustCompile(`(?i)WHERE.*\sOR\s`),
			Severity:    "medium",
			Description: "OR conditions may prevent efficient index usage",
			Suggestion:  "Consider restructuring as multiple queries with UNION",
		},
		{
			Name:        "function_in_where",
			Pattern:     regexp.MustCompile(`(?i)WHERE\s+\w+\([^)]*\w+\.[^)]*\)`),
			Severity:    "high",
			Description: "Functions in WHERE clause prevent index usage",
			Suggestion:  "Avoid functions on indexed columns in WHERE clause",
		},
	}
}

// analyzeQueryStructure analyzes the structure of a query for issues using tactical plan patterns
func (qo *QueryOptimizer) analyzeQueryStructure(querySQL string) []QueryIssue {
	var issues []QueryIssue

	normalizedQuery := strings.ToLower(strings.TrimSpace(querySQL))

	// Check for inefficient patterns from tactical plan
	if qo.containsIneffientPatterns(querySQL) {
		issues = append(issues, QueryIssue{
			Type:        "inefficient_patterns",
			Severity:    "medium",
			Description: "Query contains inefficient patterns that may impact performance",
			Location:    "query_structure",
			Impact:      0.5,
		})
	}

	// Apply optimization rules
	for _, rule := range qo.optimizationRules {
		shouldCheck := true

		// Use CheckFunc if available, otherwise use Pattern
		if rule.CheckFunc != nil {
			shouldCheck = rule.CheckFunc(querySQL)
		} else if rule.Pattern != nil {
			shouldCheck = rule.Pattern.MatchString(querySQL)
		}

		if shouldCheck {
			impact := qo.calculateIssueImpact(rule.Severity)
			issues = append(issues, QueryIssue{
				Type:        rule.Name,
				Severity:    rule.Severity,
				Description: rule.Description,
				Location:    "query_structure",
				Impact:      impact,
			})
		}
	}

	// Check for complex joins
	joinCount := strings.Count(normalizedQuery, "join")
	if joinCount > 3 {
		issues = append(issues, QueryIssue{
			Type:        "complex_joins",
			Severity:    "medium",
			Description: fmt.Sprintf("Query has %d joins, may impact performance", joinCount),
			Location:    "join_clauses",
			Impact:      float64(joinCount) * 0.2,
		})
	}

	// Check for subqueries
	subqueryCount := strings.Count(normalizedQuery, "select") - 1
	if subqueryCount > 0 {
		issues = append(issues, QueryIssue{
			Type:        "subqueries",
			Severity:    "low",
			Description: fmt.Sprintf("Query contains %d subqueries, consider optimization", subqueryCount),
			Location:    "subquery_clauses",
			Impact:      float64(subqueryCount) * 0.1,
		})
	}

	return issues
}

// suggestIndexes analyzes query and suggests beneficial indexes
func (qo *QueryOptimizer) suggestIndexes(querySQL string) []string {
	var suggestions []string

	// Extract table and column information
	_ = qo.extractTableNames(querySQL) // Extract but don't use yet
	whereColumns := qo.extractWhereColumns(querySQL)
	orderByColumns := qo.extractOrderByColumns(querySQL)
	joinColumns := qo.extractJoinColumns(querySQL)

	// Suggest indexes for WHERE clauses
	for table, columns := range whereColumns {
		if len(columns) > 0 {
			if len(columns) == 1 {
				suggestions = append(suggestions, fmt.Sprintf("CREATE INDEX idx_%s_%s ON %s (%s)",
					table, columns[0], table, columns[0]))
			} else {
				suggestions = append(suggestions, fmt.Sprintf("CREATE INDEX idx_%s_composite ON %s (%s)",
					table, table, strings.Join(columns, ", ")))
			}
		}
	}

	// Suggest indexes for ORDER BY clauses
	for table, columns := range orderByColumns {
		if len(columns) > 0 {
			suggestions = append(suggestions, fmt.Sprintf("CREATE INDEX idx_%s_order ON %s (%s)",
				table, table, strings.Join(columns, ", ")))
		}
	}

	// Suggest indexes for JOIN conditions
	for _, column := range joinColumns {
		parts := strings.Split(column, ".")
		if len(parts) == 2 {
			suggestions = append(suggestions, fmt.Sprintf("CREATE INDEX idx_%s_%s ON %s (%s)",
				parts[0], parts[1], parts[0], parts[1]))
		}
	}

	return qo.deduplicateIndexSuggestions(suggestions)
}

// suggestQueryRewrite suggests query rewrite opportunities
func (qo *QueryOptimizer) suggestQueryRewrite(querySQL string) *string {
	normalizedQuery := strings.ToLower(strings.TrimSpace(querySQL))

	// Rewrite EXISTS to JOIN where appropriate
	if strings.Contains(normalizedQuery, "where exists") {
		rewritten := qo.rewriteExistsToJoin(querySQL)
		if rewritten != querySQL {
			return &rewritten
		}
	}

	// Rewrite IN subqueries to JOIN
	if strings.Contains(normalizedQuery, "where") && strings.Contains(normalizedQuery, "in (select") {
		rewritten := qo.rewriteInSubqueryToJoin(querySQL)
		if rewritten != querySQL {
			return &rewritten
		}
	}

	return nil
}

// Helper methods for query analysis

func (qo *QueryOptimizer) generateQueryHash(querySQL string) string {
	return qo.performanceMonitor.GenerateQueryHash(querySQL)
}

// AnalyzeIndexUsage analyzes index usage patterns (public method for testing)
func (qo *QueryOptimizer) AnalyzeIndexUsage() error {
	// Clear existing analytics
	_, err := qo.db.Exec("DELETE FROM index_usage_analytics")
	if err != nil {
		return fmt.Errorf("failed to clear analytics: %w", err)
	}

	// Insert fresh analytics from the function
	_, err = qo.db.Exec(`
		INSERT INTO index_usage_analytics 
		(schema_name, table_name, index_name, index_type, total_scans, 
		 tuples_read, tuples_fetched, last_used_at, index_efficiency_pct, 
		 usage_frequency, recommendation, recorded_at)
		SELECT 
			schema_name, table_name, index_name, index_type, 
			total_scans, tuples_read, tuples_fetched, last_scan as last_used_at,
			usage_ratio as index_efficiency_pct,
			CASE 
				WHEN total_scans = 0 THEN 'unused'
				WHEN total_scans < 100 THEN 'low'
				WHEN total_scans < 1000 THEN 'medium'
				ELSE 'high'
			END as usage_frequency,
			recommendation, NOW()
		FROM analyze_index_usage()`)

	return err
}

// GetIndexAnalytics returns index usage analytics (public method for testing)
func (qo *QueryOptimizer) GetIndexAnalytics() ([]models.IndexUsageAnalytic, error) {
	var analytics []models.IndexUsageAnalytic

	err := qo.db.Select(&analytics, `
		SELECT * FROM index_usage_analytics 
		ORDER BY recorded_at DESC, index_efficiency_pct ASC`)

	return analytics, err
}

func (qo *QueryOptimizer) calculateIssueImpact(severity string) float64 {
	switch severity {
	case "critical":
		return 1.0
	case "high":
		return 0.7
	case "medium":
		return 0.4
	case "low":
		return 0.2
	default:
		return 0.1
	}
}

func (qo *QueryOptimizer) calculateEstimatedImprovement(analysis *models.QueryPerformanceAnalysis, issues []QueryIssue) float64 {
	if analysis == nil {
		return 0
	}

	totalImpact := 0.0
	for _, issue := range issues {
		totalImpact += issue.Impact
	}

	// Base improvement on current performance and issue impact
	if analysis.AverageExecutionTimeMs > 1000 {
		return totalImpact * 50 // Up to 50% improvement for slow queries
	}
	return totalImpact * 25 // Up to 25% improvement for medium queries
}

func (qo *QueryOptimizer) estimateImprovementPercentage(recommendationType string, currentPerformanceMs float64) float64 {
	baseImprovement := map[string]float64{
		"slow_query_optimization": 60.0,
		"efficiency_optimization": 40.0,
		"index_optimization":      50.0,
		"query_rewrite":           30.0,
	}

	improvement := baseImprovement[recommendationType]
	if improvement == 0 {
		improvement = 25.0
	}

	// Higher improvement potential for slower queries
	if currentPerformanceMs > 5000 {
		improvement *= 1.5
	} else if currentPerformanceMs > 2000 {
		improvement *= 1.2
	}

	return improvement
}

func (qo *QueryOptimizer) calculateComplexity(recommendationType string) string {
	complexityMap := map[string]string{
		"slow_query_optimization": "medium",
		"efficiency_optimization": "low",
		"index_optimization":      "low",
		"query_rewrite":           "high",
	}

	complexity := complexityMap[recommendationType]
	if complexity == "" {
		complexity = "medium"
	}

	return complexity
}

// extractTableNames extracts table names from SQL query using tactical plan pattern
func (qo *QueryOptimizer) extractTableNames(querySQL string) []string {
	// Simple table name extraction from tactical plan - in production, use SQL parser
	tablePattern := regexp.MustCompile(`(?i)\b(?:FROM|JOIN|INTO|UPDATE)\s+(\w+)`)
	matches := tablePattern.FindAllStringSubmatch(querySQL, -1)

	var tables []string
	seen := make(map[string]bool)

	for _, match := range matches {
		if len(match) > 1 {
			table := strings.ToLower(match[1])
			if !seen[table] {
				tables = append(tables, table)
				seen[table] = true
			}
		}
	}

	return tables
}

func (qo *QueryOptimizer) determineQueryType(query string) string {
	query = strings.TrimSpace(strings.ToUpper(query))

	switch {
	case strings.HasPrefix(query, "SELECT"):
		return "SELECT"
	case strings.HasPrefix(query, "INSERT"):
		return "INSERT"
	case strings.HasPrefix(query, "UPDATE"):
		return "UPDATE"
	case strings.HasPrefix(query, "DELETE"):
		return "DELETE"
	case strings.HasPrefix(query, "WITH"):
		return "CTE"
	default:
		return "OTHER"
	}
}

func (qo *QueryOptimizer) containsIneffientPatterns(querySQL string) bool {
	// Simple pattern detection from tactical plan - in production, use SQL parser
	inefficientPatterns := []string{
		"SELECT *",
		"ORDER BY RAND()",
		"WHERE column LIKE '%value%'",
		"NOT IN (",
		"OR (",
	}

	// Convert to uppercase for case-insensitive matching per tactical plan
	upperQuery := strings.ToUpper(querySQL)

	for _, pattern := range inefficientPatterns {
		if strings.Contains(upperQuery, strings.ToUpper(pattern)) {
			return true
		}
	}

	return false
}

func (qo *QueryOptimizer) extractWhereColumns(querySQL string) map[string][]string {
	result := make(map[string][]string)

	// Extract table name from FROM clause first
	tableName := ""
	tableRe := regexp.MustCompile(`(?i)FROM\s+(\w+)`)
	tableMatches := tableRe.FindStringSubmatch(querySQL)
	if len(tableMatches) > 1 {
		tableName = strings.ToLower(tableMatches[1])
	}

	// Extract WHERE columns (both table.column and column formats)
	re := regexp.MustCompile(`(?i)WHERE\s+.*?(\w+(?:\.\w+)?)\s*[=<>!]`)
	matches := re.FindAllStringSubmatch(querySQL, -1)
	for _, match := range matches {
		if len(match) > 1 {
			column := match[1]
			parts := strings.Split(column, ".")
			if len(parts) == 2 {
				// table.column format
				result[parts[0]] = append(result[parts[0]], parts[1])
			} else if tableName != "" {
				// column format - use the table from FROM clause
				result[tableName] = append(result[tableName], column)
			}
		}
	}
	return result
}

func (qo *QueryOptimizer) extractOrderByColumns(querySQL string) map[string][]string {
	// Simplified ORDER BY column extraction
	result := make(map[string][]string)
	re := regexp.MustCompile(`(?i)ORDER\s+BY\s+(.*?)(?:LIMIT|;|$)`)
	matches := re.FindAllStringSubmatch(querySQL, -1)
	for _, match := range matches {
		if len(match) > 1 {
			columns := strings.Split(match[1], ",")
			for _, col := range columns {
				col = strings.TrimSpace(col)
				parts := strings.Split(col, ".")
				if len(parts) == 2 {
					result[parts[0]] = append(result[parts[0]], parts[1])
				}
			}
		}
	}
	return result
}

func (qo *QueryOptimizer) extractJoinColumns(querySQL string) []string {
	// Simplified JOIN column extraction
	re := regexp.MustCompile(`(?i)JOIN\s+\w+\s+ON\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)`)
	matches := re.FindAllStringSubmatch(querySQL, -1)
	var columns []string
	for _, match := range matches {
		if len(match) > 2 {
			columns = append(columns, match[1], match[2])
		}
	}
	return columns
}

func (qo *QueryOptimizer) deduplicateIndexSuggestions(suggestions []string) []string {
	seen := make(map[string]bool)
	var result []string
	for _, suggestion := range suggestions {
		if !seen[suggestion] {
			seen[suggestion] = true
			result = append(result, suggestion)
		}
	}
	return result
}

func (qo *QueryOptimizer) rewriteExistsToJoin(querySQL string) string {
	// Placeholder for EXISTS to JOIN rewrite logic
	return querySQL
}

func (qo *QueryOptimizer) rewriteInSubqueryToJoin(querySQL string) string {
	// Placeholder for IN subquery to JOIN rewrite logic
	return querySQL
}
