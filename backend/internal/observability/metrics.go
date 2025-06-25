package observability

import (
	"fmt"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// MetricsCollector provides standardized service metrics.
type MetricsCollector struct {
	registry       prometheus.Registerer
	serviceMetrics *ServiceMetrics
	customMetrics  map[string]prometheus.Collector
}

type ServiceMetrics struct {
	RequestDuration *prometheus.HistogramVec
	RequestCount    *prometheus.CounterVec
}

func NewMetricsCollector(reg prometheus.Registerer) *MetricsCollector {
	if reg == nil {
		reg = prometheus.DefaultRegisterer
	}
	return &MetricsCollector{
		registry:       reg,
		serviceMetrics: &ServiceMetrics{},
		customMetrics:  make(map[string]prometheus.Collector),
	}
}

// RegisterServiceMetrics registers standard service metrics.
func (mc *MetricsCollector) RegisterServiceMetrics(serviceName string) {
	mc.serviceMetrics.RequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "service_request_duration_seconds",
			Help: "Request duration in seconds",
		},
		[]string{"service", "method", "endpoint"},
	)
	mc.serviceMetrics.RequestCount = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "service_requests_total",
			Help: "Total number of requests",
		},
		[]string{"service", "method", "endpoint", "status"},
	)
	mc.registry.MustRegister(mc.serviceMetrics.RequestDuration, mc.serviceMetrics.RequestCount)
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// MetricsMiddleware records service metrics for incoming requests.
func (mc *MetricsCollector) MetricsMiddleware(serviceName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(wrapped, r)

			duration := time.Since(start).Seconds()
			endpoint := r.URL.Path
			mc.serviceMetrics.RequestDuration.WithLabelValues(serviceName, r.Method, endpoint).Observe(duration)
			mc.serviceMetrics.RequestCount.WithLabelValues(serviceName, r.Method, endpoint, fmt.Sprintf("%d", wrapped.statusCode)).Inc()
		})
	}
}

// Handler returns an HTTP handler exposing Prometheus metrics.
func (mc *MetricsCollector) Handler() http.Handler {
	return promhttp.HandlerFor(prometheus.DefaultGatherer, promhttp.HandlerOpts{})
}
