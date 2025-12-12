package services

import "errors"

var (
	// ErrPhaseExecutionMissing indicates no in-memory execution context exists for the requested phase/campaign.
	ErrPhaseExecutionMissing = errors.New("phase execution missing")
	// ErrPhaseNotRunning indicates the requested phase exists but is not currently running.
	ErrPhaseNotRunning = errors.New("phase not running")
	// ErrPhasePauseUnsupported is returned when a phase does not implement cooperative pause support.
	ErrPhasePauseUnsupported = errors.New("phase pause unsupported")
	// ErrPhaseResumeUnsupported is returned when a phase does not implement cooperative resume support.
	ErrPhaseResumeUnsupported = errors.New("phase resume unsupported")
	// ErrPhasePauseTimeout indicates the phase did not acknowledge the pause request within the allotted time.
	ErrPhasePauseTimeout = errors.New("phase pause timed out")
	// ErrPhaseResumeTimeout indicates the phase did not acknowledge the resume request within the allotted time.
	ErrPhaseResumeTimeout = errors.New("phase resume timed out")
	// ErrPhaseNotPaused indicates a resume request was made for a phase that is not paused.
	ErrPhaseNotPaused = errors.New("phase not paused")
)
