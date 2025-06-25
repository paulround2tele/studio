package capacity

import (
	"context"
	"math"
	"time"
)

type DailyForecast struct {
	Date                 time.Time
	PredictedRPS         float64
	PredictedCPU         float64
	PredictedMemory      float64
	RecommendedInstances int
}

type CapacityForecast struct {
	ServiceName     string
	ForecastType    string
	TimeHorizonDays int
	Forecasts       []DailyForecast
	ConfidenceScore float64
	GeneratedAt     time.Time
}

type ForecastingModel interface {
	GenerateForecast(serviceName string, daysAhead int) (*CapacityForecast, error)
	GetModelAccuracy() float64
}

type LinearGrowthModel struct {
	GrowthRate float64
	Confidence float64
}

func (lgm *LinearGrowthModel) GetModelAccuracy() float64 { return lgm.Confidence }

func (lgm *LinearGrowthModel) GenerateForecast(serviceName string, daysAhead int) (*CapacityForecast, error) {
	baselineRPS := 100.0
	baselineCPU := 50.0
	baselineMem := 1024.0
	forecasts := make([]DailyForecast, daysAhead)
	for i := 1; i <= daysAhead; i++ {
		factor := 1.0 + lgm.GrowthRate*float64(i)/30.0
		forecasts[i-1] = DailyForecast{
			Date:                 time.Now().AddDate(0, 0, i),
			PredictedRPS:         baselineRPS * factor,
			PredictedCPU:         baselineCPU * factor,
			PredictedMemory:      baselineMem * factor,
			RecommendedInstances: int(math.Ceil((baselineCPU * factor) / 70.0)),
		}
	}
	return &CapacityForecast{
		ServiceName:     serviceName,
		ForecastType:    "linear",
		TimeHorizonDays: daysAhead,
		Forecasts:       forecasts,
		ConfidenceScore: lgm.Confidence,
		GeneratedAt:     time.Now(),
	}, nil
}

type CapacityPlanningEngine struct {
	forecastingModels map[string]ForecastingModel
}

func NewCapacityPlanningEngine() *CapacityPlanningEngine {
	return &CapacityPlanningEngine{forecastingModels: map[string]ForecastingModel{"linear": &LinearGrowthModel{GrowthRate: 0.05, Confidence: 0.8}}}
}

func (cpe *CapacityPlanningEngine) GenerateCapacityPlan(ctx context.Context, serviceName string, horizon int) (*CapacityForecast, error) {
	model := cpe.forecastingModels["linear"]
	return model.GenerateForecast(serviceName, horizon)
}
