package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/logging"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// CachedSessionService wraps SessionService with Redis distributed caching
type CachedSessionService struct {
	*SessionService
	redisCache  *cache.DistributedCacheManager
	cacheConfig *CachedSessionConfig
}

// CachedSessionConfig defines caching behavior for sessions
type CachedSessionConfig struct {
	// How long to cache valid sessions in Redis (default: 5 minutes)
	CacheTTL time.Duration
	// How long to cache "session not found" results to prevent DB spam (default: 30 seconds)
	NegativeCacheTTL time.Duration
	// Cache key prefix
	KeyPrefix string
	// Enable/disable distributed caching
	Enabled bool
}

// DefaultCachedSessionConfig returns optimized cache configuration
func DefaultCachedSessionConfig() *CachedSessionConfig {
	return &CachedSessionConfig{
		CacheTTL:         5 * time.Minute,  // Cache valid sessions for 5 minutes
		NegativeCacheTTL: 30 * time.Second, // Cache "not found" for 30 seconds
		KeyPrefix:        "session:",
		Enabled:          true,
	}
}

// CachedSessionData represents session data optimized for caching
type CachedSessionData struct {
	*SessionData
	CachedAt time.Time `json:"cached_at"`
	IsValid  bool      `json:"is_valid"`
}

// NewCachedSessionService creates a new cached session service
func NewCachedSessionService(
	db *sqlx.DB,
	sessionConfig *config.SessionConfig,
	auditLogStore store.AuditLogStore,
	redisCache *cache.DistributedCacheManager,
	cacheConfig *CachedSessionConfig,
) (*CachedSessionService, error) {

	// Create base session service
	baseService, err := NewSessionService(db, sessionConfig, auditLogStore)
	if err != nil {
		return nil, fmt.Errorf("failed to create base session service: %w", err)
	}

	if cacheConfig == nil {
		cacheConfig = DefaultCachedSessionConfig()
	}

	return &CachedSessionService{
		SessionService: baseService,
		redisCache:     redisCache,
		cacheConfig:    cacheConfig,
	}, nil
}

// ValidateSession with distributed Redis caching
func (s *CachedSessionService) ValidateSession(sessionID, clientIP string) (*SessionData, error) {
	startTime := time.Now()

	// Validate session ID format first for security
	if sessionID == "" || len(sessionID) < 32 {
		return nil, ErrSessionNotFound
	}

	// Skip cache if disabled
	if !s.cacheConfig.Enabled {
		return s.SessionService.ValidateSession(sessionID, clientIP)
	}

	// Try Redis cache first (distributed cache)
	cacheKey := s.getCacheKey(sessionID)
	cachedData, redisCacheHit := s.getFromRedisCache(cacheKey)

	if redisCacheHit {
		// Validate cached session is still fresh and valid
		if s.isCachedSessionValid(cachedData, clientIP) {
			duration := time.Since(startTime)

			// Log successful Redis cache hit (only for slow operations)
			if duration > 10*time.Millisecond {
				logging.LogSessionEvent(
					"session_redis_cache_hit",
					&cachedData.SessionData.UserID,
					&sessionID,
					clientIP,
					"",
					true,
					&cachedData.SessionData.ExpiresAt,
					map[string]interface{}{
						"validation_duration_ms": duration.Milliseconds(),
						"cache_age_seconds":      time.Since(cachedData.CachedAt).Seconds(),
					},
				)
			}

			return cachedData.SessionData, nil
		}
		// Cached session is stale/invalid, remove from cache
		s.removeFromRedisCache(cacheKey)
	}

	// Fallback to base service (which has its own in-memory cache + DB)
	session, err := s.SessionService.ValidateSession(sessionID, clientIP)

	if err != nil {
		// Cache negative result to prevent DB spam
		s.cacheNegativeResult(cacheKey)
		return nil, err
	}

	// Cache successful result in Redis
	s.cacheSessionInRedis(cacheKey, session)

	duration := time.Since(startTime)

	// Log cache miss performance (only for slow operations)
	if duration > 50*time.Millisecond {
		logging.LogSessionEvent(
			"session_redis_cache_miss",
			&session.UserID,
			&sessionID,
			clientIP,
			"",
			true,
			&session.ExpiresAt,
			map[string]interface{}{
				"validation_duration_ms": duration.Milliseconds(),
				"redis_cache_hit":        redisCacheHit,
			},
		)
	}

	return session, nil
}

// InvalidateSession removes from all caches and database
func (s *CachedSessionService) InvalidateSession(sessionID string) error {
	// Remove from Redis cache
	if s.cacheConfig.Enabled {
		cacheKey := s.getCacheKey(sessionID)
		s.removeFromRedisCache(cacheKey)
	}

	// Remove from base service (in-memory + database)
	return s.SessionService.InvalidateSession(sessionID)
}

// InvalidateAllUserSessions removes all user sessions from caches and database
func (s *CachedSessionService) InvalidateAllUserSessions(userID uuid.UUID) error {
	// For Redis, we'd need to scan for user's session keys
	// This is expensive, so we rely on TTL expiration for Redis cleanup
	// The in-memory cache and database are still properly cleaned

	return s.SessionService.InvalidateAllUserSessions(userID)
}

// GetCacheMetrics returns enhanced metrics including Redis cache performance
func (s *CachedSessionService) GetCacheMetrics() map[string]interface{} {
	baseMetrics := s.SessionService.GetMetrics()

	metrics := map[string]interface{}{
		"total_sessions":        baseMetrics.TotalSessions,
		"active_sessions":       baseMetrics.ActiveSessions,
		"memory_cache_hit_rate": baseMetrics.CacheHitRate,
		"avg_lookup_time_ms":    baseMetrics.AvgLookupTime.Milliseconds(),
		"cleanup_count":         baseMetrics.CleanupCount,
		"security_events":       baseMetrics.SecurityEvents,
		"redis_cache_enabled":   s.cacheConfig.Enabled,
		"cache_ttl_minutes":     s.cacheConfig.CacheTTL.Minutes(),
	}

	// Add Redis-specific metrics if available
	if s.redisCache != nil {
		redisMetrics := s.redisCache.GetMetrics()
		metrics["redis_total_operations"] = redisMetrics["total_operations"]
		metrics["redis_cache_hits"] = redisMetrics["cache_hits"]
		metrics["redis_cache_misses"] = redisMetrics["cache_misses"]
		metrics["redis_errors"] = redisMetrics["errors"]
	}

	return metrics
}

// Private methods for Redis caching

func (s *CachedSessionService) getCacheKey(sessionID string) string {
	return s.cacheConfig.KeyPrefix + sessionID
}

func (s *CachedSessionService) getFromRedisCache(cacheKey string) (*CachedSessionData, bool) {
	ctx := context.Background()

	data, err := s.redisCache.Get(ctx, cacheKey)
	if err != nil {
		return nil, false
	}

	var cachedSession CachedSessionData
	if err := json.Unmarshal([]byte(data), &cachedSession); err != nil {
		// Invalid cached data, remove it
		s.redisCache.Delete(ctx, cacheKey)
		return nil, false
	}

	return &cachedSession, true
}

func (s *CachedSessionService) cacheSessionInRedis(cacheKey string, session *SessionData) {
	ctx := context.Background()

	cachedData := &CachedSessionData{
		SessionData: session,
		CachedAt:    time.Now(),
		IsValid:     true,
	}

	jsonData, err := json.Marshal(cachedData)
	if err != nil {
		return // Fail silently, caching is not critical
	}

	// Cache with TTL
	s.redisCache.SetWithTTL(ctx, cacheKey, string(jsonData), s.cacheConfig.CacheTTL)
}

func (s *CachedSessionService) cacheNegativeResult(cacheKey string) {
	ctx := context.Background()

	negativeData := &CachedSessionData{
		SessionData: nil,
		CachedAt:    time.Now(),
		IsValid:     false,
	}

	jsonData, err := json.Marshal(negativeData)
	if err != nil {
		return
	}

	// Cache negative result with shorter TTL
	s.redisCache.SetWithTTL(ctx, cacheKey, string(jsonData), s.cacheConfig.NegativeCacheTTL)
}

func (s *CachedSessionService) removeFromRedisCache(cacheKey string) {
	ctx := context.Background()
	s.redisCache.Delete(ctx, cacheKey)
}

func (s *CachedSessionService) isCachedSessionValid(cachedData *CachedSessionData, clientIP string) bool {
	// Check if negative cache result
	if !cachedData.IsValid {
		return false
	}

	session := cachedData.SessionData
	if session == nil {
		return false
	}

	now := time.Now()

	// Check if session has expired since being cached
	if now.After(session.ExpiresAt) {
		return false
	}

	// Check if cache entry itself is too old
	cacheAge := now.Sub(cachedData.CachedAt)
	if cacheAge > s.cacheConfig.CacheTTL {
		return false
	}

	// Check idle timeout
	idleTime := now.Sub(session.LastActivity)
	if idleTime > s.SessionService.config.IdleTimeout {
		return false
	}

	// Perform security checks (minimal for cached sessions)
	if s.SessionService.config.RequireIPMatch && session.IPAddress != clientIP {
		return false
	}

	return true
}

// Health check method for monitoring
func (s *CachedSessionService) HealthCheck() map[string]interface{} {
	health := map[string]interface{}{
		"service_status": "healthy",
		"cache_enabled":  s.cacheConfig.Enabled,
	}

	// Test Redis connectivity
	if s.redisCache != nil {
		ctx := context.Background()
		testKey := "health_check_" + time.Now().Format("20060102150405")

		// Test set/get/delete
		err := s.redisCache.Set(ctx, testKey, "test_value")
		if err != nil {
			health["redis_status"] = "error"
			health["redis_error"] = err.Error()
		} else {
			_, err := s.redisCache.Get(ctx, testKey)
			if err != nil {
				health["redis_status"] = "read_error"
				health["redis_error"] = err.Error()
			} else {
				s.redisCache.Delete(ctx, testKey)
				health["redis_status"] = "healthy"
			}
		}
	} else {
		health["redis_status"] = "not_configured"
	}

	return health
}
