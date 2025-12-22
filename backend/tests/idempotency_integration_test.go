package tests

import (
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/services"
)

// TestIdempotencyCache_DuplicateKeyNoDuplicateSSE tests that the same idempotency key
// returns cached results and doesn't trigger duplicate SSE emissions.
func TestIdempotencyCache_DuplicateKeyNoDuplicateSSE(t *testing.T) {
	// This is a unit test for the idempotency cache behavior.
	// Integration tests would need a full server setup.

	cache := services.NewIdempotencyCache(5 * time.Minute)
	defer cache.Stop()

	key := "test-idem-12345"

	// First call - should not be cached
	if entry := cache.Get(key); entry != nil {
		t.Fatal("First call should not find cached entry")
	}

	// Simulate successful operation - cache the result
	result := map[string]interface{}{
		"status":   "paused",
		"sequence": 42,
	}
	cache.Set(key, result, nil)

	// Second call with same key - should return cached result
	cached := cache.Get(key)
	if cached == nil {
		t.Fatal("Second call should find cached entry")
	}

	// Verify cached result matches
	cachedResult, ok := cached.Result.(map[string]interface{})
	if !ok {
		t.Fatal("Cached result should be map[string]interface{}")
	}
	if cachedResult["sequence"] != 42 {
		t.Errorf("Cached sequence = %v, want 42", cachedResult["sequence"])
	}

	// Third call with same key - still cached (no new SSE should be emitted)
	stillCached := cache.Get(key)
	if stillCached == nil {
		t.Fatal("Third call should still find cached entry")
	}

	// Different key should NOT find cached entry
	if entry := cache.Get("different-key-67890"); entry != nil {
		t.Error("Different key should not find cached entry")
	}
}

// TestIdempotencyCache_RetryAfterTimeout tests that after TTL expires,
// a retry with the same key will execute again (not return cached).
func TestIdempotencyCache_RetryAfterTimeout(t *testing.T) {
	// Use very short TTL for testing
	cache := services.NewIdempotencyCache(50 * time.Millisecond)
	defer cache.Stop()

	key := "timeout-test-key"

	// First call - cache result
	cache.Set(key, "first-result", nil)

	// Immediately after - should be cached
	if entry := cache.Get(key); entry == nil {
		t.Fatal("Should be cached immediately after set")
	}

	// Wait for TTL expiration
	time.Sleep(60 * time.Millisecond)

	// After timeout - retry should execute again (not cached)
	if entry := cache.Get(key); entry != nil {
		t.Error("After timeout, key should not be in cache")
	}

	// Can cache a new result with same key
	cache.Set(key, "second-result", nil)
	entry := cache.Get(key)
	if entry == nil {
		t.Fatal("Should be able to cache again after timeout")
	}
	if entry.Result != "second-result" {
		t.Errorf("Result = %v, want 'second-result'", entry.Result)
	}
}

// TestIdempotencyCache_ErrorCachingForRetry tests that errors are also cached
// so retries with the same key don't re-execute failed operations.
func TestIdempotencyCache_ErrorCachingForRetry(t *testing.T) {
	cache := services.NewIdempotencyCache(5 * time.Minute)
	defer cache.Stop()

	key := "error-test-key"
	testErr := services.NewExpectedStateMismatchError409(
		"paused",
		"in_progress",
		"pause",
	)

	// Cache error result
	cache.Set(key, nil, testErr)

	// Retry with same key should return cached error
	cached := cache.Get(key)
	if cached == nil {
		t.Fatal("Error should be cached")
	}
	if cached.Error == nil {
		t.Fatal("Cached entry should have error")
	}

	// Verify error is the expected_state mismatch
	err409, ok := cached.Error.(*services.TransitionError409)
	if !ok {
		t.Fatalf("Cached error type = %T, want *TransitionError409", cached.Error)
	}
	if err409.Code != services.ErrorCodeExpectedStateMismatch {
		t.Errorf("Error code = %v, want EXPECTED_STATE_MISMATCH", err409.Code)
	}
}

// TestIdempotencyCache_StartOperation tests that start operations support idempotency keys.
func TestIdempotencyCache_StartOperation(t *testing.T) {
	cache := services.NewIdempotencyCache(5 * time.Minute)
	defer cache.Stop()

	key := "start-idem-key-12345"

	// Simulate first start call - not cached
	if entry := cache.Get(key); entry != nil {
		t.Fatal("First start call should not be cached")
	}

	// Simulate successful start - cache result
	startResult := map[string]interface{}{
		"phase":    "domain_generation",
		"status":   "in_progress",
		"sequence": 1,
	}
	cache.Set(key, startResult, nil)

	// Second start call with same key - should return cached
	cached := cache.Get(key)
	if cached == nil {
		t.Fatal("Second start call should be cached")
	}
	if cached.Error != nil {
		t.Errorf("Cached start should have no error, got: %v", cached.Error)
	}
}

// TestIdempotencyCache_StopOperation tests that stop operations support idempotency keys.
func TestIdempotencyCache_StopOperation(t *testing.T) {
	cache := services.NewIdempotencyCache(5 * time.Minute)
	defer cache.Stop()

	key := "stop-idem-key-67890"

	// First stop call - not cached
	if entry := cache.Get(key); entry != nil {
		t.Fatal("First stop call should not be cached")
	}

	// Simulate successful stop - cache result
	stopResult := map[string]interface{}{
		"phase":    "dns_validation",
		"status":   "cancelled",
		"sequence": 5,
	}
	cache.Set(key, stopResult, nil)

	// Second stop call with same key - should return cached
	cached := cache.Get(key)
	if cached == nil {
		t.Fatal("Second stop call should be cached")
	}
}

// TestIdempotencyCache_IndependentOperations tests that different control operations
// with different keys work independently.
func TestIdempotencyCache_IndependentOperations(t *testing.T) {
	cache := services.NewIdempotencyCache(5 * time.Minute)
	defer cache.Stop()

	// Different keys for different operations
	startKey := "op-start-abc123"
	pauseKey := "op-pause-def456"
	resumeKey := "op-resume-ghi789"
	stopKey := "op-stop-jkl012"

	// Cache results for each operation
	cache.Set(startKey, map[string]string{"op": "start"}, nil)
	cache.Set(pauseKey, map[string]string{"op": "pause"}, nil)
	cache.Set(resumeKey, map[string]string{"op": "resume"}, nil)
	cache.Set(stopKey, map[string]string{"op": "stop"}, nil)

	// Verify each has independent cache
	tests := []struct {
		key string
		op  string
	}{
		{startKey, "start"},
		{pauseKey, "pause"},
		{resumeKey, "resume"},
		{stopKey, "stop"},
	}

	for _, tt := range tests {
		cached := cache.Get(tt.key)
		if cached == nil {
			t.Errorf("Operation %s should be cached", tt.op)
			continue
		}
		result, ok := cached.Result.(map[string]string)
		if !ok {
			t.Errorf("Operation %s result type mismatch", tt.op)
			continue
		}
		if result["op"] != tt.op {
			t.Errorf("Operation %s: got %v, want %s", tt.op, result["op"], tt.op)
		}
	}

	// Verify cache size
	if size := cache.Size(); size != 4 {
		t.Errorf("Cache size = %d, want 4", size)
	}
}
