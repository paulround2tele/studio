// File: backend/internal/models/advanced_analytics_part2.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 1: ADVANCED ANALYTICS CONTINUATION
// Performance KPIs, Stealth Analytics, Resource Analytics, and Visualization
// ===============================================================================

// PerformanceKPIData - Key Performance Indicators for enterprise operations
type PerformanceKPIData struct {
	OverallPerformanceScore float64               `json:"overallPerformanceScore"` // 0-100
	OperationalKPIs         *OperationalKPIs      `json:"operationalKPIs,omitempty"`
	BusinessKPIs            *BusinessKPIs         `json:"businessKPIs,omitempty"`
	TechnicalKPIs           *TechnicalKPIs        `json:"technicalKPIs,omitempty"`
	UserExperienceKPIs      *UserExperienceKPIs   `json:"userExperienceKPIs,omitempty"`
	KPITrends               []KPITrendPoint       `json:"kpiTrends,omitempty"`
	BenchmarkComparisons    []BenchmarkComparison `json:"benchmarkComparisons,omitempty"`
}

// OperationalKPIs - Core operational performance indicators
type OperationalKPIs struct {
	AverageProcessingTime int64   `json:"averageProcessingTime"` // milliseconds
	ThroughputRate        float64 `json:"throughputRate"`        // operations/hour
	SystemUptime          float64 `json:"systemUptime"`          // percentage
	ErrorRate             float64 `json:"errorRate"`             // percentage
	SuccessRate           float64 `json:"successRate"`           // percentage
	ResourceUtilization   float64 `json:"resourceUtilization"`   // percentage
	ConcurrentOperations  int64   `json:"concurrentOperations"`  // count
	QueueLength           int64   `json:"queueLength"`           // count
	ProcessingEfficiency  float64 `json:"processingEfficiency"`  // percentage
}

// BusinessKPIs - Business-focused performance indicators
type BusinessKPIs struct {
	LeadGenerationRate      float64 `json:"leadGenerationRate"`      // leads/hour
	LeadQualityScore        float64 `json:"leadQualityScore"`        // 0-100
	ConversionRate          float64 `json:"conversionRate"`          // percentage
	CostPerLead             float64 `json:"costPerLead"`             // currency
	RevenuePerOperation     float64 `json:"revenuePerOperation"`     // currency
	CustomerAcquisitionCost float64 `json:"customerAcquisitionCost"` // currency
	CustomerLifetimeValue   float64 `json:"customerLifetimeValue"`   // currency
	MarketPenetrationRate   float64 `json:"marketPenetrationRate"`   // percentage
	CompetitiveAdvantage    float64 `json:"competitiveAdvantage"`    // score 0-100
}

// TechnicalKPIs - Technical performance indicators
type TechnicalKPIs struct {
	SystemReliability    float64 `json:"systemReliability"`    // percentage
	DataIntegrity        float64 `json:"dataIntegrity"`        // percentage
	SecurityScore        float64 `json:"securityScore"`        // 0-100
	ScalabilityIndex     float64 `json:"scalabilityIndex"`     // 0-100
	InfrastructureHealth float64 `json:"infrastructureHealth"` // 0-100
	CodeQuality          float64 `json:"codeQuality"`          // 0-100
	TestCoverage         float64 `json:"testCoverage"`         // percentage
	DeploymentSuccess    float64 `json:"deploymentSuccess"`    // percentage
	MeanTimeToRecovery   int64   `json:"meanTimeToRecovery"`   // minutes
}

// UserExperienceKPIs - User experience and satisfaction metrics
type UserExperienceKPIs struct {
	UserSatisfactionScore   float64 `json:"userSatisfactionScore"`   // 0-100
	SystemResponsiveness    float64 `json:"systemResponsiveness"`    // 0-100
	InterfaceUsability      float64 `json:"interfaceUsability"`      // 0-100
	FeatureAdoptionRate     float64 `json:"featureAdoptionRate"`     // percentage
	UserRetentionRate       float64 `json:"userRetentionRate"`       // percentage
	SupportTicketResolution int64   `json:"supportTicketResolution"` // hours
	UserEngagementScore     float64 `json:"userEngagementScore"`     // 0-100
}

// KPITrendPoint - KPI performance over time
type KPITrendPoint struct {
	Timestamp           time.Time `json:"timestamp"`
	OverallScore        float64   `json:"overallScore"`        // 0-100
	OperationalScore    float64   `json:"operationalScore"`    // 0-100
	BusinessScore       float64   `json:"businessScore"`       // 0-100
	TechnicalScore      float64   `json:"technicalScore"`      // 0-100
	UserExperienceScore float64   `json:"userExperienceScore"` // 0-100
	TrendDirection      string    `json:"trendDirection" validate:"oneof=improving stable declining"`
}

// BenchmarkComparison - Performance against industry benchmarks
type BenchmarkComparison struct {
	BenchmarkName       string  `json:"benchmarkName"` // "industry_average", "top_quartile", "best_in_class"
	MetricName          string  `json:"metricName"`
	CurrentValue        float64 `json:"currentValue"`
	BenchmarkValue      float64 `json:"benchmarkValue"`
	PerformanceGap      float64 `json:"performanceGap"` // positive = above benchmark
	Percentile          int     `json:"percentile"`     // 1-100
	CompetitivePosition string  `json:"competitivePosition" validate:"oneof=leader strong_performer average underperformer"`
}

// StealthAnalyticsData - Advanced stealth operation analytics
type StealthAnalyticsData struct {
	OverallStealthScore    float64                   `json:"overallStealthScore"` // 0-1 (lower is better)
	DetectionRiskAnalysis  *DetectionRiskAnalysis    `json:"detectionRiskAnalysis,omitempty"`
	StealthTechniques      []StealthTechniqueMetrics `json:"stealthTechniques,omitempty"`
	AnonymityMetrics       *AnonymityMetrics         `json:"anonymityMetrics,omitempty"`
	CountermeasureAnalysis []CountermeasureAnalysis  `json:"countermeasureAnalysis,omitempty"`
	StealthTrendAnalysis   []StealthTrendPoint       `json:"stealthTrendAnalysis,omitempty"`
	ComplianceWithPolicies *StealthComplianceData    `json:"complianceWithPolicies,omitempty"`
}

// DetectionRiskAnalysis - Analysis of detection risks and mitigation
type DetectionRiskAnalysis struct {
	CurrentRiskLevel        string               `json:"currentRiskLevel" validate:"oneof=minimal low medium high critical"`
	RiskScore               float64              `json:"riskScore"` // 0-1
	RiskFactors             []RiskFactor         `json:"riskFactors,omitempty"`
	MitigationStrategies    []MitigationStrategy `json:"mitigationStrategies,omitempty"`
	RiskTrendDirection      string               `json:"riskTrendDirection" validate:"oneof=decreasing stable increasing"`
	LastDetectionIncident   *time.Time           `json:"lastDetectionIncident,omitempty"`
	TimeToDetectionEstimate int64                `json:"timeToDetectionEstimate"` // hours
}

// RiskFactor - Individual risk factors for detection
type RiskFactor struct {
	FactorName       string  `json:"factorName"`       // "ip_reputation", "request_patterns", "timing_analysis"
	RiskContribution float64 `json:"riskContribution"` // 0-1
	Severity         string  `json:"severity" validate:"oneof=low medium high critical"`
	Detectability    float64 `json:"detectability"` // 0-1
	Mitigation       string  `json:"mitigation"`
	Status           string  `json:"status" validate:"oneof=mitigated monitored active escalating"`
}

// MitigationStrategy - Strategies to reduce detection risk
type MitigationStrategy struct {
	StrategyName        string  `json:"strategyName"`  // "proxy_rotation", "timing_randomization", "user_agent_diversity"
	Effectiveness       float64 `json:"effectiveness"` // 0-1
	ImplementationCost  string  `json:"implementationCost" validate:"oneof=low medium high"`
	ResourceRequirement string  `json:"resourceRequirement" validate:"oneof=minimal moderate intensive"`
	RiskReduction       float64 `json:"riskReduction"` // 0-1
	IsActive            bool    `json:"isActive"`
	Description         string  `json:"description"`
}

// StealthTechniqueMetrics - Performance metrics for individual stealth techniques
type StealthTechniqueMetrics struct {
	TechniqueName      string  `json:"techniqueName"`      // "proxy_rotation", "user_agent_spoofing", "timing_obfuscation"
	EffectivenessScore float64 `json:"effectivenessScore"` // 0-1
	DetectionEvaded    int64   `json:"detectionEvaded"`    // count
	SuccessRate        float64 `json:"successRate"`        // percentage
	ResourceCost       float64 `json:"resourceCost"`       // relative cost 0-1
	ConfigurationScore float64 `json:"configurationScore"` // 0-1
	AdaptabilityScore  float64 `json:"adaptabilityScore"`  // 0-1
}

// AnonymityMetrics - Metrics for anonymity and privacy protection
type AnonymityMetrics struct {
	AnonymitySet              int64   `json:"anonymitySet"`              // size of anonymity set
	EntropyScore              float64 `json:"entropyScore"`              // information theory entropy
	UnlinkabilityScore        float64 `json:"unlinkabilityScore"`        // 0-1
	UnobservabilityScore      float64 `json:"unobservabilityScore"`      // 0-1
	PseudonymityScore         float64 `json:"pseudonymityScore"`         // 0-1
	TrafficAnalysisResistance float64 `json:"trafficAnalysisResistance"` // 0-1
}

// CountermeasureAnalysis - Analysis of deployed countermeasures
type CountermeasureAnalysis struct {
	CountermeasureName  string  `json:"countermeasureName"` // "rate_limiting_bypass", "captcha_solving", "fingerprint_masking"
	DeploymentStatus    string  `json:"deploymentStatus" validate:"oneof=active inactive testing deprecated"`
	EffectivenessRating float64 `json:"effectivenessRating"` // 0-1
	BypassSuccessRate   float64 `json:"bypassSuccessRate"`   // percentage
	ResourceUtilization float64 `json:"resourceUtilization"` // percentage
	MaintenanceRequired bool    `json:"maintenanceRequired"`
	UpdateFrequency     string  `json:"updateFrequency" validate:"oneof=realtime hourly daily weekly monthly"`
}

// StealthTrendPoint - Stealth performance trends over time
type StealthTrendPoint struct {
	Timestamp             time.Time `json:"timestamp"`
	StealthScore          float64   `json:"stealthScore"`       // 0-1
	DetectionEvents       int64     `json:"detectionEvents"`    // count
	SuccessfulEvasions    int64     `json:"successfulEvasions"` // count
	RiskLevel             string    `json:"riskLevel" validate:"oneof=minimal low medium high critical"`
	ActiveCountermeasures int       `json:"activeCountermeasures"` // count
}

// StealthComplianceData - Compliance with stealth operation policies
type StealthComplianceData struct {
	PolicyComplianceScore float64                      `json:"policyComplianceScore"` // 0-100
	EthicalGuidelineScore float64                      `json:"ethicalGuidelineScore"` // 0-100
	LegalComplianceScore  float64                      `json:"legalComplianceScore"`  // 0-100
	ComplianceViolations  []StealthComplianceViolation `json:"complianceViolations,omitempty"`
	AuditTrail            []StealthAuditEntry          `json:"auditTrail,omitempty"`
}

// StealthComplianceViolation - Record of compliance violations
type StealthComplianceViolation struct {
	ViolationType     string     `json:"violationType"` // "rate_limit_exceeded", "ethical_boundary", "legal_constraint"
	Severity          string     `json:"severity" validate:"oneof=low medium high critical"`
	Description       string     `json:"description"`
	Timestamp         time.Time  `json:"timestamp"`
	Resolution        string     `json:"resolution,omitempty"`
	ResolutionTime    *time.Time `json:"resolutionTime,omitempty"`
	PreventiveMeasure string     `json:"preventiveMeasure,omitempty"`
}

// StealthAuditEntry - Stealth operation audit trail entry
type StealthAuditEntry struct {
	Timestamp     time.Time `json:"timestamp"`
	Operation     string    `json:"operation"` // "stealth_config_change", "countermeasure_activation"
	UserID        uuid.UUID `json:"userId"`
	Description   string    `json:"description"`
	RiskImpact    string    `json:"riskImpact" validate:"oneof=none minimal moderate significant high"`
	Justification string    `json:"justification"`
}

// ResourceAnalyticsData - Advanced resource management analytics
type ResourceAnalyticsData struct {
	ResourceUtilizationSummary *ResourceUtilizationSummary `json:"resourceUtilizationSummary,omitempty"`
	CapacityPlanningData       *CapacityPlanningData       `json:"capacityPlanningData,omitempty"`
	ResourceOptimization       *ResourceOptimizationData   `json:"resourceOptimization,omitempty"`
	CostAnalysis               *ResourceCostAnalysis       `json:"costAnalysis,omitempty"`
	PerformanceCorrelation     *ResourcePerformanceData    `json:"performanceCorrelation,omitempty"`
	AllocationRecommendations  []ResourceAllocationRec     `json:"allocationRecommendations,omitempty"`
}

// ResourceUtilizationSummary - Summary of resource utilization across all systems
type ResourceUtilizationSummary struct {
	CPUUtilization      ResourceUtilizationDetail `json:"cpuUtilization"`
	MemoryUtilization   ResourceUtilizationDetail `json:"memoryUtilization"`
	NetworkUtilization  ResourceUtilizationDetail `json:"networkUtilization"`
	StorageUtilization  ResourceUtilizationDetail `json:"storageUtilization"`
	ProxyUtilization    ResourceUtilizationDetail `json:"proxyUtilization"`
	DatabaseUtilization ResourceUtilizationDetail `json:"databaseUtilization"`
}

// ResourceUtilizationDetail - Detailed utilization metrics for a resource type
type ResourceUtilizationDetail struct {
	CurrentUsage     float64                     `json:"currentUsage"` // percentage
	PeakUsage        float64                     `json:"peakUsage"`    // percentage
	AverageUsage     float64                     `json:"averageUsage"` // percentage
	UtilizationTrend string                      `json:"utilizationTrend" validate:"oneof=increasing stable decreasing"`
	EfficiencyScore  float64                     `json:"efficiencyScore"` // 0-100
	BottleneckRisk   string                      `json:"bottleneckRisk" validate:"oneof=low medium high critical"`
	UsageHistory     []ResourceUsageHistoryPoint `json:"usageHistory,omitempty"`
}

// ResourceUsageHistoryPoint - Historical resource usage data point
type ResourceUsageHistoryPoint struct {
	Timestamp  time.Time `json:"timestamp"`
	Usage      float64   `json:"usage"`      // percentage
	Efficiency float64   `json:"efficiency"` // 0-100
	Cost       float64   `json:"cost"`       // currency units
}

// CapacityPlanningData - Future capacity planning and forecasting
type CapacityPlanningData struct {
	CurrentCapacity        ResourceCapacitySnapshot `json:"currentCapacity"`
	ForecastedRequirements []CapacityForecast       `json:"forecastedRequirements,omitempty"`
	ScalingRecommendations []CapacityScalingRec     `json:"scalingRecommendations,omitempty"`
	CapacityConstraints    []CapacityConstraint     `json:"capacityConstraints,omitempty"`
	InvestmentRequirements []CapacityInvestment     `json:"investmentRequirements,omitempty"`
}

// ResourceCapacitySnapshot - Current capacity across all resource types
type ResourceCapacitySnapshot struct {
	TotalCPUCores        int64   `json:"totalCPUCores"`
	TotalMemoryGB        float64 `json:"totalMemoryGB"`
	TotalStorageGB       float64 `json:"totalStorageGB"`
	NetworkBandwidthMbps float64 `json:"networkBandwidthMbps"`
	ActiveProxies        int64   `json:"activeProxies"`
	DatabaseConnections  int64   `json:"databaseConnections"`
	UtilizationRate      float64 `json:"utilizationRate"` // percentage
}

// CapacityForecast - Forecasted capacity requirements
type CapacityForecast struct {
	ForecastDate     time.Time                `json:"forecastDate"`
	PredictedLoad    float64                  `json:"predictedLoad"` // percentage increase
	RequiredCapacity ResourceCapacitySnapshot `json:"requiredCapacity"`
	ConfidenceLevel  float64                  `json:"confidenceLevel"` // percentage
	GrowthDrivers    []string                 `json:"growthDrivers,omitempty"`
	SeasonalFactors  float64                  `json:"seasonalFactors"` // multiplier
}

// CapacityScalingRec - Capacity scaling recommendations
type CapacityScalingRec struct {
	ResourceType        string  `json:"resourceType"`        // "cpu", "memory", "storage", "network", "proxy", "database"
	CurrentCapacity     float64 `json:"currentCapacity"`     // current units
	RecommendedCapacity float64 `json:"recommendedCapacity"` // recommended units
	ScalingTimeframe    string  `json:"scalingTimeframe"`    // "immediate", "1_week", "1_month", "1_quarter"
	EstimatedCost       float64 `json:"estimatedCost"`       // currency
	BusinessImpact      string  `json:"businessImpact"`      // description
	Priority            string  `json:"priority" validate:"oneof=low medium high critical"`
}

// CapacityConstraint - Constraints affecting capacity planning
type CapacityConstraint struct {
	ConstraintType string  `json:"constraintType"` // "budget", "physical", "technical", "regulatory"
	Description    string  `json:"description"`
	ImpactSeverity string  `json:"impactSeverity" validate:"oneof=low medium high critical"`
	Workaround     string  `json:"workaround,omitempty"`
	ResolutionCost float64 `json:"resolutionCost,omitempty"` // currency
	TimeToResolve  int     `json:"timeToResolve,omitempty"`  // days
}

// CapacityInvestment - Investment requirements for capacity expansion
type CapacityInvestment struct {
	InvestmentType        string   `json:"investmentType"` // "hardware", "software", "infrastructure", "personnel"
	RequiredAmount        float64  `json:"requiredAmount"` // currency
	ExpectedROI           float64  `json:"expectedROI"`    // percentage
	PaybackPeriod         int      `json:"paybackPeriod"`  // months
	RiskLevel             string   `json:"riskLevel" validate:"oneof=low medium high"`
	BusinessJustification string   `json:"businessJustification"`
	AlternativeOptions    []string `json:"alternativeOptions,omitempty"`
}

// ResourceOptimizationData - Resource optimization opportunities and recommendations
type ResourceOptimizationData struct {
	OptimizationScore        float64                     `json:"optimizationScore"` // 0-100
	ImprovementOpportunities []ResourceImprovementOpp    `json:"improvementOpportunities,omitempty"`
	EfficiencyMetrics        *ResourceEfficiencyMetrics  `json:"efficiencyMetrics,omitempty"`
	OptimizationHistory      []ResourceOptimizationEvent `json:"optimizationHistory,omitempty"`
	AutomationOpportunities  []ResourceAutomationOpp     `json:"automationOpportunities,omitempty"`
}

// ResourceImprovementOpp - Resource improvement opportunity
type ResourceImprovementOpp struct {
	OpportunityType    string   `json:"opportunityType"` // "consolidation", "rightsizing", "scheduling", "caching"
	Description        string   `json:"description"`
	ExpectedSavings    float64  `json:"expectedSavings"`    // percentage or currency
	ImplementationCost float64  `json:"implementationCost"` // currency
	ImplementationTime int      `json:"implementationTime"` // days
	RiskLevel          string   `json:"riskLevel" validate:"oneof=low medium high"`
	Priority           string   `json:"priority" validate:"oneof=low medium high critical"`
	Dependencies       []string `json:"dependencies,omitempty"`
}

// ResourceEfficiencyMetrics - Efficiency metrics for resource usage
type ResourceEfficiencyMetrics struct {
	OverallEfficiency     float64 `json:"overallEfficiency"`     // 0-100
	CPUEfficiency         float64 `json:"cpuEfficiency"`         // 0-100
	MemoryEfficiency      float64 `json:"memoryEfficiency"`      // 0-100
	NetworkEfficiency     float64 `json:"networkEfficiency"`     // 0-100
	StorageEfficiency     float64 `json:"storageEfficiency"`     // 0-100
	CostEfficiency        float64 `json:"costEfficiency"`        // 0-100
	WasteReduction        float64 `json:"wasteReduction"`        // percentage
	OptimizationPotential float64 `json:"optimizationPotential"` // percentage
}

// ResourceOptimizationEvent - Historical resource optimization events
type ResourceOptimizationEvent struct {
	Timestamp         time.Time `json:"timestamp"`
	OptimizationType  string    `json:"optimizationType"` // "consolidation", "rightsizing", "automation"
	ResourcesAffected []string  `json:"resourcesAffected,omitempty"`
	PerformanceImpact string    `json:"performanceImpact"` // "positive", "neutral", "negative"
	CostImpact        float64   `json:"costImpact"`        // currency (positive = savings)
	EfficiencyGain    float64   `json:"efficiencyGain"`    // percentage
	Description       string    `json:"description"`
}

// ResourceAutomationOpp - Automation opportunities for resource management
type ResourceAutomationOpp struct {
	AutomationType        string   `json:"automationType"` // "scaling", "optimization", "monitoring", "allocation"
	Description           string   `json:"description"`
	ExpectedBenefit       string   `json:"expectedBenefit"`
	ComplexityLevel       string   `json:"complexityLevel" validate:"oneof=low medium high"`
	DevelopmentEffort     int      `json:"developmentEffort"`   // person-days
	MaintenanceOverhead   float64  `json:"maintenanceOverhead"` // percentage of development effort
	ROIEstimate           float64  `json:"roiEstimate"`         // percentage
	TechnicalRequirements []string `json:"technicalRequirements,omitempty"`
}

// ResourceCostAnalysis - Cost analysis for resource utilization
type ResourceCostAnalysis struct {
	TotalCost             float64                   `json:"totalCost"` // currency
	CostBreakdown         ResourceCostBreakdown     `json:"costBreakdown"`
	CostTrends            []ResourceCostTrendPoint  `json:"costTrends,omitempty"`
	CostOptimization      *ResourceCostOptimization `json:"costOptimization,omitempty"`
	BudgetAnalysis        *ResourceBudgetAnalysis   `json:"budgetAnalysis,omitempty"`
	CostEfficiencyMetrics *CostEfficiencyMetrics    `json:"costEfficiencyMetrics,omitempty"`
}

// ResourceCostBreakdown - Breakdown of costs by resource type
type ResourceCostBreakdown struct {
	CPUCosts         float64 `json:"cpuCosts"`         // currency
	MemoryCosts      float64 `json:"memoryCosts"`      // currency
	StorageCosts     float64 `json:"storageCosts"`     // currency
	NetworkCosts     float64 `json:"networkCosts"`     // currency
	ProxyCosts       float64 `json:"proxyCosts"`       // currency
	DatabaseCosts    float64 `json:"databaseCosts"`    // currency
	LicensingCosts   float64 `json:"licensingCosts"`   // currency
	OperationalCosts float64 `json:"operationalCosts"` // currency
}

// ResourceCostTrendPoint - Cost trends over time
type ResourceCostTrendPoint struct {
	Timestamp         time.Time `json:"timestamp"`
	TotalCost         float64   `json:"totalCost"`         // currency
	CostPerOperation  float64   `json:"costPerOperation"`  // currency
	CostEfficiency    float64   `json:"costEfficiency"`    // 0-100
	BudgetUtilization float64   `json:"budgetUtilization"` // percentage
}

// ResourceCostOptimization - Cost optimization strategies and results
type ResourceCostOptimization struct {
	CurrentMonthlySpend      float64                    `json:"currentMonthlySpend"`     // currency
	PotentialMonthlySavings  float64                    `json:"potentialMonthlySavings"` // currency
	OptimizationStrategies   []CostOptimizationStrategy `json:"optimizationStrategies,omitempty"`
	ImplementedOptimizations []ImplementedOptimization  `json:"implementedOptimizations,omitempty"`
	SavingsToDate            float64                    `json:"savingsToDate"` // currency
}

// CostOptimizationStrategy - Individual cost optimization strategy
type CostOptimizationStrategy struct {
	StrategyName         string   `json:"strategyName"` // "rightsizing", "reserved_instances", "spot_instances"
	Description          string   `json:"description"`
	EstimatedSavings     float64  `json:"estimatedSavings"` // currency per month
	ImplementationEffort string   `json:"implementationEffort" validate:"oneof=low medium high"`
	RiskLevel            string   `json:"riskLevel" validate:"oneof=low medium high"`
	TimeToImplement      int      `json:"timeToImplement"` // days
	Prerequisites        []string `json:"prerequisites,omitempty"`
}

// ImplementedOptimization - Record of implemented cost optimizations
type ImplementedOptimization struct {
	OptimizationName    string    `json:"optimizationName"`
	ImplementationDate  time.Time `json:"implementationDate"`
	ActualSavings       float64   `json:"actualSavings"`   // currency per month
	ExpectedSavings     float64   `json:"expectedSavings"` // currency per month
	PerformanceImpact   string    `json:"performanceImpact" validate:"oneof=positive neutral negative"`
	MaintenanceRequired bool      `json:"maintenanceRequired"`
	Description         string    `json:"description"`
}

// ResourceBudgetAnalysis - Budget analysis for resource spending
type ResourceBudgetAnalysis struct {
	AllocatedBudget   float64       `json:"allocatedBudget"`   // currency
	SpentToDate       float64       `json:"spentToDate"`       // currency
	RemainingBudget   float64       `json:"remainingBudget"`   // currency
	BurnRate          float64       `json:"burnRate"`          // currency per day
	ForecastedSpend   float64       `json:"forecastedSpend"`   // currency (total for period)
	BudgetUtilization float64       `json:"budgetUtilization"` // percentage
	VarianceFromPlan  float64       `json:"varianceFromPlan"`  // currency (positive = under budget)
	BudgetAlerts      []BudgetAlert `json:"budgetAlerts,omitempty"`
}

// BudgetAlert - Budget-related alerts and warnings
type BudgetAlert struct {
	AlertType      string    `json:"alertType" validate:"oneof=approaching_limit exceeded_budget unusual_spend trend_change"`
	Severity       string    `json:"severity" validate:"oneof=low medium high critical"`
	Description    string    `json:"description"`
	Timestamp      time.Time `json:"timestamp"`
	Threshold      float64   `json:"threshold"`    // currency or percentage
	CurrentValue   float64   `json:"currentValue"` // currency or percentage
	Recommendation string    `json:"recommendation,omitempty"`
}

// ResourcePerformanceData - Correlation between resource usage and performance
type ResourcePerformanceData struct {
	PerformanceCorrelations []ResourcePerformanceCorrelation `json:"performanceCorrelations,omitempty"`
	OptimalResourceLevels   *OptimalResourceLevels           `json:"optimalResourceLevels,omitempty"`
	PerformanceBottlenecks  []PerformanceBottleneck          `json:"performanceBottlenecks,omitempty"`
	ScalingImpactAnalysis   *ScalingImpactAnalysis           `json:"scalingImpactAnalysis,omitempty"`
}

// ResourcePerformanceCorrelation - Correlation between resource usage and performance metrics
type ResourcePerformanceCorrelation struct {
	ResourceType        string        `json:"resourceType"`      // "cpu", "memory", "network", "storage"
	PerformanceMetric   string        `json:"performanceMetric"` // "response_time", "throughput", "error_rate"
	CorrelationCoeff    float64       `json:"correlationCoeff"`  // -1 to 1
	CorrelationStrength string        `json:"correlationStrength" validate:"oneof=weak moderate strong very_strong"`
	OptimalRange        ResourceRange `json:"optimalRange"`
	Description         string        `json:"description"`
}

// ResourceRange - Optimal range for resource utilization
type ResourceRange struct {
	MinValue     float64 `json:"minValue"`     // percentage
	MaxValue     float64 `json:"maxValue"`     // percentage
	OptimalValue float64 `json:"optimalValue"` // percentage
}

// OptimalResourceLevels - Optimal resource levels for different scenarios
type OptimalResourceLevels struct {
	NormalOperations OptimalLevels `json:"normalOperations"`
	PeakLoad         OptimalLevels `json:"peakLoad"`
	LowLoad          OptimalLevels `json:"lowLoad"`
	HighVolume       OptimalLevels `json:"highVolume"`
}

// OptimalLevels - Optimal resource levels for a specific scenario
type OptimalLevels struct {
	CPUTarget      float64 `json:"cpuTarget"`      // percentage
	MemoryTarget   float64 `json:"memoryTarget"`   // percentage
	NetworkTarget  float64 `json:"networkTarget"`  // percentage
	StorageTarget  float64 `json:"storageTarget"`  // percentage
	ProxyTarget    int64   `json:"proxyTarget"`    // count
	DatabaseTarget int64   `json:"databaseTarget"` // connections
}

// PerformanceBottleneck - Identified performance bottlenecks related to resources
type PerformanceBottleneck struct {
	BottleneckType    string  `json:"bottleneckType"` // "cpu_bound", "memory_bound", "io_bound", "network_bound"
	Severity          string  `json:"severity" validate:"oneof=low medium high critical"`
	ImpactOnPerf      float64 `json:"impactOnPerf"`      // percentage impact
	ResourceThreshold float64 `json:"resourceThreshold"` // threshold where bottleneck occurs
	Mitigation        string  `json:"mitigation"`
	EstimatedFix      string  `json:"estimatedFix"`
}

// ScalingImpactAnalysis - Analysis of scaling impact on performance
type ScalingImpactAnalysis struct {
	ScalingEfficiency      float64                 `json:"scalingEfficiency"`  // 0-1
	LinearScalingRange     ResourceRange           `json:"linearScalingRange"` // range where scaling is linear
	DiminishingReturns     float64                 `json:"diminishingReturns"` // threshold where returns diminish
	ScalingRecommendations []ScalingRecommendation `json:"scalingRecommendations,omitempty"`
	OptimalScalingPoints   []OptimalScalingPoint   `json:"optimalScalingPoints,omitempty"`
}

// OptimalScalingPoint - Optimal points for resource scaling
type OptimalScalingPoint struct {
	LoadLevel           float64 `json:"loadLevel"`           // percentage
	RecommendedCapacity float64 `json:"recommendedCapacity"` // percentage
	ExpectedPerformance float64 `json:"expectedPerformance"` // relative performance
	CostEfficiency      float64 `json:"costEfficiency"`      // cost per performance unit
}

// ResourceAllocationRec - Resource allocation recommendations
type ResourceAllocationRec struct {
	RecommendationType string                    `json:"recommendationType"` // "immediate", "scheduled", "conditional", "optimization"
	Priority           string                    `json:"priority" validate:"oneof=low medium high critical"`
	ResourceChanges    []ResourceChange          `json:"resourceChanges,omitempty"`
	ExpectedBenefit    string                    `json:"expectedBenefit"`
	ImplementationTime int                       `json:"implementationTime"` // minutes
	RiskAssessment     string                    `json:"riskAssessment" validate:"oneof=low medium high"`
	Conditions         []string                  `json:"conditions,omitempty"` // conditions for implementation
	Monitoring         *RecommendationMonitoring `json:"monitoring,omitempty"`
}

// ResourceChange - Specific resource change recommendation
type ResourceChange struct {
	ResourceType     string  `json:"resourceType"` // "cpu", "memory", "storage", "network", "proxy"
	ChangeType       string  `json:"changeType" validate:"oneof=increase decrease maintain optimize"`
	CurrentValue     float64 `json:"currentValue"`     // current allocation
	RecommendedValue float64 `json:"recommendedValue"` // recommended allocation
	Justification    string  `json:"justification"`
	ExpectedImpact   string  `json:"expectedImpact"`
}

// RecommendationMonitoring - Monitoring plan for resource allocation recommendations
type RecommendationMonitoring struct {
	MonitoringPeriod int      `json:"monitoringPeriod"` // hours
	KeyMetrics       []string `json:"keyMetrics,omitempty"`
	SuccessCriteria  []string `json:"successCriteria,omitempty"`
	RollbackTriggers []string `json:"rollbackTriggers,omitempty"`
	ReviewSchedule   string   `json:"reviewSchedule"` // "hourly", "daily", "weekly"
}
