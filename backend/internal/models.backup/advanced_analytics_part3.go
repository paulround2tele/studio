// File: backend/internal/models/advanced_analytics_part3.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 1: ADVANCED ANALYTICS FINAL COMPONENTS
// Comparative Analytics, Predictive Analytics, Visualization, and Export
// ===============================================================================

// CostEfficiencyMetrics - Missing type from part2
type CostEfficiencyMetrics struct {
	OverallCostEfficiency   float64 `json:"overallCostEfficiency"`  // 0-100
	CostPerPerformanceUnit  float64 `json:"costPerPerformanceUnit"` // currency per unit
	ResourceValueRatio      float64 `json:"resourceValueRatio"`     // value delivered per resource unit
	WasteReductionScore     float64 `json:"wasteReductionScore"`    // 0-100
	OptimizationPotential   float64 `json:"optimizationPotential"`  // percentage
	CompetitiveCostPosition string  `json:"competitiveCostPosition" validate:"oneof=excellent good average poor"`
}

// ComparativeAnalyticsData - Comparative analytics against baselines and benchmarks
type ComparativeAnalyticsData struct {
	ComparisonType             string                        `json:"comparisonType" validate:"oneof=period historical benchmark competitor"`
	BaselineMetrics            *BaselineMetrics              `json:"baselineMetrics,omitempty"`
	CurrentMetrics             *BaselineMetrics              `json:"currentMetrics,omitempty"`
	PerformanceComparison      *PerformanceComparison        `json:"performanceComparison,omitempty"`
	TrendAnalysis              *TrendAnalysis                `json:"trendAnalysis,omitempty"`
	BenchmarkComparisons       []DetailedBenchmarkComparison `json:"benchmarkComparisons,omitempty"`
	CompetitiveAnalysis        *CompetitiveAnalysis          `json:"competitiveAnalysis,omitempty"`
	ImprovementRecommendations []ImprovementRecommendation   `json:"improvementRecommendations,omitempty"`
}

// BaselineMetrics - Baseline metrics for comparison
type BaselineMetrics struct {
	TimePeriod         TimeRangeFilter            `json:"timePeriod"`
	OperationalMetrics OperationalBaselineMetrics `json:"operationalMetrics"`
	PerformanceMetrics PerformanceBaselineMetrics `json:"performanceMetrics"`
	QualityMetrics     QualityBaselineMetrics     `json:"qualityMetrics"`
	ResourceMetrics    ResourceBaselineMetrics    `json:"resourceMetrics"`
	StealthMetrics     StealthBaselineMetrics     `json:"stealthMetrics"`
	CostMetrics        CostBaselineMetrics        `json:"costMetrics"`
}

// OperationalBaselineMetrics - Baseline operational metrics
type OperationalBaselineMetrics struct {
	TotalOperations      int64   `json:"totalOperations"`
	SuccessfulOperations int64   `json:"successfulOperations"`
	FailedOperations     int64   `json:"failedOperations"`
	AverageResponseTime  int64   `json:"averageResponseTime"` // milliseconds
	ThroughputRate       float64 `json:"throughputRate"`      // operations/hour
	ErrorRate            float64 `json:"errorRate"`           // percentage
	UptimePercentage     float64 `json:"uptimePercentage"`    // percentage
}

// PerformanceBaselineMetrics - Baseline performance metrics
type PerformanceBaselineMetrics struct {
	AverageLatency   int64   `json:"averageLatency"`   // milliseconds
	P95Latency       int64   `json:"p95Latency"`       // milliseconds
	P99Latency       int64   `json:"p99Latency"`       // milliseconds
	ThroughputScore  float64 `json:"throughputScore"`  // 0-100
	ReliabilityScore float64 `json:"reliabilityScore"` // 0-100
	ScalabilityScore float64 `json:"scalabilityScore"` // 0-100
	EfficiencyScore  float64 `json:"efficiencyScore"`  // 0-100
}

// QualityBaselineMetrics - Baseline quality metrics
type QualityBaselineMetrics struct {
	DataAccuracy      float64 `json:"dataAccuracy"`      // percentage
	ValidationSuccess float64 `json:"validationSuccess"` // percentage
	DataCompleteness  float64 `json:"dataCompleteness"`  // percentage
	DataConsistency   float64 `json:"dataConsistency"`   // percentage
	QualityScore      float64 `json:"qualityScore"`      // 0-100
}

// ResourceBaselineMetrics - Baseline resource metrics
type ResourceBaselineMetrics struct {
	AverageCPUUsage         float64 `json:"averageCPUUsage"`         // percentage
	AverageMemoryUsage      float64 `json:"averageMemoryUsage"`      // percentage
	AverageNetworkUsage     float64 `json:"averageNetworkUsage"`     // percentage
	AverageStorageUsage     float64 `json:"averageStorageUsage"`     // percentage
	ResourceEfficiencyScore float64 `json:"resourceEfficiencyScore"` // 0-100
	CostEfficiencyScore     float64 `json:"costEfficiencyScore"`     // 0-100
}

// StealthBaselineMetrics - Baseline stealth metrics
type StealthBaselineMetrics struct {
	AverageStealthScore         float64 `json:"averageStealthScore"` // 0-1 (lower is better)
	DetectionEvents             int64   `json:"detectionEvents"`
	SuccessfulEvasions          int64   `json:"successfulEvasions"`
	AnonymityScore              float64 `json:"anonymityScore"`              // 0-100
	CountermeasureEffectiveness float64 `json:"countermeasureEffectiveness"` // 0-100
}

// CostBaselineMetrics - Baseline cost metrics
type CostBaselineMetrics struct {
	TotalCost             float64               `json:"totalCost"`             // currency
	CostPerOperation      float64               `json:"costPerOperation"`      // currency
	CostPerSuccessfulLead float64               `json:"costPerSuccessfulLead"` // currency
	ResourceCostBreakdown ResourceCostBreakdown `json:"resourceCostBreakdown"`
	ROI                   float64               `json:"roi"` // percentage
}

// PerformanceComparison - Detailed performance comparison results
type PerformanceComparison struct {
	OverallImprovement      float64                      `json:"overallImprovement"` // percentage
	MetricComparisons       []MetricComparison           `json:"metricComparisons,omitempty"`
	SignificantChanges      []SignificantChange          `json:"significantChanges,omitempty"`
	RegressionAnalysis      *RegressionAnalysis          `json:"regressionAnalysis,omitempty"`
	StatisticalSignificance *StatisticalSignificanceData `json:"statisticalSignificance,omitempty"`
}

// MetricComparison - Individual metric comparison
type MetricComparison struct {
	MetricName         string  `json:"metricName"`
	BaselineValue      float64 `json:"baselineValue"`
	CurrentValue       float64 `json:"currentValue"`
	AbsoluteChange     float64 `json:"absoluteChange"`
	PercentageChange   float64 `json:"percentageChange"`
	ChangeDirection    string  `json:"changeDirection" validate:"oneof=improvement regression stable"`
	SignificanceLevel  string  `json:"significanceLevel" validate:"oneof=not_significant low medium high very_high"`
	ConfidenceInterval float64 `json:"confidenceInterval"` // percentage
}

// SignificantChange - Statistically significant changes detected
type SignificantChange struct {
	ChangeType         string    `json:"changeType"` // "improvement", "regression", "trend_change"
	MetricAffected     string    `json:"metricAffected"`
	Magnitude          float64   `json:"magnitude"`       // percentage
	ConfidenceLevel    float64   `json:"confidenceLevel"` // percentage
	DetectedAt         time.Time `json:"detectedAt"`
	PotentialCauses    []string  `json:"potentialCauses,omitempty"`
	RecommendedActions []string  `json:"recommendedActions,omitempty"`
}

// RegressionAnalysis - Statistical regression analysis of performance trends
type RegressionAnalysis struct {
	TrendDirection          string  `json:"trendDirection" validate:"oneof=improving stable declining"`
	RSquaredValue           float64 `json:"rSquaredValue"`           // 0-1
	CorrelationCoefficient  float64 `json:"correlationCoefficient"`  // -1 to 1
	StatisticalSignificance float64 `json:"statisticalSignificance"` // p-value
	ForecastAccuracy        float64 `json:"forecastAccuracy"`        // percentage
	TrendEquation           string  `json:"trendEquation,omitempty"`
}

// StatisticalSignificanceData - Statistical significance analysis
type StatisticalSignificanceData struct {
	PValue                     float64 `json:"pValue"`          // 0-1
	ConfidenceLevel            float64 `json:"confidenceLevel"` // percentage
	SampleSize                 int64   `json:"sampleSize"`
	StandardDeviation          float64 `json:"standardDeviation"`
	MarginOfError              float64 `json:"marginOfError"`
	IsStatisticallySignificant bool    `json:"isStatisticallySignificant"`
}

// TrendAnalysis - Advanced trend analysis
type TrendAnalysis struct {
	ShortTermTrend   TrendDirection           `json:"shortTermTrend"`  // last 24 hours
	MediumTermTrend  TrendDirection           `json:"mediumTermTrend"` // last 7 days
	LongTermTrend    TrendDirection           `json:"longTermTrend"`   // last 30 days
	SeasonalPatterns []SeasonalPattern        `json:"seasonalPatterns,omitempty"`
	CyclicalPatterns []CyclicalPattern        `json:"cyclicalPatterns,omitempty"`
	AnomalyDetection *AnomalyDetectionResults `json:"anomalyDetection,omitempty"`
	TrendBreakpoints []TrendBreakpoint        `json:"trendBreakpoints,omitempty"`
}

// TrendDirection - Direction and strength of trends
type TrendDirection struct {
	Direction  string  `json:"direction" validate:"oneof=strongly_improving improving stable declining strongly_declining"`
	Strength   float64 `json:"strength"`   // 0-1
	Confidence float64 `json:"confidence"` // percentage
	Rate       float64 `json:"rate"`       // rate of change per time unit
	Duration   int     `json:"duration"`   // days the trend has been active
}

// SeasonalPattern - Detected seasonal patterns in data
type SeasonalPattern struct {
	PatternType         string    `json:"patternType"`        // "daily", "weekly", "monthly", "quarterly"
	PatternStrength     float64   `json:"patternStrength"`    // 0-1
	PeakTime            string    `json:"peakTime"`           // description of peak time
	TroughTime          string    `json:"troughTime"`         // description of trough time
	AmplitudeVariation  float64   `json:"amplitudeVariation"` // percentage
	NextPredictedPeak   time.Time `json:"nextPredictedPeak"`
	NextPredictedTrough time.Time `json:"nextPredictedTrough"`
}

// CyclicalPattern - Detected cyclical patterns
type CyclicalPattern struct {
	CycleLength      int       `json:"cycleLength"`   // days
	CycleStrength    float64   `json:"cycleStrength"` // 0-1
	LastCycleStart   time.Time `json:"lastCycleStart"`
	NextCycleStart   time.Time `json:"nextCycleStart"`
	AverageAmplitude float64   `json:"averageAmplitude"` // percentage
	CycleReliability float64   `json:"cycleReliability"` // 0-1
}

// AnomalyDetectionResults - Results from anomaly detection algorithms
type AnomalyDetectionResults struct {
	AnomaliesDetected    []DetectedAnomaly `json:"anomaliesDetected,omitempty"`
	AnomalyScore         float64           `json:"anomalyScore"`         // 0-1
	BaselineVariability  float64           `json:"baselineVariability"`  // standard deviations
	DetectionSensitivity float64           `json:"detectionSensitivity"` // 0-1
	FalsePositiveRate    float64           `json:"falsePositiveRate"`    // percentage
	AlertStatus          string            `json:"alertStatus" validate:"oneof=normal warning critical"`
}

// DetectedAnomaly - Individual detected anomaly
type DetectedAnomaly struct {
	AnomalyType     string    `json:"anomalyType"` // "spike", "drop", "trend_change", "pattern_break"
	Severity        string    `json:"severity" validate:"oneof=low medium high critical"`
	DetectedAt      time.Time `json:"detectedAt"`
	Duration        int64     `json:"duration"`  // minutes
	Magnitude       float64   `json:"magnitude"` // how many standard deviations from normal
	AffectedMetrics []string  `json:"affectedMetrics,omitempty"`
	PotentialCauses []string  `json:"potentialCauses,omitempty"`
	RecoveryTime    *int64    `json:"recoveryTime,omitempty"` // minutes to return to normal
	BusinessImpact  string    `json:"businessImpact" validate:"oneof=minimal low moderate high severe"`
}

// TrendBreakpoint - Points where trends change significantly
type TrendBreakpoint struct {
	BreakpointTime    time.Time `json:"breakpointTime"`
	BreakpointType    string    `json:"breakpointType" validate:"oneof=level_shift trend_change variance_change"`
	PreviousTrend     string    `json:"previousTrend" validate:"oneof=improving stable declining"`
	NewTrend          string    `json:"newTrend" validate:"oneof=improving stable declining"`
	SignificanceLevel float64   `json:"significanceLevel"` // statistical significance
	PotentialCauses   []string  `json:"potentialCauses,omitempty"`
	BusinessEvents    []string  `json:"businessEvents,omitempty"`
}

// DetailedBenchmarkComparison - Detailed benchmark comparison data
type DetailedBenchmarkComparison struct {
	BenchmarkSource       string                      `json:"benchmarkSource"` // "industry_standard", "competitor_analysis", "best_practice"
	BenchmarkName         string                      `json:"benchmarkName"`
	ComparisonResults     []BenchmarkMetricComparison `json:"comparisonResults,omitempty"`
	OverallRanking        int                         `json:"overallRanking"` // position among benchmarked entities
	PerformanceGap        float64                     `json:"performanceGap"` // percentage gap to benchmark leader
	CompetitiveAdvantages []string                    `json:"competitiveAdvantages,omitempty"`
	ImprovementAreas      []string                    `json:"improvementAreas,omitempty"`
	BenchmarkDate         time.Time                   `json:"benchmarkDate"`
}

// BenchmarkMetricComparison - Individual metric comparison against benchmark
type BenchmarkMetricComparison struct {
	MetricName            string  `json:"metricName"`
	OurValue              float64 `json:"ourValue"`
	BenchmarkValue        float64 `json:"benchmarkValue"`
	IndustryAverage       float64 `json:"industryAverage"`
	TopQuartileValue      float64 `json:"topQuartileValue"`
	PerformancePercentile int     `json:"performancePercentile"` // 1-100
	GapToBenchmark        float64 `json:"gapToBenchmark"`        // percentage
	CompetitivePosition   string  `json:"competitivePosition" validate:"oneof=leader above_average average below_average laggard"`
}

// CompetitiveAnalysis - Analysis against competitor performance
type CompetitiveAnalysis struct {
	CompetitorComparisons []CompetitorComparison `json:"competitorComparisons,omitempty"`
	MarketPosition        string                 `json:"marketPosition" validate:"oneof=leader challenger follower niche"`
	CompetitiveStrengths  []CompetitiveStrength  `json:"competitiveStrengths,omitempty"`
	CompetitiveWeaknesses []CompetitiveWeakness  `json:"competitiveWeaknesses,omitempty"`
	MarketShare           float64                `json:"marketShare"` // percentage
	ThreatLevel           string                 `json:"threatLevel" validate:"oneof=low moderate high critical"`
}

// CompetitorComparison - Comparison against individual competitor
type CompetitorComparison struct {
	CompetitorName        string                       `json:"competitorName"`
	CompetitorType        string                       `json:"competitorType" validate:"oneof=direct indirect substitute emerging"`
	PerformanceComparison []CompetitorMetricComparison `json:"performanceComparison,omitempty"`
	OverallRanking        string                       `json:"overallRanking" validate:"oneof=superior comparable inferior"`
	ThreatLevel           string                       `json:"threatLevel" validate:"oneof=low moderate high critical"`
	MarketShare           float64                      `json:"marketShare"` // percentage
	GrowthRate            float64                      `json:"growthRate"`  // percentage
}

// CompetitorMetricComparison - Individual metric comparison with competitor
type CompetitorMetricComparison struct {
	MetricName            string  `json:"metricName"`
	OurPerformance        float64 `json:"ourPerformance"`
	CompetitorPerformance float64 `json:"competitorPerformance"`
	PerformanceGap        float64 `json:"performanceGap"` // percentage (positive = we're better)
	CompetitiveAdvantage  string  `json:"competitiveAdvantage" validate:"oneof=strong moderate weak none disadvantage"`
	StrategicImportance   string  `json:"strategicImportance" validate:"oneof=low medium high critical"`
}

// CompetitiveStrength - Identified competitive strengths
type CompetitiveStrength struct {
	StrengthArea          string  `json:"strengthArea"` // "technology", "cost", "quality", "speed"
	StrengthLevel         string  `json:"strengthLevel" validate:"oneof=marginal moderate strong dominant"`
	QuantitativeAdvantage float64 `json:"quantitativeAdvantage"` // percentage or multiple
	Sustainability        string  `json:"sustainability" validate:"oneof=temporary medium_term sustainable"`
	StrategicValue        string  `json:"strategicValue" validate:"oneof=low medium high critical"`
	Description           string  `json:"description"`
}

// CompetitiveWeakness - Identified competitive weaknesses
type CompetitiveWeakness struct {
	WeaknessArea     string  `json:"weaknessArea"` // "technology", "cost", "quality", "speed"
	SeverityLevel    string  `json:"severityLevel" validate:"oneof=minor moderate significant critical"`
	QuantitativeGap  float64 `json:"quantitativeGap"` // percentage behind competition
	UrgencyLevel     string  `json:"urgencyLevel" validate:"oneof=low medium high immediate"`
	ImpactOnBusiness string  `json:"impactOnBusiness" validate:"oneof=minimal moderate significant severe"`
	ImprovementPlan  string  `json:"improvementPlan,omitempty"`
}

// ImprovementRecommendation - Recommendations based on comparative analysis
type ImprovementRecommendation struct {
	RecommendationType   string   `json:"recommendationType"` // "performance", "cost", "quality", "strategic"
	Priority             string   `json:"priority" validate:"oneof=low medium high critical"`
	ImprovementArea      string   `json:"improvementArea"`
	CurrentGap           float64  `json:"currentGap"`        // percentage behind target
	TargetImprovement    float64  `json:"targetImprovement"` // percentage improvement expected
	ExpectedTimeframe    int      `json:"expectedTimeframe"` // days
	ResourceRequirements []string `json:"resourceRequirements,omitempty"`
	EstimatedCost        float64  `json:"estimatedCost"` // currency
	ExpectedROI          float64  `json:"expectedROI"`   // percentage
	RiskLevel            string   `json:"riskLevel" validate:"oneof=low medium high"`
	Dependencies         []string `json:"dependencies,omitempty"`
	SuccessMetrics       []string `json:"successMetrics,omitempty"`
	Description          string   `json:"description"`
}

// PredictiveAnalyticsData - Advanced predictive analytics and forecasting
type PredictiveAnalyticsData struct {
	PredictionHorizon         int                         `json:"predictionHorizon"`         // hours
	OverallPredictionAccuracy float64                     `json:"overallPredictionAccuracy"` // percentage
	PerformanceForecasts      []PerformanceForecast       `json:"performanceForecasts,omitempty"`
	ResourceForecasts         []ResourceForecast          `json:"resourceForecasts,omitempty"`
	TrendPredictions          []TrendPrediction           `json:"trendPredictions,omitempty"`
	RiskPredictions           []RiskPrediction            `json:"riskPredictions,omitempty"`
	OpportunityPredictions    []OpportunityPrediction     `json:"opportunityPredictions,omitempty"`
	ModelPerformance          *PredictiveModelPerformance `json:"modelPerformance,omitempty"`
	ScenarioAnalysis          *ScenarioAnalysis           `json:"scenarioAnalysis,omitempty"`
}

// PerformanceForecast - Predicted performance metrics
type PerformanceForecast struct {
	MetricName         string    `json:"metricName"`
	CurrentValue       float64   `json:"currentValue"`
	PredictedValue     float64   `json:"predictedValue"`
	ForecastTime       time.Time `json:"forecastTime"`
	ConfidenceInterval float64   `json:"confidenceInterval"` // percentage
	PredictionAccuracy float64   `json:"predictionAccuracy"` // percentage
	InfluencingFactors []string  `json:"influencingFactors,omitempty"`
	ForecastMethod     string    `json:"forecastMethod"` // "time_series", "regression", "ml_model"
	Assumptions        []string  `json:"assumptions,omitempty"`
}

// ResourceForecast - Predicted resource utilization
type ResourceForecast struct {
	ResourceType          string    `json:"resourceType"`         // "cpu", "memory", "network", "storage", "proxy"
	CurrentUtilization    float64   `json:"currentUtilization"`   // percentage
	PredictedUtilization  float64   `json:"predictedUtilization"` // percentage
	ForecastTime          time.Time `json:"forecastTime"`
	CapacityThreshold     float64   `json:"capacityThreshold"` // percentage when scaling needed
	ScalingRecommendation string    `json:"scalingRecommendation,omitempty"`
	ConfidenceLevel       float64   `json:"confidenceLevel"` // percentage
	PredictionError       float64   `json:"predictionError"` // historical error rate
}

// TrendPrediction - Predicted future trends
type TrendPrediction struct {
	TrendName            string    `json:"trendName"`
	CurrentDirection     string    `json:"currentDirection" validate:"oneof=improving stable declining"`
	PredictedDirection   string    `json:"predictedDirection" validate:"oneof=improving stable declining"`
	TrendChangeTime      time.Time `json:"trendChangeTime,omitempty"`
	TrendStrength        float64   `json:"trendStrength"` // 0-1
	TrendDuration        int       `json:"trendDuration"` // days
	InfluencingFactors   []string  `json:"influencingFactors,omitempty"`
	ConfidenceLevel      float64   `json:"confidenceLevel"` // percentage
	BusinessImplications []string  `json:"businessImplications,omitempty"`
}

// RiskPrediction - Predicted future risks
type RiskPrediction struct {
	RiskType                  string    `json:"riskType"` // "performance_degradation", "resource_exhaustion", "detection_risk"
	RiskLevel                 string    `json:"riskLevel" validate:"oneof=low medium high critical"`
	Probability               float64   `json:"probability"` // 0-1
	PotentialImpact           string    `json:"potentialImpact" validate:"oneof=minimal low moderate high severe"`
	EarliestOccurrence        time.Time `json:"earliestOccurrence"`
	LatestOccurrence          time.Time `json:"latestOccurrence"`
	RiskIndicators            []string  `json:"riskIndicators,omitempty"`
	MitigationStrategies      []string  `json:"mitigationStrategies,omitempty"`
	PreventiveMeasures        []string  `json:"preventiveMeasures,omitempty"`
	MonitoringRecommendations []string  `json:"monitoringRecommendations,omitempty"`
}

// OpportunityPrediction - Predicted opportunities for improvement
type OpportunityPrediction struct {
	OpportunityType      string    `json:"opportunityType"` // "performance_improvement", "cost_optimization", "market_expansion"
	OpportunityLevel     string    `json:"opportunityLevel" validate:"oneof=minor moderate significant major"`
	Probability          float64   `json:"probability"`      // 0-1
	PotentialBenefit     float64   `json:"potentialBenefit"` // percentage or currency
	OptimalTiming        time.Time `json:"optimalTiming"`
	WindowDuration       int       `json:"windowDuration"` // days
	RequiredConditions   []string  `json:"requiredConditions,omitempty"`
	ResourceRequirements []string  `json:"resourceRequirements,omitempty"`
	SuccessProbability   float64   `json:"successProbability"` // 0-1
	RecommendedActions   []string  `json:"recommendedActions,omitempty"`
}

// PredictiveModelPerformance - Performance metrics for predictive models
type PredictiveModelPerformance struct {
	ModelAccuracy        float64             `json:"modelAccuracy"`  // percentage
	ModelPrecision       float64             `json:"modelPrecision"` // percentage
	ModelRecall          float64             `json:"modelRecall"`    // percentage
	ModelF1Score         float64             `json:"modelF1Score"`   // 0-1
	MeanAbsoluteError    float64             `json:"meanAbsoluteError"`
	RootMeanSquaredError float64             `json:"rootMeanSquaredError"`
	LastModelUpdate      time.Time           `json:"lastModelUpdate"`
	TrainingDataSize     int64               `json:"trainingDataSize"`
	ModelComplexity      string              `json:"modelComplexity" validate:"oneof=simple moderate complex very_complex"`
	OverfittingRisk      string              `json:"overfittingRisk" validate:"oneof=low medium high"`
	ModelReliability     float64             `json:"modelReliability"` // 0-100
	FeatureImportance    []FeatureImportance `json:"featureImportance,omitempty"`
}

// FeatureImportance - Importance of different features in predictive models
type FeatureImportance struct {
	FeatureName             string  `json:"featureName"`
	ImportanceScore         float64 `json:"importanceScore"` // 0-1
	InfluenceDirection      string  `json:"influenceDirection" validate:"oneof=positive negative neutral"`
	StatisticalSignificance float64 `json:"statisticalSignificance"` // p-value
	BusinessRelevance       string  `json:"businessRelevance" validate:"oneof=low medium high critical"`
}

// ScenarioAnalysis - Analysis of different potential scenarios
type ScenarioAnalysis struct {
	BaseScenario           Scenario                    `json:"baseScenario"`
	OptimisticScenario     Scenario                    `json:"optimisticScenario"`
	PessimisticScenario    Scenario                    `json:"pessimisticScenario"`
	CustomScenarios        []Scenario                  `json:"customScenarios,omitempty"`
	ScenarioProbabilities  []ScenarioProbability       `json:"scenarioProbabilities,omitempty"`
	RecommendedPreparation []PreparationRecommendation `json:"recommendedPreparation,omitempty"`
}

// Scenario - Individual scenario definition and outcomes
type Scenario struct {
	ScenarioName      string            `json:"scenarioName"`
	ScenarioType      string            `json:"scenarioType" validate:"oneof=base optimistic pessimistic custom"`
	Assumptions       []string          `json:"assumptions,omitempty"`
	PredictedOutcomes []ScenarioOutcome `json:"predictedOutcomes,omitempty"`
	Probability       float64           `json:"probability"` // 0-1
	BusinessImpact    string            `json:"businessImpact" validate:"oneof=minimal low moderate high severe"`
	RequiredActions   []string          `json:"requiredActions,omitempty"`
	RiskMitigation    []string          `json:"riskMitigation,omitempty"`
}

// ScenarioOutcome - Predicted outcome for a specific scenario
type ScenarioOutcome struct {
	OutcomeType       string  `json:"outcomeType"` // "performance", "cost", "resource", "risk"
	MetricAffected    string  `json:"metricAffected"`
	PredictedValue    float64 `json:"predictedValue"`
	VarianceFromBase  float64 `json:"varianceFromBase"` // percentage difference from base scenario
	ConfidenceLevel   float64 `json:"confidenceLevel"`  // percentage
	ImpactDescription string  `json:"impactDescription"`
}

// ScenarioProbability - Probability assessment for different scenarios
type ScenarioProbability struct {
	ScenarioName         string    `json:"scenarioName"`
	Probability          float64   `json:"probability"` // 0-1
	ProbabilityTrend     string    `json:"probabilityTrend" validate:"oneof=increasing stable decreasing"`
	LastUpdated          time.Time `json:"lastUpdated"`
	InfluencingFactors   []string  `json:"influencingFactors,omitempty"`
	MonitoringIndicators []string  `json:"monitoringIndicators,omitempty"`
}

// PreparationRecommendation - Recommendations for scenario preparation
type PreparationRecommendation struct {
	RecommendationType   string   `json:"recommendationType"` // "proactive", "reactive", "monitoring", "contingency"
	TargetScenarios      []string `json:"targetScenarios,omitempty"`
	ActionDescription    string   `json:"actionDescription"`
	Priority             string   `json:"priority" validate:"oneof=low medium high critical"`
	TimeFrame            string   `json:"timeFrame"` // "immediate", "short_term", "medium_term", "long_term"
	ResourceRequirements []string `json:"resourceRequirements,omitempty"`
	ExpectedBenefit      string   `json:"expectedBenefit"`
	ImplementationRisk   string   `json:"implementationRisk" validate:"oneof=low medium high"`
}

// VisualizationDataPrep - Data prepared for visualization components
type VisualizationDataPrep struct {
	ChartData           []ChartDataSet       `json:"chartData,omitempty"`
	DashboardLayouts    []DashboardLayout    `json:"dashboardLayouts,omitempty"`
	InteractiveElements []InteractiveElement `json:"interactiveElements,omitempty"`
	ExportFormats       []string             `json:"exportFormats,omitempty"`
	ColorSchemeData     *ColorSchemeData     `json:"colorSchemeData,omitempty"`
	ResponsiveSettings  *ResponsiveSettings  `json:"responsiveSettings,omitempty"`
	AnimationSettings   *AnimationSettings   `json:"animationSettings,omitempty"`
}

// ChartDataSet - Data set prepared for specific chart types
type ChartDataSet struct {
	ChartType     string               `json:"chartType" validate:"oneof=line bar pie scatter heatmap radar treemap"`
	ChartTitle    string               `json:"chartTitle"`
	DataSeries    []DataSeries         `json:"dataSeries,omitempty"`
	XAxisConfig   AxisConfiguration    `json:"xAxisConfig"`
	YAxisConfig   AxisConfiguration    `json:"yAxisConfig"`
	LegendConfig  LegendConfiguration  `json:"legendConfig"`
	TooltipConfig TooltipConfiguration `json:"tooltipConfig"`
	DrillDownData []DrillDownLevel     `json:"drillDownData,omitempty"`
}

// DataSeries - Individual data series for charts
type DataSeries struct {
	SeriesName  string      `json:"seriesName"`
	SeriesType  string      `json:"seriesType" validate:"oneof=primary secondary reference benchmark"`
	DataPoints  []DataPoint `json:"dataPoints,omitempty"`
	ColorCode   string      `json:"colorCode,omitempty"`
	LineStyle   string      `json:"lineStyle,omitempty" validate:"omitempty,oneof=solid dashed dotted"`
	MarkerStyle string      `json:"markerStyle,omitempty" validate:"omitempty,oneof=circle square triangle diamond"`
	Aggregation string      `json:"aggregation,omitempty" validate:"omitempty,oneof=sum average count min max"`
}

// DataPoint - Individual data point with metadata
type DataPoint struct {
	Timestamp        time.Time              `json:"timestamp,omitempty"`
	Value            float64                `json:"value"`
	Label            string                 `json:"label,omitempty"`
	Category         string                 `json:"category,omitempty"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	FormattedValue   string                 `json:"formattedValue,omitempty"`
	DrillDownEnabled bool                   `json:"drillDownEnabled"`
}

// AxisConfiguration - Chart axis configuration
type AxisConfiguration struct {
	Title        string   `json:"title"`
	Scale        string   `json:"scale" validate:"oneof=linear logarithmic time"`
	MinValue     *float64 `json:"minValue,omitempty"`
	MaxValue     *float64 `json:"maxValue,omitempty"`
	TickInterval *float64 `json:"tickInterval,omitempty"`
	Format       string   `json:"format,omitempty"`
	Unit         string   `json:"unit,omitempty"`
	GridLines    bool     `json:"gridLines"`
}

// LegendConfiguration - Chart legend configuration
type LegendConfiguration struct {
	Enabled     bool   `json:"enabled"`
	Position    string `json:"position" validate:"oneof=top bottom left right"`
	Orientation string `json:"orientation" validate:"oneof=horizontal vertical"`
	Interactive bool   `json:"interactive"`
	MaxItems    int    `json:"maxItems,omitempty"`
}

// TooltipConfiguration - Chart tooltip configuration
type TooltipConfiguration struct {
	Enabled      bool     `json:"enabled"`
	Format       string   `json:"format,omitempty"`
	ShowAll      bool     `json:"showAll"`
	CustomFields []string `json:"customFields,omitempty"`
	Interactive  bool     `json:"interactive"`
}

// DrillDownLevel - Drill-down data for interactive charts
type DrillDownLevel struct {
	Level           int      `json:"level"`
	LevelName       string   `json:"levelName"`
	GroupingField   string   `json:"groupingField"`
	AvailableFields []string `json:"availableFields,omitempty"`
	DataQuery       string   `json:"dataQuery,omitempty"`
}

// DashboardLayout - Dashboard layout configuration
type DashboardLayout struct {
	LayoutName      string             `json:"layoutName"`
	LayoutType      string             `json:"layoutType" validate:"oneof=executive operational technical custom"`
	Sections        []DashboardSection `json:"sections,omitempty"`
	RefreshInterval int                `json:"refreshInterval"` // seconds
	AutoRefresh     bool               `json:"autoRefresh"`
	Responsive      bool               `json:"responsive"`
	ShareableLink   string             `json:"shareableLink,omitempty"`
}

// DashboardSection - Individual dashboard section
type DashboardSection struct {
	SectionID    string            `json:"sectionId"`
	SectionTitle string            `json:"sectionTitle"`
	SectionType  string            `json:"sectionType" validate:"oneof=chart table metric alert summary"`
	Position     DashboardPosition `json:"position"`
	Size         DashboardSize     `json:"size"`
	DataSource   string            `json:"dataSource"`
	RefreshRate  int               `json:"refreshRate"` // seconds
	Visible      bool              `json:"visible"`
	Collapsible  bool              `json:"collapsible"`
}

// DashboardPosition - Position within dashboard
type DashboardPosition struct {
	Row    int `json:"row"`
	Column int `json:"column"`
	ZIndex int `json:"zIndex,omitempty"`
}

// DashboardSize - Size of dashboard element
type DashboardSize struct {
	Width     int  `json:"width"`  // grid units
	Height    int  `json:"height"` // grid units
	MinWidth  int  `json:"minWidth,omitempty"`
	MinHeight int  `json:"minHeight,omitempty"`
	Resizable bool `json:"resizable"`
}

// InteractiveElement - Interactive elements for visualization
type InteractiveElement struct {
	ElementType   string                 `json:"elementType" validate:"oneof=filter drill_down zoom pan select highlight"`
	ElementID     string                 `json:"elementId"`
	TargetCharts  []string               `json:"targetCharts,omitempty"`
	Configuration map[string]interface{} `json:"configuration,omitempty"`
	EventTriggers []string               `json:"eventTriggers,omitempty"`
	Enabled       bool                   `json:"enabled"`
}

// ColorSchemeData - Color scheme configuration
type ColorSchemeData struct {
	SchemeName             string                  `json:"schemeName"`
	PrimaryColors          []string                `json:"primaryColors,omitempty"`
	SecondaryColors        []string                `json:"secondaryColors,omitempty"`
	AccentColors           []string                `json:"accentColors,omitempty"`
	GradientColors         []string                `json:"gradientColors,omitempty"`
	AlertColors            AlertColorConfiguration `json:"alertColors"`
	BrandCompliant         bool                    `json:"brandCompliant"`
	AccessibilityCompliant bool                    `json:"accessibilityCompliant"`
}

// AlertColorConfiguration - Colors for different alert levels
type AlertColorConfiguration struct {
	SuccessColor  string `json:"successColor"`
	WarningColor  string `json:"warningColor"`
	ErrorColor    string `json:"errorColor"`
	InfoColor     string `json:"infoColor"`
	CriticalColor string `json:"criticalColor"`
}

// ResponsiveSettings - Responsive design settings
type ResponsiveSettings struct {
	BreakpointSmall  int  `json:"breakpointSmall"`  // pixels
	BreakpointMedium int  `json:"breakpointMedium"` // pixels
	BreakpointLarge  int  `json:"breakpointLarge"`  // pixels
	MobileOptimized  bool `json:"mobileOptimized"`
	TabletOptimized  bool `json:"tabletOptimized"`
	FlexibleLayout   bool `json:"flexibleLayout"`
	ResponsiveCharts bool `json:"responsiveCharts"`
}

// AnimationSettings - Animation configuration
type AnimationSettings struct {
	EnableAnimations    bool   `json:"enableAnimations"`
	AnimationDuration   int    `json:"animationDuration"` // milliseconds
	AnimationEasing     string `json:"animationEasing" validate:"oneof=linear ease ease_in ease_out ease_in_out"`
	LoadAnimation       bool   `json:"loadAnimation"`
	TransitionAnimation bool   `json:"transitionAnimation"`
	HoverEffects        bool   `json:"hoverEffects"`
	ReducedMotion       bool   `json:"reducedMotion"` // accessibility
}

// AnalyticsAlert - Alert generated from analytics data
type AnalyticsAlert struct {
	AlertID            uuid.UUID        `json:"alertId"`
	AlertType          string           `json:"alertType" validate:"oneof=threshold anomaly trend prediction quality performance"`
	Severity           string           `json:"severity" validate:"oneof=low medium high critical"`
	Title              string           `json:"title"`
	Description        string           `json:"description"`
	MetricAffected     string           `json:"metricAffected"`
	CurrentValue       float64          `json:"currentValue"`
	ThresholdValue     float64          `json:"thresholdValue,omitempty"`
	TriggeredAt        time.Time        `json:"triggeredAt"`
	Status             string           `json:"status" validate:"oneof=active acknowledged resolved dismissed"`
	Priority           string           `json:"priority" validate:"oneof=low medium high urgent"`
	RecommendedActions []string         `json:"recommendedActions,omitempty"`
	EstimatedImpact    string           `json:"estimatedImpact" validate:"oneof=minimal low moderate high severe"`
	AutoResolve        bool             `json:"autoResolve"`
	EscalationRules    []EscalationRule `json:"escalationRules,omitempty"`
}

// EscalationRule - Rules for alert escalation
type EscalationRule struct {
	EscalationLevel      int      `json:"escalationLevel"`
	TimeThreshold        int      `json:"timeThreshold"` // minutes
	NotificationChannels []string `json:"notificationChannels,omitempty"`
	AdditionalRecipients []string `json:"additionalRecipients,omitempty"`
	EscalationActions    []string `json:"escalationActions,omitempty"`
}

// ExportInfo - Information about data export capabilities
type ExportInfo struct {
	AvailableFormats []ExportFormat    `json:"availableFormats,omitempty"`
	ExportURL        string            `json:"exportUrl,omitempty"`
	ExportSize       int64             `json:"exportSize"`     // bytes
	GenerationTime   int64             `json:"generationTime"` // milliseconds
	ExpirationTime   time.Time         `json:"expirationTime,omitempty"`
	ScheduledExports []ScheduledExport `json:"scheduledExports,omitempty"`
	CustomTemplates  []ExportTemplate  `json:"customTemplates,omitempty"`
}

// ExportFormat - Available export format
type ExportFormat struct {
	FormatType       string                 `json:"formatType" validate:"oneof=json csv excel pdf png svg"`
	FormatName       string                 `json:"formatName"`
	Description      string                 `json:"description,omitempty"`
	Compression      bool                   `json:"compression"`
	MaxSize          int64                  `json:"maxSize,omitempty"` // bytes
	CustomOptions    map[string]interface{} `json:"customOptions,omitempty"`
	RequiresTemplate bool                   `json:"requiresTemplate"`
}

// ScheduledExport - Scheduled export configuration
type ScheduledExport struct {
	ExportID       uuid.UUID `json:"exportId"`
	ExportName     string    `json:"exportName"`
	Schedule       string    `json:"schedule"` // cron expression
	Format         string    `json:"format"`
	Recipients     []string  `json:"recipients,omitempty"`
	LastGenerated  time.Time `json:"lastGenerated,omitempty"`
	NextGeneration time.Time `json:"nextGeneration"`
	Status         string    `json:"status" validate:"oneof=active paused error"`
	RetentionDays  int       `json:"retentionDays"`
}

// ExportTemplate - Custom export template
type ExportTemplate struct {
	TemplateID     uuid.UUID         `json:"templateId"`
	TemplateName   string            `json:"templateName"`
	TemplateType   string            `json:"templateType" validate:"oneof=report dashboard summary executive technical"`
	Format         string            `json:"format"`
	Sections       []TemplateSection `json:"sections,omitempty"`
	CustomBranding bool              `json:"customBranding"`
	CreatedBy      uuid.UUID         `json:"createdBy"`
	CreatedAt      time.Time         `json:"createdAt"`
	LastModified   time.Time         `json:"lastModified"`
}

// TemplateSection - Section within an export template
type TemplateSection struct {
	SectionID    string                 `json:"sectionId"`
	SectionTitle string                 `json:"sectionTitle"`
	SectionType  string                 `json:"sectionType" validate:"oneof=summary chart table text metrics"`
	DataSource   string                 `json:"dataSource"`
	Position     int                    `json:"position"`
	Visible      bool                   `json:"visible"`
	Formatting   map[string]interface{} `json:"formatting,omitempty"`
}
