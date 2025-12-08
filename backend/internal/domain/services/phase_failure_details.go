package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// buildPhaseFailureDetails normalizes structured failure payloads for persistence.
func buildPhaseFailureDetails(phase models.PhaseTypeEnum, status models.PhaseStatusEnum, message string, context map[string]interface{}) map[string]interface{} {
	details := map[string]interface{}{
		"code":      fmt.Sprintf("%s_failure", strings.ToLower(string(phase))),
		"phase":     string(phase),
		"status":    string(status),
		"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
	}
	if message != "" {
		details["message"] = message
	}
	if len(context) > 0 {
		details["context"] = context
	}
	return details
}
