# Campaign Mode Enhancement Plan

## Overview
This document captures the unified UX & technical implementation plan for enhancing both **full_sequence** and **step_by_step** campaign execution modes. It is the authoritative reference to avoid losing context in constrained session windows.

---
## Objectives
1. Deliver proactive guidance when enabling full_sequence (preflight readiness, blocked recovery, automatic chaining feedback).
2. Elevate step_by_step with clarity (next recommended action, dependency hints, progress checklist, conversion CTA to full_sequence when advantageous).
3. Unify foundational primitives (phase readiness model, SSE-driven state, Redux slice extensions) to reduce duplication.
4. Maintain graceful inter-mode transitions without race conditions or user confusion.

---
## Current State (Baseline)
| Area | Status |
|------|--------|
| Backend chaining | Auto-advance implemented; emits `phase_*`, `mode_changed`, `chain_blocked` SSE. |
| Mode persistence | PATCH `/campaigns/{id}/mode` implemented + optimistic toggle on frontend. |
| Blocking logic | Auto chain halts when next phase missing config; emits `chain_blocked`. |
| Frontend gaps | No preflight, no blocked banner, no next-action panel, no readiness abstraction. |

---
## Foundational Model
### Phase Readiness Structure
```ts
interface PhaseReadiness {
  phase: 'discovery' | 'validation' | 'extraction' | 'analysis';
  status: 'not_started' | 'configured' | 'running' | 'completed' | 'failed' | 'paused';
  configured: boolean;                // derived from status
  dependenciesMet: boolean;           // gating (previous required phases complete)
  canStart: boolean;                  // dependenciesMet && (status in startable set)
  blocked?: boolean;                  // chain_blocked targeted phase
  missingFields?: string[];           // (future) validation details
}
```

### Redux (campaignUI slice additions)
- `fullSequenceMode: boolean` (per campaign, existing)
- `blockedPhase?: string`
- `preflightOpen?: boolean`
- `guidance?: { message: string; phase?: string; severity: 'info' | 'warn' }`

### SSE Event Handling
| Event | Action |
|-------|--------|
| `mode_changed` | Sync `fullSequenceMode` boolean. |
| `chain_blocked` | Set `blockedPhase` and push guidance. |
| `phase_*` | Implicitly refresh readiness via status queries / local recompute. |

---
## Full Sequence Enhancements
| Feature | Description | Component |
|---------|-------------|-----------|
| Preflight Wizard | Checklist of all phases & config status after enabling mode. | `FullSequencePreflightWizard` |
| Optional Auto-Start | Auto-start discovery if all phases pre-configured (feature flag). | Toggle handler logic |
| Blocked Banner | Banner surfaces when `chain_blocked` SSE received. | `SequenceBlockedBanner` |
| Inline Stepper | Horizontal (or vertical) status visualization of phases. | Augment `CampaignControls` |
| Auto Resume (optional) | After config saved for blocked phase, restart automatically. | Config modal callback |
| Failure Continuation Panel | On phase failure in full_sequence, show retry/stop sequence actions. | Extension to `PhaseCard` |
| Mode Switch Guard | Confirm before switching away mid-chain. | Toggle wrapper |

---
## Step by Step Enhancements
| Feature | Description |
|---------|-------------|
| Next Action Panel | Contextual suggestion: configure or start next logical phase. |
| Dependency Hints | Unified tooltip copy for disabled start/config buttons. |
| Config Progress Checklist | Mini dashboard: N / 4 phases configured; badges. |
| Conversion CTA | Suggest enabling full_sequence when only remaining steps are already configured or trivial. |
| Timeline / History | SSE-driven chronological log (phase events). |
| Draft Presets (Future) | Save reusable config templates (out of scope initial). |

---
## Mode Transition Matrix
| From → To | Behavior |
|-----------|----------|
| step_by_step → full_sequence (idle) | Open Preflight (unless all ready, then optional auto-start). |
| step_by_step → full_sequence (mid-running) | Inform user chaining will begin after current completes. |
| full_sequence → step_by_step (blocked) | Clear `blockedPhase`, keep progress; user handles next manually. |
| full_sequence → step_by_step (active) | Confirm stop of auto-advance; future phases manual. |

---
## Incremental Delivery Plan
1. Foundation A: `usePhaseReadiness` hook.
2. Foundation B: Extend Redux slice (blockedPhase, guidance, preflightOpen control).
3. Foundation C: Integrate `onModeChanged` + `onChainBlocked` events into `CampaignControls` (dispatch actions).
4. D: `SequenceBlockedBanner` component.
5. E: `FullSequencePreflightWizard` + wiring from mode toggle success.
6. F: Next Action Panel for step_by_step mode.
7. G: Inline stepper / checklist.
8. H: Failure continuation panel logic.
9. I: Conversion CTA conditions.
10. J: Timeline history aggregator from SSE.

Each step is shippable and reduces risk; stop early if scope pressures arise.

---
## Acceptance Criteria (Initial Milestones)
- After switching to full_sequence with missing configs, Preflight appears automatically (Milestone E). *(Before E, ensure A–C deliver blockedPhase + readiness but no UI yet).*  
- chain_blocked event sets `blockedPhase` and a visible banner (after D).  
- Step by step mode shows actionable "Next" guidance (after F).  
- Toggling back and forth preserves accurate mode & removes banners logically.  

---
## Edge Cases & Handling
| Case | Strategy |
|------|----------|
| SSE arrives after manual toggle revert | Always trust latest SSE; overwrite. |
| Rapid double toggles | Pending flag prevents re-entry. |
| Config saved during blocked state | Clear blocked + optionally auto-resume. |
| Phase failure mid auto chain | Stop chaining; show retry panel. |
| Partial network outage | Optimistic state + retry surface in toasts. |

---
## Future (Not in Initial Pass)
- Draft config templates & cloning.
- Multi-phase batch persona / keyword set assignment wizard.
- Metrics overlay (durations, throughput) inside stepper.
- Pause/Resume semantics if backend adds a pausing API.

---
## Implementation Notes
- Avoid reusing `CampaignPhaseManager` (legacy) — rely on modular modals & new preflight wizard.
- Keep new components small, headless where possible for reusability.
- All readiness derived from existing status endpoints; no new backend calls initially.

---
## Rollback Plan
If preflight or banner introduces instability, feature-flag rendering (simple env or UI bool) while keeping core state logic intact.

---
## Ownership & Next Steps
- Proceed with Foundations (A–C) immediately after this file is committed.
- Log deltas in commit messages referencing step letter.

---
*End of plan.*
