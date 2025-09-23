package main

import (
	"sync/atomic"
	"time"
)

// RuntimeMetrics provides minimal in-process counters/histograms for campaign orchestration.
// This is a lightweight stop-gap before integrating a full observability stack.
type RuntimeMetrics struct {
	// Counters
	modeChanges         atomic.Int64
	phaseStarts         atomic.Int64
	phaseAutoStarts     atomic.Int64
	phaseCompletions    atomic.Int64
	phaseFailures       atomic.Int64
	campaignCompletions atomic.Int64
	phaseConfigUpdates  atomic.Int64
	
	// Auto-start specific counters
	autoStartAttempts atomic.Int64
	autoStartSuccesses atomic.Int64
	autoStartFailures  atomic.Int64
	
	// Campaign mode distribution
	manualModeCreations atomic.Int64
	autoModeCreations   atomic.Int64
	
	// Simple duration aggregations (nanoseconds accumulated)
	domainPhaseDurationNs   atomic.Int64
	dnsPhaseDurationNs      atomic.Int64
	httpPhaseDurationNs     atomic.Int64
	analysisPhaseDurationNs atomic.Int64
	
	// Auto-start timing metrics (nanoseconds)
	autoStartLatencyNs         atomic.Int64  // creation → startPhase request
	firstPhaseRunningLatencyNs atomic.Int64  // creation → first phase RUNNING
}

func NewRuntimeMetrics() *RuntimeMetrics { return &RuntimeMetrics{} }

// Increment helpers
func (m *RuntimeMetrics) IncModeChanges()         { m.modeChanges.Add(1) }
func (m *RuntimeMetrics) IncPhaseStarts()         { m.phaseStarts.Add(1) }
func (m *RuntimeMetrics) IncPhaseAutoStarts()     { m.phaseAutoStarts.Add(1) }
func (m *RuntimeMetrics) IncPhaseCompletions()    { m.phaseCompletions.Add(1) }
func (m *RuntimeMetrics) IncPhaseFailures()       { m.phaseFailures.Add(1) }
func (m *RuntimeMetrics) IncCampaignCompletions() { m.campaignCompletions.Add(1) }
func (m *RuntimeMetrics) IncPhaseConfigUpdates()  { m.phaseConfigUpdates.Add(1) }

// Auto-start specific metrics
func (m *RuntimeMetrics) IncAutoStartAttempts()  { m.autoStartAttempts.Add(1) }
func (m *RuntimeMetrics) IncAutoStartSuccesses() { m.autoStartSuccesses.Add(1) }
func (m *RuntimeMetrics) IncAutoStartFailures()  { m.autoStartFailures.Add(1) }

// Campaign mode tracking
func (m *RuntimeMetrics) IncManualModeCreations() { m.manualModeCreations.Add(1) }
func (m *RuntimeMetrics) IncAutoModeCreations()   { m.autoModeCreations.Add(1) }

// Auto-start timing
func (m *RuntimeMetrics) RecordAutoStartLatency(d time.Duration) {
	m.autoStartLatencyNs.Add(d.Nanoseconds())
}
func (m *RuntimeMetrics) RecordFirstPhaseRunningLatency(d time.Duration) {
	m.firstPhaseRunningLatencyNs.Add(d.Nanoseconds())
}

// RecordPhaseDuration aggregates the elapsed duration for a given phase.
func (m *RuntimeMetrics) RecordPhaseDuration(phase string, d time.Duration) {
	switch phase {
	case "domain_generation":
		m.domainPhaseDurationNs.Add(d.Nanoseconds())
	case "dns_validation":
		m.dnsPhaseDurationNs.Add(d.Nanoseconds())
	case "http_keyword_validation":
		m.httpPhaseDurationNs.Add(d.Nanoseconds())
	case "analysis":
		m.analysisPhaseDurationNs.Add(d.Nanoseconds())
	}
}

// Snapshot returns a read-only copy of current counters (for future handler exposure/tests).
func (m *RuntimeMetrics) Snapshot() map[string]int64 {
	return map[string]int64{
		"mode_changes_total":               m.modeChanges.Load(),
		"phase_starts_total":               m.phaseStarts.Load(),
		"phase_auto_starts_total":          m.phaseAutoStarts.Load(),
		"phase_completions_total":          m.phaseCompletions.Load(),
		"phase_failures_total":             m.phaseFailures.Load(),
		"campaign_completions_total":       m.campaignCompletions.Load(),
		"phase_config_updates_total":       m.phaseConfigUpdates.Load(),
		"domain_phase_duration_ns_sum":     m.domainPhaseDurationNs.Load(),
		"dns_phase_duration_ns_sum":        m.dnsPhaseDurationNs.Load(),
		"http_phase_duration_ns_sum":       m.httpPhaseDurationNs.Load(),
		"analysis_phase_duration_ns_sum":   m.analysisPhaseDurationNs.Load(),
		
		// Auto-start metrics
		"campaign_auto_start_attempts_total":   m.autoStartAttempts.Load(),
		"campaign_auto_start_successes_total":  m.autoStartSuccesses.Load(),
		"campaign_auto_start_failures_total":   m.autoStartFailures.Load(),
		"campaign_auto_start_latency_ns_sum":   m.autoStartLatencyNs.Load(),
		"campaign_first_phase_running_ns_sum":  m.firstPhaseRunningLatencyNs.Load(),
		
		// Campaign mode distribution
		"campaign_manual_mode_creations_total": m.manualModeCreations.Load(),
		"campaign_auto_mode_creations_total":   m.autoModeCreations.Load(),
	}
}

// GetAutoStartSuccessRate calculates the auto-start success rate
func (m *RuntimeMetrics) GetAutoStartSuccessRate() float64 {
	attempts := m.autoStartAttempts.Load()
	if attempts == 0 {
		return 0.0
	}
	successes := m.autoStartSuccesses.Load()
	return float64(successes) / float64(attempts)
}
