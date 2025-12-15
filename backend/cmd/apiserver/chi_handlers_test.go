package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRewriteLegacyCampaignSSEPathAddsEventsSuffix(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "http://localhost/api/v2/sse/campaigns/1234-5678?debug=1", nil)

	rewritten := rewriteLegacyCampaignSSEPath(req)

	if rewritten == req {
		t.Fatalf("expected rewritten request to be cloned when path changes")
	}
	if got, want := rewritten.URL.Path, "/api/v2/sse/campaigns/1234-5678/events"; got != want {
		t.Fatalf("unexpected rewritten path: got %s want %s", got, want)
	}
	if got, want := rewritten.RequestURI, "/api/v2/sse/campaigns/1234-5678/events?debug=1"; got != want {
		t.Fatalf("unexpected requestURI: got %s want %s", got, want)
	}
	if original := req.URL.Path; original != "/api/v2/sse/campaigns/1234-5678" {
		t.Fatalf("original request path mutated: %s", original)
	}
}

func TestRewriteLegacyCampaignSSEPathNoopForCanonicalRoutes(t *testing.T) {
	cases := []string{
		"http://localhost/api/v2/sse/campaigns/1234-5678/events",
		"http://localhost/api/v2/sse/campaigns/1234-5678/events/latest",
		"http://localhost/api/v2/sse/campaigns/1234-5678/extra",
	}

	for _, url := range cases {
		req := httptest.NewRequest(http.MethodGet, url, nil)
		rewritten := rewriteLegacyCampaignSSEPath(req)
		if rewritten != req {
			t.Fatalf("expected no rewrite for %s", url)
		}
	}

	postReq := httptest.NewRequest(http.MethodPost, "http://localhost/api/v2/sse/campaigns/1234-5678", nil)
	if rewritten := rewriteLegacyCampaignSSEPath(postReq); rewritten != postReq {
		t.Fatalf("expected non-GET requests to remain unchanged")
	}
}
