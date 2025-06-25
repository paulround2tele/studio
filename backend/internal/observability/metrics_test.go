package observability

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
)

func TestRegisterServiceMetrics(t *testing.T) {
	reg := prometheus.NewRegistry()
	mc := NewMetricsCollector(reg)
	mc.RegisterServiceMetrics("test")

	// record a dummy observation so the metric exists when gathered
	mc.serviceMetrics.RequestDuration.WithLabelValues("test", http.MethodGet, "/").Observe(0.1)

	mfs, err := reg.Gather()
	if err != nil {
		t.Fatalf("gather: %v", err)
	}
	found := false
	for _, mf := range mfs {
		if mf.GetName() == "service_request_duration_seconds" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("service_request_duration_seconds metric not found")
	}
}

func TestMetricsMiddleware(t *testing.T) {
	reg := prometheus.NewRegistry()
	mc := NewMetricsCollector(reg)
	mc.RegisterServiceMetrics("test")

	handler := mc.MetricsMiddleware("test")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	req := httptest.NewRequest(http.MethodGet, "/foo", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("unexpected code %d", rr.Code)
	}

	mfs, err := reg.Gather()
	if err != nil {
		t.Fatalf("gather: %v", err)
	}
	var count float64
	for _, mf := range mfs {
		if mf.GetName() == "service_requests_total" {
			for _, m := range mf.GetMetric() {
				count += m.GetCounter().GetValue()
			}
		}
	}
	if count != 1 {
		t.Fatalf("expected 1 request recorded, got %v", count)
	}
}
