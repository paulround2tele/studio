package extraction

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

// LintResult captures summary of a lint pass.
type LintResult struct {
	Scanned    int
	Violations int
	Timestamp  time.Time
}

// RunFeatureVectorLint scans a sample of feature rows (or all if limit<=0) and logs first violation via provided logger.
func RunFeatureVectorLint(ctx context.Context, db *sql.DB, limit int, logf func(msg string, fields map[string]any)) LintResult {
	res := LintResult{Timestamp: time.Now()}
	if db == nil {
		return res
	}
	q := "SELECT domain_name, feature_vector FROM domain_extraction_features WHERE feature_vector IS NOT NULL"
	if limit > 0 {
		q += " LIMIT $1"
	}
	var rows *sql.Rows
	var err error
	if limit > 0 {
		rows, err = db.QueryContext(ctx, q, limit)
	} else {
		rows, err = db.QueryContext(ctx, q)
	}
	if err != nil {
		return res
	}
	defer rows.Close()
	for rows.Next() {
		var domain string
		var raw json.RawMessage
		if err := rows.Scan(&domain, &raw); err != nil {
			continue
		}
		res.Scanned++
		fv := map[string]any{}
		_ = json.Unmarshal(raw, &fv)
		if vErr := ValidateFeatureVector(fv); vErr != nil {
			res.Violations++
			if logf != nil {
				logf("feature_vector_lint_violation", map[string]any{"domain": domain, "error": vErr.Error()})
			}
		}
	}
	return res
}
