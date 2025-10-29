package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type logEntry struct {
	level   string
	message string
	fields  map[string]interface{}
}

type testLogger struct {
	entries []logEntry
}

func (l *testLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
	l.entries = append(l.entries, logEntry{level: "debug", message: msg, fields: copyFields(fields)})
}

func (l *testLogger) Info(ctx context.Context, msg string, fields map[string]interface{}) {}
func (l *testLogger) Warn(ctx context.Context, msg string, fields map[string]interface{}) {}
func (l *testLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
	l.entries = append(l.entries, logEntry{level: "error", message: msg, fields: copyFields(fields)})
}

func copyFields(fields map[string]interface{}) map[string]interface{} {
	dup := make(map[string]interface{}, len(fields))
	for k, v := range fields {
		switch vv := v.(type) {
		case map[string]string:
			inner := make(map[string]string, len(vv))
			for kk, vv2 := range vv {
				inner[kk] = vv2
			}
			dup[k] = inner
		default:
			dup[k] = vv
		}
	}
	return dup
}

func TestNetworkLogHandlerSuccess(t *testing.T) {
	logger := &testLogger{}
	handler := newNetworkLogHandler(&AppDeps{Logger: logger})

	status := 504
	ok := false
	errText := strings.Repeat("boom", 200)
	payload := map[string]interface{}{
		"timestamp":       time.Now().UTC().Format(time.RFC3339Nano),
		"url":             " https://example.com/api/v2/resource ",
		"method":          "post",
		"durationMs":      -42,
		"status":          status,
		"ok":              ok,
		"error":           errText,
		"requestHeaders":  map[string]string{"X-Long": strings.Repeat("x", 400)},
		"responseHeaders": map[string]string{"Server": "nginx"},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/debug/network-log", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), contextKeyAllowedOrigin, "http://localhost:3000"))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected status 202, got %d", rec.Code)
	}
	if rec.Header().Get("X-Request-Id") == "" {
		t.Fatalf("expected X-Request-Id header to be set")
	}
	if len(logger.entries) != 1 {
		t.Fatalf("expected one log entry, got %d", len(logger.entries))
	}

	entry := logger.entries[0]
	if entry.message != "frontend.network.request" {
		t.Fatalf("unexpected log message: %s", entry.message)
	}
	if method, ok := entry.fields["method"].(string); !ok || method != "POST" {
		t.Fatalf("expected method POST, got %#v", entry.fields["method"])
	}
	if url, ok := entry.fields["url"].(string); !ok || url != "https://example.com/api/v2/resource" {
		t.Fatalf("unexpected url field: %#v", entry.fields["url"])
	}
	if duration, ok := entry.fields["duration_ms"].(int); !ok || duration != 0 {
		t.Fatalf("expected duration_ms 0, got %#v", entry.fields["duration_ms"])
	}
	if entry.fields["status"].(int) != status {
		t.Fatalf("expected status %d", status)
	}
	if entry.fields["ok"].(bool) != ok {
		t.Fatalf("expected ok false")
	}
	if rid, ok := entry.fields["request_id"].(string); !ok || rid == "" || rid != rec.Header().Get("X-Request-Id") {
		t.Fatalf("request_id field mismatch")
	}
	if origin, ok := entry.fields["origin"].(string); !ok || origin != "http://localhost:3000" {
		t.Fatalf("expected origin to be set")
	}

	errField, ok := entry.fields["error"].(string)
	if !ok {
		t.Fatalf("expected error field to be string")
	}
	if len(errField) != networkLogMaxErrorSize {
		t.Fatalf("expected error to be truncated to %d bytes, got %d", networkLogMaxErrorSize, len(errField))
	}

	reqHeaders, ok := entry.fields["request_headers"].(map[string]string)
	if !ok {
		t.Fatalf("expected request_headers map")
	}
	if val := reqHeaders["x-long"]; len(val) > networkLogMaxHeaderValueSize {
		t.Fatalf("expected request header value truncated")
	}
}

func TestNetworkLogHandlerBadRequest(t *testing.T) {
	logger := &testLogger{}
	handler := newNetworkLogHandler(&AppDeps{Logger: logger})

	// Missing required fields
	payload := map[string]interface{}{
		"timestamp":  time.Now().UTC().Format(time.RFC3339Nano),
		"durationMs": 5,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/debug/network-log", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Fatalf("expected JSON error response")
	}
	if len(logger.entries) != 0 {
		t.Fatalf("expected no log entries on validation failure")
	}
}
