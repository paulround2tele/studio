package models

import ()

// HttpPersonaConfig defines structured configuration for HTTP personas
type HttpPersonaConfig struct {
	UserAgent      string               `json:"userAgent" validate:"required"`
	Headers        map[string]string    `json:"headers"`
	HeaderOrder    []string             `json:"headerOrder"`
	TLSClientHello *TLSClientHello      `json:"tlsClientHello"`
	HTTP2Settings  *HTTP2SettingsConfig `json:"http2Settings"`
	CookieHandling *CookieHandling      `json:"cookieHandling"`

	// Validation settings
	AllowInsecureTLS     bool    `json:"allowInsecureTls"`
	RequestTimeoutSec    int     `json:"requestTimeoutSec" validate:"min=1,max=300"`
	RequestTimeoutSeconds int    `json:"requestTimeoutSeconds" validate:"min=1,max=300"` // Alternative field name
	MaxRedirects         int     `json:"maxRedirects" validate:"min=0,max=20"`
	RateLimitDps         float64 `json:"rateLimitDps" validate:"min=0"`
	RateLimitBurst       int     `json:"rateLimitBurst" validate:"min=1"`

	// Headless browser settings
	UseHeadless            bool   `json:"useHeadless"`
	ViewportWidth          int    `json:"viewportWidth" validate:"min=320,max=4096"`
	ViewportHeight         int    `json:"viewportHeight" validate:"min=240,max=4096"`
	HeadlessUserAgent      string `json:"headlessUserAgent"`
	ScriptExecution        bool   `json:"scriptExecution"`
	LoadImages             bool   `json:"loadImages"`
	Screenshot             bool   `json:"screenshot"`
	DomSnapshot            bool   `json:"domSnapshot"`
	HeadlessTimeoutSeconds int    `json:"headlessTimeoutSeconds" validate:"min=1,max=300"`
	WaitDelaySeconds       int    `json:"waitDelaySeconds" validate:"min=0,max=60"`
	FetchBodyForKeywords   bool   `json:"fetchBodyForKeywords"`
}

type TLSClientHello struct {
	MinVersion       string   `json:"minVersion"`
	MaxVersion       string   `json:"maxVersion"`
	CipherSuites     []string `json:"cipherSuites"`
	CurvePreferences []string `json:"curvePreferences"`
	JA3              string   `json:"ja3"`
}

type HTTP2SettingsConfig struct {
	Enabled bool `json:"enabled"`
}

type CookieHandling struct {
	Mode string `json:"mode"` // "preserve", "ignore", "custom", "none", "file", "session"
}

// DnsPersonaConfig defines structured configuration for DNS personas
type DnsPersonaConfig struct {
	Resolvers                  []string           `json:"resolvers" validate:"required,min=1"`
	UseSystemResolvers         bool               `json:"useSystemResolvers"`
	QueryTimeoutSeconds        int                `json:"queryTimeoutSeconds" validate:"min=1,max=60"`
	MaxDomainsPerRequest       int                `json:"maxDomainsPerRequest" validate:"min=1,max=1000"`
	ResolverStrategy           string             `json:"resolverStrategy" validate:"required,oneof=round_robin random weighted priority random_rotation weighted_rotation sequential_failover"`
	ResolversWeighted          map[string]float64 `json:"resolversWeighted"`
	ResolversPreferredOrder    []string           `json:"resolversPreferredOrder"`
	ConcurrentQueriesPerDomain int                `json:"concurrentQueriesPerDomain" validate:"min=1,max=10"`
	QueryDelayMinMs            int                `json:"queryDelayMinMs" validate:"min=0,max=5000"`
	QueryDelayMaxMs            int                `json:"queryDelayMaxMs" validate:"min=0,max=10000"`
	MaxConcurrentGoroutines    int                `json:"maxConcurrentGoroutines" validate:"min=1,max=1000"`
	RateLimitDps               float64            `json:"rateLimitDps" validate:"min=0"`
	RateLimitBurst             int                `json:"rateLimitBurst" validate:"min=1"`
}

// Standard API response wrapper
type APIResponse struct {
	Status  string      `json:"status"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message"`
	Error   string      `json:"error,omitempty"`
}
