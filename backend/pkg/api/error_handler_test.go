package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestErrorHandler_HandleError(t *testing.T) {
	eh := NewErrorHandler(nil)
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/test", nil)

	eh.HandleError(req.Context(), &NotFoundError{err: errExample("not found")}, req, rr)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected status %d got %d", http.StatusNotFound, rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "RESOURCE_NOT_FOUND") {
		t.Fatalf("unexpected body: %s", rr.Body.String())
	}
}

type errExample string

func (e errExample) Error() string { return string(e) }
