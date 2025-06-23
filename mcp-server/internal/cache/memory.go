package cache

import (
	"sync"
	"time"
)

// CacheEntry represents a cached item with expiration
type CacheEntry struct {
	Value      interface{}
	Expiration time.Time
}

// IsExpired checks if the cache entry has expired
func (e *CacheEntry) IsExpired() bool {
	return time.Now().After(e.Expiration)
}

// MemoryCache implements an in-memory LRU cache with TTL
type MemoryCache struct {
	mu          sync.RWMutex
	items       map[string]*CacheEntry
	maxSize     int
	defaultTTL  time.Duration
	accessOrder []string // For LRU eviction
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache(maxSize int, defaultTTL time.Duration) *MemoryCache {
	return &MemoryCache{
		items:       make(map[string]*CacheEntry),
		maxSize:     maxSize,
		defaultTTL:  defaultTTL,
		accessOrder: make([]string, 0),
	}
}

// Get retrieves a value from the cache
func (c *MemoryCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	entry, exists := c.items[key]
	c.mu.RUnlock()

	if !exists || entry.IsExpired() {
		if exists {
			c.Delete(key)
		}
		return nil, false
	}

	// Update access order for LRU
	c.mu.Lock()
	c.updateAccessOrder(key)
	c.mu.Unlock()

	return entry.Value, true
}

// Set stores a value in the cache with default TTL
func (c *MemoryCache) Set(key string, value interface{}) {
	c.SetWithTTL(key, value, c.defaultTTL)
}

// SetWithTTL stores a value in the cache with custom TTL
func (c *MemoryCache) SetWithTTL(key string, value interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Evict if at capacity and key doesn't exist
	if len(c.items) >= c.maxSize {
		if _, exists := c.items[key]; !exists {
			c.evictLRU()
		}
	}

	c.items[key] = &CacheEntry{
		Value:      value,
		Expiration: time.Now().Add(ttl),
	}

	c.updateAccessOrder(key)
}

// Delete removes a key from the cache
func (c *MemoryCache) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.items, key)
	c.removeFromAccessOrder(key)
}

// Clear removes all items from the cache
func (c *MemoryCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items = make(map[string]*CacheEntry)
	c.accessOrder = make([]string, 0)
}

// Size returns the current number of items in the cache
func (c *MemoryCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.items)
}

// CleanupExpired removes all expired entries
func (c *MemoryCache) CleanupExpired() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for key, entry := range c.items {
		if now.After(entry.Expiration) {
			delete(c.items, key)
			c.removeFromAccessOrder(key)
		}
	}
}

// updateAccessOrder moves the key to the end of access order (most recent)
func (c *MemoryCache) updateAccessOrder(key string) {
	// Remove if exists
	c.removeFromAccessOrder(key)
	// Add to end
	c.accessOrder = append(c.accessOrder, key)
}

// removeFromAccessOrder removes the key from access order
func (c *MemoryCache) removeFromAccessOrder(key string) {
	for i, k := range c.accessOrder {
		if k == key {
			c.accessOrder = append(c.accessOrder[:i], c.accessOrder[i+1:]...)
			break
		}
	}
}

// evictLRU removes the least recently used item
func (c *MemoryCache) evictLRU() {
	if len(c.accessOrder) == 0 {
		return
	}

	oldestKey := c.accessOrder[0]
	delete(c.items, oldestKey)
	c.accessOrder = c.accessOrder[1:]
}

// StartCleanupWorker starts a background worker to clean up expired entries
func (c *MemoryCache) StartCleanupWorker(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			c.CleanupExpired()
		}
	}()
}