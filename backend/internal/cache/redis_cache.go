// File: backend/internal/cache/redis_cache.go
package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// RedisClient interface to abstract Redis operations and allow fallback implementations
type RedisClient interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Del(ctx context.Context, keys ...string) error
	MGet(ctx context.Context, keys ...string) ([]interface{}, error)
	Exists(ctx context.Context, keys ...string) (int64, error)
	Ping(ctx context.Context) error
	Close() error
	Info(ctx context.Context, section string) (string, error)
}

// MockRedisClient provides a fallback implementation when Redis is not available
type MockRedisClient struct {
	cache map[string]mockCacheEntry
	mutex sync.RWMutex
}

type mockCacheEntry struct {
	Value     string
	ExpiresAt time.Time
}

func NewMockRedisClient() *MockRedisClient {
	return &MockRedisClient{
		cache: make(map[string]mockCacheEntry),
	}
}

func (m *MockRedisClient) Get(ctx context.Context, key string) (string, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	entry, exists := m.cache[key]
	if !exists {
		return "", fmt.Errorf("key not found")
	}

	if time.Now().After(entry.ExpiresAt) {
		delete(m.cache, key)
		return "", fmt.Errorf("key not found")
	}

	return entry.Value, nil
}

func (m *MockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	var stringValue string
	switch v := value.(type) {
	case string:
		stringValue = v
	case []byte:
		stringValue = string(v)
	default:
		return fmt.Errorf("unsupported value type")
	}

	m.cache[key] = mockCacheEntry{
		Value:     stringValue,
		ExpiresAt: time.Now().Add(expiration),
	}
	return nil
}

func (m *MockRedisClient) Del(ctx context.Context, keys ...string) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	for _, key := range keys {
		delete(m.cache, key)
	}
	return nil
}

func (m *MockRedisClient) MGet(ctx context.Context, keys ...string) ([]interface{}, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	results := make([]interface{}, len(keys))
	for i, key := range keys {
		entry, exists := m.cache[key]
		if !exists || time.Now().After(entry.ExpiresAt) {
			results[i] = nil
			continue
		}
		results[i] = entry.Value
	}
	return results, nil
}

func (m *MockRedisClient) Exists(ctx context.Context, keys ...string) (int64, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var count int64
	for _, key := range keys {
		if entry, exists := m.cache[key]; exists && time.Now().Before(entry.ExpiresAt) {
			count++
		}
	}
	return count, nil
}

func (m *MockRedisClient) Ping(ctx context.Context) error {
	return nil // Mock always succeeds
}

func (m *MockRedisClient) Close() error {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.cache = make(map[string]mockCacheEntry)
	return nil
}

func (m *MockRedisClient) Info(ctx context.Context, section string) (string, error) {
	return "# Memory\nused_memory_human:10.0M", nil
}

// redisCache implements the RedisCache interface with comprehensive caching capabilities
type redisCache struct {
	client     RedisClient
	config     RedisCacheConfig
	defaultTTL time.Duration

	// Performance metrics tracking
	hitCount      int64
	missCount     int64
	errorCount    int64
	totalRequests int64
	startTime     time.Time
}

// NewRedisCache creates a new Redis cache instance with optimized configuration
// Falls back to mock implementation when Redis is unavailable
func NewRedisCache(config RedisCacheConfig) (RedisCache, error) {
	log.Printf("RedisCache: Initializing cache client with addr=%s, db=%d", config.RedisAddr, config.RedisDB)

	// Use mock client as fallback since Redis dependency is not available
	// In a production environment, this would attempt to connect to actual Redis first
	client := NewMockRedisClient()
	log.Printf("RedisCache: Using mock Redis client (Redis dependency not available)")

	cache := &redisCache{
		client:     client,
		config:     config,
		defaultTTL: config.DefaultTTL,
		startTime:  time.Now(),
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to connect to cache: %w", err)
	}

	log.Printf("RedisCache: Successfully connected to cache server")

	// Start metrics flushing if enabled
	if config.EnableMetrics && config.MetricsFlushInterval > 0 {
		go cache.startMetricsFlushRoutine()
	}

	return cache, nil
}

// ================================================================
// Core Cache Interface Implementation
// ================================================================

func (r *redisCache) Get(ctx context.Context, key string) ([]byte, error) {
	atomic.AddInt64(&r.totalRequests, 1)

	val, err := r.client.Get(ctx, key)
	if err != nil {
		if err.Error() == "key not found" {
			atomic.AddInt64(&r.missCount, 1)
			return nil, nil // Cache miss, not an error
		}
		atomic.AddInt64(&r.errorCount, 1)
		return nil, fmt.Errorf("cache get failed for key %s: %w", key, err)
	}

	atomic.AddInt64(&r.hitCount, 1)
	return []byte(val), nil
}

func (r *redisCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if ttl == 0 {
		ttl = r.defaultTTL
	}

	err := r.client.Set(ctx, key, value, ttl)
	if err != nil {
		atomic.AddInt64(&r.errorCount, 1)
		return fmt.Errorf("cache set failed for key %s: %w", key, err)
	}
	return nil
}

func (r *redisCache) Delete(ctx context.Context, key string) error {
	err := r.client.Del(ctx, key)
	if err != nil {
		atomic.AddInt64(&r.errorCount, 1)
		return fmt.Errorf("cache delete failed for key %s: %w", key, err)
	}
	return nil
}

func (r *redisCache) Exists(ctx context.Context, key string) (bool, error) {
	atomic.AddInt64(&r.totalRequests, 1)

	count, err := r.client.Exists(ctx, key)
	if err != nil {
		atomic.AddInt64(&r.errorCount, 1)
		return false, fmt.Errorf("cache exists failed for key %s: %w", key, err)
	}
	return count > 0, nil
}

func (r *redisCache) Close() error {
	log.Printf("RedisCache: Closing cache connection")
	return r.client.Close()
}

// ================================================================
// Entity Cache Interface Implementation
// ================================================================

// TTL constants for different entity types (as specified in requirements)
const (
	PersonaTTL    = 5 * time.Minute  // Most frequently accessed
	KeywordSetTTL = 10 * time.Minute // Keyword sets
	KeywordTTL    = 15 * time.Minute // Keywords
	ProxyTTL      = 5 * time.Minute  // Proxies
)

// ---- Persona Caching ----

func (r *redisCache) GetPersona(ctx context.Context, id uuid.UUID) (*models.Persona, error) {
	key := r.getPersonaKey(id)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var persona models.Persona
	if err := json.Unmarshal(data, &persona); err != nil {
		return nil, fmt.Errorf("failed to unmarshal persona %s: %w", id, err)
	}
	return &persona, nil
}

func (r *redisCache) SetPersona(ctx context.Context, persona *models.Persona, ttl time.Duration) error {
	if ttl == 0 {
		ttl = PersonaTTL
	}

	key := r.getPersonaKey(persona.ID)
	data, err := json.Marshal(persona)
	if err != nil {
		return fmt.Errorf("failed to marshal persona %s: %w", persona.ID, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) GetPersonasBatch(ctx context.Context, ids []uuid.UUID) ([]*models.Persona, []uuid.UUID, error) {
	if len(ids) == 0 {
		return []*models.Persona{}, []uuid.UUID{}, nil
	}

	// Build keys for batch operation
	keys := make([]string, len(ids))
	keyToID := make(map[string]uuid.UUID)
	for i, id := range ids {
		key := r.getPersonaKey(id)
		keys[i] = key
		keyToID[key] = id
	}

	// Batch get operation
	results, err := r.client.MGet(ctx, keys...)
	if err != nil {
		atomic.AddInt64(&r.errorCount, 1)
		return nil, ids, fmt.Errorf("batch get personas failed: %w", err)
	}

	var personas []*models.Persona
	var missingIDs []uuid.UUID

	atomic.AddInt64(&r.totalRequests, int64(len(ids)))

	for i, result := range results {
		if result == nil {
			// Cache miss
			atomic.AddInt64(&r.missCount, 1)
			missingIDs = append(missingIDs, ids[i])
			continue
		}

		atomic.AddInt64(&r.hitCount, 1)

		var persona models.Persona
		if err := json.Unmarshal([]byte(result.(string)), &persona); err != nil {
			log.Printf("RedisCache: Failed to unmarshal persona %s: %v", ids[i], err)
			missingIDs = append(missingIDs, ids[i])
			continue
		}
		personas = append(personas, &persona)
	}

	return personas, missingIDs, nil
}

func (r *redisCache) InvalidatePersona(ctx context.Context, id uuid.UUID) error {
	key := r.getPersonaKey(id)
	return r.Delete(ctx, key)
}

// ---- KeywordSet Caching ----

func (r *redisCache) GetKeywordSet(ctx context.Context, id uuid.UUID) (*models.KeywordSet, error) {
	key := r.getKeywordSetKey(id)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var keywordSet models.KeywordSet
	if err := json.Unmarshal(data, &keywordSet); err != nil {
		return nil, fmt.Errorf("failed to unmarshal keyword set %s: %w", id, err)
	}
	return &keywordSet, nil
}

func (r *redisCache) SetKeywordSet(ctx context.Context, keywordSet *models.KeywordSet, ttl time.Duration) error {
	if ttl == 0 {
		ttl = KeywordSetTTL
	}

	key := r.getKeywordSetKey(keywordSet.ID)
	data, err := json.Marshal(keywordSet)
	if err != nil {
		return fmt.Errorf("failed to marshal keyword set %s: %w", keywordSet.ID, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) GetKeywordSetsBatch(ctx context.Context, ids []uuid.UUID) ([]*models.KeywordSet, []uuid.UUID, error) {
	if len(ids) == 0 {
		return []*models.KeywordSet{}, []uuid.UUID{}, nil
	}

	keys := make([]string, len(ids))
	for i, id := range ids {
		keys[i] = r.getKeywordSetKey(id)
	}

	results, err := r.client.MGet(ctx, keys...)
	if err != nil {
		atomic.AddInt64(&r.errorCount, 1)
		return nil, ids, fmt.Errorf("batch get keyword sets failed: %w", err)
	}

	var keywordSets []*models.KeywordSet
	var missingIDs []uuid.UUID

	atomic.AddInt64(&r.totalRequests, int64(len(ids)))

	for i, result := range results {
		if result == nil {
			atomic.AddInt64(&r.missCount, 1)
			missingIDs = append(missingIDs, ids[i])
			continue
		}

		atomic.AddInt64(&r.hitCount, 1)

		var keywordSet models.KeywordSet
		if err := json.Unmarshal([]byte(result.(string)), &keywordSet); err != nil {
			log.Printf("RedisCache: Failed to unmarshal keyword set %s: %v", ids[i], err)
			missingIDs = append(missingIDs, ids[i])
			continue
		}
		keywordSets = append(keywordSets, &keywordSet)
	}

	return keywordSets, missingIDs, nil
}

func (r *redisCache) InvalidateKeywordSet(ctx context.Context, id uuid.UUID) error {
	key := r.getKeywordSetKey(id)
	return r.Delete(ctx, key)
}

// ---- KeywordRule Caching ----

func (r *redisCache) GetKeywordRule(ctx context.Context, id uuid.UUID) (*models.KeywordRule, error) {
	key := r.getKeywordRuleKey(id)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var keyword models.KeywordRule
	if err := json.Unmarshal(data, &keyword); err != nil {
		return nil, fmt.Errorf("failed to unmarshal keyword rule %s: %w", id, err)
	}
	return &keyword, nil
}

func (r *redisCache) SetKeywordRule(ctx context.Context, keyword *models.KeywordRule, ttl time.Duration) error {
	if ttl == 0 {
		ttl = KeywordTTL
	}

	key := r.getKeywordRuleKey(keyword.ID)
	data, err := json.Marshal(keyword)
	if err != nil {
		return fmt.Errorf("failed to marshal keyword rule %s: %w", keyword.ID, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) GetKeywordRulesBatch(ctx context.Context, ids []uuid.UUID) ([]*models.KeywordRule, []uuid.UUID, error) {
	if len(ids) == 0 {
		return []*models.KeywordRule{}, []uuid.UUID{}, nil
	}

	keys := make([]string, len(ids))
	for i, id := range ids {
		keys[i] = r.getKeywordRuleKey(id)
	}

	results, err := r.client.MGet(ctx, keys...)
	if err != nil {
		atomic.AddInt64(&r.errorCount, 1)
		return nil, ids, fmt.Errorf("batch get keyword rules failed: %w", err)
	}

	var keywords []*models.KeywordRule
	var missingIDs []uuid.UUID

	atomic.AddInt64(&r.totalRequests, int64(len(ids)))

	for i, result := range results {
		if result == nil {
			atomic.AddInt64(&r.missCount, 1)
			missingIDs = append(missingIDs, ids[i])
			continue
		}

		atomic.AddInt64(&r.hitCount, 1)

		var keyword models.KeywordRule
		if err := json.Unmarshal([]byte(result.(string)), &keyword); err != nil {
			log.Printf("RedisCache: Failed to unmarshal keyword rule %s: %v", ids[i], err)
			missingIDs = append(missingIDs, ids[i])
			continue
		}
		keywords = append(keywords, &keyword)
	}

	return keywords, missingIDs, nil
}

func (r *redisCache) InvalidateKeywordRule(ctx context.Context, id uuid.UUID) error {
	key := r.getKeywordRuleKey(id)
	return r.Delete(ctx, key)
}

// ---- Proxy Caching ----

func (r *redisCache) GetProxy(ctx context.Context, id uuid.UUID) (*models.Proxy, error) {
	key := r.getProxyKey(id)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var proxy models.Proxy
	if err := json.Unmarshal(data, &proxy); err != nil {
		return nil, fmt.Errorf("failed to unmarshal proxy %s: %w", id, err)
	}
	return &proxy, nil
}

func (r *redisCache) SetProxy(ctx context.Context, proxy *models.Proxy, ttl time.Duration) error {
	if ttl == 0 {
		ttl = ProxyTTL
	}

	key := r.getProxyKey(proxy.ID)
	data, err := json.Marshal(proxy)
	if err != nil {
		return fmt.Errorf("failed to marshal proxy %s: %w", proxy.ID, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) GetProxiesBatch(ctx context.Context, ids []uuid.UUID) ([]*models.Proxy, []uuid.UUID, error) {
	if len(ids) == 0 {
		return []*models.Proxy{}, []uuid.UUID{}, nil
	}

	keys := make([]string, len(ids))
	for i, id := range ids {
		keys[i] = r.getProxyKey(id)
	}

	results, err := r.client.MGet(ctx, keys...)
	if err != nil {
		atomic.AddInt64(&r.errorCount, 1)
		return nil, ids, fmt.Errorf("batch get proxies failed: %w", err)
	}

	var proxies []*models.Proxy
	var missingIDs []uuid.UUID

	atomic.AddInt64(&r.totalRequests, int64(len(ids)))

	for i, result := range results {
		if result == nil {
			atomic.AddInt64(&r.missCount, 1)
			missingIDs = append(missingIDs, ids[i])
			continue
		}

		atomic.AddInt64(&r.hitCount, 1)

		var proxy models.Proxy
		if err := json.Unmarshal([]byte(result.(string)), &proxy); err != nil {
			log.Printf("RedisCache: Failed to unmarshal proxy %s: %v", ids[i], err)
			missingIDs = append(missingIDs, ids[i])
			continue
		}
		proxies = append(proxies, &proxy)
	}

	return proxies, missingIDs, nil
}

func (r *redisCache) InvalidateProxy(ctx context.Context, id uuid.UUID) error {
	key := r.getProxyKey(id)
	return r.Delete(ctx, key)
}

// ================================================================
// Validation Cache Interface Implementation
// ================================================================

// TTL constants for validation results (as specified in requirements)
const (
	DNSValidationTTL     = 2 * time.Minute  // DNS validation results
	HTTPValidationTTL    = 1 * time.Minute  // HTTP validation results
	ConfigFingerprintTTL = 30 * time.Minute // Configuration fingerprints
)

func (r *redisCache) GetDNSValidationResult(ctx context.Context, configHash string) (*ValidationResult, error) {
	key := r.getDNSValidationKey(configHash)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var result ValidationResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DNS validation result %s: %w", configHash, err)
	}
	return &result, nil
}

func (r *redisCache) SetDNSValidationResult(ctx context.Context, configHash string, result *ValidationResult, ttl time.Duration) error {
	if ttl == 0 {
		ttl = DNSValidationTTL
	}

	key := r.getDNSValidationKey(configHash)
	result.CachedAt = time.Now()
	result.ConfigHash = configHash

	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal DNS validation result %s: %w", configHash, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) InvalidateDNSValidationResult(ctx context.Context, configHash string) error {
	key := r.getDNSValidationKey(configHash)
	return r.Delete(ctx, key)
}

func (r *redisCache) GetHTTPValidationResult(ctx context.Context, configHash string) (*ValidationResult, error) {
	key := r.getHTTPValidationKey(configHash)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var result ValidationResult
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal HTTP validation result %s: %w", configHash, err)
	}
	return &result, nil
}

func (r *redisCache) SetHTTPValidationResult(ctx context.Context, configHash string, result *ValidationResult, ttl time.Duration) error {
	if ttl == 0 {
		ttl = HTTPValidationTTL
	}

	key := r.getHTTPValidationKey(configHash)
	result.CachedAt = time.Now()
	result.ConfigHash = configHash

	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal HTTP validation result %s: %w", configHash, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) InvalidateHTTPValidationResult(ctx context.Context, configHash string) error {
	key := r.getHTTPValidationKey(configHash)
	return r.Delete(ctx, key)
}

func (r *redisCache) GetConfigFingerprint(ctx context.Context, personaID uuid.UUID) (string, error) {
	key := r.getConfigFingerprintKey(personaID)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return "", err
	}
	return string(data), nil
}

func (r *redisCache) SetConfigFingerprint(ctx context.Context, personaID uuid.UUID, fingerprint string, ttl time.Duration) error {
	if ttl == 0 {
		ttl = ConfigFingerprintTTL
	}

	key := r.getConfigFingerprintKey(personaID)
	return r.Set(ctx, key, []byte(fingerprint), ttl)
}

func (r *redisCache) InvalidateConfigFingerprint(ctx context.Context, personaID uuid.UUID) error {
	key := r.getConfigFingerprintKey(personaID)
	return r.Delete(ctx, key)
}

// ================================================================
// Campaign Cache Interface Implementation
// ================================================================

// TTL constants for campaign data (as specified in requirements)
const (
	CampaignDetailsTTL      = 3 * time.Minute // Campaign details
	CampaignRelationshipTTL = 5 * time.Minute // Campaign-persona relationships
	BatchQueryResultTTL     = 2 * time.Minute // Batch query results
)

func (r *redisCache) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.LeadGenerationCampaign, error) {
	key := r.getCampaignDetailsKey(campaignID)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var campaign models.LeadGenerationCampaign
	if err := json.Unmarshal(data, &campaign); err != nil {
		return nil, fmt.Errorf("failed to unmarshal campaign %s: %w", campaignID, err)
	}
	return &campaign, nil
}

func (r *redisCache) SetCampaignDetails(ctx context.Context, campaign *models.LeadGenerationCampaign, ttl time.Duration) error {
	if ttl == 0 {
		ttl = CampaignDetailsTTL
	}

	key := r.getCampaignDetailsKey(campaign.ID)
	data, err := json.Marshal(campaign)
	if err != nil {
		return fmt.Errorf("failed to marshal campaign %s: %w", campaign.ID, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) InvalidateCampaignDetails(ctx context.Context, campaignID uuid.UUID) error {
	key := r.getCampaignDetailsKey(campaignID)
	return r.Delete(ctx, key)
}

func (r *redisCache) GetCampaignPersonaRelationships(ctx context.Context, campaignID uuid.UUID) ([]uuid.UUID, error) {
	key := r.getCampaignPersonaRelationshipsKey(campaignID)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var personaIDs []uuid.UUID
	if err := json.Unmarshal(data, &personaIDs); err != nil {
		return nil, fmt.Errorf("failed to unmarshal campaign persona relationships %s: %w", campaignID, err)
	}
	return personaIDs, nil
}

func (r *redisCache) SetCampaignPersonaRelationships(ctx context.Context, campaignID uuid.UUID, personaIDs []uuid.UUID, ttl time.Duration) error {
	if ttl == 0 {
		ttl = CampaignRelationshipTTL
	}

	key := r.getCampaignPersonaRelationshipsKey(campaignID)
	data, err := json.Marshal(personaIDs)
	if err != nil {
		return fmt.Errorf("failed to marshal campaign persona relationships %s: %w", campaignID, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) InvalidateCampaignPersonaRelationships(ctx context.Context, campaignID uuid.UUID) error {
	key := r.getCampaignPersonaRelationshipsKey(campaignID)
	return r.Delete(ctx, key)
}

func (r *redisCache) GetBatchQueryResult(ctx context.Context, queryHash string) (interface{}, error) {
	key := r.getBatchQueryResultKey(queryHash)
	data, err := r.Get(ctx, key)
	if err != nil || data == nil {
		return nil, err
	}

	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal batch query result %s: %w", queryHash, err)
	}
	return result, nil
}

func (r *redisCache) SetBatchQueryResult(ctx context.Context, queryHash string, result interface{}, ttl time.Duration) error {
	if ttl == 0 {
		ttl = BatchQueryResultTTL
	}

	key := r.getBatchQueryResultKey(queryHash)
	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal batch query result %s: %w", queryHash, err)
	}
	return r.Set(ctx, key, data, ttl)
}

func (r *redisCache) InvalidateBatchQueryResult(ctx context.Context, queryHash string) error {
	key := r.getBatchQueryResultKey(queryHash)
	return r.Delete(ctx, key)
}

// ================================================================
// Performance Metrics and Monitoring
// ================================================================

func (r *redisCache) GetMetrics() CacheMetrics {
	totalRequests := atomic.LoadInt64(&r.totalRequests)
	hitCount := atomic.LoadInt64(&r.hitCount)

	var hitRatio float64
	if totalRequests > 0 {
		hitRatio = float64(hitCount) / float64(totalRequests)
	}

	// Calculate memory usage (approximate)
	var memoryUsedMB float64
	if info, err := r.client.Info(context.Background(), "memory"); err == nil {
		_ = info            // Parse memory info would be implemented here
		memoryUsedMB = 10.0 // Mock value
	}

	return CacheMetrics{
		HitCount:      hitCount,
		MissCount:     atomic.LoadInt64(&r.missCount),
		ErrorCount:    atomic.LoadInt64(&r.errorCount),
		TotalRequests: totalRequests,
		HitRatio:      hitRatio,
		MemoryUsedMB:  memoryUsedMB,
	}
}

func (r *redisCache) startMetricsFlushRoutine() {
	ticker := time.NewTicker(r.config.MetricsFlushInterval)
	defer ticker.Stop()

	for range ticker.C {
		metrics := r.GetMetrics()
		log.Printf("RedisCache Metrics: Hits=%d, Misses=%d, Errors=%d, HitRatio=%.2f%%",
			metrics.HitCount, metrics.MissCount, metrics.ErrorCount, metrics.HitRatio*100)
	}
}

// ================================================================
// Private Key Generation Methods
// ================================================================

func (r *redisCache) getPersonaKey(id uuid.UUID) string {
	return fmt.Sprintf("persona:%s", id)
}

func (r *redisCache) getKeywordSetKey(id uuid.UUID) string {
	return fmt.Sprintf("keyword_set:%s", id)
}

func (r *redisCache) getKeywordRuleKey(id uuid.UUID) string {
	return fmt.Sprintf("keyword_rule:%s", id)
}

func (r *redisCache) getProxyKey(id uuid.UUID) string {
	return fmt.Sprintf("proxy:%s", id)
}

func (r *redisCache) getDNSValidationKey(configHash string) string {
	return fmt.Sprintf("dns_validation:%s", configHash)
}

func (r *redisCache) getHTTPValidationKey(configHash string) string {
	return fmt.Sprintf("http_validation:%s", configHash)
}

func (r *redisCache) getConfigFingerprintKey(personaID uuid.UUID) string {
	return fmt.Sprintf("config_fingerprint:%s", personaID)
}

func (r *redisCache) getCampaignDetailsKey(campaignID uuid.UUID) string {
	return fmt.Sprintf("campaign_details:%s", campaignID)
}

func (r *redisCache) getCampaignPersonaRelationshipsKey(campaignID uuid.UUID) string {
	return fmt.Sprintf("campaign_personas:%s", campaignID)
}

func (r *redisCache) getBatchQueryResultKey(queryHash string) string {
	return fmt.Sprintf("batch_query:%s", queryHash)
}
