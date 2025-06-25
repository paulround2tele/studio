package config

import (
	"crypto/rand"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEnvironmentManagerOverridesAndDrift(t *testing.T) {
	base := map[string]interface{}{"debug": false, "log_level": "info"}
	key := make([]byte, 32)
	rand.Read(key)
	sm := NewSecretManager(key)
	em := NewEnvironmentManager(base, sm)

	overrides := map[string]interface{}{"log_level": "error"}
	em.SetOverrides("production", overrides)

	cfg, err := em.ResolveConfiguration("svc", "production")
	assert.NoError(t, err)
	assert.Equal(t, "error", cfg.Data["log_level"])
	assert.Equal(t, false, cfg.Data["debug"])

	// second call without changes should not trigger drift
	_, err = em.ResolveConfiguration("svc", "production")
	assert.NoError(t, err)

	// change override to trigger drift
	overrides["log_level"] = "warn"
	em.SetOverrides("production", overrides)
	_, err = em.ResolveConfiguration("svc", "production")
	assert.Error(t, err)
}

func TestSecretManagerEncryptDecrypt(t *testing.T) {
	key := make([]byte, 32)
	rand.Read(key)
	sm := NewSecretManager(key)

	cfg := &EnvironmentConfig{
		Configuration:   map[string]interface{}{"password": "secret"},
		EncryptedFields: []string{"password"},
	}

	err := sm.EncryptConfig(cfg)
	assert.NoError(t, err)
	encVal, _ := cfg.Configuration["password"].(string)
	assert.NotEqual(t, "secret", encVal)

	err = sm.DecryptConfig(cfg)
	assert.NoError(t, err)
	decVal, _ := cfg.Configuration["password"].(string)
	assert.Equal(t, "secret", decVal)
}

func TestValidateEnvironmentConfigBytes(t *testing.T) {
	cfg := EnvironmentConfig{
		Environment:   "dev",
		ServiceName:   "api",
		Version:       "1",
		Configuration: map[string]interface{}{"k": "v"},
	}
	b, _ := json.Marshal(cfg)
	err := ValidateEnvironmentConfigBytes(b)
	assert.NoError(t, err)

	invalid := []byte(`{"environment":1}`)
	err = ValidateEnvironmentConfigBytes(invalid)
	assert.Error(t, err)
}
