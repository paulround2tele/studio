package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"strings"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
)

// startChiServer starts the Chi server on the configured port and blocks.
func startChiServer() {
	// Initialize shared dependencies for strict handlers
	deps, err := initAppDependencies()
	if err != nil {
		log.Fatalf("Failed to initialize dependencies: %v", err)
	}

	// Lightweight auth-context middleware: validate session cookie and attach user_id to ctx
	authCtx := func(next gen.StrictHandlerFunc, operationID string) gen.StrictHandlerFunc {
		return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req interface{}) (interface{}, error) {
			// Only attempt if session service is available
			if deps.Session != nil {
				if c, err := r.Cookie(config.SessionCookieName); err == nil {
					ip := clientIP(r)
					if sd, verr := deps.Session.ValidateSession(c.Value, ip); verr == nil {
						ctx = context.WithValue(ctx, "user_id", sd.UserID.String())
						ctx = context.WithValue(ctx, "session_id", sd.ID)
					}
				}
			}
			return next(ctx, w, r, req)
		}
	}

	// Build generated strict server with base URL /api/v2 and auth context injection
	handler := gen.NewStrictHandler(&strictHandlers{deps: deps}, []gen.StrictMiddlewareFunc{authCtx})
	r := gen.HandlerWithOptions(handler, gen.ChiServerOptions{BaseURL: "/api/v2"})

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}
	srv := &http.Server{Addr: ":" + port, Handler: r}
	log.Printf("Chi server starting on %s (OpenAPI-generated)", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Chi ListenAndServe error: %v", err)
	}
}

// clientIP extracts the best-effort client IP from headers or remote addr
func clientIP(r *http.Request) string {
	// Try X-Forwarded-For first
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	if xr := r.Header.Get("X-Real-IP"); xr != "" {
		return xr
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}
