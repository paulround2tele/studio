// Package services provides business logic for campaign phase orchestration.
package services

import (
	"sync"
	"time"
)

// IdempotencyEntry stores the result of an idempotent operation.
type IdempotencyEntry struct {
	Key       string      `json:"key"`
	Result    interface{} `json:"result"`
	Error     error       `json:"-"`
	CreatedAt time.Time   `json:"created_at"`
	ExpiresAt time.Time   `json:"expires_at"`
}

// IdempotencyCache provides in-memory caching for idempotent control operations.
// Keys expire after DefaultTTL and are cleaned up periodically.
//
// MULTI-INSTANCE CONSIDERATION (P3.4):
// This implementation uses in-memory storage which works for single-instance deployments.
// For multi-instance deployments (e.g., Kubernetes with multiple pods), consider:
//
//  1. Redis-backed implementation:
//     - Use SETNX with TTL for atomic check-and-set
//     - Example: `SETNX <key> <result> EX 300` (5 min TTL)
//     - Read with `GET <key>`, returns nil if expired
//
//  2. Interface extraction:
//     - Extract IdempotencyStore interface: Get(key) (*Entry, error), Set(key, result, err, ttl) error
//     - Create InMemoryIdempotencyStore (current impl)
//     - Create RedisIdempotencyStore for distributed deployments
//
//  3. Configuration:
//     - Add config option: `idempotency_store: "memory" | "redis"`
//     - For Redis: `redis_url`, `redis_password`, `redis_db`
//
// The current in-memory implementation is sufficient for:
// - Single-instance deployments
// - Development/testing environments
// - Deployments behind sticky sessions (same user → same instance)
type IdempotencyCache struct {
	mu      sync.RWMutex
	entries map[string]*IdempotencyEntry
	ttl     time.Duration
	stopCh  chan struct{}
}

// DefaultIdempotencyTTL is the default time-to-live for idempotency keys.
const DefaultIdempotencyTTL = 5 * time.Minute

// NewIdempotencyCache creates a new idempotency cache with the given TTL.
// Pass 0 for ttl to use DefaultIdempotencyTTL.
func NewIdempotencyCache(ttl time.Duration) *IdempotencyCache {
	if ttl <= 0 {
		ttl = DefaultIdempotencyTTL
	}
	c := &IdempotencyCache{
		entries: make(map[string]*IdempotencyEntry),
		ttl:     ttl,
		stopCh:  make(chan struct{}),
	}
	go c.cleanupLoop()
	return c
}

// Get retrieves an entry by key. Returns nil if not found or expired.
func (c *IdempotencyCache) Get(key string) *IdempotencyEntry {
	if key == "" {
		return nil
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	entry, ok := c.entries[key]
	if !ok {
		return nil
	}
	if time.Now().After(entry.ExpiresAt) {
		return nil // Expired, will be cleaned up
	}
	return entry
}

// Set stores an entry with the configured TTL.
func (c *IdempotencyCache) Set(key string, result interface{}, err error) {
	if key == "" {
		return
	}
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = &IdempotencyEntry{
		Key:       key,
		Result:    result,
		Error:     err,
		CreatedAt: now,
		ExpiresAt: now.Add(c.ttl),
	}
}

// Delete removes an entry by key.
func (c *IdempotencyCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, key)
}

// Size returns the current number of entries.
func (c *IdempotencyCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.entries)
}

// Stop halts the background cleanup goroutine.
func (c *IdempotencyCache) Stop() {
	close(c.stopCh)
}

// cleanupLoop removes expired entries every 30 seconds.
func (c *IdempotencyCache) cleanupLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-c.stopCh:
			return
		case <-ticker.C:
			c.cleanup()
		}
	}
}

// cleanup removes all expired entries.
func (c *IdempotencyCache) cleanup() {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	for key, entry := range c.entries {
		if now.After(entry.ExpiresAt) {
			delete(c.entries, key)
		}
	}
}
