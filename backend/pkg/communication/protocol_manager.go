package communication

import (
	"context"
	"fmt"
	"time"
)

type Protocol string

const (
	ProtocolHTTP    Protocol = "http"
	ProtocolGRPC    Protocol = "grpc"
	ProtocolMessage Protocol = "message"
)

type TimeoutConfig struct {
	Request time.Duration
}

type RetryConfig struct {
	MaxRetries int
}

type CircuitBreakerConfig struct{}

type CircuitBreaker struct{}

type MessageClient interface{}

type ServiceResponse struct {
	Status int
	Data   interface{}
}

type ProtocolManager struct {
	httpClient     interface{}
	grpcClients    map[string]interface{}
	messageClients map[string]MessageClient
	circuitBreaker *CircuitBreaker
	retryPolicy    *RetryPolicy
	tracingEnabled bool
}

type CommunicationConfig struct {
	PreferredProtocol    Protocol
	FallbackProtocols    []Protocol
	TimeoutConfig        TimeoutConfig
	RetryConfig          RetryConfig
	CircuitBreakerConfig CircuitBreakerConfig
}

type ServiceCall struct {
	TargetService string
	Method        string
	Payload       interface{}
	Headers       map[string]string
	Timeout       time.Duration
	Retries       int
	Metadata      map[string]interface{}
}

func (pm *ProtocolManager) addTracing(ctx context.Context, call *ServiceCall) context.Context {
	return ctx
}

func (pm *ProtocolManager) getServiceConfig(service string) (*CommunicationConfig, error) {
	return &CommunicationConfig{PreferredProtocol: ProtocolHTTP}, nil
}

func (pm *ProtocolManager) recordCommunicationEvent(id, service, event string) {}

func (pm *ProtocolManager) callHTTP(ctx context.Context, call *ServiceCall, cfg *CommunicationConfig) (*ServiceResponse, error) {
	return &ServiceResponse{Status: 200}, nil
}

func (pm *ProtocolManager) callGRPC(ctx context.Context, call *ServiceCall, cfg *CommunicationConfig) (*ServiceResponse, error) {
	return &ServiceResponse{Status: 200}, nil
}

func (pm *ProtocolManager) callMessage(ctx context.Context, call *ServiceCall, cfg *CommunicationConfig) (*ServiceResponse, error) {
	return &ServiceResponse{Status: 200}, nil
}

func (pm *ProtocolManager) CallService(ctx context.Context, call *ServiceCall) (*ServiceResponse, error) {
	ctx = pm.addTracing(ctx, call)
	config, err := pm.getServiceConfig(call.TargetService)
	if err != nil {
		return nil, fmt.Errorf("failed to get service config: %w", err)
	}

	protocols := append([]Protocol{config.PreferredProtocol}, config.FallbackProtocols...)
	var lastErr error
	for _, protocol := range protocols {
		switch protocol {
		case ProtocolHTTP:
			resp, err := pm.callHTTP(ctx, call, config)
			if err == nil {
				return resp, nil
			}
			lastErr = err
		case ProtocolGRPC:
			resp, err := pm.callGRPC(ctx, call, config)
			if err == nil {
				return resp, nil
			}
			lastErr = err
		case ProtocolMessage:
			resp, err := pm.callMessage(ctx, call, config)
			if err == nil {
				return resp, nil
			}
			lastErr = err
		}
	}
	return nil, fmt.Errorf("all protocols failed, last error: %w", lastErr)
}
