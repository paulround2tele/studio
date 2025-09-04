package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// MetricsRuntimeGet serves an internal runtime metrics snapshot (not in OpenAPI spec; auxiliary for tests).
// If not wired in router, it remains unused; tests can invoke directly.
func (h *strictHandlers) MetricsRuntimeGet(ctx context.Context) (map[string]interface{}, error) {
	if h.deps == nil || h.deps.Metrics == nil {
		return map[string]interface{}{"timestamp": time.Now(), "metrics": map[string]int64{}}, nil
	}
	snap := h.deps.Metrics.Snapshot()
	out := map[string]interface{}{"timestamp": time.Now(), "metrics": snap}
	return out, nil
}

// (Optional) If later added to spec, wiring would return a gen response type.
var _ = gen.Metadata{}
