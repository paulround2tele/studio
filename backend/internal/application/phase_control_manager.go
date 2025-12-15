package application

import (
	"context"
	"errors"
	"fmt"
	"sync"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// PhaseControlManager manages subscription channels for phase-level control signals.
type PhaseControlManager interface {
	Subscribe(_ context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) (<-chan domainservices.ControlCommand, error)
	Broadcast(_ context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, signal domainservices.ControlSignal, ack chan<- error) error
	Close(campaignID uuid.UUID, phase models.PhaseTypeEnum)
}

var (
	// ErrControlChannelMissing indicates no control subscription exists for the requested phase.
	ErrControlChannelMissing = errors.New("phase control channel missing")
	// ErrControlChannelFull indicates the subscription channel exists but cannot accept new commands.
	ErrControlChannelFull = errors.New("phase control channel full")
)

const defaultPhaseControlBuffer = 8

// inMemoryPhaseControlManager provides a lightweight, goroutine-safe implementation suitable for a single process.
type inMemoryPhaseControlManager struct {
	mu       sync.RWMutex
	buffer   int
	channels map[string]chan domainservices.ControlCommand
}

func newInMemoryPhaseControlManager() *inMemoryPhaseControlManager {
	return &inMemoryPhaseControlManager{
		buffer:   defaultPhaseControlBuffer,
		channels: make(map[string]chan domainservices.ControlCommand),
	}
}

// Subscribe returns a channel carrying control signals for the provided campaign phase.
func (m *inMemoryPhaseControlManager) Subscribe(_ context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) (<-chan domainservices.ControlCommand, error) {
	if phase == "" {
		return nil, fmt.Errorf("phase is required for control subscription")
	}
	key := controlMapKey(campaignID, phase)

	m.mu.Lock()
	defer m.mu.Unlock()

	if ch, exists := m.channels[key]; exists {
		return ch, nil
	}

	ch := make(chan domainservices.ControlCommand, m.buffer)
	m.channels[key] = ch
	return ch, nil
}

// Broadcast sends a control signal to the registered phase channel, if any.
func (m *inMemoryPhaseControlManager) Broadcast(_ context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, signal domainservices.ControlSignal, ack chan<- error) error {
	if phase == "" {
		return fmt.Errorf("phase is required for control signal")
	}
	key := controlMapKey(campaignID, phase)

	m.mu.RLock()
	ch, exists := m.channels[key]
	m.mu.RUnlock()
	if !exists {
		err := fmt.Errorf("%w for campaign=%s phase=%s", ErrControlChannelMissing, campaignID, phase)
		if ack != nil {
			select {
			case ack <- err:
			default:
			}
		}
		return err
	}

	cmd := domainservices.ControlCommand{Signal: signal, Ack: ack}
	select {
	case ch <- cmd:
		return nil
	default:
		err := fmt.Errorf("%w for campaign=%s phase=%s", ErrControlChannelFull, campaignID, phase)
		if ack != nil {
			select {
			case ack <- err:
			default:
			}
		}
		return err
	}
}

// Close removes and closes the control channel associated with the campaign phase.
func (m *inMemoryPhaseControlManager) Close(campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	key := controlMapKey(campaignID, phase)

	m.mu.Lock()
	ch, exists := m.channels[key]
	if exists {
		delete(m.channels, key)
	}
	m.mu.Unlock()

	if exists {
		close(ch)
	}
}

func controlMapKey(campaignID uuid.UUID, phase models.PhaseTypeEnum) string {
	return fmt.Sprintf("%s:%s", campaignID.String(), string(phase))
}
