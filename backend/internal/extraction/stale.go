package extraction

import (
	"context"
	"database/sql"
	"fmt"
)

// MarkStaleScores sets is_stale_score=true where current snapshot id differs from latest provided.
// latestSnapshotID may be nil to force marking all ready rows stale.
func MarkStaleScores(ctx context.Context, db *sql.DB, campaignID string, latestSnapshotID *string) (int, error) {
	if db == nil {
		return 0, fmt.Errorf("nil db")
	}
	var res sql.Result
	var err error
	if latestSnapshotID == nil {
		res, err = db.ExecContext(ctx, `UPDATE domain_extraction_features SET is_stale_score=true WHERE campaign_id=$1 AND processing_state='ready' AND is_stale_score=false`, campaignID)
	} else {
		res, err = db.ExecContext(ctx, `UPDATE domain_extraction_features SET is_stale_score=true WHERE campaign_id=$1 AND processing_state='ready' AND (scoring_profile_snapshot_id IS DISTINCT FROM $2) AND is_stale_score=false`, campaignID, *latestSnapshotID)
	}
	if err != nil {
		return 0, err
	}
	rows, _ := res.RowsAffected()
	return int(rows), nil
}
