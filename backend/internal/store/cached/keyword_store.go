// File: backend/internal/store/cached/keyword_store.go
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

// CachedKeywordStore wraps the existing KeywordStore with Redis caching
type CachedKeywordStore struct {
	store store.KeywordStore
	cache cache.RedisCache
}

// NewCachedKeywordStore creates a cache-aware keyword store
func NewCachedKeywordStore(baseStore store.KeywordStore, redisCache cache.RedisCache) store.KeywordStore {
	return &CachedKeywordStore{
		store: baseStore,
		cache: redisCache,
	}
}

// BeginTxx starts a new transaction (delegated to base store)
func (cks *CachedKeywordStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return cks.store.BeginTxx(ctx, opts)
}

// ================================================================
// KeywordSet Methods
// ================================================================

// CreateKeywordSet creates a keyword set and caches it
func (cks *CachedKeywordStore) CreateKeywordSet(ctx context.Context, exec store.Querier, keywordSet *models.KeywordSet) error {
	err := cks.store.CreateKeywordSet(ctx, exec, keywordSet)
	if err != nil {
		return err
	}

	// Cache the newly created keyword set
	if cacheErr := cks.cache.SetKeywordSet(ctx, keywordSet, 0); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to cache created keyword set %s: %v", keywordSet.ID, cacheErr)
	}

	return nil
}

// GetKeywordSetByID retrieves a keyword set with cache-first strategy
func (cks *CachedKeywordStore) GetKeywordSetByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.KeywordSet, error) {
	startTime := time.Now()

	// Try cache first
	cachedKeywordSet, err := cks.cache.GetKeywordSet(ctx, id)
	if err == nil && cachedKeywordSet != nil {
		log.Printf("CachedKeywordStore: Cache hit for keyword set %s (%.2fms)", id, time.Since(startTime).Seconds()*1000)
		return cachedKeywordSet, nil
	}

	// Cache miss - fallback to database
	keywordSet, err := cks.store.GetKeywordSetByID(ctx, exec, id)
	if err != nil {
		return nil, err
	}

	// Cache the result for future requests
	if cacheErr := cks.cache.SetKeywordSet(ctx, keywordSet, 0); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to cache keyword set %s: %v", id, cacheErr)
	}

	log.Printf("CachedKeywordStore: Database lookup for keyword set %s (%.2fms)", id, time.Since(startTime).Seconds()*1000)
	return keywordSet, nil
}

// GetKeywordSetByName retrieves a keyword set by name (not cached, delegated to base store)
func (cks *CachedKeywordStore) GetKeywordSetByName(ctx context.Context, exec store.Querier, name string) (*models.KeywordSet, error) {
	return cks.store.GetKeywordSetByName(ctx, exec, name)
}

// UpdateKeywordSet updates a keyword set and invalidates cache
func (cks *CachedKeywordStore) UpdateKeywordSet(ctx context.Context, exec store.Querier, keywordSet *models.KeywordSet) error {
	err := cks.store.UpdateKeywordSet(ctx, exec, keywordSet)
	if err != nil {
		return err
	}

	// Invalidate cache for updated keyword set
	if cacheErr := cks.cache.InvalidateKeywordSet(ctx, keywordSet.ID); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to invalidate keyword set cache %s: %v", keywordSet.ID, cacheErr)
	}

	// Cache the updated keyword set
	if cacheErr := cks.cache.SetKeywordSet(ctx, keywordSet, 0); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to cache updated keyword set %s: %v", keywordSet.ID, cacheErr)
	}

	return nil
}

// DeleteKeywordSet deletes a keyword set and invalidates cache
func (cks *CachedKeywordStore) DeleteKeywordSet(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	err := cks.store.DeleteKeywordSet(ctx, exec, id)
	if err != nil {
		return err
	}

	// Invalidate cache for deleted keyword set
	if cacheErr := cks.cache.InvalidateKeywordSet(ctx, id); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to invalidate deleted keyword set cache %s: %v", id, cacheErr)
	}

	return nil
}

// ListKeywordSets delegates to base store (list operations are typically not cached)
func (cks *CachedKeywordStore) ListKeywordSets(ctx context.Context, exec store.Querier, filter store.ListKeywordSetsFilter) ([]*models.KeywordSet, error) {
	return cks.store.ListKeywordSets(ctx, exec, filter)
}

// GetKeywordSetsByIDs implements optimized batch retrieval with cache integration
func (cks *CachedKeywordStore) GetKeywordSetsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.KeywordSet, error) {
	startTime := time.Now()

	if len(ids) == 0 {
		return []*models.KeywordSet{}, nil
	}

	log.Printf("CachedKeywordStore: Batch retrieving %d keyword sets", len(ids))

	// Step 1: Check cache for all requested keyword sets
	cachedKeywordSets, missingIDs, err := cks.cache.GetKeywordSetsBatch(ctx, ids)
	if err != nil {
		log.Printf("CachedKeywordStore: Cache error, falling back to database for all keyword sets: %v", err)
		missingIDs = ids // Fallback to database for all
		cachedKeywordSets = []*models.KeywordSet{}
	}

	cacheHits := len(cachedKeywordSets)
	cacheMisses := len(missingIDs)

	log.Printf("CachedKeywordStore: Cache performance - Hits: %d, Misses: %d, Hit ratio: %.2f%%",
		cacheHits, cacheMisses, float64(cacheHits)/float64(len(ids))*100)

	// Step 2: Query database only for missing keyword sets using existing batch method
	var dbKeywordSets []*models.KeywordSet
	if len(missingIDs) > 0 {
		dbKeywordSets, err = cks.store.GetKeywordSetsByIDs(ctx, exec, missingIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to get keyword sets from database: %w", err)
		}

		// Step 3: Cache the database results for future requests
		for _, keywordSet := range dbKeywordSets {
			if cacheErr := cks.cache.SetKeywordSet(ctx, keywordSet, 0); cacheErr != nil {
				log.Printf("CachedKeywordStore: Failed to cache keyword set %s: %v", keywordSet.ID, cacheErr)
			}
		}

		log.Printf("CachedKeywordStore: Retrieved %d keyword sets from database and cached them", len(dbKeywordSets))
	}

	// Step 4: Combine cached and database results
	allKeywordSets := append(cachedKeywordSets, dbKeywordSets...)

	duration := time.Since(startTime)
	log.Printf("CachedKeywordStore: Batch operation completed in %.2fms - Total: %d, Cache hits: %d, DB queries: %d",
		duration.Seconds()*1000, len(allKeywordSets), cacheHits, len(missingIDs))

	return allKeywordSets, nil
}

// GetKeywordSetsWithKeywordsByIDs implements cache-aware complex query with relationships
func (cks *CachedKeywordStore) GetKeywordSetsWithKeywordsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.KeywordSet, error) {
	startTime := time.Now()

	if len(ids) == 0 {
		return []*models.KeywordSet{}, nil
	}

	log.Printf("CachedKeywordStore: Batch retrieving %d keyword sets with keywords", len(ids))

	// For complex queries with relationships, use hybrid approach similar to persona store
	cachedKeywordSets, missingIDs, err := cks.cache.GetKeywordSetsBatch(ctx, ids)
	if err != nil {
		log.Printf("CachedKeywordStore: Cache error for complex query, using database: %v", err)
		// Fall back to full database query
		keywordSets, err := cks.store.GetKeywordSetsWithKeywordsByIDs(ctx, exec, ids)
		if err != nil {
			return nil, err
		}

		// Cache the results
		for _, keywordSet := range keywordSets {
			if cacheErr := cks.cache.SetKeywordSet(ctx, keywordSet, 0); cacheErr != nil {
				log.Printf("CachedKeywordStore: Failed to cache keyword set %s: %v", keywordSet.ID, cacheErr)
			}
		}

		return keywordSets, nil
	}

	// If we have significant cache hits, use hybrid approach
	cacheHitRatio := float64(len(cachedKeywordSets)) / float64(len(ids))
	if cacheHitRatio > 0.5 {
		// Get missing keyword sets with relationships from database
		var dbKeywordSets []*models.KeywordSet
		if len(missingIDs) > 0 {
			dbKeywordSets, err = cks.store.GetKeywordSetsWithKeywordsByIDs(ctx, exec, missingIDs)
			if err != nil {
				return nil, err
			}

			// Cache the database results
			for _, keywordSet := range dbKeywordSets {
				if cacheErr := cks.cache.SetKeywordSet(ctx, keywordSet, 0); cacheErr != nil {
					log.Printf("CachedKeywordStore: Failed to cache keyword set %s: %v", keywordSet.ID, cacheErr)
				}
			}
		}

		// Combine results
		allKeywordSets := append(cachedKeywordSets, dbKeywordSets...)
		log.Printf("CachedKeywordStore: Hybrid retrieval completed in %.2fms - Cache hits: %d, DB queries: %d",
			time.Since(startTime).Seconds()*1000, len(cachedKeywordSets), len(dbKeywordSets))

		return allKeywordSets, nil
	}

	// Low cache hit ratio, use full database query for consistency
	log.Printf("CachedKeywordStore: Low cache hit ratio (%.2f%%), using full database query", cacheHitRatio*100)
	keywordSets, err := cks.store.GetKeywordSetsWithKeywordsByIDs(ctx, exec, ids)
	if err != nil {
		return nil, err
	}

	// Cache the results for future requests
	for _, keywordSet := range keywordSets {
		if cacheErr := cks.cache.SetKeywordSet(ctx, keywordSet, 0); cacheErr != nil {
			log.Printf("CachedKeywordStore: Failed to cache keyword set %s: %v", keywordSet.ID, cacheErr)
		}
	}

	log.Printf("CachedKeywordStore: Full database query completed in %.2fms", time.Since(startTime).Seconds()*1000)
	return keywordSets, nil
}

// ================================================================
// KeywordRule Methods
// ================================================================

// CreateKeywordRules creates keyword rules and caches them
func (cks *CachedKeywordStore) CreateKeywordRules(ctx context.Context, exec store.Querier, rules []*models.KeywordRule) error {
	err := cks.store.CreateKeywordRules(ctx, exec, rules)
	if err != nil {
		return err
	}

	// Cache the newly created keyword rules
	for _, rule := range rules {
		if cacheErr := cks.cache.SetKeywordRule(ctx, rule, 0); cacheErr != nil {
			log.Printf("CachedKeywordStore: Failed to cache created keyword rule %s: %v", rule.ID, cacheErr)
		}
	}

	return nil
}

// GetKeywordRulesBySetID retrieves keyword rules by set ID (not cached, delegated to base store)
func (cks *CachedKeywordStore) GetKeywordRulesBySetID(ctx context.Context, exec store.Querier, keywordSetID uuid.UUID) ([]models.KeywordRule, error) {
	return cks.store.GetKeywordRulesBySetID(ctx, exec, keywordSetID)
}

// UpdateKeywordRule updates a keyword rule and invalidates cache
func (cks *CachedKeywordStore) UpdateKeywordRule(ctx context.Context, exec store.Querier, rule *models.KeywordRule) error {
	err := cks.store.UpdateKeywordRule(ctx, exec, rule)
	if err != nil {
		return err
	}

	// Invalidate and update cache for the keyword rule
	if cacheErr := cks.cache.InvalidateKeywordRule(ctx, rule.ID); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to invalidate keyword rule cache %s: %v", rule.ID, cacheErr)
	}

	if cacheErr := cks.cache.SetKeywordRule(ctx, rule, 0); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to cache updated keyword rule %s: %v", rule.ID, cacheErr)
	}

	return nil
}

// DeleteKeywordRule deletes a keyword rule and invalidates cache
func (cks *CachedKeywordStore) DeleteKeywordRule(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	err := cks.store.DeleteKeywordRule(ctx, exec, id)
	if err != nil {
		return err
	}

	// Invalidate cache for deleted keyword rule
	if cacheErr := cks.cache.InvalidateKeywordRule(ctx, id); cacheErr != nil {
		log.Printf("CachedKeywordStore: Failed to invalidate deleted keyword rule cache %s: %v", id, cacheErr)
	}

	return nil
}

// DeleteKeywordRulesBySetID deletes keyword rules by set ID (delegated to base store)
func (cks *CachedKeywordStore) DeleteKeywordRulesBySetID(ctx context.Context, exec store.Querier, keywordSetID uuid.UUID) error {
	return cks.store.DeleteKeywordRulesBySetID(ctx, exec, keywordSetID)
}

// GetKeywordsByKeywordSetIDs retrieves keywords by keyword set IDs (not individually cached)
func (cks *CachedKeywordStore) GetKeywordsByKeywordSetIDs(ctx context.Context, exec store.Querier, keywordSetIDs []uuid.UUID) ([]*models.KeywordRule, error) {
	return cks.store.GetKeywordsByKeywordSetIDs(ctx, exec, keywordSetIDs)
}

// GetKeywordsByIDs implements optimized batch retrieval with cache integration for individual keyword rules
func (cks *CachedKeywordStore) GetKeywordsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.KeywordRule, error) {
	startTime := time.Now()

	if len(ids) == 0 {
		return []*models.KeywordRule{}, nil
	}

	log.Printf("CachedKeywordStore: Batch retrieving %d keyword rules", len(ids))

	// Step 1: Check cache for all requested keyword rules
	cachedKeywords, missingIDs, err := cks.cache.GetKeywordRulesBatch(ctx, ids)
	if err != nil {
		log.Printf("CachedKeywordStore: Cache error, falling back to database for all keyword rules: %v", err)
		missingIDs = ids // Fallback to database for all
		cachedKeywords = []*models.KeywordRule{}
	}

	cacheHits := len(cachedKeywords)
	cacheMisses := len(missingIDs)

	log.Printf("CachedKeywordStore: Cache performance - Hits: %d, Misses: %d, Hit ratio: %.2f%%",
		cacheHits, cacheMisses, float64(cacheHits)/float64(len(ids))*100)

	// Step 2: Query database only for missing keyword rules using existing batch method
	var dbKeywords []*models.KeywordRule
	if len(missingIDs) > 0 {
		dbKeywords, err = cks.store.GetKeywordsByIDs(ctx, exec, missingIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to get keyword rules from database: %w", err)
		}

		// Step 3: Cache the database results for future requests
		for _, keyword := range dbKeywords {
			if cacheErr := cks.cache.SetKeywordRule(ctx, keyword, 0); cacheErr != nil {
				log.Printf("CachedKeywordStore: Failed to cache keyword rule %s: %v", keyword.ID, cacheErr)
			}
		}

		log.Printf("CachedKeywordStore: Retrieved %d keyword rules from database and cached them", len(dbKeywords))
	}

	// Step 4: Combine cached and database results
	allKeywords := append(cachedKeywords, dbKeywords...)

	duration := time.Since(startTime)
	log.Printf("CachedKeywordStore: Batch operation completed in %.2fms - Total: %d, Cache hits: %d, DB queries: %d",
		duration.Seconds()*1000, len(allKeywords), cacheHits, len(missingIDs))

	return allKeywords, nil
}

// Ensure CachedKeywordStore implements store.KeywordStore
var _ store.KeywordStore = (*CachedKeywordStore)(nil)
