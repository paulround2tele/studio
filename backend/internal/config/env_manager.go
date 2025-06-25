package config

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
)

// ResolvedConfig represents a resolved configuration for a service/environment.
type ResolvedConfig struct {
	ServiceName string                 `json:"service_name"`
	Environment string                 `json:"environment"`
	Data        map[string]interface{} `json:"data"`
}

// EnvironmentManager handles environment-specific configuration with overrides
// and secret resolution.
type EnvironmentManager struct {
	baseConfig    map[string]interface{}
	overrides     map[string]map[string]interface{}
	secretManager *SecretManager
	deployedHash  map[string][32]byte
}

// NewEnvironmentManager creates a new manager with the given base configuration.
func NewEnvironmentManager(base map[string]interface{}, sm *SecretManager) *EnvironmentManager {
	return &EnvironmentManager{
		baseConfig:    deepCopyMap(base),
		overrides:     map[string]map[string]interface{}{},
		secretManager: sm,
		deployedHash:  map[string][32]byte{},
	}
}

// SetOverrides sets overrides for an environment.
func (em *EnvironmentManager) SetOverrides(env string, cfg map[string]interface{}) {
	em.overrides[env] = deepCopyMap(cfg)
}

// ResolveConfiguration returns the configuration with overrides and secrets resolved.
func (em *EnvironmentManager) ResolveConfiguration(serviceName, environment string) (*ResolvedConfig, error) {
	result := deepCopyMap(em.baseConfig)
	if o, ok := em.overrides[environment]; ok {
		result = mergeMaps(result, o)
	}

	envCfg := &EnvironmentConfig{
		Environment:   environment,
		ServiceName:   serviceName,
		Configuration: result,
	}
	if em.secretManager != nil {
		if err := em.secretManager.DecryptConfig(envCfg); err != nil {
			return nil, err
		}
	}

	b, _ := json.Marshal(envCfg.Configuration)
	hash := sha256.Sum256(b)
	if prev, ok := em.deployedHash[environment]; ok && prev != hash {
		// configuration drift detected
		em.deployedHash[environment] = hash
		return &ResolvedConfig{ServiceName: serviceName, Environment: environment, Data: result}, fmt.Errorf("configuration drift detected")
	}
	em.deployedHash[environment] = hash
	return &ResolvedConfig{ServiceName: serviceName, Environment: environment, Data: result}, nil
}

// helper deep copy for maps
func deepCopyMap(src map[string]interface{}) map[string]interface{} {
	b, _ := json.Marshal(src)
	var dst map[string]interface{}
	_ = json.Unmarshal(b, &dst)
	if dst == nil {
		dst = map[string]interface{}{}
	}
	return dst
}

// mergeMaps merges b into a (shallow merge)
func mergeMaps(a, b map[string]interface{}) map[string]interface{} {
	out := deepCopyMap(a)
	for k, v := range b {
		out[k] = v
	}
	return out
}
