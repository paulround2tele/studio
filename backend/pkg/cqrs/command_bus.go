package cqrs

import (
	"context"
	"fmt"
)

// Command represents a write operation.
type Command interface {
	CommandID() string
	AggregateID() string
	CommandType() string
	Validate() error
}

// CommandHandler processes a command.
type CommandHandler interface {
	Handle(ctx context.Context, cmd Command) error
	CommandType() string
}

// CommandBus routes commands to registered handlers.
type CommandBus struct {
	handlers map[string]CommandHandler
}

// NewCommandBus creates an empty bus.
func NewCommandBus() *CommandBus {
	return &CommandBus{handlers: map[string]CommandHandler{}}
}

// RegisterHandler registers a command handler.
func (b *CommandBus) RegisterHandler(h CommandHandler) {
	b.handlers[h.CommandType()] = h
}

// Send validates and dispatches a command.
func (b *CommandBus) Send(ctx context.Context, cmd Command) error {
	if err := cmd.Validate(); err != nil {
		return fmt.Errorf("command validation failed: %w", err)
	}
	h, ok := b.handlers[cmd.CommandType()]
	if !ok {
		return fmt.Errorf("no handler for command type %s", cmd.CommandType())
	}
	return h.Handle(ctx, cmd)
}
