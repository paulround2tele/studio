package utils

import (
	"context"
	"fmt"

	"github.com/fntelecomllc/studio/backend/internal/constants"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/jmoiron/sqlx"
)

// QueryBuilder helps build SQL queries with filters, ordering, and pagination
type QueryBuilder struct {
	baseQuery string
	args      []interface{}
}

// NewQueryBuilder creates a new query builder with a base query
func NewQueryBuilder(baseQuery string, args ...interface{}) *QueryBuilder {
	return &QueryBuilder{
		baseQuery: baseQuery,
		args:      args,
	}
}

// AddFilter adds a WHERE condition if the value is not empty
func (qb *QueryBuilder) AddFilter(condition string, value interface{}) *QueryBuilder {
	if value != nil {
		switch v := value.(type) {
		case string:
			if v != "" {
				qb.baseQuery += " AND " + condition
				qb.args = append(qb.args, v)
			}
		case int:
			if v != 0 {
				qb.baseQuery += " AND " + condition
				qb.args = append(qb.args, v)
			}
		default:
			qb.baseQuery += " AND " + condition
			qb.args = append(qb.args, value)
		}
	}
	return qb
}

// AddOrdering adds ORDER BY clause
func (qb *QueryBuilder) AddOrdering(orderBy string) *QueryBuilder {
	qb.baseQuery += " " + orderBy
	return qb
}

// AddPagination adds LIMIT and OFFSET if provided
func (qb *QueryBuilder) AddPagination(limit, offset int) *QueryBuilder {
	if limit > 0 {
		qb.baseQuery += constants.SQLLimit
		qb.args = append(qb.args, limit)
	}
	if offset > 0 {
		qb.baseQuery += constants.SQLOffset
		qb.args = append(qb.args, offset)
	}
	return qb
}

// Build returns the final query and arguments
func (qb *QueryBuilder) Build() (string, []interface{}) {
	return qb.baseQuery, qb.args
}

// ExecuteQuery executes the built query and returns results
func (qb *QueryBuilder) ExecuteQuery(ctx context.Context, exec store.Querier, results interface{}) error {
	query, args := qb.Build()
	
	var reboundQuery string
	switch q := exec.(type) {
	case *sqlx.DB:
		reboundQuery = q.Rebind(query)
	case *sqlx.Tx:
		reboundQuery = q.Rebind(query)
	default:
		return fmt.Errorf("unexpected Querier type: %T", exec)
	}

	return exec.SelectContext(ctx, results, reboundQuery, args...)
}
