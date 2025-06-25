package cqrs

import (
	"context"
	"fmt"
)

// Query represents a read request.
type Query interface {
	QueryID() string
	QueryType() string
	Validate() error
}

// QueryResult is a generic result.
type QueryResult interface{}

// QueryHandler processes a query.
type QueryHandler interface {
	Handle(ctx context.Context, q Query) (QueryResult, error)
	QueryType() string
}

// QueryBus routes queries to handlers.
type QueryBus struct {
	handlers map[string]QueryHandler
}

// NewQueryBus creates a QueryBus.
func NewQueryBus() *QueryBus {
	return &QueryBus{handlers: map[string]QueryHandler{}}
}

// RegisterHandler registers a handler.
func (b *QueryBus) RegisterHandler(h QueryHandler) {
	b.handlers[h.QueryType()] = h
}

// Send validates and dispatches the query.
func (b *QueryBus) Send(ctx context.Context, q Query) (QueryResult, error) {
	if err := q.Validate(); err != nil {
		return nil, fmt.Errorf("query validation failed: %w", err)
	}
	h, ok := b.handlers[q.QueryType()]
	if !ok {
		return nil, fmt.Errorf("no handler for query type %s", q.QueryType())
	}
	return h.Handle(ctx, q)
}
