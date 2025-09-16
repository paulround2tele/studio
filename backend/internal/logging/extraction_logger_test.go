package logging
package logging

import "testing"

func TestExtractionLoggerLog(t *testing.T) {
    GlobalExtractionLogger.Log("extraction", "test_event", map[string]any{"k":"v"})
    // No assertion; ensures no panic and logger initialized.
}
