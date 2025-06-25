package config

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
)

// SecretManager handles encryption/decryption of sensitive configuration fields.
type SecretManager struct {
	key []byte
}

// NewSecretManager creates a new SecretManager with the provided AES key.
func NewSecretManager(key []byte) *SecretManager {
	return &SecretManager{key: key}
}

// EncryptConfig encrypts the fields listed in cfg.EncryptedFields.
func (sm *SecretManager) EncryptConfig(cfg *EnvironmentConfig) error {
	if sm == nil || len(sm.key) != 32 {
		return fmt.Errorf("invalid encryption key")
	}
	for _, field := range cfg.EncryptedFields {
		if val, ok := cfg.Configuration[field]; ok {
			str, ok := val.(string)
			if !ok {
				continue
			}
			encVal, err := sm.encrypt(str)
			if err != nil {
				return err
			}
			cfg.Configuration[field] = encVal
		}
	}
	return nil
}

// DecryptConfig decrypts the fields listed in cfg.EncryptedFields.
func (sm *SecretManager) DecryptConfig(cfg *EnvironmentConfig) error {
	if sm == nil || len(sm.key) != 32 {
		return fmt.Errorf("invalid encryption key")
	}
	for _, field := range cfg.EncryptedFields {
		if val, ok := cfg.Configuration[field]; ok {
			str, ok := val.(string)
			if !ok || str == "" {
				continue
			}
			decVal, err := sm.decrypt(str)
			if err != nil {
				return err
			}
			cfg.Configuration[field] = decVal
		}
	}
	return nil
}

func (sm *SecretManager) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(sm.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (sm *SecretManager) decrypt(ciphertext string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(sm.key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}
	nonce, ct := data[:nonceSize], data[nonceSize:]
	pt, err := gcm.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}
