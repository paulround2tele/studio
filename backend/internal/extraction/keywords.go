package extraction

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// KeywordDetail represents one row destined for domain_extracted_keywords.
type KeywordDetail struct {
	CampaignID      string
	DomainID        string
	KeywordID       string
	SurfaceForm     string
	SignalType      string
	Occurrences     int
	BaseWeight      float64
	ValueScore      float64
	EffectiveWeight float64
	Position        int
	SourceSubphase  string
}

// PersistKeywordDetails bulk inserts (or replaces) keyword detail rows for a domain.
// Strategy: delete existing domain scope then bulk insert rows (idempotent rebuild). Gated by EXTRACTION_KEYWORD_DETAIL_ENABLED.
func PersistKeywordDetails(ctx context.Context, conn *pgx.Conn, details []KeywordDetail) error {
	if !EnabledKeywordDetail() || len(details) == 0 {
		return nil
	}
	campaignID := details[0].CampaignID
	domainID := details[0].DomainID
	// Delete existing scope
	if _, err := conn.Exec(ctx, `DELETE FROM domain_extracted_keywords WHERE campaign_id=$1 AND domain_id=$2`, campaignID, domainID); err != nil {
		return fmt.Errorf("delete existing keyword details: %w", err)
	}
	// Build bulk insert
	valueStrings := make([]string, 0, len(details))
	args := make([]any, 0, len(details)*11)
	idx := 1
	for _, d := range details {
		valueStrings = append(valueStrings, fmt.Sprintf("($%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d,$%d, now(), now())", idx, idx+1, idx+2, idx+3, idx+4, idx+5, idx+6, idx+7, idx+8, idx+9, idx+10))
		args = append(args, d.CampaignID, d.DomainID, d.KeywordID, d.SurfaceForm, d.SignalType, d.Occurrences, d.BaseWeight, d.ValueScore, d.EffectiveWeight, d.Position, d.SourceSubphase)
		idx += 11
	}
	stmt := `INSERT INTO domain_extracted_keywords (campaign_id, domain_id, keyword_id, surface_form, signal_type, occurrences, base_weight, value_score, effective_weight, first_seen_position, source_subphase, created_at, updated_at) VALUES ` + strings.Join(valueStrings, ",")
	_, err := conn.Exec(ctx, stmt, args...)
	return err
}

// GenerateKeywordDetails aggregates raw keyword hits into KeywordDetail rows.
// It combines occurrences per (keywordID, signalType) and computes effective weight.
func GenerateKeywordDetails(campaignID, domainID string, hits []KeywordHit, source string) []KeywordDetail {
	if len(hits) == 0 {
		return nil
	}
	type agg struct {
		surface string
		occ     int
		baseW   float64
		valueW  float64
		pos     int
	}
	keyMap := map[string]*agg{}
	for _, h := range hits {
		composite := h.KeywordID + "|" + h.SignalType
		a, ok := keyMap[composite]
		if !ok {
			keyMap[composite] = &agg{surface: h.SurfaceForm, occ: 1, baseW: h.BaseWeight, valueW: h.ValueScore, pos: h.Position}
			continue
		}
		a.occ++
		a.baseW += h.BaseWeight
		if h.ValueScore > 0 {
			a.valueW += h.ValueScore
		}
		if h.Position >= 0 && (a.pos < 0 || h.Position < a.pos) {
			a.pos = h.Position
		}
	}
	out := make([]KeywordDetail, 0, len(keyMap))
	for composite, a := range keyMap {
		// effective weight: base * (1 + valueW/occ) simple heuristic
		eff := a.baseW
		if a.occ > 0 && a.valueW > 0 {
			eff = a.baseW * (1 + (a.valueW / float64(a.occ)))
		}
		parts := strings.SplitN(composite, "|", 2)
		kd := KeywordDetail{
			CampaignID:      campaignID,
			DomainID:        domainID,
			KeywordID:       parts[0],
			SurfaceForm:     a.surface,
			SignalType:      parts[1],
			Occurrences:     a.occ,
			BaseWeight:      a.baseW,
			ValueScore:      a.valueW,
			EffectiveWeight: eff,
			Position:        a.pos,
			SourceSubphase:  source,
		}
		out = append(out, kd)
	}
	return out
}
