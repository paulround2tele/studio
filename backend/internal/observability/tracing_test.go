package observability

import (
	"context"
	"testing"

	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"
)

func TestTracePropagation(t *testing.T) {
	sr := tracetest.NewSpanRecorder()
	tp := sdktrace.NewTracerProvider()
	tp.RegisterSpanProcessor(sr)

	tracer := tp.Tracer("test")
	ctx, span := StartSpan(context.Background(), tracer, "root")
	ctx, child := StartSpan(ctx, tracer, "child")
	child.End()
	span.End()

	spans := sr.Ended()
	if len(spans) != 2 {
		t.Fatalf("expected 2 spans, got %d", len(spans))
	}
	var rootSpan, childSpan sdktrace.ReadOnlySpan
	for _, sp := range spans {
		switch sp.Name() {
		case "root":
			rootSpan = sp
		case "child":
			childSpan = sp
		}
	}
	if childSpan == nil || rootSpan == nil {
		t.Fatalf("spans not recorded correctly")
	}
	if childSpan.Parent().SpanID() != rootSpan.SpanContext().SpanID() {
		t.Fatalf("child span does not have correct parent")
	}
}
