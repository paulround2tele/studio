package config

// Cookie names - shared between frontend and backend
const (
	SessionCookieName    = "domainflow_session" // Fixed to match frontend expectation
	AuthTokensCookieName = "auth_tokens"

	// Legacy cookie name for backward compatibility
	LegacySessionCookieName = "sessionId" // Swapped: old name is now legacy
)

// Cookie settings - VERY RELAXED for development and testing
const (
	CookieMaxAge   = 86400 // 24 hours - much longer for convenience
	CookiePath     = "/"
	CookieSecure   = false // Always disabled for easy testing
	CookieHttpOnly = false // Allow JavaScript access for easier debugging
	CookieSameSite = "None" // Most permissive setting
)
