package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// Database handlers (modularized out of handlers_stubs.go)

func (h *strictHandlers) DbBulkQuery(ctx context.Context, r gen.DbBulkQueryRequestObject) (gen.DbBulkQueryResponseObject, error) {
	// Guards and deps
	if h.deps == nil || h.deps.DB == nil {
		return gen.DbBulkQuery500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "database not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Params.XRequestedWith == nil || *r.Params.XRequestedWith != gen.DbBulkQueryParamsXRequestedWithXMLHttpRequest {
		return gen.DbBulkQuery403JSONResponse{ForbiddenJSONResponse: gen.ForbiddenJSONResponse{Error: gen.ApiError{Message: "forbidden: missing or invalid X-Requested-With", Code: gen.FORBIDDEN, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || len(r.Body.Queries) == 0 {
		return gen.DbBulkQuery400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "queries are required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Limits and timeout
	const (
		defaultLimit   = 100
		maxLimit       = 1000
		maxColumns     = 200
		defaultTimeout = 5  // seconds
		maxTimeout     = 30 // seconds
	)
	rowLimit := defaultLimit
	if r.Body.Limit != nil && *r.Body.Limit > 0 {
		rowLimit = *r.Body.Limit
		if rowLimit > maxLimit {
			rowLimit = maxLimit
		}
	}
	timeoutSec := defaultTimeout
	if r.Body.Timeout != nil && *r.Body.Timeout > 0 {
		timeoutSec = *r.Body.Timeout
		if timeoutSec > maxTimeout {
			timeoutSec = maxTimeout
		}
	}
	qctx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSec)*time.Second)
	defer cancel()

	// Prepare response containers
	results := make(map[string]struct {
		Columns       *[]string              `json:"columns,omitempty"`
		Error         *string                `json:"error,omitempty"`
		ExecutionTime *int64                 `json:"executionTime,omitempty"`
		RowCount      *int                   `json:"rowCount,omitempty"`
		Rows          *[][]gen.DatabaseValue `json:"rows,omitempty"`
		Success       *bool                  `json:"success,omitempty"`
	})
	totalRows := 0

	// Helper to mark error result
	setErr := func(id, msg string) {
		m := results[id]
		m.Success = boolPtr(false)
		m.Error = &msg
		results[id] = m
	}

	// Process each query safely
	for _, q := range r.Body.Queries {
		id := q.Id
		sqlText := strings.TrimSpace(q.Sql)
		start := time.Now()

		// Safety checks: must be single SELECT-only statement (allow CTE WITH ... SELECT)
		lower := strings.ToLower(sqlText)
		if strings.Contains(lower, ";") ||
			strings.Contains(lower, " delete ") || strings.HasPrefix(lower, "delete ") ||
			strings.Contains(lower, " insert ") || strings.HasPrefix(lower, "insert ") ||
			strings.Contains(lower, " update ") || strings.HasPrefix(lower, "update ") ||
			strings.Contains(lower, " alter ") || strings.HasPrefix(lower, "alter ") ||
			strings.Contains(lower, " drop ") || strings.HasPrefix(lower, "drop ") ||
			strings.Contains(lower, " create ") || strings.HasPrefix(lower, "create ") ||
			strings.Contains(lower, " grant ") || strings.HasPrefix(lower, "grant ") ||
			strings.Contains(lower, " revoke ") || strings.HasPrefix(lower, "revoke ") ||
			strings.Contains(lower, " truncate ") || strings.HasPrefix(lower, "truncate ") ||
			strings.Contains(lower, " copy ") || strings.HasPrefix(lower, "copy ") {
			setErr(id, "only read-only SELECT queries are allowed")
			continue
		}
		if !(strings.HasPrefix(lower, "select ") || strings.HasPrefix(lower, "with ")) {
			setErr(id, "query must start with SELECT or WITH")
			continue
		}
		// Enforce LIMIT if not present
		boundedSQL := sqlText
		if !containsLimitClause(lower) {
			boundedSQL = fmt.Sprintf("%s LIMIT %d", sqlText, rowLimit)
		}

		// Execute
		rows, err := h.deps.DB.QueryxContext(qctx, boundedSQL)
		if err != nil {
			setErr(id, fmt.Sprintf("query failed: %v", err))
			continue
		}
		cols, _ := rows.Columns()
		if len(cols) > maxColumns {
			cols = cols[:maxColumns]
		}
		// Collect rows
		data := make([][]gen.DatabaseValue, 0, rowLimit)
		count := 0
		for rows.Next() {
			vals, err := rows.SliceScan()
			if err != nil {
				_ = rows.Close()
				setErr(id, fmt.Sprintf("scan failed: %v", err))
				break
			}
			if len(vals) > maxColumns {
				vals = vals[:maxColumns]
			}
			mapped := make([]gen.DatabaseValue, 0, len(vals))
			for _, v := range vals {
				mapped = append(mapped, mapDBValue(v))
			}
			data = append(data, mapped)
			count++
			if count >= rowLimit {
				break
			}
		}
		_ = rows.Close()
		execMs := time.Since(start).Milliseconds()
		success := true
		rc := count
		resCols := make([]string, len(cols))
		copy(resCols, cols)
		results[id] = struct {
			Columns       *[]string              `json:"columns,omitempty"`
			Error         *string                `json:"error,omitempty"`
			ExecutionTime *int64                 `json:"executionTime,omitempty"`
			RowCount      *int                   `json:"rowCount,omitempty"`
			Rows          *[][]gen.DatabaseValue `json:"rows,omitempty"`
			Success       *bool                  `json:"success,omitempty"`
		}{
			Columns:       &resCols,
			Error:         nil,
			ExecutionTime: int64Ptr(execMs),
			RowCount:      &rc,
			Rows:          &data,
			Success:       &success,
		}
		totalRows += count
	}

	totalCount := totalRows
	resp := gen.DbBulkQuery200JSONResponse(gen.BulkDatabaseQueryResponse{Results: &results, TotalCount: &totalCount})
	return resp, nil
}

func (h *strictHandlers) DbBulkStats(ctx context.Context, r gen.DbBulkStatsRequestObject) (gen.DbBulkStatsResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil {
		return gen.DbBulkStats500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "database not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Params.XRequestedWith == nil || *r.Params.XRequestedWith != gen.XMLHttpRequest {
		return gen.DbBulkStats403JSONResponse{ForbiddenJSONResponse: gen.ForbiddenJSONResponse{Error: gen.ApiError{Message: "forbidden: missing or invalid X-Requested-With", Code: gen.FORBIDDEN, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		empty := gen.BulkDatabaseStatsResponse{}
		return gen.DbBulkStats200JSONResponse(empty), nil
	}

	qctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	db := h.deps.DB

	// DatabaseStats
	dbStats := &gen.DatabaseStats{}
	// Version
	var version string
	_ = db.GetContext(qctx, &version, "select version()")
	if version != "" {
		dbStats.Version = &version
	}
	// Uptime
	var uptime string
	_ = db.GetContext(qctx, &uptime, "select now() - pg_postmaster_start_time()")
	if uptime != "" {
		dbStats.Uptime = &uptime
	}
	// Total tables
	var totalTables int
	_ = db.GetContext(qctx, &totalTables, "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')")
	if totalTables > 0 {
		dbStats.TotalTables = &totalTables
	}
	// Total users (roles that can login)
	var totalUsers int
	_ = db.GetContext(qctx, &totalUsers, "select count(*) from pg_roles where rolcanlogin = true")
	if totalUsers >= 0 {
		dbStats.TotalUsers = &totalUsers
	}
	// Total sessions
	var totalSessions int
	_ = db.GetContext(qctx, &totalSessions, "select count(*) from pg_stat_activity")
	if totalSessions >= 0 {
		dbStats.TotalSessions = &totalSessions
	}
	// Database size
	var dbSize string
	_ = db.GetContext(qctx, &dbSize, "select pg_size_pretty(pg_database_size(current_database()))")
	if dbSize != "" {
		dbStats.DatabaseSize = &dbSize
	}
	// Health
	healthy := true
	dbStats.IsHealthy = &healthy

	// SchemaStats
	var schemaStats map[string]gen.SchemaStats
	if r.Body.Schemas != nil && len(*r.Body.Schemas) > 0 {
		schemaStats = make(map[string]gen.SchemaStats)
		for _, s := range *r.Body.Schemas {
			name := s
			var tableCount int
			_ = db.GetContext(qctx, &tableCount, "select count(*) from information_schema.tables where table_schema = $1", name)

			// Total rows (approx)
			var totalRows int
			_ = db.GetContext(qctx, &totalRows, `select coalesce(sum(reltuples)::bigint,0) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = $1 and c.relkind = 'r'`, name)

			// Total size
			var totalSize string
			_ = db.GetContext(qctx, &totalSize, `select coalesce(pg_size_pretty(sum(pg_total_relation_size(c.oid)))::text,'0 bytes') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = $1 and c.relkind = 'r'`, name)

			schemaStats[name] = gen.SchemaStats{TableCount: &tableCount, TotalRows: &totalRows, TotalSize: &totalSize, Name: &name}
		}
	}

	// TableStats
	var tableStats map[string]gen.TableStats
	if r.Body.Tables != nil && len(*r.Body.Tables) > 0 {
		tableStats = make(map[string]gen.TableStats)
		includeIdx := false
		includeSize := false
		if r.Body.IncludeIndexes != nil {
			includeIdx = *r.Body.IncludeIndexes
		}
		if r.Body.IncludeSize != nil {
			includeSize = *r.Body.IncludeSize
		}
		for _, t := range *r.Body.Tables {
			// schema-qualified
			schemaName := "public"
			tableName := t
			if strings.Contains(t, ".") {
				parts := strings.SplitN(t, ".", 2)
				schemaName = parts[0]
				tableName = parts[1]
			}
			// Row count (estimate)
			var rowCount int
			_ = db.GetContext(qctx, &rowCount, `select coalesce(reltuples::bigint,0) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = $1 and c.relname = $2 and c.relkind = 'r'`, schemaName, tableName)

			ts := gen.TableStats{}
			ts.RowCount = &rowCount
			name := fmt.Sprintf("%s.%s", schemaName, tableName)
			ts.Name = &name

			if includeSize {
				var size string
				_ = db.GetContext(qctx, &size, `select pg_size_pretty(pg_total_relation_size(format('%s.%s', $1, $2)::regclass))`, schemaName, tableName)
				ts.Size = &size
			}
			if includeIdx {
				var idx []string
				rows, err := db.QueryxContext(qctx, `select indexname from pg_indexes where schemaname = $1 and tablename = $2`, schemaName, tableName)
				if err == nil {
					for rows.Next() {
						var iname string
						if err := rows.Scan(&iname); err == nil {
							idx = append(idx, iname)
						}
					}
					_ = rows.Close()
				}
				if len(idx) > 0 {
					ts.Indexes = &idx
				}
			}
			tableStats[name] = ts
		}
	}

	totalCount := 0
	if tableStats != nil {
		totalCount += len(tableStats)
	}
	if schemaStats != nil {
		totalCount += len(schemaStats)
	}

	resp := gen.DbBulkStats200JSONResponse(gen.BulkDatabaseStatsResponse{DatabaseStats: dbStats, SchemaStats: &schemaStats, TableStats: &tableStats, TotalCount: &totalCount})
	return resp, nil
}
