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
	chainBlocked        atomic.Int64
	campaignCompletions atomic.Int64
	phaseConfigUpdates  atomic.Int64
	// Simple duration aggregations (nanoseconds accumulated)
	domainPhaseDurationNs   atomic.Int64
	dnsPhaseDurationNs      atomic.Int64
	httpPhaseDurationNs     atomic.Int64
	analysisPhaseDurationNs atomic.Int64
}

func NewRuntimeMetrics() *RuntimeMetrics { return &RuntimeMetrics{} }

// Increment helpers
func (m *RuntimeMetrics) IncModeChanges()         { m.modeChanges.Add(1) }
func (m *RuntimeMetrics) IncPhaseStarts()         { m.phaseStarts.Add(1) }
func (m *RuntimeMetrics) IncPhaseAutoStarts()     { m.phaseAutoStarts.Add(1) }
func (m *RuntimeMetrics) IncPhaseCompletions()    { m.phaseCompletions.Add(1) }
func (m *RuntimeMetrics) IncPhaseFailures()       { m.phaseFailures.Add(1) }
func (m *RuntimeMetrics) IncChainBlocked()        { m.chainBlocked.Add(1) }
func (m *RuntimeMetrics) IncCampaignCompletions() { m.campaignCompletions.Add(1) }
func (m *RuntimeMetrics) IncPhaseConfigUpdates()  { m.phaseConfigUpdates.Add(1) }

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
		"mode_changes_total":             m.modeChanges.Load(),
		"phase_starts_total":             m.phaseStarts.Load(),
		"phase_auto_starts_total":        m.phaseAutoStarts.Load(),
		"phase_completions_total":        m.phaseCompletions.Load(),
		"phase_failures_total":           m.phaseFailures.Load(),
		"chain_blocked_total":            m.chainBlocked.Load(),
		"campaign_completions_total":     m.campaignCompletions.Load(),
		"phase_config_updates_total":     m.phaseConfigUpdates.Load(),
		"domain_phase_duration_ns_sum":   m.domainPhaseDurationNs.Load(),
		"dns_phase_duration_ns_sum":      m.dnsPhaseDurationNs.Load(),
		"http_phase_duration_ns_sum":     m.httpPhaseDurationNs.Load(),
		"analysis_phase_duration_ns_sum": m.analysisPhaseDurationNs.Load(),
	}
}
