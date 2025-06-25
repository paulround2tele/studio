package loadbalancer

import (
	"fmt"
	"math"
	"sync"
	"time"
)

type ServiceInstance struct {
	ID      string
	Weight  int
	Healthy bool
}

type Request struct{}

type LoadBalancingAlgorithm interface {
	SelectInstance(instances []*ServiceInstance, req *Request) (*ServiceInstance, error)
	UpdateMetrics(instance *ServiceInstance, responseTime time.Duration, success bool)
}

type WeightedRoundRobinAlgorithm struct {
	currentWeights map[string]int
	mutex          sync.RWMutex
}

func (wrr *WeightedRoundRobinAlgorithm) SelectInstance(instances []*ServiceInstance, req *Request) (*ServiceInstance, error) {
	wrr.mutex.Lock()
	defer wrr.mutex.Unlock()
	if len(instances) == 0 {
		return nil, fmt.Errorf("no healthy instances available")
	}
	totalWeight := 0
	for _, inst := range instances {
		totalWeight += inst.Weight
	}
	var selected *ServiceInstance
	maxWeight := -1
	for _, inst := range instances {
		if wrr.currentWeights == nil {
			wrr.currentWeights = make(map[string]int)
		}
		if wrr.currentWeights[inst.ID] == 0 {
			wrr.currentWeights[inst.ID] = inst.Weight
		}
		if wrr.currentWeights[inst.ID] > maxWeight {
			maxWeight = wrr.currentWeights[inst.ID]
			selected = inst
		}
	}
	if selected == nil {
		return nil, fmt.Errorf("failed to select instance")
	}
	wrr.currentWeights[selected.ID] -= totalWeight
	for _, inst := range instances {
		wrr.currentWeights[inst.ID] += inst.Weight
	}
	return selected, nil
}

func (wrr *WeightedRoundRobinAlgorithm) UpdateMetrics(instance *ServiceInstance, responseTime time.Duration, success bool) {
	// no-op for simple implementation
}

type LeastConnectionsAlgorithm struct {
	connectionCounts map[string]int
	mutex            sync.RWMutex
}

func (lc *LeastConnectionsAlgorithm) SelectInstance(instances []*ServiceInstance, req *Request) (*ServiceInstance, error) {
	lc.mutex.RLock()
	defer lc.mutex.RUnlock()
	if len(instances) == 0 {
		return nil, fmt.Errorf("no healthy instances available")
	}
	var selected *ServiceInstance
	min := math.MaxInt32
	for _, inst := range instances {
		c := lc.connectionCounts[inst.ID]
		if c < min {
			min = c
			selected = inst
		}
	}
	return selected, nil
}

func (lc *LeastConnectionsAlgorithm) UpdateMetrics(instance *ServiceInstance, responseTime time.Duration, success bool) {
	lc.mutex.Lock()
	defer lc.mutex.Unlock()
	if success {
		if lc.connectionCounts[instance.ID] > 0 {
			lc.connectionCounts[instance.ID]--
		}
	} else {
		lc.connectionCounts[instance.ID] += 2
	}
}
