// File: backend/internal/services/optimized_campaign_queries.go
package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// CampaignSummary represents a lightweight campaign summary for list views
type CampaignSummary struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	Name             string     `json:"name" db:"name"`
	Status           string     `json:"status" db:"status"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
	DomainCount      int        `json:"domain_count" db:"domain_count"`
	ActiveDomains    int        `json:"active_domains" db:"active_domains"`
	AvgPerformance   *float64   `json:"avg_performance" db:"avg_performance"`
	LastActivity     *time.Time `json:"last_activity" db:"last_activity"`
	GenerationStatus string     `json:"generation_status" db:"generation_status"`
}

// CampaignDetails represents full campaign details with related data
type CampaignDetails struct {
	models.Campaign
	DomainStats     DomainStats         `json:"domain_stats"`
	RecentDomains   []models.Domain     `json:"recent_domains"`
	PerformanceData []PerformanceMetric `json:"performance_data"`
	GenerationTasks []AsyncTaskSummary  `json:"generation_tasks"`
}

// DomainStats represents aggregated domain statistics
type DomainStats struct {
	Total         int        `json:"total" db:"total"`
	Active        int        `json:"active" db:"active"`
	Inactive      int        `json:"inactive" db:"inactive"`
	AvgScore      float64    `json:"avg_score" db:"avg_score"`
	TopPerformer  string     `json:"top_performer" db:"top_performer"`
	LastGenerated *time.Time `json:"last_generated" db:"last_generated"`
}

// PerformanceMetric represents performance data over time
type PerformanceMetric struct {
	Date        time.Time `json:"date" db:"date"`
	AvgScore    float64   `json:"avg_score" db:"avg_score"`
	DomainCount int       `json:"domain_count" db:"domain_count"`
	ActiveCount int       `json:"active_count" db:"active_count"`
}

// AsyncTaskSummary represents a summary of async generation tasks
type AsyncTaskSummary struct {
	ID          string     `json:"id" db:"id"`
	Status      string     `json:"status" db:"status"`
	Progress    float64    `json:"progress" db:"progress"`
	StartedAt   time.Time  `json:"started_at" db:"started_at"`
	CompletedAt *time.Time `json:"completed_at" db:"completed_at"`
	Message     string     `json:"message" db:"message"`
}

// CampaignQueryOptions represents options for optimized campaign queries
type CampaignQueryOptions struct {
	IncludeDomainStats   bool
	IncludeRecentDomains bool
	IncludePerformance   bool
	IncludeAsyncTasks    bool
	PerformanceDays      int
	RecentDomainLimit    int
}

// OptimizedCampaignService provides optimized campaign queries
type OptimizedCampaignService struct {
	db *sqlx.DB
}

// NewOptimizedCampaignService creates a new optimized campaign service
func NewOptimizedCampaignService(db *sqlx.DB) *OptimizedCampaignService {
	return &OptimizedCampaignService{db: db}
}

// GetCampaignSummaries loads campaigns with minimal data for list views
func (ocs *OptimizedCampaignService) GetCampaignSummaries(ctx context.Context, userID uuid.UUID, limit, offset int) ([]CampaignSummary, int64, error) {
	// Get total count for pagination
	var total int64
	err := ocs.db.GetContext(ctx, &total, `
		SELECT COUNT(*) FROM campaigns WHERE user_id = $1`, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get campaign count: %w", err)
	}

	// Get campaign summaries with aggregated data
	query := `
		SELECT 
			c.id,
			c.name,
			c.status,
			c.created_at,
			c.updated_at,
			COALESCE(ds.total_domains, 0) as domain_count,
			COALESCE(ds.active_domains, 0) as active_domains,
			ds.avg_performance,
			ds.last_activity,
			COALESCE(ats.status, 'none') as generation_status
		FROM campaigns c
		LEFT JOIN (
			SELECT 
				d.campaign_id,
				COUNT(*) as total_domains,
				COUNT(*) FILTER (WHERE d.status = 'active') as active_domains,
				AVG(d.performance_score) as avg_performance,
				MAX(d.updated_at) as last_activity
			FROM domains d
			GROUP BY d.campaign_id
		) ds ON c.id = ds.campaign_id
		LEFT JOIN (
			SELECT DISTINCT ON (campaign_id) 
				campaign_id,
				status
			FROM async_task_status 
			WHERE task_type = 'domain_generation'
			ORDER BY campaign_id, created_at DESC
		) ats ON c.id = ats.campaign_id
		WHERE c.user_id = $1
		ORDER BY c.updated_at DESC
		LIMIT $2 OFFSET $3`

	var summaries []CampaignSummary
	err = ocs.db.SelectContext(ctx, &summaries, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get campaign summaries: %w", err)
	}

	return summaries, total, nil
}

// GetCampaignDetails loads full campaign details with related data
func (ocs *OptimizedCampaignService) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID, options CampaignQueryOptions) (*CampaignDetails, error) {
	// Load base campaign data
	var campaign models.Campaign
	err := ocs.db.GetContext(ctx, &campaign, `
		SELECT * FROM campaigns WHERE id = $1`, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	details := &CampaignDetails{
		Campaign: campaign,
	}

	// Load domain stats if requested
	if options.IncludeDomainStats {
		stats, err := ocs.getDomainStats(ctx, campaignID)
		if err != nil {
			return nil, fmt.Errorf("failed to get domain stats: %w", err)
		}
		details.DomainStats = *stats
	}

	// Load recent domains if requested
	if options.IncludeRecentDomains {
		limit := options.RecentDomainLimit
		if limit == 0 {
			limit = 10
		}
		domains, err := ocs.getRecentDomains(ctx, campaignID, limit)
		if err != nil {
			return nil, fmt.Errorf("failed to get recent domains: %w", err)
		}
		details.RecentDomains = domains
	}

	// Load performance data if requested
	if options.IncludePerformance {
		days := options.PerformanceDays
		if days == 0 {
			days = 30
		}
		performance, err := ocs.getPerformanceData(ctx, campaignID, days)
		if err != nil {
			return nil, fmt.Errorf("failed to get performance data: %w", err)
		}
		details.PerformanceData = performance
	}

	// Load async tasks if requested
	if options.IncludeAsyncTasks {
		tasks, err := ocs.getAsyncTaskSummaries(ctx, campaignID)
		if err != nil {
			return nil, fmt.Errorf("failed to get async tasks: %w", err)
		}
		details.GenerationTasks = tasks
	}

	return details, nil
}

// getDomainStats gets aggregated domain statistics for a campaign
func (ocs *OptimizedCampaignService) getDomainStats(ctx context.Context, campaignID uuid.UUID) (*DomainStats, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'active') as active,
			COUNT(*) FILTER (WHERE status != 'active') as inactive,
			COALESCE(AVG(performance_score), 0) as avg_score,
			(SELECT name FROM domains WHERE campaign_id = $1 ORDER BY performance_score DESC LIMIT 1) as top_performer,
			MAX(created_at) as last_generated
		FROM domains 
		WHERE campaign_id = $1`

	var stats DomainStats
	err := ocs.db.GetContext(ctx, &stats, query, campaignID)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// getRecentDomains gets the most recently created domains for a campaign
func (ocs *OptimizedCampaignService) getRecentDomains(ctx context.Context, campaignID uuid.UUID, limit int) ([]models.Domain, error) {
	query := `
		SELECT * FROM domains 
		WHERE campaign_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2`

	var domains []models.Domain
	err := ocs.db.SelectContext(ctx, &domains, query, campaignID, limit)
	if err != nil {
		return nil, err
	}

	return domains, nil
}

// getPerformanceData gets performance metrics over time for a campaign
func (ocs *OptimizedCampaignService) getPerformanceData(ctx context.Context, campaignID uuid.UUID, days int) ([]PerformanceMetric, error) {
	query := `
		SELECT 
			DATE(created_at) as date,
			AVG(performance_score) as avg_score,
			COUNT(*) as domain_count,
			COUNT(*) FILTER (WHERE status = 'active') as active_count
		FROM domains 
		WHERE campaign_id = $1 
			AND created_at >= NOW() - INTERVAL '%d days'
		GROUP BY DATE(created_at)
		ORDER BY date DESC`

	var metrics []PerformanceMetric
	err := ocs.db.SelectContext(ctx, &metrics, fmt.Sprintf(query, days), campaignID)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}

// getAsyncTaskSummaries gets summaries of async generation tasks for a campaign
func (ocs *OptimizedCampaignService) getAsyncTaskSummaries(ctx context.Context, campaignID uuid.UUID) ([]AsyncTaskSummary, error) {
	query := `
		SELECT 
			id,
			status,
			progress,
			started_at,
			completed_at,
			message
		FROM async_task_status 
		WHERE campaign_id = $1 
			AND task_type = 'domain_generation'
		ORDER BY started_at DESC 
		LIMIT 10`

	var tasks []AsyncTaskSummary
	err := ocs.db.SelectContext(ctx, &tasks, query, campaignID)
	if err != nil {
		return nil, err
	}

	return tasks, nil
}

// SearchCampaigns performs optimized campaign search with filters
func (ocs *OptimizedCampaignService) SearchCampaigns(ctx context.Context, userID uuid.UUID, searchParams CampaignSearchParams) ([]CampaignSummary, int64, error) {
	whereClause, args := ocs.buildSearchWhereClause(userID, searchParams)

	// Get total count
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM campaigns c
		LEFT JOIN (
			SELECT 
				d.campaign_id,
				COUNT(*) as total_domains,
				COUNT(*) FILTER (WHERE d.status = 'active') as active_domains
			FROM domains d
			GROUP BY d.campaign_id
		) ds ON c.id = ds.campaign_id
		WHERE %s`, whereClause)

	var total int64
	err := ocs.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get search count: %w", err)
	}

	// Get results
	searchQuery := fmt.Sprintf(`
		SELECT 
			c.id,
			c.name,
			c.status,
			c.created_at,
			c.updated_at,
			COALESCE(ds.total_domains, 0) as domain_count,
			COALESCE(ds.active_domains, 0) as active_domains,
			ds.avg_performance,
			ds.last_activity,
			'none' as generation_status
		FROM campaigns c
		LEFT JOIN (
			SELECT 
				d.campaign_id,
				COUNT(*) as total_domains,
				COUNT(*) FILTER (WHERE d.status = 'active') as active_domains,
				AVG(d.performance_score) as avg_performance,
				MAX(d.updated_at) as last_activity
			FROM domains d
			GROUP BY d.campaign_id
		) ds ON c.id = ds.campaign_id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		whereClause,
		ocs.buildOrderByClause(searchParams.SortBy, searchParams.SortOrder),
		len(args)+1, len(args)+2)

	args = append(args, searchParams.Limit, searchParams.Offset)

	var campaigns []CampaignSummary
	err = ocs.db.SelectContext(ctx, &campaigns, searchQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search campaigns: %w", err)
	}

	return campaigns, total, nil
}

// CampaignSearchParams represents search parameters for campaigns
type CampaignSearchParams struct {
	Query     string
	Status    string
	SortBy    string
	SortOrder string
	Limit     int
	Offset    int
}

// buildSearchWhereClause builds the WHERE clause for campaign search
func (ocs *OptimizedCampaignService) buildSearchWhereClause(userID uuid.UUID, params CampaignSearchParams) (string, []interface{}) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	// Always filter by user
	conditions = append(conditions, fmt.Sprintf("c.user_id = $%d", argIndex))
	args = append(args, userID)
	argIndex++

	// Add search query if provided
	if params.Query != "" {
		conditions = append(conditions, fmt.Sprintf("(c.name ILIKE $%d OR c.description ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+params.Query+"%")
		argIndex++
	}

	// Add status filter if provided
	if params.Status != "" {
		conditions = append(conditions, fmt.Sprintf("c.status = $%d", argIndex))
		args = append(args, params.Status)
		argIndex++
	}

	return strings.Join(conditions, " AND "), args
}

// buildOrderByClause builds the ORDER BY clause for search results
func (ocs *OptimizedCampaignService) buildOrderByClause(sortBy, sortOrder string) string {
	// Validate sort fields
	validSortFields := map[string]string{
		"name":         "c.name",
		"created_at":   "c.created_at",
		"updated_at":   "c.updated_at",
		"status":       "c.status",
		"domain_count": "ds.total_domains",
	}

	field, exists := validSortFields[sortBy]
	if !exists {
		field = "c.updated_at" // Default sort field
	}

	order := "DESC"
	if sortOrder == "asc" {
		order = "ASC"
	}

	return fmt.Sprintf("%s %s", field, order)
}

// GetCampaignPerformanceTrends gets performance trends for multiple campaigns
func (ocs *OptimizedCampaignService) GetCampaignPerformanceTrends(ctx context.Context, userID uuid.UUID, days int) (map[uuid.UUID][]PerformanceMetric, error) {
	query := `
		SELECT 
			d.campaign_id,
			DATE(d.created_at) as date,
			AVG(d.performance_score) as avg_score,
			COUNT(*) as domain_count,
			COUNT(*) FILTER (WHERE d.status = 'active') as active_count
		FROM domains d
		JOIN campaigns c ON d.campaign_id = c.id
		WHERE c.user_id = $1 
			AND d.created_at >= NOW() - INTERVAL '%d days'
		GROUP BY d.campaign_id, DATE(d.created_at)
		ORDER BY d.campaign_id, date DESC`

	rows, err := ocs.db.QueryContext(ctx, fmt.Sprintf(query, days), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get performance trends: %w", err)
	}
	defer rows.Close()

	trends := make(map[uuid.UUID][]PerformanceMetric)

	for rows.Next() {
		var campaignID uuid.UUID
		var metric PerformanceMetric

		err := rows.Scan(&campaignID, &metric.Date, &metric.AvgScore, &metric.DomainCount, &metric.ActiveCount)
		if err != nil {
			return nil, err
		}

		trends[campaignID] = append(trends[campaignID], metric)
	}

	return trends, nil
}
