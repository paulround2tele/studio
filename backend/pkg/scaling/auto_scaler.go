package scaling

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type ScalingPolicy struct {
	ServiceName     string
	MinInstances    int
	MaxInstances    int
	CPUThreshold    float64
	MemoryThreshold float64
	CooldownMinutes int
}

type ScalingDecision struct {
	ShouldScale          bool
	ScaleDirection       string
	RecommendedInstances int
	TriggerMetric        string
}

type Orchestrator interface {
	ScaleService(ctx context.Context, serviceName string, instances int) error
}

type AutoScaler struct {
	db           *sql.DB
	orchestrator Orchestrator
}

func NewAutoScaler(db *sql.DB, orch Orchestrator) *AutoScaler {
	return &AutoScaler{db: db, orchestrator: orch}
}

func (as *AutoScaler) EvaluateScaling(ctx context.Context, policy *ScalingPolicy) (*ScalingDecision, error) {
	if policy == nil {
		return nil, errors.New("policy required")
	}
	var cpu, mem float64
	var instances int
	err := as.db.QueryRowContext(ctx,
		`SELECT cpu_utilization, memory_utilization, instance_count
         FROM service_capacity_metrics
         WHERE service_name=$1
         ORDER BY recorded_at DESC LIMIT 1`,
		policy.ServiceName).Scan(&cpu, &mem, &instances)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch metrics: %w", err)
	}

	decision := &ScalingDecision{RecommendedInstances: instances}

	if cpu > policy.CPUThreshold || mem > policy.MemoryThreshold {
		if instances < policy.MaxInstances {
			decision.ShouldScale = true
			decision.ScaleDirection = "up"
			decision.RecommendedInstances = instances + 1
			if cpu > policy.CPUThreshold {
				decision.TriggerMetric = "cpu"
			} else {
				decision.TriggerMetric = "memory"
			}
		}
	} else if cpu < policy.CPUThreshold*0.5 && mem < policy.MemoryThreshold*0.5 {
		if instances > policy.MinInstances {
			decision.ShouldScale = true
			decision.ScaleDirection = "down"
			decision.RecommendedInstances = instances - 1
			decision.TriggerMetric = "cpu"
		}
	}

	return decision, nil
}

func (as *AutoScaler) ExecuteScaling(ctx context.Context, policy *ScalingPolicy, dec *ScalingDecision) error {
	if !dec.ShouldScale {
		return nil
	}
	if policy.CooldownMinutes > 0 {
		var last time.Time
		err := as.db.QueryRowContext(ctx,
			`SELECT executed_at FROM scaling_events
             WHERE service_name=$1 ORDER BY executed_at DESC LIMIT 1`,
			policy.ServiceName).Scan(&last)
		if err == nil && time.Since(last) < time.Duration(policy.CooldownMinutes)*time.Minute {
			return nil
		}
	}
	if err := as.orchestrator.ScaleService(ctx, policy.ServiceName, dec.RecommendedInstances); err != nil {
		return err
	}
	_, _ = as.db.ExecContext(ctx,
		`INSERT INTO scaling_events(service_name, scale_direction, target_instances, executed_at)
         VALUES($1,$2,$3,NOW())`,
		policy.ServiceName, dec.ScaleDirection, dec.RecommendedInstances)
	return nil
}
