package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// requestLoggingMiddleware emits a structured log line for every HTTP request handled by the Chi server.
// It captures method, path, status, latency, bytes written, caller IP, and correlates with request_id when present.
func requestLoggingMiddleware(logger HandlerLogger) func(http.Handler) http.Handler {
	if logger == nil {
		logger = &SimpleLogger{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			reqIDHeader := requestID(r)
			ctx := context.WithValue(r.Context(), "request_id", reqIDHeader)

			wrappedWriter := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			if wrappedWriter.Header().Get("X-Request-Id") == "" {
				wrappedWriter.Header().Set("X-Request-Id", reqIDHeader)
			}

			defer func() {
				if rec := recover(); rec != nil {
					fields := map[string]interface{}{
						"request_id":  reqIDHeader,
						"method":      r.Method,
						"path":        r.URL.Path,
						"remote_ip":   clientIP(r),
						"host":        r.Host,
						"duration_ms": time.Since(start).Milliseconds(),
						"panic":       fmt.Sprintf("%v", rec),
					}
					logger.Error(ctx, "http.request.panic", fmt.Errorf("panic: %v", rec), fields)
					panic(rec)
				}
			}()

			next.ServeHTTP(wrappedWriter, r.WithContext(ctx))

			status := wrappedWriter.Status()
			if status == 0 {
				status = http.StatusOK
			}

			duration := time.Since(start)
			fields := map[string]interface{}{
				"request_id":    reqIDHeader,
				"method":        r.Method,
				"path":          r.URL.Path,
				"status":        status,
				"duration_ms":   duration.Milliseconds(),
				"bytes_written": wrappedWriter.BytesWritten(),
				"scheme":        schemeFromRequest(r),
				"proto":         r.Proto,
				"remote_ip":     clientIP(r),
				"host":          r.Host,
			}

			if rawQuery := r.URL.RawQuery; rawQuery != "" {
				fields["query"] = rawQuery
			}
			if ref := r.Header.Get("Referer"); ref != "" {
				fields["referer"] = ref
			}
			if ua := r.Header.Get("User-Agent"); ua != "" {
				fields["user_agent"] = ua
			}
			if cl := r.ContentLength; cl > 0 {
				fields["content_length"] = cl
			}
			switch {
			case status >= 500:
				logger.Error(ctx, "http.request", fmt.Errorf("response status %d", status), fields)
			case status >= 400:
				logger.Warn(ctx, "http.request", fields)
			default:
				logger.Info(ctx, "http.request", fields)
			}
		})
	}
}

func schemeFromRequest(r *http.Request) string {
	if r.TLS != nil {
		return "https"
	}
	if scheme := r.Header.Get("X-Forwarded-Proto"); scheme != "" {
		return scheme
	}
	return "http"
}
