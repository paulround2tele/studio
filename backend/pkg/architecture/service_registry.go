package architecture

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/patrickmn/go-cache"
)

// ServiceRegistry manages service contracts and provides contract validation.
type ServiceRegistry struct {
	db        *sql.DB
	cache     *cache.Cache
	contracts map[string]*ServiceContract
	mu        sync.RWMutex
}

// NewServiceRegistry creates a new registry instance.
func NewServiceRegistry(db *sql.DB) *ServiceRegistry {
	c := cache.New(5*time.Minute, 10*time.Minute)
	return &ServiceRegistry{db: db, cache: c, contracts: make(map[string]*ServiceContract)}
}

// RegisterService validates and stores a service contract.
func (sr *ServiceRegistry) RegisterService(contract *ServiceContract) error {
	if err := sr.validateContract(contract); err != nil {
		return fmt.Errorf("contract validation failed: %w", err)
	}

	if err := sr.storeContract(contract); err != nil {
		return fmt.Errorf("failed to store contract: %w", err)
	}

	sr.updateRegistry(contract)
	return nil
}

// GetServiceContract retrieves a contract by service name.
func (sr *ServiceRegistry) GetServiceContract(name string) (*ServiceContract, bool) {
	sr.mu.RLock()
	defer sr.mu.RUnlock()
	c, ok := sr.contracts[name]
	return c, ok
}

func (sr *ServiceRegistry) validateContract(contract *ServiceContract) error {
	if contract.ServiceName == "" {
		return errors.New("service_name required")
	}
	if len(contract.Endpoints) == 0 {
		return errors.New("at least one endpoint required")
	}
	return nil
}

func (sr *ServiceRegistry) storeContract(contract *ServiceContract) error {
	if sr.db == nil {
		return nil
	}
	data, err := json.Marshal(contract)
	if err != nil {
		return err
	}
	_, err = sr.db.Exec(`INSERT INTO service_contracts (service_name, version, contract, created_at, updated_at)
        VALUES ($1,$2,$3,NOW(),NOW())
        ON CONFLICT (service_name, version) DO UPDATE SET contract = EXCLUDED.contract, updated_at = NOW()`,
		contract.ServiceName, contract.Version, string(data))
	return err
}

func (sr *ServiceRegistry) updateRegistry(contract *ServiceContract) {
	sr.mu.Lock()
	defer sr.mu.Unlock()
	sr.contracts[contract.ServiceName] = contract
	sr.cache.Set(contract.ServiceName, contract, cache.DefaultExpiration)
}
