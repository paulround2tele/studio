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
		// Join with DNS validation results for status filtering
		baseQuery = `SELECT gd.id, gd.domain_generation_campaign_id, gd.domain_name, gd.source_keyword, gd.source_pattern, gd.tld, gd.offset_index, gd.generated_at, gd.created_at
			FROM generated_domains gd
			LEFT JOIN dns_validation_results dvr ON gd.id = dvr.generated_domain_id
			WHERE gd.domain_generation_campaign_id = $1`
		conditions = append(conditions, fmt.Sprintf("(dvr.validation_status = $%d OR dvr.validation_status IS NULL)", argIndex))
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

// GetDNSValidationResultsWithCursor implements cursor-based pagination for DNS validation results
func (s *campaignStorePostgres) GetDNSValidationResultsWithCursor(ctx context.Context, exec store.Querier, filter store.ListDNSValidationResultsFilter) (*store.PaginatedResult[*models.DNSValidationResult], error) {
	startTime := time.Now()
	
	results := []*models.DNSValidationResult{}
	baseQuery := `SELECT id, dns_campaign_id, generated_domain_id, domain_name, validation_status, business_status, dns_records, validated_by_persona_id, attempts, last_checked_at, created_at
		FROM dns_validation_results
		WHERE dns_campaign_id = $1`
	
	args := []interface{}{filter.CampaignID}
	conditions := []string{}
	argIndex := 2
	
	// Add validation status filter
	if filter.ValidationStatus != "" {
		conditions = append(conditions, fmt.Sprintf("validation_status = $%d", argIndex))
		args = append(args, filter.ValidationStatus)
		argIndex++
	}
	
	if filter.BusinessStatus != "" {
		conditions = append(conditions, fmt.Sprintf("business_status = $%d", argIndex))
		args = append(args, filter.BusinessStatus)
		argIndex++
	}
	
	// Add cursor-based pagination conditions
	if filter.After != "" {
		cursor, err := store.DecodeCursor(filter.After)
		if err != nil {
			return nil, fmt.Errorf("invalid after cursor: %w", err)
		}
		
		if filter.GetSortOrder() == "DESC" {
			conditions = append(conditions, fmt.Sprintf("(created_at < $%d OR (created_at = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
		} else {
			conditions = append(conditions, fmt.Sprintf("(created_at > $%d OR (created_at = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
		}
		args = append(args, cursor.Timestamp, cursor.ID)
		argIndex += 2
	}
	
	// Build final query
	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " AND " + strings.Join(conditions, " AND ")
	}
	
	finalQuery += fmt.Sprintf(" ORDER BY created_at %s, id %s", filter.GetSortOrder(), filter.GetSortOrder())
	
	limit := filter.GetLimit() + 1
	finalQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
	args = append(args, limit)
	
	err := exec.SelectContext(ctx, &results, finalQuery, args...)
	if err != nil {
		s.recordQueryPerformance(ctx, exec, "dns_validation_pagination", time.Since(startTime), len(args), len(results), false)
		return nil, fmt.Errorf("failed to fetch DNS validation results with cursor: %w", err)
	}
	
	s.recordQueryPerformance(ctx, exec, "dns_validation_pagination", time.Since(startTime), len(args), len(results), true)
	
	hasNextPage := len(results) > filter.GetLimit()
	if hasNextPage {
		results = results[:filter.GetLimit()]
	}
	
	pageInfo := store.PageInfo{
		HasNextPage:     hasNextPage,
		HasPreviousPage: filter.After != "",
	}
	
	if len(results) > 0 {
		firstResult := results[0]
		lastResult := results[len(results)-1]
		
		pageInfo.StartCursor = store.EncodeCursor(store.CursorInfo{
			ID:        firstResult.ID,
			Timestamp: firstResult.CreatedAt,
		})
		pageInfo.EndCursor = store.EncodeCursor(store.CursorInfo{
			ID:        lastResult.ID,
			Timestamp: lastResult.CreatedAt,
		})
	}
	
	return &store.PaginatedResult[*models.DNSValidationResult]{
		Data:     results,
		PageInfo: pageInfo,
	}, nil
}

// GetHTTPKeywordResultsWithCursor implements cursor-based pagination for HTTP keyword validation results
func (s *campaignStorePostgres) GetHTTPKeywordResultsWithCursor(ctx context.Context, exec store.Querier, filter store.ListHTTPValidationResultsFilter) (*store.PaginatedResult[*models.HTTPKeywordResult], error) {
	startTime := time.Now()
	
	results := []*models.HTTPKeywordResult{}
	baseQuery := `SELECT id, http_keyword_campaign_id, dns_result_id, domain_name, validation_status, http_status_code, response_headers, page_title, extracted_content_snippet, found_keywords_from_sets, found_ad_hoc_keywords, content_hash, validated_by_persona_id, used_proxy_id, attempts, last_checked_at, created_at
		FROM http_keyword_results
		WHERE http_keyword_campaign_id = $1`
	
	args := []interface{}{filter.CampaignID}
	conditions := []string{}
	argIndex := 2
	
	// Add validation status filter
	if filter.ValidationStatus != "" {
		conditions = append(conditions, fmt.Sprintf("validation_status = $%d", argIndex))
		args = append(args, filter.ValidationStatus)
		argIndex++
	}
	
	// Add keyword filter
	if filter.HasKeywords != nil {
		if *filter.HasKeywords {
			conditions = append(conditions, "(found_keywords_from_sets IS NOT NULL OR found_ad_hoc_keywords IS NOT NULL)")
		} else {
			conditions = append(conditions, "(found_keywords_from_sets IS NULL AND found_ad_hoc_keywords IS NULL)")
		}
	}
	
	// Add cursor-based pagination conditions
	if filter.After != "" {
		cursor, err := store.DecodeCursor(filter.After)
		if err != nil {
			return nil, fmt.Errorf("invalid after cursor: %w", err)
		}
		
		if filter.GetSortOrder() == "DESC" {
			conditions = append(conditions, fmt.Sprintf("(created_at < $%d OR (created_at = $%d AND id < $%d))", argIndex, argIndex, argIndex+1))
		} else {
			conditions = append(conditions, fmt.Sprintf("(created_at > $%d OR (created_at = $%d AND id > $%d))", argIndex, argIndex, argIndex+1))
		}
		args = append(args, cursor.Timestamp, cursor.ID)
		argIndex += 2
	}
	
	// Build final query
	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " AND " + strings.Join(conditions, " AND ")
	}
	
	finalQuery += fmt.Sprintf(" ORDER BY created_at %s, id %s", filter.GetSortOrder(), filter.GetSortOrder())
	
	limit := filter.GetLimit() + 1
	finalQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
	args = append(args, limit)
	
	err := exec.SelectContext(ctx, &results, finalQuery, args...)
	if err != nil {
		s.recordQueryPerformance(ctx, exec, "http_validation_pagination", time.Since(startTime), len(args), len(results), false)
		return nil, fmt.Errorf("failed to fetch HTTP keyword results with cursor: %w", err)
	}
	
	s.recordQueryPerformance(ctx, exec, "http_validation_pagination", time.Since(startTime), len(args), len(results), true)
	
	hasNextPage := len(results) > filter.GetLimit()
	if hasNextPage {
		results = results[:filter.GetLimit()]
	}
	
	pageInfo := store.PageInfo{
		HasNextPage:     hasNextPage,
		HasPreviousPage: filter.After != "",
	}
	
	if len(results) > 0 {
		firstResult := results[0]
		lastResult := results[len(results)-1]
		
		pageInfo.StartCursor = store.EncodeCursor(store.CursorInfo{
			ID:        firstResult.ID,
			Timestamp: firstResult.CreatedAt,
		})
		pageInfo.EndCursor = store.EncodeCursor(store.CursorInfo{
			ID:        lastResult.ID,
			Timestamp: lastResult.CreatedAt,
		})
	}
	
	return &store.PaginatedResult[*models.HTTPKeywordResult]{
		Data:     results,
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