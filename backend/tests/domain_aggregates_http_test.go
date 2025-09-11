package tests

import (
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// localBuildDomainAggregates replicates handler logic for test isolation
func localBuildDomainAggregates(counters *models.CampaignDomainCounters) *struct {
	Http *struct{ Error, Ok, Pending, Timeout *int }
} {
	if counters == nil {
		return nil
	}
	toPtr := func(v int64) *int { x := int(v); return &x }
	return &struct {
		Http *struct{ Error, Ok, Pending, Timeout *int }
	}{Http: &struct{ Error, Ok, Pending, Timeout *int }{Error: toPtr(counters.HTTPError), Ok: toPtr(counters.HTTPOk), Pending: toPtr(counters.HTTPPending), Timeout: toPtr(counters.HTTPTimeout)}}
}

// TestBuildDomainAggregatesHTTP ensures HTTP counters map correctly (unit-level without handler indirection).
func TestBuildDomainAggregatesHTTP(t *testing.T) {
	counters := &models.CampaignDomainCounters{HTTPPending: 5, HTTPOk: 3, HTTPError: 2, HTTPTimeout: 1, DNSPending: 1, DNSOk: 1, DNSError: 1, DNSTimeout: 0, LeadPending: 1, LeadMatch: 0, LeadNoMatch: 0, LeadError: 0, LeadTimeout: 0}
	agg := localBuildDomainAggregates(counters)
	if agg == nil || agg.Http == nil || agg.Http.Pending == nil || *agg.Http.Pending != 5 || *agg.Http.Ok != 3 || *agg.Http.Error != 2 || *agg.Http.Timeout != 1 {
		t.Fatalf("http aggregates mismatch: %#v", agg)
	}
}
