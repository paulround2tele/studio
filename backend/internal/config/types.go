// File: backend/internal/config/types.go
package config

import "time"

// TLSClientHelloConfig defines TLS client hello parameters.
type TLSClientHelloConfig struct {
	MinVersion       string   `json:"minVersion,omitempty"`
	MaxVersion       string   `json:"maxVersion,omitempty"`
	CipherSuites     []string `json:"cipherSuites,omitempty"`
	CurvePreferences []string `json:"curvePreferences,omitempty"`
}

// HTTP2SettingsConfig defines HTTP/2 specific settings.
type HTTP2SettingsConfig struct {
	Enabled *bool `json:"enabled,omitempty"`
}

// CookieHandlingConfig defines how cookies should be handled.
type CookieHandlingConfig struct {
	Mode string `json:"mode,omitempty"`
}

// LoggingConfig defines logging parameters.
type LoggingConfig struct {
	Level                    string `json:"level"`
	LogFilePath              string `json:"logFilePath,omitempty"`
	EnableFileLogging        bool   `json:"enableFileLogging,omitempty"`
	LogDirectory             string `json:"logDirectory,omitempty"`
	MaxFileSize              int    `json:"maxFileSize,omitempty"`
	MaxBackups               int    `json:"maxBackups,omitempty"`
	MaxAge                   int    `json:"maxAge,omitempty"`
	EnableJSONFormat         bool   `json:"enableJSONFormat,omitempty"`
	EnableRequestLogging     bool   `json:"enableRequestLogging,omitempty"`
	EnablePerformanceLogging bool   `json:"enablePerformanceLogging,omitempty"`
}

// WorkerConfig defines settings for the background campaign workers.
type WorkerConfig struct {
	NumWorkers                    int `json:"numWorkers,omitempty"`
	PollIntervalSeconds           int `json:"pollIntervalSeconds,omitempty"`
	ErrorRetryDelaySeconds        int `json:"errorRetryDelaySeconds,omitempty"`
	MaxJobRetries                 int `json:"maxJobRetries,omitempty"`
	JobProcessingTimeoutMinutes   int `json:"jobProcessingTimeoutMinutes,omitempty"`
	BatchSize                     int `json:"batchSize,omitempty"`
	MaxRetries                    int `json:"maxRetries,omitempty"`
	RetryDelaySeconds             int `json:"retryDelaySeconds,omitempty"`
	DNSSubtaskConcurrency         int `json:"dnsSubtaskConcurrency,omitempty"`         // Added
	HTTPKeywordSubtaskConcurrency int `json:"httpKeywordSubtaskConcurrency,omitempty"` // Added
}

// RateLimiterConfig defines global API rate limiting settings.
type RateLimiterConfig struct {
	MaxRequests   int `json:"maxRequests"`
	WindowSeconds int `json:"windowSeconds"`
}

// FeatureFlags holds feature flag settings persisted in config.json.
type FeatureFlags struct {
	EnableRealTimeUpdates bool `json:"enableRealTimeUpdates"`
	EnableOfflineMode     bool `json:"enableOfflineMode"`
	EnableAnalytics       bool `json:"enableAnalytics"`
	EnableDebugMode       bool `json:"enableDebugMode"`
	EnableStealth         bool `json:"enableStealth"`
	// EnableStealthForceCursor forces stealth to use cursor pagination only (no legacy fallback)
	EnableStealthForceCursor bool `json:"enableStealthForceCursor"`
}

// ServerConfig defines server-specific settings.
type ServerConfig struct {
	Port                     string          `json:"port"`
	APIKey                   string          `json:"apiKey"`
	StreamChunkSize          int             `json:"streamChunkSize,omitempty"`
	GinMode                  string          `json:"ginMode,omitempty"`
	DBMaxOpenConns           int             `json:"dbMaxOpenConns,omitempty"`
	DBMaxIdleConns           int             `json:"dbMaxIdleConns,omitempty"`
	DBConnMaxLifetimeMinutes int             `json:"dbConnMaxLifetimeMinutes,omitempty"`
	DatabaseConfig           *DatabaseConfig `json:"database,omitempty"`
	AuthConfig               *AuthConfig     `json:"auth,omitempty"`
}

// DNSValidatorConfig holds the effective configuration for DNSValidator.
type DNSValidatorConfig struct {
	Resolvers                  []string
	UseSystemResolvers         bool
	QueryTimeout               time.Duration
	MaxDomainsPerRequest       int
	ResolverStrategy           string
	ResolversWeighted          map[string]int
	ResolversPreferredOrder    []string
	ConcurrentQueriesPerDomain int
	QueryDelayMin              time.Duration
	QueryDelayMax              time.Duration
	MaxConcurrentGoroutines    int
	RateLimitDPS               float64
	RateLimitBurst             int
	QueryTimeoutSeconds        int `json:"-"`
	JSONQueryDelayMinMs        int `json:"-"`
	JSONQueryDelayMaxMs        int `json:"-"`
}

// DNSValidatorConfigJSON is used for marshalling/unmarshalling DNSValidator settings.
type DNSValidatorConfigJSON struct {
	Resolvers                  []string       `json:"resolvers,omitempty"`
	UseSystemResolvers         bool           `json:"useSystemResolvers"`
	QueryTimeoutSeconds        int            `json:"queryTimeoutSeconds,omitempty"`
	MaxDomainsPerRequest       int            `json:"maxDomainsPerRequest,omitempty"`
	ResolverStrategy           string         `json:"resolverStrategy,omitempty"`
	ResolversWeighted          map[string]int `json:"resolversWeighted,omitempty"`
	ResolversPreferredOrder    []string       `json:"resolversPreferredOrder,omitempty"`
	ConcurrentQueriesPerDomain int            `json:"concurrentQueriesPerDomain,omitempty"`
	QueryDelayMinMs            int            `json:"queryDelayMinMs,omitempty"`
	QueryDelayMaxMs            int            `json:"queryDelayMaxMs,omitempty"`
	MaxConcurrentGoroutines    int            `json:"maxConcurrentGoroutines,omitempty"`
	RateLimitDPS               float64        `json:"rateLimitDps,omitempty"`
	RateLimitBurst             int            `json:"rateLimitBurst,omitempty"`
}

// HTTPValidatorConfig holds the effective configuration for HTTPValidator.
type HTTPValidatorConfig struct {
	DefaultUserAgent        string
	UserAgents              []string
	DefaultHeaders          map[string]string
	RequestTimeout          time.Duration
	MaxRedirects            int
	FollowRedirects         bool
	MaxDomainsPerRequest    int
	AllowInsecureTLS        bool
	MaxConcurrentGoroutines int
	RateLimitDPS            float64
	RateLimitBurst          int
	MaxBodyReadBytes        int64
	RequestTimeoutSeconds   int `json:"-"`
}

// HTTPValidatorConfigJSON is used for marshalling/unmarshalling HTTPValidator settings.
type HTTPValidatorConfigJSON struct {
	DefaultUserAgent        string            `json:"defaultUserAgent,omitempty"`
	UserAgents              []string          `json:"userAgents,omitempty"`
	DefaultHeaders          map[string]string `json:"defaultHeaders,omitempty"`
	RequestTimeoutSeconds   int               `json:"requestTimeoutSeconds,omitempty"`
	MaxRedirects            int               `json:"maxRedirects,omitempty"`
	FollowRedirects         *bool             `json:"followRedirects,omitempty"`
	MaxDomainsPerRequest    int               `json:"maxDomainsPerRequest,omitempty"`
	AllowInsecureTLS        bool              `json:"allowInsecureTLS"`
	MaxConcurrentGoroutines int               `json:"maxConcurrentGoroutines,omitempty"`
	RateLimitDPS            float64           `json:"rateLimitDps,omitempty"`
	RateLimitBurst          int               `json:"rateLimitBurst,omitempty"`
	MaxBodyReadBytes        int64             `json:"maxBodyReadBytes,omitempty"`
}

// ProxyManagerConfig holds settings for proxy health checks.
type ProxyManagerConfig struct {
	TestTimeout                      time.Duration
	TestURL                          string
	InitialHealthCheckTimeout        time.Duration
	MaxConcurrentInitialChecks       int
	TestTimeoutSeconds               int `json:"-"`
	InitialHealthCheckTimeoutSeconds int `json:"-"`
}

// ProxyManagerConfigJSON is the JSON representation of ProxyManagerConfig.
type ProxyManagerConfigJSON struct {
	TestTimeoutSeconds               int    `json:"testTimeoutSeconds"`
	TestURL                          string `json:"testUrl"`
	InitialHealthCheckTimeoutSeconds int    `json:"initialHealthCheckTimeoutSeconds"`
	MaxConcurrentInitialChecks       int    `json:"maxConcurrentInitialChecks"`
}

// AppConfigJSON defines the structure of the main config.json file.
// This struct is used to unmarshal the config.json file.
type AppConfigJSON struct {
	Server         ServerConfig                   `json:"server"`
	Worker         WorkerConfig                   `json:"worker,omitempty"` // WorkerConfig now includes the new fields
	DNSValidator   DNSValidatorConfigJSON         `json:"dnsValidator"`
	HTTPValidator  HTTPValidatorConfigJSON        `json:"httpValidator"`
	Logging        LoggingConfig                  `json:"logging"`
	RateLimiter    RateLimiterConfig              `json:"rateLimiter,omitempty"`
	ProxyManager   ProxyManagerConfigJSON         `json:"proxyManager"`
	Features       FeatureFlags                   `json:"features"`
	Reconciliation DomainReconciliationConfigJSON `json:"reconciliation"`
}

// DomainReconciliationConfig controls the nightly domain counters reconciliation job.
type DomainReconciliationConfig struct {
	Enabled              bool
	IntervalMinutes      int
	DriftThresholdPct    float64
	AutoCorrect          bool
	MaxCorrectionsPerRun int
}

// DomainReconciliationConfigJSON is JSON representation.
type DomainReconciliationConfigJSON struct {
	Enabled              bool    `json:"enabled"`
	IntervalMinutes      int     `json:"intervalMinutes"`
	DriftThresholdPct    float64 `json:"driftThresholdPct"`
	AutoCorrect          bool    `json:"autoCorrect"`
	MaxCorrectionsPerRun int     `json:"maxCorrectionsPerRun"`
}

func ConvertJSONToDomainReconciliationConfig(j DomainReconciliationConfigJSON) DomainReconciliationConfig {
	cfg := DomainReconciliationConfig{
		Enabled:              j.Enabled,
		IntervalMinutes:      j.IntervalMinutes,
		DriftThresholdPct:    j.DriftThresholdPct,
		AutoCorrect:          j.AutoCorrect,
		MaxCorrectionsPerRun: j.MaxCorrectionsPerRun,
	}
	if cfg.IntervalMinutes <= 0 {
		cfg.IntervalMinutes = 1440
	} // default daily
	if cfg.DriftThresholdPct <= 0 {
		cfg.DriftThresholdPct = 0.01
	} // default 0.01%
	if cfg.MaxCorrectionsPerRun <= 0 {
		cfg.MaxCorrectionsPerRun = 50
	}
	return cfg
}

func ConvertDomainReconciliationConfigToJSON(c DomainReconciliationConfig) DomainReconciliationConfigJSON {
	return DomainReconciliationConfigJSON{
		Enabled:              c.Enabled,
		IntervalMinutes:      c.IntervalMinutes,
		DriftThresholdPct:    c.DriftThresholdPct,
		AutoCorrect:          c.AutoCorrect,
		MaxCorrectionsPerRun: c.MaxCorrectionsPerRun,
	}
}
