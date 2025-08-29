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

	// Post-response middleware: set session cookie on successful AuthLogin
	authLoginCookie := func(next gen.StrictHandlerFunc, operationID string) gen.StrictHandlerFunc {
		return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req interface{}) (interface{}, error) {
			resp, err := next(ctx, w, r, req)
			if operationID == "AuthLogin" {
				if v, ok := resp.(gen.AuthLogin200JSONResponse); ok && v.Data != nil {
					token := string(v.Data.Token)
					if token != "" {
						http.SetCookie(w, &http.Cookie{
							Name:     config.SessionCookieName,
							Value:    token,
							Path:     config.CookiePath,
							HttpOnly: config.CookieHttpOnly,
							Secure:   config.CookieSecure,
							SameSite: sameSiteFromString(config.CookieSameSite),
							MaxAge:   config.CookieMaxAge,
						})
					}
				}
			}
			return resp, err
		}
	}

	handler := gen.NewStrictHandlerWithOptions(&strictHandlers{deps: deps}, []gen.StrictMiddlewareFunc{authCtx, authLoginCookie}, opts)
	baseHandler := gen.HandlerWithOptions(handler, gen.ChiServerOptions{BaseURL: "/api/v2"})

	// CORS middleware to allow frontend at localhost:3000 to call API with credentials
	allowedOrigins := map[string]struct{}{
		"http://localhost:3000": {},
		"http://127.0.0.1:3000": {},
	}
	corsWrapper := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if _, ok := allowedOrigins[origin]; ok {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Vary", "Origin")
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Authorization")
					w.Header().Set("Access-Control-Max-Age", "7200")
				}
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
	r := corsWrapper(baseHandler)

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

// Map string to http.SameSite mode with safe defaults
func sameSiteFromString(s string) http.SameSite {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "lax":
		return http.SameSiteLaxMode
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	default:
		return http.SameSiteLaxMode
	}
}
