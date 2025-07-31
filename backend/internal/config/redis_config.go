// File: backend/internal/config/redis_config.go
package config

import (
	"fmt"
	"time"
)

// RedisConfig holds Redis-specific configuration for caching
type RedisConfig struct {
	// Basic connection settings
	Enabled  bool   `json:"enabled" env:"REDIS_ENABLED" default:"false"`
	Addr     string `json:"addr" env:"REDIS_ADDR" default:"localhost:6379"`
	Password string `json:"password" env:"REDIS_PASSWORD" default:""`
	DB       int    `json:"db" env:"REDIS_DB" default:"0"`

	// Connection pool settings
	PoolSize        int           `json:"poolSize" env:"REDIS_POOL_SIZE" default:"20"`
	MinIdleConns    int           `json:"minIdleConns" env:"REDIS_MIN_IDLE_CONNS" default:"5"`
	IdleTimeout     time.Duration `json:"idleTimeout" env:"REDIS_IDLE_TIMEOUT" default:"5m"`
	ConnMaxLifetime time.Duration `json:"connMaxLifetime" env:"REDIS_CONN_MAX_LIFETIME" default:"30m"`

	// Timeouts
	DialTimeout  time.Duration `json:"dialTimeout" env:"REDIS_DIAL_TIMEOUT" default:"5s"`
	ReadTimeout  time.Duration `json:"readTimeout" env:"REDIS_READ_TIMEOUT" default:"3s"`
	WriteTimeout time.Duration `json:"writeTimeout" env:"REDIS_WRITE_TIMEOUT" default:"3s"`

	// Retry and reliability
	MaxRetries int `json:"maxRetries" env:"REDIS_MAX_RETRIES" default:"3"`

	// TTL settings for different entity types
	EntityTTL struct {
		PersonaTTL    time.Duration `json:"personaTTL" env:"REDIS_PERSONA_TTL" default:"5m"`
		KeywordSetTTL time.Duration `json:"keywordSetTTL" env:"REDIS_KEYWORD_SET_TTL" default:"10m"`
		KeywordTTL    time.Duration `json:"keywordTTL" env:"REDIS_KEYWORD_TTL" default:"15m"`
		ProxyTTL      time.Duration `json:"proxyTTL" env:"REDIS_PROXY_TTL" default:"5m"`
	} `json:"entityTTL"`

	// Validation result TTLs
	ValidationTTL struct {
		DNSValidationTTL     time.Duration `json:"dnsValidationTTL" env:"REDIS_DNS_VALIDATION_TTL" default:"2m"`
		HTTPValidationTTL    time.Duration `json:"httpValidationTTL" env:"REDIS_HTTP_VALIDATION_TTL" default:"1m"`
		ConfigFingerprintTTL time.Duration `json:"configFingerprintTTL" env:"REDIS_CONFIG_FINGERPRINT_TTL" default:"30m"`
	} `json:"validationTTL"`

	// Campaign data TTLs
	CampaignTTL struct {
		CampaignDetailsTTL      time.Duration `json:"campaignDetailsTTL" env:"REDIS_CAMPAIGN_DETAILS_TTL" default:"3m"`
		CampaignRelationshipTTL time.Duration `json:"campaignRelationshipTTL" env:"REDIS_CAMPAIGN_RELATIONSHIP_TTL" default:"5m"`
		BatchQueryResultTTL     time.Duration `json:"batchQueryResultTTL" env:"REDIS_BATCH_QUERY_RESULT_TTL" default:"2m"`
	} `json:"campaignTTL"`

	// Monitoring and metrics
	Metrics struct {
		Enabled              bool          `json:"enabled" env:"REDIS_METRICS_ENABLED" default:"true"`
		FlushInterval        time.Duration `json:"flushInterval" env:"REDIS_METRICS_FLUSH_INTERVAL" default:"30s"`
		PerformanceThreshold struct {
			LatencyWarningMs  int64   `json:"latencyWarningMs" env:"REDIS_LATENCY_WARNING_MS" default:"50"`
			LatencyCriticalMs int64   `json:"latencyCriticalMs" env:"REDIS_LATENCY_CRITICAL_MS" default:"100"`
			HitRatioWarning   float64 `json:"hitRatioWarning" env:"REDIS_HIT_RATIO_WARNING" default:"0.7"`
			ErrorRateWarning  float64 `json:"errorRateWarning" env:"REDIS_ERROR_RATE_WARNING" default:"0.05"`
		} `json:"performanceThreshold"`
	} `json:"metrics"`
}

// DefaultRedisConfig returns a production-ready Redis configuration
func DefaultRedisConfig() RedisConfig {
	config := RedisConfig{
		Enabled:         false, // Start disabled by default for backward compatibility
		Addr:            "localhost:6379",
		Password:        "",
		DB:              0,
		PoolSize:        20,
		MinIdleConns:    5,
		IdleTimeout:     5 * time.Minute,
		ConnMaxLifetime: 30 * time.Minute,
		DialTimeout:     5 * time.Second,
		ReadTimeout:     3 * time.Second,
		WriteTimeout:    3 * time.Second,
		MaxRetries:      3,
	}

	// Set entity TTLs
	config.EntityTTL.PersonaTTL = 5 * time.Minute
	config.EntityTTL.KeywordSetTTL = 10 * time.Minute
	config.EntityTTL.KeywordTTL = 15 * time.Minute
	config.EntityTTL.ProxyTTL = 5 * time.Minute

	// Set validation TTLs
	config.ValidationTTL.DNSValidationTTL = 2 * time.Minute
	config.ValidationTTL.HTTPValidationTTL = 1 * time.Minute
	config.ValidationTTL.ConfigFingerprintTTL = 30 * time.Minute

	// Set campaign TTLs
	config.CampaignTTL.CampaignDetailsTTL = 3 * time.Minute
	config.CampaignTTL.CampaignRelationshipTTL = 5 * time.Minute
	config.CampaignTTL.BatchQueryResultTTL = 2 * time.Minute

	// Set metrics configuration
	config.Metrics.Enabled = true
	config.Metrics.FlushInterval = 30 * time.Second
	config.Metrics.PerformanceThreshold.LatencyWarningMs = 50
	config.Metrics.PerformanceThreshold.LatencyCriticalMs = 100
	config.Metrics.PerformanceThreshold.HitRatioWarning = 0.7
	config.Metrics.PerformanceThreshold.ErrorRateWarning = 0.05

	return config
}

// Validate checks if the Redis configuration is valid
func (rc *RedisConfig) Validate() error {
	if !rc.Enabled {
		return nil // No validation needed if disabled
	}

	if rc.Addr == "" {
		return fmt.Errorf("Redis address cannot be empty when enabled")
	}

	if rc.DB < 0 {
		return fmt.Errorf("Redis DB must be non-negative, got %d", rc.DB)
	}

	if rc.PoolSize <= 0 {
		return fmt.Errorf("Redis pool size must be positive, got %d", rc.PoolSize)
	}

	if rc.MinIdleConns < 0 {
		return fmt.Errorf("Redis min idle connections must be non-negative, got %d", rc.MinIdleConns)
	}

	if rc.MinIdleConns > rc.PoolSize {
		return fmt.Errorf("Redis min idle connections (%d) cannot exceed pool size (%d)", rc.MinIdleConns, rc.PoolSize)
	}

	if rc.MaxRetries < 0 {
		return fmt.Errorf("Redis max retries must be non-negative, got %d", rc.MaxRetries)
	}

	// Validate timeout values
	if rc.DialTimeout <= 0 {
		return fmt.Errorf("Redis dial timeout must be positive, got %v", rc.DialTimeout)
	}

	if rc.ReadTimeout <= 0 {
		return fmt.Errorf("Redis read timeout must be positive, got %v", rc.ReadTimeout)
	}

	if rc.WriteTimeout <= 0 {
		return fmt.Errorf("Redis write timeout must be positive, got %v", rc.WriteTimeout)
	}

	return nil
}

// RedisCacheConfig represents the configuration for Redis cache
type RedisCacheConfig struct {
	RedisAddr            string        `json:"redisAddr"`
	RedisPassword        string        `json:"redisPassword"`
	RedisDB              int           `json:"redisDB"`
	DefaultTTL           time.Duration `json:"defaultTTL"`
	MaxRetries           int           `json:"maxRetries"`
	PoolSize             int           `json:"poolSize"`
	MinIdleConns         int           `json:"minIdleConns"`
	IdleTimeout          time.Duration `json:"idleTimeout"`
	ConnMaxLifetime      time.Duration `json:"connMaxLifetime"`
	DialTimeout          time.Duration `json:"dialTimeout"`
	ReadTimeout          time.Duration `json:"readTimeout"`
	WriteTimeout         time.Duration `json:"writeTimeout"`
	EnableMetrics        bool          `json:"enableMetrics"`
	MetricsFlushInterval time.Duration `json:"metricsFlushInterval"`
}

// ToRedisCacheConfig converts RedisConfig to RedisCacheConfig
func (rc *RedisConfig) ToRedisCacheConfig() RedisCacheConfig {
	return RedisCacheConfig{
		RedisAddr:            rc.Addr,
		RedisPassword:        rc.Password,
		RedisDB:              rc.DB,
		DefaultTTL:           rc.EntityTTL.PersonaTTL, // Use persona TTL as default
		MaxRetries:           rc.MaxRetries,
		PoolSize:             rc.PoolSize,
		MinIdleConns:         rc.MinIdleConns,
		IdleTimeout:          rc.IdleTimeout,
		ConnMaxLifetime:      rc.ConnMaxLifetime,
		DialTimeout:          rc.DialTimeout,
		ReadTimeout:          rc.ReadTimeout,
		WriteTimeout:         rc.WriteTimeout,
		EnableMetrics:        rc.Metrics.Enabled,
		MetricsFlushInterval: rc.Metrics.FlushInterval,
	}
}

// GetEntityTTL returns the appropriate TTL for a given entity type
func (rc *RedisConfig) GetEntityTTL(entityType string) time.Duration {
	switch entityType {
	case "persona":
		return rc.EntityTTL.PersonaTTL
	case "keyword_set":
		return rc.EntityTTL.KeywordSetTTL
	case "keyword":
		return rc.EntityTTL.KeywordTTL
	case "proxy":
		return rc.EntityTTL.ProxyTTL
	case "dns_validation":
		return rc.ValidationTTL.DNSValidationTTL
	case "http_validation":
		return rc.ValidationTTL.HTTPValidationTTL
	case "config_fingerprint":
		return rc.ValidationTTL.ConfigFingerprintTTL
	case "campaign_details":
		return rc.CampaignTTL.CampaignDetailsTTL
	case "campaign_relationship":
		return rc.CampaignTTL.CampaignRelationshipTTL
	case "batch_query":
		return rc.CampaignTTL.BatchQueryResultTTL
	default:
		return rc.EntityTTL.PersonaTTL // Default fallback
	}
}

// IsPerformanceAlertEnabled checks if performance monitoring is enabled
func (rc *RedisConfig) IsPerformanceAlertEnabled() bool {
	return rc.Metrics.Enabled
}

// ShouldAlertOnLatency checks if latency warrants an alert
func (rc *RedisConfig) ShouldAlertOnLatency(latencyMs int64) string {
	if latencyMs >= rc.Metrics.PerformanceThreshold.LatencyCriticalMs {
		return "critical"
	}
	if latencyMs >= rc.Metrics.PerformanceThreshold.LatencyWarningMs {
		return "warning"
	}
	return ""
}

// ShouldAlertOnHitRatio checks if hit ratio warrants an alert
func (rc *RedisConfig) ShouldAlertOnHitRatio(hitRatio float64) bool {
	return rc.Metrics.Enabled && hitRatio < rc.Metrics.PerformanceThreshold.HitRatioWarning
}

// ShouldAlertOnErrorRate checks if error rate warrants an alert
func (rc *RedisConfig) ShouldAlertOnErrorRate(errorRate float64) bool {
	return rc.Metrics.Enabled && errorRate >= rc.Metrics.PerformanceThreshold.ErrorRateWarning
}
