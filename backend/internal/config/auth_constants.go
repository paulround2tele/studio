package config

// Cookie names - shared between frontend and backend
const (
	SessionCookieName    = "domainflow_session" // Fixed to match frontend expectation
	AuthTokensCookieName = "auth_tokens"
)

// Cookie settings - safe defaults for development on localhost
const (
	CookieMaxAge   = 86400 // 24 hours - much longer for convenience
	CookiePath     = "/"
	CookieSecure   = false // Not required on localhost
	CookieHttpOnly = true  // Prevent JS access; cookies only sent by browser
	CookieSameSite = "Lax" // Acceptable for localhost cross-origin (same-site) calls
)
