// File: backend/internal/store/cached/proxy_store.go
package cached

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// CachedProxyStore wraps the existing ProxyStore with Redis caching
type CachedProxyStore struct {
	store store.ProxyStore
	cache cache.RedisCache
}

// NewCachedProxyStore creates a cache-aware proxy store
func NewCachedProxyStore(baseStore store.ProxyStore, redisCache cache.RedisCache) store.ProxyStore {
	return &CachedProxyStore{
		store: baseStore,
		cache: redisCache,
	}
}

// BeginTxx starts a new transaction (delegated to base store)
func (cps *CachedProxyStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return cps.store.BeginTxx(ctx, opts)
}

// CreateProxy creates a proxy and caches it
func (cps *CachedProxyStore) CreateProxy(ctx context.Context, exec store.Querier, proxy *models.Proxy) error {
	err := cps.store.CreateProxy(ctx, exec, proxy)
	if err != nil {
		return err
	}

	// Cache the newly created proxy
	if cacheErr := cps.cache.SetProxy(ctx, proxy, 0); cacheErr != nil {
		log.Printf("CachedProxyStore: Failed to cache created proxy %s: %v", proxy.ID, cacheErr)
	}

	return nil
}

// GetProxyByID retrieves a proxy with cache-first strategy
func (cps *CachedProxyStore) GetProxyByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Proxy, error) {
	startTime := time.Now()

	// Try cache first
	cachedProxy, err := cps.cache.GetProxy(ctx, id)
	if err == nil && cachedProxy != nil {
		log.Printf("CachedProxyStore: Cache hit for proxy %s (%.2fms)", id, time.Since(startTime).Seconds()*1000)
		return cachedProxy, nil
	}

	// Cache miss - fallback to database
	proxy, err := cps.store.GetProxyByID(ctx, exec, id)
	if err != nil {
		return nil, err
	}

	// Cache the result for future requests
	if cacheErr := cps.cache.SetProxy(ctx, proxy, 0); cacheErr != nil {
		log.Printf("CachedProxyStore: Failed to cache proxy %s: %v", id, cacheErr)
	}

	log.Printf("CachedProxyStore: Database lookup for proxy %s (%.2fms)", id, time.Since(startTime).Seconds()*1000)
	return proxy, nil
}

// UpdateProxy updates a proxy and invalidates cache
func (cps *CachedProxyStore) UpdateProxy(ctx context.Context, exec store.Querier, proxy *models.Proxy) error {
	err := cps.store.UpdateProxy(ctx, exec, proxy)
	if err != nil {
		return err
	}

	// Invalidate cache for updated proxy
	if cacheErr := cps.cache.InvalidateProxy(ctx, proxy.ID); cacheErr != nil {
		log.Printf("CachedProxyStore: Failed to invalidate proxy cache %s: %v", proxy.ID, cacheErr)
	}

	// Cache the updated proxy
	if cacheErr := cps.cache.SetProxy(ctx, proxy, 0); cacheErr != nil {
		log.Printf("CachedProxyStore: Failed to cache updated proxy %s: %v", proxy.ID, cacheErr)
	}

	return nil
}

// DeleteProxy deletes a proxy and invalidates cache
func (cps *CachedProxyStore) DeleteProxy(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	err := cps.store.DeleteProxy(ctx, exec, id)
	if err != nil {
		return err
	}

	// Invalidate cache for deleted proxy
	if cacheErr := cps.cache.InvalidateProxy(ctx, id); cacheErr != nil {
		log.Printf("CachedProxyStore: Failed to invalidate deleted proxy cache %s: %v", id, cacheErr)
	}

	return nil
}

// ListProxies delegates to base store (list operations are typically not cached)
func (cps *CachedProxyStore) ListProxies(ctx context.Context, exec store.Querier, filter store.ListProxiesFilter) ([]*models.Proxy, error) {
	return cps.store.ListProxies(ctx, exec, filter)
}

// UpdateProxyHealth updates proxy health status and invalidates cache
func (cps *CachedProxyStore) UpdateProxyHealth(ctx context.Context, exec store.Querier, id uuid.UUID, isHealthy bool, latencyMs sql.NullInt32, lastCheckedAt time.Time) error {
	err := cps.store.UpdateProxyHealth(ctx, exec, id, isHealthy, latencyMs, lastCheckedAt)
	if err != nil {
		return err
	}

	// Invalidate cache since health status changed
	// Health status is frequently updated and cache should reflect current state
	if cacheErr := cps.cache.InvalidateProxy(ctx, id); cacheErr != nil {
		log.Printf("CachedProxyStore: Failed to invalidate proxy cache after health update %s: %v", id, cacheErr)
	}

	return nil
}

// GetProxiesByIDs implements optimized batch retrieval with cache integration
func (cps *CachedProxyStore) GetProxiesByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Proxy, error) {
	startTime := time.Now()

	if len(ids) == 0 {
		return []*models.Proxy{}, nil
	}

	log.Printf("CachedProxyStore: Batch retrieving %d proxies", len(ids))

	// Step 1: Check cache for all requested proxies
	cachedProxies, missingIDs, err := cps.cache.GetProxiesBatch(ctx, ids)
	if err != nil {
		log.Printf("CachedProxyStore: Cache error, falling back to database for all proxies: %v", err)
		missingIDs = ids // Fallback to database for all
		cachedProxies = []*models.Proxy{}
	}

	cacheHits := len(cachedProxies)
	cacheMisses := len(missingIDs)

	log.Printf("CachedProxyStore: Cache performance - Hits: %d, Misses: %d, Hit ratio: %.2f%%",
		cacheHits, cacheMisses, float64(cacheHits)/float64(len(ids))*100)

	// Step 2: Query database only for missing proxies using existing batch method
	var dbProxies []*models.Proxy
	if len(missingIDs) > 0 {
		dbProxies, err = cps.store.GetProxiesByIDs(ctx, exec, missingIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to get proxies from database: %w", err)
		}

		// Step 3: Cache the database results for future requests
		for _, proxy := range dbProxies {
			if cacheErr := cps.cache.SetProxy(ctx, proxy, 0); cacheErr != nil {
				log.Printf("CachedProxyStore: Failed to cache proxy %s: %v", proxy.ID, cacheErr)
			}
		}

		log.Printf("CachedProxyStore: Retrieved %d proxies from database and cached them", len(dbProxies))
	}

	// Step 4: Combine cached and database results
	allProxies := append(cachedProxies, dbProxies...)

	duration := time.Since(startTime)
	log.Printf("CachedProxyStore: Batch operation completed in %.2fms - Total: %d, Cache hits: %d, DB queries: %d",
		duration.Seconds()*1000, len(allProxies), cacheHits, len(missingIDs))

	return allProxies, nil
}

// GetProxiesByPersonaIDs retrieves proxies by persona IDs with optimized batch caching
func (cps *CachedProxyStore) GetProxiesByPersonaIDs(ctx context.Context, exec store.Querier, personaIDs []uuid.UUID) ([]*models.Proxy, error) {
	startTime := time.Now()

	if len(personaIDs) == 0 {
		return []*models.Proxy{}, nil
	}

	log.Printf("CachedProxyStore: Retrieving proxies for %d personas", len(personaIDs))

	// For persona-based proxy queries, we need to balance caching efficiency with data freshness
	// Since proxy-persona relationships can change and proxy health status is dynamic,
	// we implement a smart caching strategy:

	// Option 1: Check if we have cached campaign-persona relationships first
	var allProxies []*models.Proxy

	// For now, delegate to database for persona-based queries since relationships can be complex
	// In a more advanced implementation, we could cache persona->proxy mappings separately
	allProxies, err := cps.store.GetProxiesByPersonaIDs(ctx, exec, personaIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get proxies by persona IDs from database: %w", err)
	}

	// Cache individual proxies for future direct access
	for _, proxy := range allProxies {
		if cacheErr := cps.cache.SetProxy(ctx, proxy, 0); cacheErr != nil {
			log.Printf("CachedProxyStore: Failed to cache proxy %s: %v", proxy.ID, cacheErr)
		}
	}

	duration := time.Since(startTime)
	log.Printf("CachedProxyStore: Persona-based query completed in %.2fms - Retrieved %d proxies",
		duration.Seconds()*1000, len(allProxies))

	return allProxies, nil
}

// Ensure CachedProxyStore implements store.ProxyStore
var _ store.ProxyStore = (*CachedProxyStore)(nil)
