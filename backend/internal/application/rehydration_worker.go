package application

import (
	"context"
	"errors"
	"sync"
	"time"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
)

// RehydrationWorkerConfig defines tunables for the background rehydration worker.
type RehydrationWorkerConfig struct {
	StartupDelay          time.Duration
	SweepTimeout          time.Duration
	SleepBetweenCampaigns time.Duration
	RunOnStart            bool
}

// DefaultRehydrationWorkerConfig returns conservative defaults suitable for most deployments.
func DefaultRehydrationWorkerConfig() RehydrationWorkerConfig {
	return RehydrationWorkerConfig{
		StartupDelay:          3 * time.Second,
		SweepTimeout:          2 * time.Minute,
		SleepBetweenCampaigns: 25 * time.Millisecond,
		RunOnStart:            true,
	}
}

// RehydrationTriggerStartup labels the startup-triggered sweep for logging/metrics.
const RehydrationTriggerStartup = "startup"

// RehydrationWorker defers RestoreInFlightPhases into a background goroutine with basic throttling.
type RehydrationWorker struct {
	orchestrator *CampaignOrchestrator
	logger       domainservices.Logger
	cfg          RehydrationWorkerConfig

	triggerCh chan rehydrationRequest
	once      sync.Once
}

type rehydrationRequest struct {
	reason string
}

// NewRehydrationWorker wires a new worker.
func NewRehydrationWorker(o *CampaignOrchestrator, logger domainservices.Logger, cfg RehydrationWorkerConfig) *RehydrationWorker {
	if cfg.SweepTimeout <= 0 {
		cfg.SweepTimeout = 2 * time.Minute
	}
	if cfg.SleepBetweenCampaigns < 0 {
		cfg.SleepBetweenCampaigns = 0
	}
	return &RehydrationWorker{
		orchestrator: o,
		logger:       logger,
		cfg:          cfg,
		triggerCh:    make(chan rehydrationRequest, 1),
	}
}

// Start begins the worker loop.
func (w *RehydrationWorker) Start(ctx context.Context) {
	if w == nil {
		return
	}
	w.once.Do(func() {
		go w.loop(ctx)
	})
}

// Trigger enqueues a sweep request; duplicate requests collapse if one is already pending.
func (w *RehydrationWorker) Trigger(reason string) {
	if w == nil {
		return
	}
	req := rehydrationRequest{reason: reason}
	select {
	case w.triggerCh <- req:
	default:
	}
}

func (w *RehydrationWorker) loop(ctx context.Context) {
	if w.cfg.RunOnStart {
		if err := waitWithContext(ctx, w.cfg.StartupDelay); err == nil {
			w.runSweep(ctx, RehydrationTriggerStartup)
		}
	}
	for {
		select {
		case <-ctx.Done():
			return
		case req := <-w.triggerCh:
			w.runSweep(ctx, req.reason)
		}
	}
}

func (w *RehydrationWorker) runSweep(ctx context.Context, reason string) {
	if w == nil || w.orchestrator == nil {
		return
	}
	sweepCtx, cancel := context.WithTimeout(ctx, w.cfg.SweepTimeout)
	defer cancel()

	if w.logger != nil {
		w.logger.Info(ctx, "rehydration.worker.sweep.start", map[string]interface{}{"reason": reason})
	}

	err := w.orchestrator.restoreInFlightPhases(sweepCtx, w.cfg.SleepBetweenCampaigns)
	switch {
	case err == nil:
		if w.logger != nil {
			w.logger.Info(ctx, "rehydration.worker.sweep.completed", map[string]interface{}{"reason": reason})
		}
	case errors.Is(err, context.Canceled), errors.Is(err, context.DeadlineExceeded):
		if w.logger != nil {
			w.logger.Warn(ctx, "rehydration.worker.sweep.aborted", map[string]interface{}{"reason": reason, "error": err.Error()})
		}
	default:
		if w.logger != nil {
			w.logger.Warn(ctx, "rehydration.worker.sweep.failed", map[string]interface{}{"reason": reason, "error": err.Error()})
		}
	}
}

func waitWithContext(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
