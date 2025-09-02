package infra

import (
	"context"
)

// Job represents a unit of work that accepts a context.
type Job func(ctx context.Context)

// WorkerPool provides minimal interface for submitting jobs.
type WorkerPool interface {
	Start(ctx context.Context)
	Stop()
	AddJob(job Job)
}

// SimpleWorkerPool is a basic, synchronous implementation (placeholder).
type SimpleWorkerPool struct{}

func NewSimpleWorkerPool() *SimpleWorkerPool { return &SimpleWorkerPool{} }

func (p *SimpleWorkerPool) Start(ctx context.Context) {}
func (p *SimpleWorkerPool) Stop()                     {}
func (p *SimpleWorkerPool) AddJob(job Job) {
	if job != nil {
		job(context.Background())
	}
}
