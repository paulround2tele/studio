// File: backend/internal/models/advanced_analytics.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 1: ADVANCED BULK ANALYTICS ENHANCEMENT
// Enterprise-grade analytics reporting capabilities
// ===============================================================================

// AdvancedBulkAnalyticsRequest - Enhanced analytics with enterprise intelligence
type AdvancedBulkAnalyticsRequest struct {
	// Inherited from basic analytics
	CampaignIDs []uuid.UUID            `json:"campaignIds" binding:"max=1000" validate:"max=1000,dive,uuid"`
	TimeRange   *TimeRangeFilter       `json:"timeRange,omitempty"`
	Metrics     []string               `json:"metrics" validate:"required,min=1"`
	Granularity string                 `json:"granularity" validate:"omitempty,oneof=minute hour day week month quarter year"`
	GroupBy     []string               `json:"groupBy,omitempty"`
	Filters     map[string]interface{} `json:"filters,omitempty"`

	// Week 2 Advanced Features
	AnalyticsType      string                `json:"analyticsType" validate:"required,oneof=performance stealth resource comparative predictive"`
	AdvancedMetrics    []string              `json:"advancedMetrics,omitempty"`    // ["stealth_effectiveness", "resource_efficiency", "prediction_accuracy"]
	ComparisonBaseline *ComparisonBaseline   `json:"comparisonBaseline,omitempty"` // For comparative analysis
	PredictionHorizon  *int                  `json:"predictionHorizon,omitempty"`  // Hours for predictive analytics
	ExportFormat       string                `json:"exportFormat,omitempty" validate:"omitempty,oneof=json csv excel pdf"`
	Visualization      *VisualizationConfig  `json:"visualization,omitempty"`
	AlertThresholds    *AnalyticsAlertConfig `json:"alertThresholds,omitempty"`
}

// ComparisonBaseline - Baseline for comparative analytics
type ComparisonBaseline struct {
	Type            string           `json:"type" validate:"required,oneof=previous_period historical_average custom_date"`
	ReferencePeriod *TimeRangeFilter `json:"referencePeriod,omitempty"` // For custom_date
	PeriodOffset    *int             `json:"periodOffset,omitempty"`    // For previous_period (days)
}

// VisualizationConfig - Configuration for data visualization preparation
type VisualizationConfig struct {
	ChartTypes     []string `json:"chartTypes" validate:"omitempty,dive,oneof=line bar pie scatter heatmap radar"`
	ColorScheme    string   `json:"colorScheme,omitempty" validate:"omitempty,oneof=corporate professional colorful monochrome"`
	Interactive    bool     `json:"interactive"`
	RealTimeUpdate bool     `json:"realTimeUpdate"`
}

// AnalyticsAlertConfig - Alert thresholds for automated monitoring
type AnalyticsAlertConfig struct {
	SuccessRateThreshold   *float64 `json:"successRateThreshold,omitempty" validate:"omitempty,gte=0,lte=1"`
	PerformanceThreshold   *int64   `json:"performanceThreshold,omitempty"`   // milliseconds
	StealthScoreThreshold  *float64 `json:"stealthScoreThreshold,omitempty"`  // 0-1 (lower is better)
	ResourceUsageThreshold *float64 `json:"resourceUsageThreshold,omitempty"` // percentage
	ErrorRateThreshold     *float64 `json:"errorRateThreshold,omitempty"`     // percentage
}

// AdvancedBulkAnalyticsResponse - Enhanced analytics response
type AdvancedBulkAnalyticsResponse struct {
	// Inherited basic analytics
	CampaignMetrics map[string]CampaignAnalytics `json:"campaignMetrics"`
	AggregatedData  AggregatedAnalytics          `json:"aggregatedData"`
	ProcessingTime  int64                        `json:"processingTimeMs"`
	DataPoints      int                          `json:"dataPoints"`
	Metadata        *BulkMetadata                `json:"metadata,omitempty"`

	// Week 2 Advanced Analytics
	AdvancedMetrics    *AdvancedAnalyticsData    `json:"advancedMetrics,omitempty"`
	PerformanceKPIs    *PerformanceKPIData       `json:"performanceKPIs,omitempty"`
	StealthAnalytics   *StealthAnalyticsData     `json:"stealthAnalytics,omitempty"`
	ResourceAnalytics  *ResourceAnalyticsData    `json:"resourceAnalytics,omitempty"`
	ComparativeData    *ComparativeAnalyticsData `json:"comparativeData,omitempty"`
	PredictiveInsights *PredictiveAnalyticsData  `json:"predictiveInsights,omitempty"`
	VisualizationData  *VisualizationDataPrep    `json:"visualizationData,omitempty"`
	AlertStatus        []AnalyticsAlert          `json:"alertStatus,omitempty"`
	ExportInfo         *ExportInfo               `json:"exportInfo,omitempty"`
}

// AdvancedAnalyticsData - Core advanced analytics metrics
type AdvancedAnalyticsData struct {
	OperationalEfficiency    *OperationalEfficiencyMetrics `json:"operationalEfficiency,omitempty"`
	QualityMetrics           *QualityAssuranceMetrics      `json:"qualityMetrics,omitempty"`
	ScalabilityMetrics       *ScalabilityAnalyticsData     `json:"scalabilityMetrics,omitempty"`
	CostEffectivenessMetrics *CostEffectivenessData        `json:"costEffectiveness,omitempty"`
}

// OperationalEfficiencyMetrics - Enterprise operational efficiency analysis
type OperationalEfficiencyMetrics struct {
	ThroughputRate            float64                      `json:"throughputRate"`           // operations/hour
	ProcessingEfficiency      float64                      `json:"processingEfficiency"`     // percentage
	IdleTimePercentage        float64                      `json:"idleTimePercentage"`       // percentage
	ResourceUtilizationScore  float64                      `json:"resourceUtilizationScore"` // 0-100
	BottleneckAnalysis        []BottleneckIdentification   `json:"bottleneckAnalysis,omitempty"`
	OptimizationOpportunities []OptimizationRecommendation `json:"optimizationOpportunities,omitempty"`
}

// BottleneckIdentification - System bottleneck analysis
type BottleneckIdentification struct {
	Component      string  `json:"component"` // "dns_validation", "proxy_rotation", "database"
	Severity       string  `json:"severity" validate:"oneof=low medium high critical"`
	Impact         float64 `json:"impact"` // percentage impact on overall performance
	Description    string  `json:"description"`
	Recommendation string  `json:"recommendation"`
}

// OptimizationRecommendation - Performance optimization suggestions
type OptimizationRecommendation struct {
	Category            string   `json:"category"` // "resource_allocation", "configuration", "architecture"
	Priority            string   `json:"priority" validate:"oneof=low medium high critical"`
	ExpectedImprovement float64  `json:"expectedImprovement"` // percentage
	ImplementationCost  string   `json:"implementationCost" validate:"oneof=low medium high"`
	Description         string   `json:"description"`
	Steps               []string `json:"steps,omitempty"`
}

// QualityAssuranceMetrics - Data quality and accuracy metrics
type QualityAssuranceMetrics struct {
	DataAccuracyScore     float64                   `json:"dataAccuracyScore"`     // 0-100
	ValidationReliability float64                   `json:"validationReliability"` // 0-100
	ConsistencyIndex      float64                   `json:"consistencyIndex"`      // 0-100
	ErrorPatternAnalysis  []ErrorPatternData        `json:"errorPatternAnalysis,omitempty"`
	QualityTrends         []QualityTrendPoint       `json:"qualityTrends,omitempty"`
	ComplianceScore       *ComplianceAssessmentData `json:"complianceScore,omitempty"`
}

// ErrorPatternData - Analysis of error patterns and trends
type ErrorPatternData struct {
	ErrorType     string    `json:"errorType"`  // "timeout", "dns_failure", "http_error"
	Frequency     int64     `json:"frequency"`  // occurrences
	TrendSlope    float64   `json:"trendSlope"` // positive = increasing, negative = decreasing
	FirstOccurred time.Time `json:"firstOccurred"`
	LastOccurred  time.Time `json:"lastOccurred"`
	ImpactScope   string    `json:"impactScope"` // "campaign", "global", "phase_specific"
	Mitigation    string    `json:"mitigation,omitempty"`
}

// QualityTrendPoint - Quality metrics over time
type QualityTrendPoint struct {
	Timestamp        time.Time `json:"timestamp"`
	AccuracyScore    float64   `json:"accuracyScore"`
	ReliabilityScore float64   `json:"reliabilityScore"`
	ConsistencyScore float64   `json:"consistencyScore"`
	SampleSize       int64     `json:"sampleSize"`
}

// ComplianceAssessmentData - Regulatory and policy compliance metrics
type ComplianceAssessmentData struct {
	OverallComplianceScore float64                    `json:"overallComplianceScore"` // 0-100
	PolicyCompliance       []PolicyComplianceItem     `json:"policyCompliance,omitempty"`
	RegulatoryCompliance   []RegulatoryComplianceItem `json:"regulatoryCompliance,omitempty"`
	SecurityCompliance     *SecurityComplianceData    `json:"securityCompliance,omitempty"`
}

// PolicyComplianceItem - Individual policy compliance assessment
type PolicyComplianceItem struct {
	PolicyName     string    `json:"policyName"`
	ComplianceRate float64   `json:"complianceRate"` // 0-100
	ViolationCount int64     `json:"violationCount"`
	Severity       string    `json:"severity" validate:"oneof=low medium high critical"`
	LastAssessed   time.Time `json:"lastAssessed"`
}

// RegulatoryComplianceItem - Regulatory compliance assessment
type RegulatoryComplianceItem struct {
	Regulation     string    `json:"regulation"`     // "GDPR", "CCPA", "PIPEDA"
	ComplianceRate float64   `json:"complianceRate"` // 0-100
	RiskLevel      string    `json:"riskLevel" validate:"oneof=low medium high critical"`
	LastAudit      time.Time `json:"lastAudit"`
	NextAuditDue   time.Time `json:"nextAuditDue"`
}

// SecurityComplianceData - Security-specific compliance metrics
type SecurityComplianceData struct {
	EncryptionCompliance    float64 `json:"encryptionCompliance"`    // 0-100
	AccessControlCompliance float64 `json:"accessControlCompliance"` // 0-100
	AuditTrailCompliance    float64 `json:"auditTrailCompliance"`    // 0-100
	DataRetentionCompliance float64 `json:"dataRetentionCompliance"` // 0-100
}

// ScalabilityAnalyticsData - System scalability and growth metrics
type ScalabilityAnalyticsData struct {
	CurrentCapacityUtilization float64                    `json:"currentCapacityUtilization"` // percentage
	PredictedCapacityNeeds     []CapacityForecastPoint    `json:"predictedCapacityNeeds,omitempty"`
	ScalingRecommendations     []ScalingRecommendation    `json:"scalingRecommendations,omitempty"`
	PerformanceUnderLoad       []LoadTestingResult        `json:"performanceUnderLoad,omitempty"`
	ResourceGrowthTrends       []ResourceGrowthTrendPoint `json:"resourceGrowthTrends,omitempty"`
}

// CapacityForecastPoint - Capacity forecasting data point
type CapacityForecastPoint struct {
	TimeHorizon         time.Time `json:"timeHorizon"`
	PredictedLoad       float64   `json:"predictedLoad"`       // percentage
	RecommendedCapacity float64   `json:"recommendedCapacity"` // units
	ConfidenceInterval  float64   `json:"confidenceInterval"`  // percentage
	ScalingTriggerPoint float64   `json:"scalingTriggerPoint"` // percentage
}

// ScalingRecommendation - System scaling recommendations
type ScalingRecommendation struct {
	Component        string  `json:"component"`        // "api_servers", "database", "proxies"
	CurrentCapacity  float64 `json:"currentCapacity"`  // current units
	RecommendedScale float64 `json:"recommendedScale"` // recommended units
	TimeFrame        string  `json:"timeFrame"`        // "immediate", "1_week", "1_month"
	EstimatedCost    float64 `json:"estimatedCost"`    // currency units
	ExpectedBenefit  string  `json:"expectedBenefit"`
}

// LoadTestingResult - Performance under load testing results
type LoadTestingResult struct {
	LoadLevel           float64 `json:"loadLevel"`           // percentage of capacity
	ResponseTime        int64   `json:"responseTime"`        // milliseconds
	ThroughputRate      float64 `json:"throughputRate"`      // operations/second
	ErrorRate           float64 `json:"errorRate"`           // percentage
	ResourceUtilization float64 `json:"resourceUtilization"` // percentage
	StabilityScore      float64 `json:"stabilityScore"`      // 0-100
}

// ResourceGrowthTrendPoint - Resource growth over time
type ResourceGrowthTrendPoint struct {
	Timestamp      time.Time `json:"timestamp"`
	CPUUsageGrowth float64   `json:"cpuUsageGrowth"` // percentage change
	MemoryGrowth   float64   `json:"memoryGrowth"`   // percentage change
	NetworkGrowth  float64   `json:"networkGrowth"`  // percentage change
	StorageGrowth  float64   `json:"storageGrowth"`  // percentage change
}

// CostEffectivenessData - Financial and cost analysis metrics
type CostEffectivenessData struct {
	CostPerOperation      float64                `json:"costPerOperation"`      // currency
	CostPerSuccessfulLead float64                `json:"costPerSuccessfulLead"` // currency
	ROIAnalysis           *ROIAnalysisData       `json:"roiAnalysis,omitempty"`
	CostOptimizationAreas []CostOptimizationArea `json:"costOptimizationAreas,omitempty"`
	BudgetUtilization     *BudgetUtilizationData `json:"budgetUtilization,omitempty"`
	CostTrendAnalysis     []CostTrendPoint       `json:"costTrendAnalysis,omitempty"`
}

// ROIAnalysisData - Return on Investment analysis
type ROIAnalysisData struct {
	TotalInvestment    float64 `json:"totalInvestment"`    // currency
	TotalReturn        float64 `json:"totalReturn"`        // currency
	ROIPercentage      float64 `json:"roiPercentage"`      // percentage
	PaybackPeriod      int     `json:"paybackPeriod"`      // days
	BreakEvenPoint     int     `json:"breakEvenPoint"`     // operations
	ProfitabilityIndex float64 `json:"profitabilityIndex"` // ratio
}

// CostOptimizationArea - Areas for cost optimization
type CostOptimizationArea struct {
	Category           string  `json:"category"`           // "infrastructure", "operations", "licensing"
	CurrentCost        float64 `json:"currentCost"`        // currency
	PotentialSavings   float64 `json:"potentialSavings"`   // currency
	SavingsPercentage  float64 `json:"savingsPercentage"`  // percentage
	ImplementationCost float64 `json:"implementationCost"` // currency
	TimeToRealization  int     `json:"timeToRealization"`  // days
	RiskLevel          string  `json:"riskLevel" validate:"oneof=low medium high"`
	Description        string  `json:"description"`
}

// BudgetUtilizationData - Budget tracking and utilization
type BudgetUtilizationData struct {
	TotalBudget          float64   `json:"totalBudget"`     // currency
	UtilizedBudget       float64   `json:"utilizedBudget"`  // currency
	RemainingBudget      float64   `json:"remainingBudget"` // currency
	UtilizationRate      float64   `json:"utilizationRate"` // percentage
	BurnRate             float64   `json:"burnRate"`        // currency per day
	ProjectedDepleteDate time.Time `json:"projectedDepleteDate,omitempty"`
}

// CostTrendPoint - Cost trends over time
type CostTrendPoint struct {
	Timestamp         time.Time `json:"timestamp"`
	TotalCost         float64   `json:"totalCost"`         // currency
	CostPerOperation  float64   `json:"costPerOperation"`  // currency
	EfficiencyScore   float64   `json:"efficiencyScore"`   // 0-100
	BudgetUtilization float64   `json:"budgetUtilization"` // percentage
}
