package services

import (
	"errors"
	"testing"
	"time"
)

func TestIdempotencyCache_GetSet(t *testing.T) {
	cache := NewIdempotencyCache(1 * time.Minute)
	defer cache.Stop()

	// Test empty key returns nil
	if got := cache.Get(""); got != nil {
		t.Errorf("Get empty key = %v, want nil", got)
	}

	// Test missing key returns nil
	if got := cache.Get("nonexistent"); got != nil {
		t.Errorf("Get missing key = %v, want nil", got)
	}

	// Test set and get
	result := map[string]string{"status": "paused"}
	cache.Set("key1", result, nil)

	entry := cache.Get("key1")
	if entry == nil {
		t.Fatal("Get key1 = nil, want entry")
	}
	if entry.Key != "key1" {
		t.Errorf("entry.Key = %q, want %q", entry.Key, "key1")
	}
	if entry.Error != nil {
		t.Errorf("entry.Error = %v, want nil", entry.Error)
	}
	if entry.Result == nil {
		t.Error("entry.Result = nil, want non-nil")
	}
}

func TestIdempotencyCache_DuplicateKey(t *testing.T) {
	cache := NewIdempotencyCache(1 * time.Minute)
	defer cache.Stop()

	// First call stores result
	result1 := map[string]int{"sequence": 42}
	cache.Set("idem-123", result1, nil)

	// Second call with same key should return same result
	entry := cache.Get("idem-123")
	if entry == nil {
		t.Fatal("Get duplicate key = nil, want cached entry")
	}
	if entry.Result.(map[string]int)["sequence"] != 42 {
		t.Errorf("cached result sequence = %v, want 42", entry.Result)
	}

	// Third call - still same result
	entry2 := cache.Get("idem-123")
	if entry2 == nil || entry2.Result.(map[string]int)["sequence"] != 42 {
		t.Error("Third get should return same cached result")
	}
}

func TestIdempotencyCache_ErrorCaching(t *testing.T) {
	cache := NewIdempotencyCache(1 * time.Minute)
	defer cache.Stop()

	// Cache an error result
	err := errors.New("transition failed")
	cache.Set("error-key", nil, err)

	entry := cache.Get("error-key")
	if entry == nil {
		t.Fatal("Get error key = nil, want cached entry")
	}
	if entry.Error == nil {
		t.Error("entry.Error = nil, want cached error")
	}
	if entry.Error.Error() != "transition failed" {
		t.Errorf("entry.Error = %q, want %q", entry.Error.Error(), "transition failed")
	}
}

func TestIdempotencyCache_Expiration(t *testing.T) {
	// Use very short TTL for testing
	cache := NewIdempotencyCache(50 * time.Millisecond)
	defer cache.Stop()

	cache.Set("expires-soon", "value", nil)

	// Should exist immediately
	if entry := cache.Get("expires-soon"); entry == nil {
		t.Error("Entry should exist immediately after set")
	}

	// Wait for expiration
	time.Sleep(60 * time.Millisecond)

	// Should be expired now
	if entry := cache.Get("expires-soon"); entry != nil {
		t.Errorf("Entry should be expired, got %v", entry)
	}
}

func TestIdempotencyCache_Delete(t *testing.T) {
	cache := NewIdempotencyCache(1 * time.Minute)
	defer cache.Stop()

	cache.Set("to-delete", "value", nil)
	if cache.Get("to-delete") == nil {
		t.Fatal("Entry should exist before delete")
	}

	cache.Delete("to-delete")
	if cache.Get("to-delete") != nil {
		t.Error("Entry should be nil after delete")
	}
}

func TestIdempotencyCache_Size(t *testing.T) {
	cache := NewIdempotencyCache(1 * time.Minute)
	defer cache.Stop()

	if cache.Size() != 0 {
		t.Errorf("Initial size = %d, want 0", cache.Size())
	}

	cache.Set("key1", "v1", nil)
	cache.Set("key2", "v2", nil)
	cache.Set("key3", "v3", nil)

	if cache.Size() != 3 {
		t.Errorf("Size after 3 sets = %d, want 3", cache.Size())
	}

	cache.Delete("key2")
	if cache.Size() != 2 {
		t.Errorf("Size after delete = %d, want 2", cache.Size())
	}
}

func TestIdempotencyCache_EmptyKeyIgnored(t *testing.T) {
	cache := NewIdempotencyCache(1 * time.Minute)
	defer cache.Stop()

	// Setting empty key should be no-op
	cache.Set("", "value", nil)
	if cache.Size() != 0 {
		t.Errorf("Empty key should not be stored, size = %d", cache.Size())
	}
}

func TestIdempotencyCache_ConcurrentAccess(t *testing.T) {
	cache := NewIdempotencyCache(1 * time.Minute)
	defer cache.Stop()

	done := make(chan bool)

	// Concurrent writers
	for i := 0; i < 100; i++ {
		go func(n int) {
			cache.Set("concurrent-key", n, nil)
			done <- true
		}(i)
	}

	// Concurrent readers
	for i := 0; i < 100; i++ {
		go func() {
			_ = cache.Get("concurrent-key")
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 200; i++ {
		<-done
	}

	// Should have one entry (last writer wins)
	if cache.Size() != 1 {
		t.Errorf("After concurrent access, size = %d, want 1", cache.Size())
	}
}
