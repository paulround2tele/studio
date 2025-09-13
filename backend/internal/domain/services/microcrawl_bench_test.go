package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/google/uuid"
)

// BenchmarkMicroCrawlEnhance measures microcrawlEnhance performance over synthetic pages.
func BenchmarkMicroCrawlEnhance(b *testing.B) {
	body := "<html><head><title>Test</title></head><body>keyword alpha beta gamma <a href=\"/about\">About</a><a href=\"/contact\">Contact</a><a href=\"/products\">Products</a></body></html>"
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) })
	mux.HandleFunc("/about", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) })
	mux.HandleFunc("/contact", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) })
	mux.HandleFunc("/products", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) })
	srv := httptest.NewServer(mux)
	defer srv.Close()
	svc := &httpValidationService{}
	root := &httpvalidator.ValidationResult{FinalURL: srv.URL + "/", RawBody: []byte(body)}
	for i := 0; i < b.N; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		svc.microCrawlEnhance(ctx, uuid.New(), root, nil, nil, 3, 60000)
		cancel()
	}
}
