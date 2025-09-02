# Infrastructure Adapters Specification

This document defines the Go interfaces for the new infrastructure adapters to be created in `backend/internal/domain/services/infra/`.

## `audit.go`

```go
package infra

import "context"

// AuditService defines the interface for auditing events.
type AuditService interface {
	RecordEvent(ctx context.Context, eventType string, data map[string]interface{}) error
}
```

## `metrics_sqlx.go`

```go
package infra

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

// MetricsRecorder defines the interface for recording metrics.
type MetricsRecorder interface {
	RecordDBMetric(ctx context.Context, queryName string, duration float64)
}

// DBTX represents a database transaction.
type DBTX interface {
	sqlx.ExtContext
	sqlx.ExecerContext
	sqlx.QueryerContext
}
```

## `tx_sqlx.go`

```go
package infra

import (
	"context"

	"github.com/jmoiron/sqlx"
)

// TransactionManager defines the interface for managing database transactions.
type TransactionManager interface {
	BeginTx(ctx context.Context) (*sqlx.Tx, error)
	CommitTx(tx *sqlx.Tx) error
	RollbackTx(tx *sqlx.Tx) error
}
```

## `worker_pool.go`

```go
package infra

// Job represents a job to be executed by the worker pool.
type Job interface {
	Execute() (interface{}, error)
}

// WorkerPool defines the interface for a worker pool.
type WorkerPool interface {
	Submit(job Job)
	Results() <-chan interface{}
	Shutdown()
}
```

## `cache_redis.go`

```go
package infra

import (
	"context"
	"time"
)

// CacheManager defines the interface for a cache manager.
type CacheManager interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error
	Delete(ctx context.Context, key string) error
}
```

## `config_manager_adapter.go`

```go
package infra

// ConfigManager defines the interface for managing configurations.
type ConfigManager interface {
	GetString(key string) string
	GetInt(key string) int
	GetBool(key string) bool
}
```

## `sse.go`

```go
package infra

// SSEManager defines the interface for managing Server-Sent Events.
type SSEManager interface {
	SendEvent(channel string, event string, data string) error
}
```

## `stealth_integration.go`

```go
package infra

// StealthService defines the interface for stealth integration.
type StealthService interface {
	Obfuscate(data string) (string, error)
	Deobfuscate(data string) (string, error)
}