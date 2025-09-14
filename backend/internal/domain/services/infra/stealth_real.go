package infra

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// StealthRuntimeConfig controls runtime stealth behavior for a phase
type StealthRuntimeConfig struct {
	Enabled       bool     `json:"enabled"`
	Strategy      string   `json:"strategy"` // full_shuffle | block_shuffle | weighted | interleaved
	BlockSize     int      `json:"blockSize,omitempty"`
	JitterMinMs   int      `json:"jitterMinMs,omitempty"`
	JitterMaxMs   int      `json:"jitterMaxMs,omitempty"`
	SubsetPct     float64  `json:"subsetPct,omitempty"`     // 0-1
	PriorityHints []string `json:"priorityHints,omitempty"` // short,dictionary,numeric,mixed
}

// realStealthIntegration implements StealthIntegration using CampaignStore
type realStealthIntegration struct {
	store store.CampaignStore
	// instrumentation counters (not concurrency-safe; acceptable for coarse logging)
	cursorSuccessCount int
	cursorErrorCount   int
	forceCursor        bool // when true, disable legacy fallback and hard-fail on cursor error
}

func NewRealStealthIntegration(store store.CampaignStore) *realStealthIntegration {
	return &realStealthIntegration{store: store}
}

// test hook variables (not exported) for unit tests to simulate panic/error paths
var (
	testForceCursorPanic bool
)

func (r *realStealthIntegration) RandomizeDomainsForValidation(ctx context.Context, campaignID uuid.UUID, validationType string) ([]string, error) {
	if r.store == nil {
		return nil, fmt.Errorf("campaign store not available")
	}

	log.Printf("StealthReal: RandomizeDomainsForValidation start campaign=%s phase=%s", campaignID, validationType)
	start := time.Now()

	// Load default runtime config for in-memory shuffle logic (no persistence Phase C)
	cfg := r.defaultConfig(validationType)

	// Attempt cursor-driven collection with panic recovery
	cursorDomains, cursorMeta, cursorErr := r.collectDomainsWithCursor(ctx, campaignID, validationType)
	if cursorErr != nil {
		log.Printf("StealthReal: cursor collection error campaign=%s phase=%s err=%v", campaignID, validationType, cursorErr)
	}

	var domains []string
	if cursorErr == nil {
		domains = cursorDomains
		r.cursorSuccessCount++
		log.Printf("StealthReal: cursor success campaign=%s phase=%s pages=%d collected=%d total_success=%d", campaignID, validationType, cursorMeta.pages, cursorMeta.domains, r.cursorSuccessCount)
		// Record performance metric using placeholder query type semantics
		if r.store != nil {
			cid := campaignID
			idx := []byte(`"unknown"`)
			plan := []byte(fmt.Sprintf("\"pages=%d\"", cursorMeta.pages))
			metric := &models.QueryPerformanceMetric{ // minimal population
				QueryType:           "stealth_cursor_collection",
				ExecutionTimeMs:     float64(time.Since(start).Milliseconds()),
				RowsReturned:        int64(cursorMeta.domains),
				RowsExamined:        int64(cursorMeta.domains),
				IndexUsage:          idx,
				QueryPlan:           plan,
				ExecutedAt:          time.Now().UTC(),
				CampaignID:          &cid,
				PerformanceCategory: "stealth",
				NeedsOptimization:   false,
			}
			_ = r.store.RecordQueryPerformance(context.Background(), r.store.UnderlyingDB(), metric)
		}
	} else {
		// Always hard fail now; legacy fallback removed
		r.cursorErrorCount++
		log.Printf("StealthReal: cursor ERROR (no legacy path) campaign=%s phase=%s errors=%d err=%v", campaignID, validationType, r.cursorErrorCount, cursorErr)
		if r.store != nil {
			cid := campaignID
			idx := []byte(`"unknown"`)
			plan := []byte("\"error_no_fallback\"")
			metric := &models.QueryPerformanceMetric{
				QueryType:           "stealth_cursor_error",
				ExecutionTimeMs:     float64(time.Since(start).Milliseconds()),
				RowsReturned:        0,
				RowsExamined:        0,
				IndexUsage:          idx,
				QueryPlan:           plan,
				ExecutedAt:          time.Now().UTC(),
				CampaignID:          &cid,
				PerformanceCategory: "stealth",
				NeedsOptimization:   false,
			}
			_ = r.store.RecordQueryPerformance(context.Background(), r.store.UnderlyingDB(), metric)
		}
		return nil, fmt.Errorf("cursor error: %w", cursorErr)
	}

	if len(domains) == 0 {
		log.Printf("StealthReal: no candidate domains campaign=%s phase=%s", campaignID, validationType)
		return nil, nil
	}

	originalCount := len(domains)

	// Apply subset first
	if cfg.SubsetPct > 0 && cfg.SubsetPct < 1.0 {
		n := int(float64(len(domains)) * cfg.SubsetPct)
		if n < 1 {
			n = 1
		}
		domains = domains[:n]
	}

	// Apply strategy
	switch cfg.Strategy {
	case "full_shuffle":
		r.cryptoShuffle(domains)
	case "block_shuffle":
		bs := cfg.BlockSize
		if bs <= 0 {
			bs = 100
		}
		r.blockShuffle(domains, bs)
	case "weighted":
		r.weightedShuffle(domains, cfg.PriorityHints)
	case "interleaved":
		r.interleavedShuffle(domains)
	default:
		r.cryptoShuffle(domains)
	}

	// Emit diagnostic log (sample first up to 5 domains)
	sampleSize := 5
	if len(domains) < sampleSize {
		sampleSize = len(domains)
	}
	sample := strings.Join(domains[:sampleSize], ",")
	log.Printf("StealthShuffle: campaign=%s phase=%s strategy=%s original=%d final=%d subsetPct=%.2f sample_first=%s", campaignID, validationType, cfg.Strategy, originalCount, len(domains), cfg.SubsetPct, sample)

	return domains, nil
}

// collectDomainsWithCursor gathers domains using the cursor-based pagination API with panic recovery.
type cursorCollectionMeta struct {
	pages   int
	domains int
}

func (r *realStealthIntegration) collectDomainsWithCursor(ctx context.Context, campaignID uuid.UUID, validationType string) (_ []string, meta cursorCollectionMeta, err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("panic in cursor pagination: %v", rec)
		}
	}()
	// Use explicit non-nil exec to avoid ambiguity
	exec := r.store.UnderlyingDB()
	// Allow exec to be nil in test scenarios where a fake store is used that ignores exec.
	domains := make([]string, 0, 2048)
	var after string
	for {
		if testForceCursorPanic {
			panic("test induced panic in cursor collection")
		}
		filter := store.ListGeneratedDomainsFilter{
			CursorPaginationFilter: store.CursorPaginationFilter{First: 1000, After: after, SortBy: "offset_index", SortOrder: "ASC"},
			CampaignID:             campaignID,
		}
		if validationType == "http_keyword_validation" {
			filter.ValidationStatus = string(models.DomainDNSStatusOK)
		}
		page, qErr := r.store.GetGeneratedDomainsWithCursor(ctx, exec, filter)
		if qErr != nil {
			return nil, meta, qErr
		}
		for _, gd := range page.Data {
			if gd != nil && gd.DomainName != "" {
				domains = append(domains, gd.DomainName)
			}
		}
		meta.pages++
		if !page.PageInfo.HasNextPage || page.PageInfo.EndCursor == "" {
			break
		}
		after = page.PageInfo.EndCursor
	}
	meta.domains = len(domains)
	return domains, meta, nil
}

// collectDomainsLegacy provides fallback using the legacy offset-based pagination.
// Legacy pagination removed: collectDomainsLegacy eliminated.

func (r *realStealthIntegration) ProcessValidationWithStealth(ctx context.Context, campaignID uuid.UUID, domains []string, validationType string) error {
	if r.store == nil {
		return fmt.Errorf("campaign store not available")
	}
	if len(domains) == 0 {
		return nil
	}

	// Config used only for potential future logic (placeholder)
	_ = r.defaultConfig(validationType)

	// Phase C: stealth persistence to domains_data removed; treat as no-op.
	log.Printf("StealthReal: ProcessValidationWithStealth no-op campaign=%s phase=%s domains=%d", campaignID, validationType, len(domains))
	return nil
}

func (r *realStealthIntegration) defaultConfig(validationType string) StealthRuntimeConfig {
	// Conservative defaults; can be tuned per phase
	cfg := StealthRuntimeConfig{
		Enabled:       true,
		Strategy:      "full_shuffle",
		BlockSize:     100,
		JitterMinMs:   100,
		JitterMaxMs:   1500,
		SubsetPct:     1.0,
		PriorityHints: []string{"short", "dictionary", "mixed"},
	}
	if validationType == "http_keyword_validation" {
		cfg.JitterMinMs = 150
		cfg.JitterMaxMs = 2500
		cfg.Strategy = "interleaved"
	}
	return cfg
}

func (r *realStealthIntegration) cryptoShuffle(domains []string) {
	for i := len(domains) - 1; i > 0; i-- {
		bj, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			continue
		}
		j := int(bj.Int64())
		domains[i], domains[j] = domains[j], domains[i]
	}
}

func (r *realStealthIntegration) blockShuffle(domains []string, blockSize int) {
	for start := 0; start < len(domains); start += blockSize {
		end := start + blockSize
		if end > len(domains) {
			end = len(domains)
		}
		r.cryptoShuffle(domains[start:end])
	}
}

func (r *realStealthIntegration) weightedShuffle(domains []string, hints []string) {
	// Simple priority buckets: 1 (high), 2 (medium), 3 (low)
	buckets := map[int][]string{1: {}, 2: {}, 3: {}}
	for _, d := range domains {
		p := r.priorityFor(d, hints)
		buckets[p] = append(buckets[p], d)
	}
	r.cryptoShuffle(buckets[1])
	r.cryptoShuffle(buckets[2])
	r.cryptoShuffle(buckets[3])
	out := outSlice(len(domains))
	copy(out, append(append(buckets[1], buckets[2]...), buckets[3]...))
	copy(domains, out)
}

func (r *realStealthIntegration) interleavedShuffle(domains []string) {
	groups := map[string][]string{}
	for _, d := range domains {
		g := r.pattern(d)
		groups[g] = append(groups[g], d)
	}
	for k := range groups {
		r.cryptoShuffle(groups[k])
	}
	// Round-robin
	out := outSlice(len(domains))
	max := 0
	for _, g := range groups {
		if len(g) > max {
			max = len(g)
		}
	}
	idx := 0
	keys := make([]string, 0, len(groups))
	for k := range groups {
		keys = append(keys, k)
	}
	for i := 0; i < max; i++ {
		for _, k := range keys {
			if i < len(groups[k]) {
				out[idx] = groups[k][i]
				idx++
			}
		}
	}
	copy(domains, out)
}

// SetForceCursor enables or disables forced cursor mode (no legacy fallback). Called by toggle wrapper.
func (r *realStealthIntegration) SetForceCursor(v bool) { r.forceCursor = v }

func (r *realStealthIntegration) priorityFor(domain string, hints []string) int {
	// Default medium
	p := 2
	for _, h := range hints {
		switch h {
		case "short":
			if len(label(domain)) <= 8 {
				return 1
			}
		case "dictionary":
			if isDictionary(domain) {
				return 1
			}
		case "numeric":
			if isNumeric(label(domain)) {
				return 2
			}
		case "mixed":
			if isMixed(label(domain)) {
				return 2
			}
		}
	}
	return p
}

func (r *realStealthIntegration) pattern(domain string) string {
	l := label(domain)
	switch {
	case isNumeric(l):
		return "numeric"
	case isDictionary(domain):
		return "dictionary"
	case isMixed(l):
		return "mixed"
	case len(l) <= 8:
		return "short"
	default:
		return "random"
	}
}

func label(domain string) string {
	if i := strings.IndexByte(domain, '.'); i > 0 {
		return domain[:i]
	}
	return domain
}

func isNumeric(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

func isMixed(s string) bool {
	hasL, hasN := false, false
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') {
			hasL = true
		}
		if c >= '0' && c <= '9' {
			hasN = true
		}
	}
	return hasL && hasN
}

func isDictionary(domain string) bool {
	// Lightweight built-in word list; can be extended
	words := []string{"test", "demo", "app", "api", "web", "site", "blog", "news", "shop", "store"}
	l := label(domain)
	for _, w := range words {
		if l == w {
			return true
		}
	}
	return false
}

func outSlice(n int) []string { return make([]string, n) }
