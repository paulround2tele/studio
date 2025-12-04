package extraction

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// ReconcileOptions controls stuck row healing.
type ReconcileOptions struct {
	OlderThan   time.Duration
	BatchSize   int
	MaxAttempts int // optional future (not enforced yet)
}

// ReconcileStuckBuilding transitions rows 'building' older than threshold back to 'pending' for retry.
// Uses ctid subselect pattern to avoid long-running updates.
func ReconcileStuckBuilding(ctx context.Context, conn *pgx.Conn, opts ReconcileOptions) (int, error) {
	if conn == nil {
		return 0, fmt.Errorf("pgx connection required for reconciliation")
	}
	if opts.BatchSize <= 0 {
		opts.BatchSize = 200
	}
	threshold := time.Now().Add(-opts.OlderThan)
	q := fmt.Sprintf(`WITH stale AS (
	  SELECT ctid FROM domain_extraction_features
	  WHERE processing_state='building' AND updated_at < $1
	  LIMIT %d
	) UPDATE domain_extraction_features f
	SET processing_state='pending', updated_at=now()
	FROM stale
	WHERE f.ctid = stale.ctid
	RETURNING 1`, opts.BatchSize)
	rows, err := conn.Query(ctx, q, threshold)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	count := 0
	for rows.Next() {
		count++
	}
	return count, rows.Err()
}
