package main

import (
	"context"
	"io"
	"testing"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/services"
)

// newSSEHandlersForTest wires only the SSE dependency for handler tests.
func newSSEHandlersForTest() *strictHandlers {
	deps := &AppDeps{}
	deps.SSE = services.NewSSEService()
	return &strictHandlers{deps: deps}
}

func TestSSEStats(t *testing.T) {
	h := newSSEHandlersForTest()
	ctx := context.Background()

	resp, err := h.SseEventsStats(ctx, gen.SseEventsStatsRequestObject{})
	if err != nil {
		t.Fatalf("SseEventsStats error: %v", err)
	}
	r200, ok := resp.(gen.SseEventsStats200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 JSON response, got %T", resp)
	}
	if r200.Data == nil || r200.Data.ActiveConnections == nil || r200.Data.TotalEventsSent == nil || r200.Data.Uptime == nil {
		t.Fatalf("unexpected stats payload: %+v", r200)
	}
}

func TestSSEAllStreamSmoke(t *testing.T) {
	h := newSSEHandlersForTest()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	resp, err := h.SseEventsAll(ctx, gen.SseEventsAllRequestObject{})
	if err != nil {
		t.Fatalf("SseEventsAll error: %v", err)
	}
	r200, ok := resp.(gen.SseEventsAll200TexteventStreamResponse)
	if !ok {
		t.Fatalf("expected 200 event-stream, got %T", resp)
	}
	// Attempt to close if it's a ReadCloser
	if rc, ok := r200.Body.(io.ReadCloser); ok {
		defer func() { _ = rc.Close() }()
	}

	// Read a bit from the stream; the SSE service sends a keep-alive event immediately.
	buf := make([]byte, 1024)
	type result struct {
		n   int
		err error
	}
	ch := make(chan result, 1)
	go func() {
		n, err := r200.Body.Read(buf)
		ch <- result{n: n, err: err}
	}()
	select {
	case res := <-ch:
		if res.err != nil && res.err != io.EOF {
			t.Fatalf("failed reading SSE pipe: %v", res.err)
		}
		if res.n == 0 {
			t.Fatalf("expected some SSE data, got 0 bytes")
		}
		got := string(buf[:res.n])
		if !(contains(got, "id:") || contains(got, "event:") || contains(got, "data:") || contains(got, "keep_alive")) {
			t.Fatalf("unexpected SSE payload: %q", got)
		}
	case <-time.After(1500 * time.Millisecond):
		t.Fatalf("timed out waiting for SSE data")
	}
}

// contains is a tiny helper to avoid importing strings in this file.
func contains(s, sub string) bool {
	return len(s) >= len(sub) && (func() bool {
		for i := 0; i+len(sub) <= len(s); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
		return false
	})()
}
