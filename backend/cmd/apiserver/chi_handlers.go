package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/go-chi/chi/v5"
)

type contextKey string

const (
	contextKeyAllowedOrigin contextKey = "allowed_origin"
)

// startChiServer starts the Chi server on the configured port and blocks.
func startChiServer() {
	logCloser, err := initFileLogging()
	if err != nil {
		log.Fatalf("Failed to initialize log file: %v", err)
	}
	if logCloser != nil {
		defer logCloser.Close()
	}
	// Initialize shared dependencies for strict handlers
	deps, err := initAppDependencies()
	if err != nil {
		log.Fatalf("Failed to initialize dependencies: %v", err)
	}

	// Lightweight auth-context middleware: validate session cookie and attach user_id to ctx
	authCtx := func(next gen.StrictHandlerFunc, operationID string) gen.StrictHandlerFunc {
		return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req interface{}) (interface{}, error) {
			ctx = context.WithValue(ctx, "client_ip", clientIP(r))
			// Inject request URL pointer for query param access in handlers (e.g., expected_state)
			ctx = context.WithValue(ctx, "request_url", r.URL)
			// P3.3: Inject relevant headers for idempotency key support
			headers := map[string]string{
				"X-Idempotency-Key": r.Header.Get("X-Idempotency-Key"),
			}
			ctx = context.WithValue(ctx, "request_headers", headers)
			// Only attempt if session service is available
			if deps.Session != nil {
				if c, err := r.Cookie(config.SessionCookieName); err == nil {
					// Verify the signed cookie and extract session ID
					sessionID, valid := services.VerifySessionCookie(c.Value)
					if valid {
						ip := clientIP(r)
						if sd, verr := deps.Session.ValidateSession(sessionID, ip); verr == nil {
							ctx = context.WithValue(ctx, "user_id", sd.UserID.String())
							ctx = context.WithValue(ctx, "session_id", sd.ID)
							
							// Sliding session expiration: extend if within 6 hours of expiry
							if services.ShouldExtendSession(sd.ExpiresAt) {
								if newExpiry, extended := deps.Session.ExtendSessionWithSliding(sd.ID, sd.ExpiresAt); extended {
									// Re-issue signed cookie with updated Max-Age
									newMaxAge := int(time.Until(newExpiry).Seconds())
									if newMaxAge > 0 {
										signedCookie := services.SignSessionCookie(sd.ID)
										http.SetCookie(w, &http.Cookie{
											Name:     config.SessionCookieName,
											Value:    signedCookie,
											Path:     config.CookiePath,
											HttpOnly: config.CookieHttpOnly,
											Secure:   config.CookieSecure,
											SameSite: sameSiteFromString(config.CookieSameSite),
											MaxAge:   newMaxAge,
										})
									}
								}
							}
						}
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
				if v, ok := resp.(gen.AuthLogin200JSONResponse); ok {
					token := v.Token
					if token != "" {
						// Sign the session cookie for security
						signedCookie := services.SignSessionCookie(token)
						http.SetCookie(w, &http.Cookie{
							Name:     config.SessionCookieName,
							Value:    signedCookie,
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

	// Post-response middleware: clear session cookie on AuthLogout (both success and 401)
	authLogoutCookie := func(next gen.StrictHandlerFunc, operationID string) gen.StrictHandlerFunc {
		return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req interface{}) (interface{}, error) {
			resp, err := next(ctx, w, r, req)
			if operationID == "AuthLogout" {
				// Clear cookies on both successful logout (204) and unauthorized (401)
				// The 401 case handles when the session was already invalidated but the cookie is still present
				shouldClearCookies := false
				if _, ok := resp.(gen.AuthLogout204Response); ok {
					shouldClearCookies = true
				}
				if _, ok := resp.(gen.AuthLogout401JSONResponse); ok {
					shouldClearCookies = true
				}
				if shouldClearCookies {
					// Clear the session cookie by setting MaxAge to -1
					http.SetCookie(w, &http.Cookie{
						Name:     config.SessionCookieName,
						Value:    "",
						Path:     config.CookiePath,
						HttpOnly: config.CookieHttpOnly,
						Secure:   config.CookieSecure,
						SameSite: sameSiteFromString(config.CookieSameSite),
						MaxAge:   -1, // Immediately expire the cookie
					})
					// Also clear the auth_presence cookie
					http.SetCookie(w, &http.Cookie{
						Name:     "auth_presence",
						Value:    "",
						Path:     config.CookiePath,
						HttpOnly: false, // auth_presence is readable by JS
						Secure:   config.CookieSecure,
						SameSite: sameSiteFromString(config.CookieSameSite),
						MaxAge:   -1, // Immediately expire the cookie
					})
				}
			}
			return resp, err
		}
	}

	networkLogger := newNetworkLogHandler(deps)
	strict := &strictHandlers{deps: deps, networkLogger: networkLogger}
	handler := gen.NewStrictHandlerWithOptions(strict, []gen.StrictMiddlewareFunc{authCtx, authLoginCookie, authLogoutCookie}, opts)
	baseHandler := gen.HandlerWithOptions(handler, gen.ChiServerOptions{BaseURL: "/api/v2"})

	// CORS middleware to allow frontend at localhost:3000 to call API with credentials
	allowedOrigins := buildAllowedOrigins()
	corsWrapper := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			if origin := r.Header.Get("Origin"); origin != "" {
				if originAllowed(origin, allowedOrigins) {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Authorization")
					w.Header().Set("Access-Control-Max-Age", "7200")
					w.Header().Add("Vary", "Origin")
					ctx = context.WithValue(ctx, contextKeyAllowedOrigin, origin)
				}
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
	finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && r.URL.Path == "/api/v2/debug/network-log" {
			networkLogger.ServeHTTP(w, r)
			return
		}
		rewritten := rewriteLegacyCampaignSSEPath(r)
		baseHandler.ServeHTTP(w, rewritten)
	})
	wrappedHandler := corsWrapper(finalHandler)
	r := requestLoggingMiddleware(deps.Logger)(wrappedHandler)

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

// initFileLogging configures the global logger to write to both stdout and a persistent log file.
// The log path can be overridden with APISERVER_LOG_PATH; defaults to ./apiserver.log relative to the working directory.
func initFileLogging() (io.Closer, error) {
	logPath := resolveLogPath()

	dir := filepath.Dir(logPath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}

	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return nil, err
	}

	multi := io.MultiWriter(os.Stdout, file)
	log.SetOutput(multi)
	log.SetFlags(log.LstdFlags | log.LUTC)

	return file, nil
}

func resolveLogPath() string {
	if env := strings.TrimSpace(os.Getenv("APISERVER_LOG_PATH")); env != "" {
		return env
	}

	if data, err := os.ReadFile("config.json"); err == nil {
		var cfg struct {
			Logging struct {
				LogFilePath string `json:"logFilePath"`
			} `json:"logging"`
		}
		if err := json.Unmarshal(data, &cfg); err == nil {
			if cfgPath := strings.TrimSpace(cfg.Logging.LogFilePath); cfgPath != "" {
				return cfgPath
			}
		}
	}

	return config.DefaultLogFilePath
}

func buildAllowedOrigins() map[string]struct{} {
	defaults := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://localhost:3000",
		"https://127.0.0.1:3000",
		"http://localhost:3001",
		"http://127.0.0.1:3001",
		"https://localhost:3001",
		"https://127.0.0.1:3001",
		"http://localhost:3002",
		"http://127.0.0.1:3002",
		"https://localhost:3002",
		"https://127.0.0.1:3002",
		"http://localhost:3003",
		"http://127.0.0.1:3003",
		"https://localhost:3003",
		"https://127.0.0.1:3003",
	}

	origins := make(map[string]struct{})
	add := func(raw string) {
		trimmed := strings.TrimSpace(raw)
		if trimmed != "" {
			origins[trimmed] = struct{}{}
		}
	}

	for _, candidate := range defaults {
		add(candidate)
	}

	if extra := os.Getenv("APISERVER_ALLOWED_ORIGINS"); extra != "" {
		parts := strings.Split(extra, ",")
		for _, part := range parts {
			add(part)
		}
	}

	if csName := strings.TrimSpace(os.Getenv("CODESPACE_NAME")); csName != "" {
		domain := strings.TrimSpace(os.Getenv("GITHUB_CODESPACE_PORT_FORWARDING_DOMAIN"))
		if domain == "" {
			domain = "app.github.dev"
		}
		add(fmt.Sprintf("https://%s-3000.%s", csName, domain))
	}

	return origins
}

func originAllowed(origin string, allowed map[string]struct{}) bool {
	if _, ok := allowed[origin]; ok {
		return true
	}
	if strings.HasSuffix(origin, ".app.github.dev") {
		if strings.Contains(origin, "-3000.") || strings.Contains(origin, "-3001.") || strings.Contains(origin, "-3002.") || strings.Contains(origin, "-3003.") {
			return true
		}
	}
	return false
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

// rewriteLegacyCampaignSSEPath transparently upgrades legacy SSE URLs
// (/api/v2/sse/campaigns/{id}) to the canonical streaming endpoint
// (/api/v2/sse/campaigns/{id}/events) so older clients keep working.
func rewriteLegacyCampaignSSEPath(r *http.Request) *http.Request {
	if r == nil || r.URL == nil {
		return r
	}
	if r.Method != http.MethodGet {
		return r
	}
	path := r.URL.Path
	if !strings.HasPrefix(path, "/api/v2/sse/campaigns/") {
		return r
	}
	if strings.HasSuffix(path, "/events") {
		return r
	}
	remainder := strings.Trim(path[len("/api/v2/sse/campaigns/"):], "/")
	if remainder == "" || strings.Contains(remainder, "/") {
		return r
	}
	canonicalPath := "/api/v2/sse/campaigns/" + remainder + "/events"
	clone := r.Clone(r.Context())
	newURL := *clone.URL
	newURL.Path = canonicalPath
	newURL.RawPath = canonicalPath
	clone.URL = &newURL
	requestURI := canonicalPath
	if newURL.RawQuery != "" {
		requestURI = requestURI + "?" + newURL.RawQuery
	}
	clone.RequestURI = requestURI
	return clone
}
func NewStrictTestRouter(deps *AppDeps) chi.Router {
	r := chi.NewRouter()
	networkLogger := newNetworkLogHandler(deps)
	strict := &strictHandlers{deps: deps, networkLogger: networkLogger}
	h := gen.NewStrictHandler(strict, nil)
	r.Route("/api/v2", func(r chi.Router) {
		gen.HandlerFromMuxWithBaseURL(h, r, "/api/v2")
	})
	return r
}
