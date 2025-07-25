// File: backend/internal/store/postgres/campaign_store_optimized.go
package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// GetGeneratedDomainsWithCursor implements cursor-based pagination for generated domains
// Optimized for enterprise scale with 2M+ domains per campaign
func (s *campaignStorePostgres) GetGeneratedDomainsWithCursor(ctx context.Context, exec store.Querier, filter store.ListGeneratedDomainsFilter) (*store.PaginatedResult[*models.GeneratedDomain], error) {
	startTime := time.Now()

	domains := []*models.GeneratedDomain{}
	baseQuery := `SELECT id, domain_generation_campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at
		FROM generated_domains
		WHERE domain_generation_campaign_id = $1`

	args := []interface{}{filter.CampaignID}
	conditions := []string{}
	argIndex := 2

	// Add cursor-based pagination conditions
	if filter.After != "" {
		cursor, err := store.DecodeCursor(filter.After)
		if err != nil {
			return nil, fmt.Errorf("invalid after cursor: %w", err)
		}

		switch filter.GetSortBy() {
		case "created_at":
			if filter.GetSortOrder() == "DESC" {
				conditions = append(conditions, fmt.Sprintf("(created_at < $%d OR (created_at = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
			} else {
				conditions = append(conditions, fmt.Sprintf("(created_at > $%d OR (created_at = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
			}
			args = append(args, cursor.Timestamp, cursor.ID)
			argIndex += 2
		case "offset_index":
			if filter.GetSortOrder() == "DESC" {
				conditions = append(conditions, fmt.Sprintf("(offset_index < $%d OR (offset_index = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
			} else {
				conditions = append(conditions, fmt.Sprintf("(offset_index > $%d OR (offset_index = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
			}
			args = append(args, cursor.Offset, cursor.ID)
			argIndex += 2
		default:
			if filter.GetSortOrder() == "DESC" {
				conditions = append(conditions, fmt.Sprintf("(domain_name < $%d OR (domain_name = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
			} else {
				conditions = append(conditions, fmt.Sprintf("(domain_name > $%d OR (domain_name = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
			}
			args = append(args, cursor.Name, cursor.ID)
			argIndex += 2
		}
	}

	if filter.Before != "" {
		cursor, err := store.DecodeCursor(filter.Before)
		if err != nil {
			return nil, fmt.Errorf("invalid before cursor: %w", err)
		}

		switch filter.GetSortBy() {
		case "created_at":
			if filter.GetSortOrder() == "DESC" {
				conditions = append(conditions, fmt.Sprintf("(created_at > $%d OR (created_at = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
			} else {
				conditions = append(conditions, fmt.Sprintf("(created_at < $%d OR (created_at = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
			}
			args = append(args, cursor.Timestamp, cursor.ID)
			argIndex += 2
		case "offset_index":
			if filter.GetSortOrder() == "DESC" {
				conditions = append(conditions, fmt.Sprintf("(offset_index > $%d OR (offset_index = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
			} else {
				conditions = append(conditions, fmt.Sprintf("(offset_index < $%d OR (offset_index = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
			}
			args = append(args, cursor.Offset, cursor.ID)
			argIndex += 2
		default:
			if filter.GetSortOrder() == "DESC" {
				conditions = append(conditions, fmt.Sprintf("(domain_name > $%d OR (domain_name = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
			} else {
				conditions = append(conditions, fmt.Sprintf("(domain_name < $%d OR (domain_name = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
			}
			args = append(args, cursor.Name, cursor.ID)
			argIndex += 2
		}
	}

	// Add additional filters
	if filter.ValidationStatus != "" {
		// Filter by DNS status in generated_domains table directly
		conditions = append(conditions, fmt.Sprintf("dns_status = $%d", argIndex))
		args = append(args, filter.ValidationStatus)
		argIndex++
	}

	// Build final query
	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " AND " + strings.Join(conditions, " AND ")
	}

	// Add ordering - crucial for cursor pagination performance
	switch filter.GetSortBy() {
	case "created_at":
		finalQuery += fmt.Sprintf(" ORDER BY created_at %s, id %s", filter.GetSortOrder(), filter.GetSortOrder())
	case "offset_index":
		finalQuery += fmt.Sprintf(" ORDER BY offset_index %s, id %s", filter.GetSortOrder(), filter.GetSortOrder())
	default:
		finalQuery += fmt.Sprintf(" ORDER BY domain_name %s, id %s", filter.GetSortOrder(), filter.GetSortOrder())
	}

	// Add limit (fetch one extra to determine hasNextPage)
	limit := filter.GetLimit() + 1
	finalQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
	args = append(args, limit)

	// Execute query with performance tracking
	err := exec.SelectContext(ctx, &domains, finalQuery, args...)
	if err != nil {
		// Record performance metrics for failed query
		s.recordQueryPerformance(ctx, exec, "domain_pagination", time.Since(startTime), 0, len(domains), false)
		return nil, fmt.Errorf("failed to fetch generated domains with cursor: %w", err)
	}

	// Record performance metrics for successful query
	s.recordQueryPerformance(ctx, exec, "domain_pagination", time.Since(startTime), len(args), len(domains), true)

	// Determine pagination metadata
	hasNextPage := len(domains) > filter.GetLimit()
	if hasNextPage {
		domains = domains[:filter.GetLimit()] // Remove extra item
	}

	pageInfo := store.PageInfo{
		HasNextPage:     hasNextPage,
		HasPreviousPage: filter.After != "" || filter.Before != "",
	}

	// Set cursors if we have data
	if len(domains) > 0 {
		firstDomain := domains[0]
		lastDomain := domains[len(domains)-1]

		switch filter.GetSortBy() {
		case "created_at":
			pageInfo.StartCursor = store.EncodeCursor(store.CursorInfo{
				ID:        firstDomain.ID,
				Timestamp: firstDomain.CreatedAt,
			})
			pageInfo.EndCursor = store.EncodeCursor(store.CursorInfo{
				ID:        lastDomain.ID,
				Timestamp: lastDomain.CreatedAt,
			})
		case "offset_index":
			pageInfo.StartCursor = store.EncodeCursor(store.CursorInfo{
				ID:        firstDomain.ID,
				Timestamp: firstDomain.CreatedAt,
				Offset:    firstDomain.OffsetIndex,
			})
			pageInfo.EndCursor = store.EncodeCursor(store.CursorInfo{
				ID:        lastDomain.ID,
				Timestamp: lastDomain.CreatedAt,
				Offset:    lastDomain.OffsetIndex,
			})
		default:
			pageInfo.StartCursor = store.EncodeCursor(store.CursorInfo{
				ID:        firstDomain.ID,
				Timestamp: firstDomain.CreatedAt,
				Name:      firstDomain.DomainName,
			})
			pageInfo.EndCursor = store.EncodeCursor(store.CursorInfo{
				ID:        lastDomain.ID,
				Timestamp: lastDomain.CreatedAt,
				Name:      lastDomain.DomainName,
			})
		}
	}

	return &store.PaginatedResult[*models.GeneratedDomain]{
		Data:     domains,
		PageInfo: pageInfo,
	}, nil
}

// RecordQueryPerformance records query performance metrics for monitoring
func (s *campaignStorePostgres) RecordQueryPerformance(ctx context.Context, exec store.Querier, metric *models.QueryPerformanceMetric) error {
	query := `INSERT INTO query_performance_metrics
		(query_type, campaign_id, execution_time_ms, rows_returned, rows_examined, index_usage, query_plan, memory_used_bytes, cpu_time_ms, executed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := exec.ExecContext(ctx, query,
		metric.QueryType,
		metric.CampaignID,
		metric.ExecutionTimeMs,
		metric.RowsReturned,
		metric.RowsExamined,
		metric.IndexUsage,
		metric.QueryPlan,
		metric.MemoryUsedBytes,
		metric.CPUTimeMs,
		metric.ExecutedAt,
	)

	return err
}

// RecordConnectionPoolMetrics records connection pool health metrics
func (s *campaignStorePostgres) RecordConnectionPoolMetrics(ctx context.Context, exec store.Querier, metrics *models.ConnectionPoolMetrics) error {
	query := `INSERT INTO connection_pool_metrics 
		(active_connections, idle_connections, max_connections, wait_count, wait_duration_ms, connection_errors, pool_utilization_percent, recorded_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := exec.ExecContext(ctx, query,
		metrics.ActiveConnections,
		metrics.IdleConnections,
		metrics.MaxConnections,
		metrics.WaitCount,
		metrics.WaitDurationMs,
		metrics.ConnectionErrors,
		metrics.PoolUtilizationPercent,
		metrics.RecordedAt,
	)

	return err
}

// recordQueryPerformance is a helper method to record query performance metrics
func (s *campaignStorePostgres) recordQueryPerformance(ctx context.Context, exec store.Querier, queryType string, duration time.Duration, argCount, rowCount int, success bool) {
	// Only record if query took longer than threshold or failed
	durationMs := int(duration.Milliseconds())
	if durationMs < 10 && success { // Only record slow or failed queries
		return
	}

	metric := &models.QueryPerformanceMetric{
		QueryType:           queryType,
		ExecutionTimeMs:     float64(durationMs),
		RowsExamined:        int64(argCount),
		RowsReturned:        int64(rowCount),
		ExecutedAt:          time.Now(),
		ServiceName:         "campaign-store",
		PerformanceCategory: "pagination",
		NeedsOptimization:   durationMs > 100 || !success,
	}

	// Record performance metrics asynchronously to avoid impacting query performance
	go func() {
		if err := s.RecordQueryPerformance(context.Background(), exec, metric); err != nil {
			// Log error but don't fail the original query
			// In production, you might want to use a proper logger here
		}
	}()
}
