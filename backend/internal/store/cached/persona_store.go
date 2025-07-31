// File: backend/internal/store/cached/persona_store.go
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

// CachedPersonaStore wraps the existing PersonaStore with Redis caching
type CachedPersonaStore struct {
	store store.PersonaStore
	cache cache.RedisCache
}

// NewCachedPersonaStore creates a cache-aware persona store
func NewCachedPersonaStore(baseStore store.PersonaStore, redisCache cache.RedisCache) store.PersonaStore {
	return &CachedPersonaStore{
		store: baseStore,
		cache: redisCache,
	}
}

// BeginTxx starts a new transaction (delegated to base store)
func (cps *CachedPersonaStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return cps.store.BeginTxx(ctx, opts)
}

// CreatePersona creates a persona and invalidates related cache entries
func (cps *CachedPersonaStore) CreatePersona(ctx context.Context, exec store.Querier, persona *models.Persona) error {
	err := cps.store.CreatePersona(ctx, exec, persona)
	if err != nil {
		return err
	}

	// Cache the newly created persona
	if cacheErr := cps.cache.SetPersona(ctx, persona, 0); cacheErr != nil {
		log.Printf("CachedPersonaStore: Failed to cache created persona %s: %v", persona.ID, cacheErr)
	}

	return nil
}

// GetPersonaByID retrieves a persona with cache-first strategy
func (cps *CachedPersonaStore) GetPersonaByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Persona, error) {
	startTime := time.Now()

	// Try cache first
	cachedPersona, err := cps.cache.GetPersona(ctx, id)
	if err == nil && cachedPersona != nil {
		log.Printf("CachedPersonaStore: Cache hit for persona %s (%.2fms)", id, time.Since(startTime).Seconds()*1000)
		return cachedPersona, nil
	}

	// Cache miss - fallback to database
	persona, err := cps.store.GetPersonaByID(ctx, exec, id)
	if err != nil {
		return nil, err
	}

	// Cache the result for future requests
	if cacheErr := cps.cache.SetPersona(ctx, persona, 0); cacheErr != nil {
		log.Printf("CachedPersonaStore: Failed to cache persona %s: %v", id, cacheErr)
	}

	log.Printf("CachedPersonaStore: Database lookup for persona %s (%.2fms)", id, time.Since(startTime).Seconds()*1000)
	return persona, nil
}

// GetPersonaByName retrieves a persona by name (not cached, delegated to base store)
func (cps *CachedPersonaStore) GetPersonaByName(ctx context.Context, exec store.Querier, name string) (*models.Persona, error) {
	// Names are less frequently accessed, so we delegate to base store
	// Could be optimized later with secondary indexing
	return cps.store.GetPersonaByName(ctx, exec, name)
}

// UpdatePersona updates a persona and invalidates cache
func (cps *CachedPersonaStore) UpdatePersona(ctx context.Context, exec store.Querier, persona *models.Persona) error {
	err := cps.store.UpdatePersona(ctx, exec, persona)
	if err != nil {
		return err
	}

	// Invalidate cache for updated persona
	if cacheErr := cps.cache.InvalidatePersona(ctx, persona.ID); cacheErr != nil {
		log.Printf("CachedPersonaStore: Failed to invalidate persona cache %s: %v", persona.ID, cacheErr)
	}

	// Cache the updated persona
	if cacheErr := cps.cache.SetPersona(ctx, persona, 0); cacheErr != nil {
		log.Printf("CachedPersonaStore: Failed to cache updated persona %s: %v", persona.ID, cacheErr)
	}

	return nil
}

// DeletePersona deletes a persona and invalidates cache
func (cps *CachedPersonaStore) DeletePersona(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	err := cps.store.DeletePersona(ctx, exec, id)
	if err != nil {
		return err
	}

	// Invalidate cache for deleted persona
	if cacheErr := cps.cache.InvalidatePersona(ctx, id); cacheErr != nil {
		log.Printf("CachedPersonaStore: Failed to invalidate deleted persona cache %s: %v", id, cacheErr)
	}

	return nil
}

// ListPersonas delegates to base store (list operations are typically not cached)
func (cps *CachedPersonaStore) ListPersonas(ctx context.Context, exec store.Querier, filter store.ListPersonasFilter) ([]*models.Persona, error) {
	// List operations with filters are complex to cache effectively
	// Could be optimized later with query result caching
	return cps.store.ListPersonas(ctx, exec, filter)
}

// GetPersonasByIDs implements optimized batch retrieval with cache integration
// This is the key optimization method that leverages both cache and existing batch queries
func (cps *CachedPersonaStore) GetPersonasByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Persona, error) {
	startTime := time.Now()

	if len(ids) == 0 {
		return []*models.Persona{}, nil
	}

	log.Printf("CachedPersonaStore: Batch retrieving %d personas", len(ids))

	// Step 1: Check cache for all requested personas
	cachedPersonas, missingIDs, err := cps.cache.GetPersonasBatch(ctx, ids)
	if err != nil {
		log.Printf("CachedPersonaStore: Cache error, falling back to database for all personas: %v", err)
		missingIDs = ids // Fallback to database for all
		cachedPersonas = []*models.Persona{}
	}

	cacheHits := len(cachedPersonas)
	cacheMisses := len(missingIDs)

	log.Printf("CachedPersonaStore: Cache performance - Hits: %d, Misses: %d, Hit ratio: %.2f%%",
		cacheHits, cacheMisses, float64(cacheHits)/float64(len(ids))*100)

	// Step 2: Query database only for missing personas using existing batch method
	var dbPersonas []*models.Persona
	if len(missingIDs) > 0 {
		dbPersonas, err = cps.store.GetPersonasByIDs(ctx, exec, missingIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to get personas from database: %w", err)
		}

		// Step 3: Cache the database results for future requests
		for _, persona := range dbPersonas {
			if cacheErr := cps.cache.SetPersona(ctx, persona, 0); cacheErr != nil {
				log.Printf("CachedPersonaStore: Failed to cache persona %s: %v", persona.ID, cacheErr)
			}
		}

		log.Printf("CachedPersonaStore: Retrieved %d personas from database and cached them", len(dbPersonas))
	}

	// Step 4: Combine cached and database results
	allPersonas := append(cachedPersonas, dbPersonas...)

	duration := time.Since(startTime)
	log.Printf("CachedPersonaStore: Batch operation completed in %.2fms - Total: %d, Cache hits: %d, DB queries: %d",
		duration.Seconds()*1000, len(allPersonas), cacheHits, len(missingIDs))

	return allPersonas, nil
}

// GetPersonasWithKeywordSetsByIDs implements cache-aware complex query with relationships
func (cps *CachedPersonaStore) GetPersonasWithKeywordSetsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Persona, error) {
	startTime := time.Now()

	if len(ids) == 0 {
		return []*models.Persona{}, nil
	}

	log.Printf("CachedPersonaStore: Batch retrieving %d personas with keyword sets", len(ids))

	// For complex queries with relationships, we implement a hybrid approach:
	// 1. Try to get base personas from cache
	// 2. Use database for the complex relationship query
	// 3. Cache individual personas from the result

	// Step 1: Check cache for base personas
	cachedPersonas, missingIDs, err := cps.cache.GetPersonasBatch(ctx, ids)
	if err != nil {
		log.Printf("CachedPersonaStore: Cache error for complex query, using database: %v", err)
		// Fall back to full database query
		personas, err := cps.store.GetPersonasWithKeywordSetsByIDs(ctx, exec, ids)
		if err != nil {
			return nil, err
		}

		// Cache the results
		for _, persona := range personas {
			if cacheErr := cps.cache.SetPersona(ctx, persona, 0); cacheErr != nil {
				log.Printf("CachedPersonaStore: Failed to cache persona %s: %v", persona.ID, cacheErr)
			}
		}

		return personas, nil
	}

	// Step 2: If we have significant cache hits, use hybrid approach
	cacheHitRatio := float64(len(cachedPersonas)) / float64(len(ids))
	if cacheHitRatio > 0.5 { // If more than 50% cache hit, use hybrid approach
		// Get missing personas with relationships from database
		var dbPersonas []*models.Persona
		if len(missingIDs) > 0 {
			dbPersonas, err = cps.store.GetPersonasWithKeywordSetsByIDs(ctx, exec, missingIDs)
			if err != nil {
				return nil, err
			}

			// Cache the database results
			for _, persona := range dbPersonas {
				if cacheErr := cps.cache.SetPersona(ctx, persona, 0); cacheErr != nil {
					log.Printf("CachedPersonaStore: Failed to cache persona %s: %v", persona.ID, cacheErr)
				}
			}
		}

		// Combine results
		allPersonas := append(cachedPersonas, dbPersonas...)
		log.Printf("CachedPersonaStore: Hybrid retrieval completed in %.2fms - Cache hits: %d, DB queries: %d",
			time.Since(startTime).Seconds()*1000, len(cachedPersonas), len(dbPersonas))

		return allPersonas, nil
	}

	// Step 3: Low cache hit ratio, use full database query for consistency
	log.Printf("CachedPersonaStore: Low cache hit ratio (%.2f%%), using full database query", cacheHitRatio*100)
	personas, err := cps.store.GetPersonasWithKeywordSetsByIDs(ctx, exec, ids)
	if err != nil {
		return nil, err
	}

	// Cache the results for future requests
	for _, persona := range personas {
		if cacheErr := cps.cache.SetPersona(ctx, persona, 0); cacheErr != nil {
			log.Printf("CachedPersonaStore: Failed to cache persona %s: %v", persona.ID, cacheErr)
		}
	}

	log.Printf("CachedPersonaStore: Full database query completed in %.2fms", time.Since(startTime).Seconds()*1000)
	return personas, nil
}

// Ensure CachedPersonaStore implements store.PersonaStore
var _ store.PersonaStore = (*CachedPersonaStore)(nil)
