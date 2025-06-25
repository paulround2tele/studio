package services

import "github.com/fntelecomllc/studio/backend/pkg/architecture"

// RegisterServiceContracts registers basic contracts for core services.
func RegisterServiceContracts(registry *architecture.ServiceRegistry) error {
	contracts := []architecture.ServiceContract{
		{
			ServiceName: "api-key-service",
			Version:     "v1",
			Endpoints:   []architecture.EndpointContract{{Path: "/api/v2/keys", Method: "POST"}},
		},
		{
			ServiceName: "mfa-service",
			Version:     "v1",
			Endpoints:   []architecture.EndpointContract{{Path: "/api/v2/mfa", Method: "POST"}},
		},
	}
	for _, c := range contracts {
		if err := registry.RegisterService(&c); err != nil {
			return err
		}
	}
	return nil
}
