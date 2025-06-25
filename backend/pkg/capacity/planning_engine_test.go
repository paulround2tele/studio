package capacity

import (
	"context"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestLinearGrowthForecast(t *testing.T) {
	model := &LinearGrowthModel{GrowthRate: 0.05, Confidence: 0.85}
	forecast, err := model.GenerateForecast("test-service", 30)
	assert.NoError(t, err)
	assert.Equal(t, 30, len(forecast.Forecasts))
	assert.Equal(t, "linear", forecast.ForecastType)
	assert.Equal(t, 0.85, forecast.ConfidenceScore)
	assert.Greater(t, forecast.Forecasts[29].PredictedRPS, forecast.Forecasts[0].PredictedRPS)
}

func TestCapacityPlanningEngine(t *testing.T) {
	engine := NewCapacityPlanningEngine()
	plan, err := engine.GenerateCapacityPlan(context.Background(), "myservice", 7)
	assert.NoError(t, err)
	assert.Equal(t, 7, len(plan.Forecasts))
}
