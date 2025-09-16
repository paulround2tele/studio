package logging

import (
	"encoding/json"
	"log"
	"os"
	"time"
)

// ExtractionLogger provides minimal structured logging for extraction analytics events.
type ExtractionLogger struct{ logger *log.Logger }

var GlobalExtractionLogger = NewExtractionLogger()

// NewExtractionLogger creates a new instance writing JSON lines to stdout.
func NewExtractionLogger() *ExtractionLogger {
	return &ExtractionLogger{logger: log.New(os.Stdout, "", 0)}
}

// Event represents a generic extraction analytics log entry.
type Event struct {
	Timestamp string         `json:"timestamp"`
	Component string         `json:"component"`
	Type      string         `json:"type"`
	Data      map[string]any `json:"data"`
}

// Log writes an event if serialization succeeds.
func (l *ExtractionLogger) Log(component, typ string, data map[string]any) {
	if l == nil || l.logger == nil {
		return
	}
	e := Event{Timestamp: time.Now().UTC().Format(time.RFC3339Nano), Component: component, Type: typ, Data: data}
	if b, err := json.Marshal(e); err == nil {
		l.logger.Println(string(b))
	}
}
