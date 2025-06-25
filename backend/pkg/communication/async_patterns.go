package communication

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type MessageQueue interface {
	Publish(ctx context.Context, msg *AsyncMessage) error
	Subscribe(ctx context.Context, sub *Subscription) error
}

type EventStore interface {
	StoreMessage(msg *AsyncMessage) error
	GetMessage(id string) (*AsyncMessage, error)
}

type SagaManager interface {
	StoreSaga(saga *Saga) error
	ExecuteNextStep(ctx context.Context, saga *Saga) error
	GetSaga(id string) (*Saga, error)
}

type RetryScheduler struct{}

type MessagePattern string

const (
	PatternFireAndForget MessagePattern = "fire_and_forget"
	PatternRequestReply  MessagePattern = "request_reply"
	PatternPubSub        MessagePattern = "pub_sub"
	PatternSaga          MessagePattern = "saga"
)

type AsyncMessage struct {
	ID            string                 `json:"id"`
	CorrelationID string                 `json:"correlation_id"`
	SourceService string                 `json:"source_service"`
	TargetService string                 `json:"target_service"`
	MessageType   string                 `json:"message_type"`
	Payload       interface{}            `json:"payload"`
	Headers       map[string]string      `json:"headers"`
	Timestamp     time.Time              `json:"timestamp"`
	ExpiresAt     *time.Time             `json:"expires_at,omitempty"`
	RetryCount    int                    `json:"retry_count"`
	MaxRetries    int                    `json:"max_retries"`
	Pattern       MessagePattern         `json:"pattern"`
	Metadata      map[string]interface{} `json:"metadata"`
}

type MessageHandler func(context.Context, *AsyncMessage) error

type Subscription struct {
	ServiceID       string
	Handler         MessageHandler
	ErrorHandler    func(error, *AsyncMessage)
	RetryPolicy     RetryPolicy
	DeadLetterQueue DeadLetterQueue
}

type RetryPolicy struct{}

type DeadLetterQueue interface{}

type SagaStatus string

const (
	SagaStatusStarted SagaStatus = "started"
)

type SagaStep struct {
	Service            string
	Action             string
	CompensationAction string
}

type Saga struct {
	ID          string
	Steps       []SagaStep
	CurrentStep int
	Status      SagaStatus
	StartedAt   time.Time
	Metadata    map[string]interface{}
}

type AsyncPatternManager struct {
	messageQueue   MessageQueue
	eventStore     EventStore
	sagaManager    SagaManager
	retryScheduler *RetryScheduler
}

func NewAsyncPatternManager(mq MessageQueue, es EventStore, sm SagaManager) *AsyncPatternManager {
	return &AsyncPatternManager{
		messageQueue: mq,
		eventStore:   es,
		sagaManager:  sm,
	}
}

func (apm *AsyncPatternManager) validateMessage(msg *AsyncMessage) error {
	if msg.ID == "" || msg.SourceService == "" || msg.TargetService == "" {
		return fmt.Errorf("missing required fields")
	}
	return nil
}

func (apm *AsyncPatternManager) publishFireAndForget(ctx context.Context, msg *AsyncMessage) error {
	return apm.messageQueue.Publish(ctx, msg)
}

func (apm *AsyncPatternManager) publishRequestReply(ctx context.Context, msg *AsyncMessage) error {
	return apm.messageQueue.Publish(ctx, msg)
}

func (apm *AsyncPatternManager) publishPubSub(ctx context.Context, msg *AsyncMessage) error {
	return apm.messageQueue.Publish(ctx, msg)
}

func (apm *AsyncPatternManager) publishSaga(ctx context.Context, msg *AsyncMessage) error {
	return apm.messageQueue.Publish(ctx, msg)
}

func (apm *AsyncPatternManager) createErrorHandler(serviceID string) func(error, *AsyncMessage) {
	return func(err error, msg *AsyncMessage) {}
}

func (apm *AsyncPatternManager) createRetryPolicy(serviceID string) RetryPolicy {
	return RetryPolicy{}
}

func (apm *AsyncPatternManager) createDeadLetterQueue(serviceID string) DeadLetterQueue {
	return nil
}

func (apm *AsyncPatternManager) PublishMessage(ctx context.Context, message *AsyncMessage) error {
	if err := apm.validateMessage(message); err != nil {
		return fmt.Errorf("message validation failed: %w", err)
	}

	if err := apm.eventStore.StoreMessage(message); err != nil {
		return fmt.Errorf("failed to store message: %w", err)
	}

	switch message.Pattern {
	case PatternFireAndForget:
		return apm.publishFireAndForget(ctx, message)
	case PatternRequestReply:
		return apm.publishRequestReply(ctx, message)
	case PatternPubSub:
		return apm.publishPubSub(ctx, message)
	case PatternSaga:
		return apm.publishSaga(ctx, message)
	default:
		return fmt.Errorf("unsupported message pattern: %s", message.Pattern)
	}
}

func (apm *AsyncPatternManager) SubscribeToMessages(ctx context.Context, serviceID string, handler MessageHandler) error {
	sub := &Subscription{
		ServiceID:       serviceID,
		Handler:         handler,
		ErrorHandler:    apm.createErrorHandler(serviceID),
		RetryPolicy:     apm.createRetryPolicy(serviceID),
		DeadLetterQueue: apm.createDeadLetterQueue(serviceID),
	}
	return apm.messageQueue.Subscribe(ctx, sub)
}

func (apm *AsyncPatternManager) StartSaga(ctx context.Context, sagaID string, steps []SagaStep) error {
	saga := &Saga{
		ID:          sagaID,
		Steps:       steps,
		CurrentStep: 0,
		Status:      SagaStatusStarted,
		StartedAt:   time.Now(),
		Metadata:    make(map[string]interface{}),
	}

	if err := apm.sagaManager.StoreSaga(saga); err != nil {
		return fmt.Errorf("failed to store saga: %w", err)
	}
	return apm.sagaManager.ExecuteNextStep(ctx, saga)
}

// InMemoryEventStore is a simple in-memory implementation of EventStore

type InMemoryEventStore struct {
	mu       sync.Mutex
	messages map[string]*AsyncMessage
}

func NewInMemoryEventStore() *InMemoryEventStore {
	return &InMemoryEventStore{messages: make(map[string]*AsyncMessage)}
}

func (e *InMemoryEventStore) StoreMessage(msg *AsyncMessage) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.messages[msg.ID] = msg
	return nil
}

func (e *InMemoryEventStore) GetMessage(id string) (*AsyncMessage, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	m, ok := e.messages[id]
	if !ok {
		return nil, fmt.Errorf("message not found")
	}
	return m, nil
}

// SimpleQueue is an in-memory MessageQueue

type SimpleQueue struct {
	ch chan *AsyncMessage
}

func NewSimpleQueue(size int) *SimpleQueue {
	return &SimpleQueue{ch: make(chan *AsyncMessage, size)}
}

func (q *SimpleQueue) Publish(ctx context.Context, msg *AsyncMessage) error {
	select {
	case q.ch <- msg:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (q *SimpleQueue) Subscribe(ctx context.Context, sub *Subscription) error {
	go func() {
		for {
			select {
			case m := <-q.ch:
				if err := sub.Handler(ctx, m); err != nil && sub.ErrorHandler != nil {
					sub.ErrorHandler(err, m)
				}
			case <-ctx.Done():
				return
			}
		}
	}()
	return nil
}
