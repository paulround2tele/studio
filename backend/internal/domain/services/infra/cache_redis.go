package infra

import (
	"context"
	"time"
)

// Cache defines minimal cache interface.
type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)
}

type NoopCache struct{}

func (c *NoopCache) Get(ctx context.Context, key string) (string, error) { return "", nil }
func (c *NoopCache) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	return nil
}
func (c *NoopCache) Delete(ctx context.Context, key string) error         { return nil }
func (c *NoopCache) Exists(ctx context.Context, key string) (bool, error) { return false, nil }

// NewCacheRedis returns a no-op Cache implementation placeholder.
// Signature accepts an unused parameter to match callers using NewCacheRedis(nil).
func NewCacheRedis(_ interface{}) Cache { return &NoopCache{} }
