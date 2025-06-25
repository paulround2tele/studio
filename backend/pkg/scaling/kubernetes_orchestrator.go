package scaling

import (
	"context"
	"fmt"
	"os/exec"
)

type KubernetesOrchestrator struct{}

func NewKubernetesOrchestrator() *KubernetesOrchestrator {
	return &KubernetesOrchestrator{}
}

func (k *KubernetesOrchestrator) ScaleService(ctx context.Context, serviceName string, instances int) error {
	cmd := exec.CommandContext(ctx, "kubectl", "scale", "deployment", serviceName, fmt.Sprintf("--replicas=%d", instances))
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kubectl scale failed: %v: %s", err, string(output))
	}
	return nil
}
