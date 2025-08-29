package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

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
	// Wire strict error handlers to return our standardized envelopes
	opts := gen.StrictHTTPServerOptions{
		RequestErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
			// 400 Bad Request envelope
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(gen.BadRequestJSONResponse{
				Error:     gen.ApiError{Message: err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()},
				RequestId: requestID(r),
				Success:   boolPtr(false),
			})
		},
		ResponseErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
			// 500 Internal Server Error envelope for unexpected response types/validation
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(gen.InternalServerErrorJSONResponse{
				Error:     gen.ApiError{Message: err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()},
				RequestId: requestID(r),
				Success:   boolPtr(false),
			})
		},
	}
	handler := gen.NewStrictHandlerWithOptions(&strictHandlers{deps: deps}, []gen.StrictMiddlewareFunc{authCtx}, opts)
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
