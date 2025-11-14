package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
)

// SimpleLogger implements the Logger interface for domain services using structured JSON field output.
type SimpleLogger struct{}

func (l *SimpleLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
	l.print(ctx, "DEBUG", msg, fields, nil)
}

func (l *SimpleLogger) Info(ctx context.Context, msg string, fields map[string]interface{}) {
	l.print(ctx, "INFO", msg, fields, nil)
}

func (l *SimpleLogger) Warn(ctx context.Context, msg string, fields map[string]interface{}) {
	l.print(ctx, "WARN", msg, fields, nil)
}

func (l *SimpleLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
	l.print(ctx, "ERROR", msg, fields, err)
}

func (l *SimpleLogger) print(ctx context.Context, level, msg string, fields map[string]interface{}, err error) {
	fields = l.ensureContextFields(ctx, fields)
	encodedFields := encodeFields(fields)
	if err != nil {
		if encodedFields != "" {
			log.Printf("[%s] %s error=%q fields=%s", level, msg, err.Error(), encodedFields)
			return
		}
		log.Printf("[%s] %s error=%q", level, msg, err.Error())
		return
	}
	if encodedFields != "" {
		log.Printf("[%s] %s %s", level, msg, encodedFields)
		return
	}
	log.Printf("[%s] %s", level, msg)
}

func (l *SimpleLogger) ensureContextFields(ctx context.Context, fields map[string]interface{}) map[string]interface{} {
	if ctx == nil {
		return fields
	}
	if rid, ok := ctx.Value("request_id").(string); ok && rid != "" {
		if fields == nil {
			fields = make(map[string]interface{})
		}
		if _, exists := fields["request_id"]; !exists {
			fields["request_id"] = rid
		}
	}
	return fields
}

func encodeFields(fields map[string]interface{}) string {
	if len(fields) == 0 {
		return ""
	}
	b, err := json.Marshal(fields)
	if err != nil {
		return fmt.Sprintf("%v", fields)
	}
	return string(b)
}
