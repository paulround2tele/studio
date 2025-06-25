package loadbalancer

import "time"

type AlgorithmSelector struct{}

func (a *AlgorithmSelector) SelectBestAlgorithm(service string, instances []*ServiceInstance, req *Request) string {
	// For demo, always pick weighted_round_robin
	return "wrr"
}

type AdaptiveMetrics struct{}

func (am *AdaptiveMetrics) RecordAlgorithmUsage(name, service string)                           {}
func (am *AdaptiveMetrics) RecordInstancePerformance(id string, rt time.Duration, success bool) {}

type AdaptiveLoadBalancer struct {
	algorithms map[string]LoadBalancingAlgorithm
	selector   *AlgorithmSelector
	metrics    *AdaptiveMetrics
}

func NewAdaptiveLoadBalancer() *AdaptiveLoadBalancer {
	return &AdaptiveLoadBalancer{
		algorithms: map[string]LoadBalancingAlgorithm{
			"wrr":   &WeightedRoundRobinAlgorithm{currentWeights: make(map[string]int)},
			"least": &LeastConnectionsAlgorithm{connectionCounts: make(map[string]int)},
		},
		selector: &AlgorithmSelector{},
		metrics:  &AdaptiveMetrics{},
	}
}

func (alb *AdaptiveLoadBalancer) SelectInstance(serviceName string, instances []*ServiceInstance, req *Request) (*ServiceInstance, error) {
	algName := alb.selector.SelectBestAlgorithm(serviceName, instances, req)
	alg := alb.algorithms[algName]
	inst, err := alg.SelectInstance(instances, req)
	if err == nil {
		alb.metrics.RecordAlgorithmUsage(algName, serviceName)
	}
	return inst, err
}

func (alb *AdaptiveLoadBalancer) UpdateInstanceMetrics(instance *ServiceInstance, rt time.Duration, success bool) {
	for _, alg := range alb.algorithms {
		alg.UpdateMetrics(instance, rt, success)
	}
	alb.metrics.RecordInstancePerformance(instance.ID, rt, success)
}
