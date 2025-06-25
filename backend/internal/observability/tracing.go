package observability

import (
	"context"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/exporters/zipkin"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
	"go.opentelemetry.io/otel/trace"
)

// InitTracer initializes a tracer provider and sets it as the global provider.
// The backendURL may point to a Jaeger or Zipkin collector.
func InitTracer(serviceName, backendURL string) (*sdktrace.TracerProvider, error) {
	var (
		exp sdktrace.SpanExporter
		err error
	)

	if strings.Contains(strings.ToLower(backendURL), "zipkin") {
		exp, err = zipkin.New(backendURL)
	} else {
		if backendURL == "" {
			backendURL = "http://localhost:14268/api/traces"
		}
		exp, err = jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint(backendURL)))
	}
	if err != nil {
		return nil, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(serviceName),
		)),
	)
	otel.SetTracerProvider(tp)
	return tp, nil
}

// StartSpan starts a new span with the given tracer and returns the new context.
func StartSpan(ctx context.Context, tracer trace.Tracer, operation string) (context.Context, trace.Span) {
	ctx, span := tracer.Start(ctx, operation)
	return ctx, span
}
