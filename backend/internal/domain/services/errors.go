package services

import "errors"

var (
	// ErrPhaseExecutionMissing indicates no in-memory execution context exists for the requested phase/campaign.
	ErrPhaseExecutionMissing = errors.New("phase execution missing")
	// ErrPhaseNotRunning indicates the requested phase exists but is not currently running.
	ErrPhaseNotRunning = errors.New("phase not running")
)
