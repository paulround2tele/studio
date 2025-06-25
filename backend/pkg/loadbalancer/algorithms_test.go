package loadbalancer

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestWeightedRoundRobinAlgorithm(t *testing.T) {
	alg := &WeightedRoundRobinAlgorithm{currentWeights: make(map[string]int)}
	instances := []*ServiceInstance{
		{ID: "instance-1", Weight: 3, Healthy: true},
		{ID: "instance-2", Weight: 2, Healthy: true},
		{ID: "instance-3", Weight: 1, Healthy: true},
	}
	selections := make(map[string]int)
	for i := 0; i < 60; i++ {
		inst, err := alg.SelectInstance(instances, &Request{})
		assert.NoError(t, err)
		selections[inst.ID]++
	}
	assert.Equal(t, 30, selections["instance-1"])
	assert.Equal(t, 20, selections["instance-2"])
	assert.Equal(t, 10, selections["instance-3"])
}

func TestLeastConnectionsAlgorithm(t *testing.T) {
	alg := &LeastConnectionsAlgorithm{connectionCounts: map[string]int{"instance-1": 5, "instance-2": 2, "instance-3": 8}}
	instances := []*ServiceInstance{
		{ID: "instance-1", Healthy: true},
		{ID: "instance-2", Healthy: true},
		{ID: "instance-3", Healthy: true},
	}
	inst, err := alg.SelectInstance(instances, &Request{})
	assert.NoError(t, err)
	assert.Equal(t, "instance-2", inst.ID)
}
