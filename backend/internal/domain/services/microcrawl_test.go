package services

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/keywordscanner"
	"github.com/google/uuid"
)

// Test verifying current stub behavior: maybeAdaptiveMicroCrawl returns nil without side-effects
// and does NOT error; ensures future implementation toggles will deliberately update this test.
// NOTE: Stub test removed due to implementation; retained cancellation + not-implemented guard semantics via updated tests.

// Introduce a future-facing guard: if implementation begins returning data, this test
// should be revised rather than silently passing.
// New functional test: when flag enabled microcrawl fetches candidate pages and returns counts.
func TestMaybeAdaptiveMicroCrawl_Functional(t *testing.T) {
	os.Setenv("ENABLE_HTTP_MICROCRAWL", "1")
	defer os.Unsetenv("ENABLE_HTTP_MICROCRAWL")
	// Spin up test server with simple keyword-rich pages
	mux := http.NewServeMux()
	mux.HandleFunc("/about", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("About us keyword Alpha Beta")) })
	mux.HandleFunc("/contact", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("Contact keyword Beta Gamma")) })
	mux.HandleFunc("/products", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("Products Delta keyword")) })
	srv := httptest.NewServer(mux)
	defer srv.Close()
	// Build root URL
	rootURL, _ := url.Parse(srv.URL)
	// Minimal keyword scanner stub using in-memory store (nil safe path). We only test ad-hoc scanning.
	ks := keywordscanner.NewService(nil)
	svc := &httpValidationService{kwScanner: ks}
	signals := map[string]any{"ad_hoc_keywords": []string{"keyword", "Alpha", "Gamma"}}
	got, err := svc.maybeAdaptiveMicroCrawl(context.Background(), uuid.Nil, rootURL, signals)
	if err != nil {
		t.Fatalf("microcrawl error: %v", err)
	}
	if got == nil {
		t.Fatalf("expected enrichment map, got nil")
	}
	if pages, _ := got["microcrawl_pages"].(int); pages == 0 {
		t.Errorf("expected pages >0, got %v", pages)
	}
	if kw, _ := got["microcrawl_keywords"].(int); kw == 0 {
		t.Errorf("expected keyword count >0, got %v", kw)
	}
}

// Negative path: cancelled context must short-circuit without panic (even if later implemented)
func TestMaybeAdaptiveMicroCrawl_CancelledContext(t *testing.T) {
	os.Setenv("ENABLE_HTTP_MICROCRAWL", "1")
	defer os.Unsetenv("ENABLE_HTTP_MICROCRAWL")
	ks := keywordscanner.NewService(nil)
	svc := &httpValidationService{kwScanner: ks}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	rootURL, _ := url.Parse("https://example.com")
	if _, err := svc.maybeAdaptiveMicroCrawl(ctx, uuid.Nil, rootURL, map[string]any{}); err != nil && !errors.Is(err, context.Canceled) {
		t.Fatalf("expected nil or context.Canceled, got %v", err)
	}
}
