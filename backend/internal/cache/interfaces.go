// File: backend/internal/cache/interfaces.go
package cache

import (
	"context"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// Cache defines the core caching interface with basic operations
type Cache interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
	GetMetrics() CacheMetrics
	Close() error
}

// EntityCache defines caching operations for domain entities
type EntityCache interface {
	// Persona caching
	GetPersona(ctx context.Context, id uuid.UUID) (*models.Persona, error)
	SetPersona(ctx context.Context, persona *models.Persona, ttl time.Duration) error
	GetPersonasBatch(ctx context.Context, ids []uuid.UUID) ([]*models.Persona, []uuid.UUID, error)
	InvalidatePersona(ctx context.Context, id uuid.UUID) error

	// KeywordSet caching
	GetKeywordSet(ctx context.Context, id uuid.UUID) (*models.KeywordSet, error)
	SetKeywordSet(ctx context.Context, keywordSet *models.KeywordSet, ttl time.Duration) error
	GetKeywordSetsBatch(ctx context.Context, ids []uuid.UUID) ([]*models.KeywordSet, []uuid.UUID, error)
	InvalidateKeywordSet(ctx context.Context, id uuid.UUID) error

	// Keyword caching
	GetKeywordRule(ctx context.Context, id uuid.UUID) (*models.KeywordRule, error)
	SetKeywordRule(ctx context.Context, keyword *models.KeywordRule, ttl time.Duration) error
	GetKeywordRulesBatch(ctx context.Context, ids []uuid.UUID) ([]*models.KeywordRule, []uuid.UUID, error)
	InvalidateKeywordRule(ctx context.Context, id uuid.UUID) error

	// Proxy caching
	GetProxy(ctx context.Context, id uuid.UUID) (*models.Proxy, error)
	SetProxy(ctx context.Context, proxy *models.Proxy, ttl time.Duration) error
	GetProxiesBatch(ctx context.Context, ids []uuid.UUID) ([]*models.Proxy, []uuid.UUID, error)
	InvalidateProxy(ctx context.Context, id uuid.UUID) error
}

// ValidationCache defines caching operations for validation results
type ValidationCache interface {
	// DNS validation result caching
	GetDNSValidationResult(ctx context.Context, configHash string) (*ValidationResult, error)
	SetDNSValidationResult(ctx context.Context, configHash string, result *ValidationResult, ttl time.Duration) error
	InvalidateDNSValidationResult(ctx context.Context, configHash string) error

	// HTTP validation result caching
	GetHTTPValidationResult(ctx context.Context, configHash string) (*ValidationResult, error)
	SetHTTPValidationResult(ctx context.Context, configHash string, result *ValidationResult, ttl time.Duration) error
	InvalidateHTTPValidationResult(ctx context.Context, configHash string) error

	// Configuration fingerprint caching
	GetConfigFingerprint(ctx context.Context, personaID uuid.UUID) (string, error)
	SetConfigFingerprint(ctx context.Context, personaID uuid.UUID, fingerprint string, ttl time.Duration) error
	InvalidateConfigFingerprint(ctx context.Context, personaID uuid.UUID) error
}

// CampaignCache defines caching operations for campaign data
type CampaignCache interface {
	// Campaign details caching
	GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, error)
	SetCampaignDetails(ctx context.Context, campaign *models.LeadGenerationCampaign, ttl time.Duration) error
	InvalidateCampaignDetails(ctx context.Context, campaignID uuid.UUID) error

	// Campaign-persona relationships caching
	GetCampaignPersonaRelationships(ctx context.Context, campaignID uuid.UUID) ([]uuid.UUID, error)
	SetCampaignPersonaRelationships(ctx context.Context, campaignID uuid.UUID, personaIDs []uuid.UUID, ttl time.Duration) error
	InvalidateCampaignPersonaRelationships(ctx context.Context, campaignID uuid.UUID) error

	// Batch query results caching
	GetBatchQueryResult(ctx context.Context, queryHash string) (interface{}, error)
	SetBatchQueryResult(ctx context.Context, queryHash string, result interface{}, ttl time.Duration) error
	InvalidateBatchQueryResult(ctx context.Context, queryHash string) error
}

// RedisCache combines all cache interfaces for Redis implementation
type RedisCache interface {
	Cache
	EntityCache
	ValidationCache
	CampaignCache
}

// ValidationResult represents cached validation outcome
type ValidationResult struct {
	IsValid        bool                   `json:"isValid"`
	ErrorMessage   string                 `json:"errorMessage,omitempty"`
	ResponseTime   time.Duration          `json:"responseTime"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	CachedAt       time.Time              `json:"cachedAt"`
	ConfigHash     string                 `json:"configHash"`
	ValidationHash string                 `json:"validationHash"`
}

// CacheMetrics tracks cache performance
type CacheMetrics struct {
	HitCount      int64   `json:"hitCount"`
	MissCount     int64   `json:"missCount"`
	ErrorCount    int64   `json:"errorCount"`
	TotalRequests int64   `json:"totalRequests"`
	HitRatio      float64 `json:"hitRatio"`
	AvgLatencyMs  int64   `json:"avgLatencyMs"`
	MemoryUsedMB  float64 `json:"memoryUsedMB"`
}

// RedisCacheConfig holds Redis-specific configuration settings
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

// DefaultRedisCacheConfig returns a production-ready Redis cache configuration
func DefaultRedisCacheConfig() RedisCacheConfig {
	return RedisCacheConfig{
		RedisAddr:            "localhost:6379",
		RedisPassword:        "",
		RedisDB:              0,
		DefaultTTL:           5 * time.Minute,
		MaxRetries:           3,
		PoolSize:             20,
		MinIdleConns:         5,
		IdleTimeout:          5 * time.Minute,
		ConnMaxLifetime:      30 * time.Minute,
		DialTimeout:          5 * time.Second,
		ReadTimeout:          3 * time.Second,
		WriteTimeout:         3 * time.Second,
		EnableMetrics:        true,
		MetricsFlushInterval: 30 * time.Second,
	}
}
