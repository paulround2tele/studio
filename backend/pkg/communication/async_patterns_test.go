package communication

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestAsyncPatternManager_PublishAndSubscribe(t *testing.T) {
	mq := NewSimpleQueue(10)
	es := NewInMemoryEventStore()

	apm := NewAsyncPatternManager(mq, es, nil)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	received := make(chan *AsyncMessage, 1)
	err := apm.SubscribeToMessages(ctx, "test-service", func(ctx context.Context, msg *AsyncMessage) error {
		received <- msg
		return nil
	})
	require.NoError(t, err)

	msg := &AsyncMessage{
		ID:            uuid.New().String(),
		CorrelationID: uuid.New().String(),
		SourceService: "sender",
		TargetService: "test-service",
		MessageType:   "test",
		Payload:       "data",
		Pattern:       PatternPubSub,
		Timestamp:     time.Now(),
	}

	err = apm.PublishMessage(ctx, msg)
	require.NoError(t, err)

	stored, err := es.GetMessage(msg.ID)
	require.NoError(t, err)
	require.Equal(t, msg.ID, stored.ID)

	select {
	case r := <-received:
		require.Equal(t, msg.ID, r.ID)
	case <-time.After(time.Second):
		t.Fatal("message not received")
	}
}
