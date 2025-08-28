package main

import (
	"context"
	"log"
)

// SimpleLogger implements the Logger interface for domain services
type SimpleLogger struct{}

func (l *SimpleLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
	log.Printf("[DEBUG] %s %v", msg, fields)
}

func (l *SimpleLogger) Info(ctx context.Context, msg string, fields map[string]interface{}) {
	log.Printf("[INFO] %s %v", msg, fields)
}

func (l *SimpleLogger) Warn(ctx context.Context, msg string, fields map[string]interface{}) {
	log.Printf("[WARN] %s %v", msg, fields)
}

func (l *SimpleLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
	log.Printf("[ERROR] %s: %v %v", msg, err, fields)
}
