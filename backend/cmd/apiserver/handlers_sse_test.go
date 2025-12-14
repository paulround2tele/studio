package main

import (
	"context"
	"net/http/httptest"
	"testing"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/services"
)

type flushRecorder struct{ *httptest.ResponseRecorder }

func (f *flushRecorder) Flush() {}

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
	if r200.ActiveConnections == nil || r200.TotalEventsSent == nil || r200.Uptime == nil {
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
	r200, ok := resp.(sseLiveResponse)
	if !ok {
		t.Fatalf("expected SSE live response, got %T", resp)
	}
	fr := &flushRecorder{ResponseRecorder: httptest.NewRecorder()}

	ch := make(chan error, 1)
	go func() {
		ch <- r200.VisitSseEventsAllResponse(fr)
	}()

	deadline := time.After(1500 * time.Millisecond)
	for {
		select {
		case err := <-ch:
			if err != nil {
				t.Fatalf("visit failed: %v", err)
			}
			return
		case <-deadline:
			if fr.Body.Len() == 0 {
				t.Fatalf("expected some SSE data, got none")
			}
			got := fr.Body.String()
			if !(contains(got, "event:") || contains(got, "data:") || contains(got, "keep_alive")) {
				t.Fatalf("unexpected SSE payload: %q", got)
			}
			return
		case <-time.After(50 * time.Millisecond):
			if fr.Body.Len() > 0 {
				got := fr.Body.String()
				if !(contains(got, "event:") || contains(got, "data:") || contains(got, "keep_alive")) {
					t.Fatalf("unexpected SSE payload: %q", got)
				}
				return
			}
		}
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
