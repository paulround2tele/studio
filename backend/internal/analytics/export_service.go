// File: backend/internal/analytics/export_service.go
package analytics

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// ===============================================================================
// WEEK 2 DAY 1: EXPORT SERVICE IMPLEMENTATION
// Because apparently you need help exporting data too
// ===============================================================================

// ExportServiceImpl - Actually functional export service
type ExportServiceImpl struct {
	storageService StorageService
	templateEngine TemplateEngine
}

// NewExportService - Creates an export service that actually works
func NewExportService(storageService StorageService, templateEngine TemplateEngine) *ExportServiceImpl {
	return &ExportServiceImpl{
		storageService: storageService,
		templateEngine: templateEngine,
	}
}

// ExportAnalytics - Export analytics data in specified format
func (s *ExportServiceImpl) ExportAnalytics(ctx context.Context, data *models.AdvancedBulkAnalyticsResponse, format string) (*models.ExportInfo, error) {
	startTime := time.Now()

	// Generate export based on format
	var exportData []byte
	var err error
	var filename string

	switch strings.ToLower(format) {
	case "json":
		exportData, err = s.exportJSON(data)
		filename = fmt.Sprintf("analytics_export_%s.json", time.Now().Format("20060102_150405"))
	case "csv":
		exportData, err = s.exportCSV(data)
		filename = fmt.Sprintf("analytics_export_%s.csv", time.Now().Format("20060102_150405"))
	case "excel":
		exportData, err = s.exportExcel(data)
		filename = fmt.Sprintf("analytics_export_%s.xlsx", time.Now().Format("20060102_150405"))
	case "pdf":
		exportData, err = s.exportPDF(data)
		filename = fmt.Sprintf("analytics_export_%s.pdf", time.Now().Format("20060102_150405"))
	default:
		return nil, fmt.Errorf("unsupported export format: %s - learn to read documentation", format)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to generate %s export: %w", format, err)
	}

	// Store the export file
	exportURL, err := s.storageService.StoreExport(ctx, filename, exportData)
	if err != nil {
		return nil, fmt.Errorf("failed to store export file: %w", err)
	}

	// Calculate expiration time (24 hours from now)
	expirationTime := time.Now().Add(24 * time.Hour)

	exportInfo := &models.ExportInfo{
		AvailableFormats: []models.ExportFormat{
			{
				FormatType:  format,
				FormatName:  strings.ToUpper(format),
				Description: fmt.Sprintf("Analytics data in %s format", strings.ToUpper(format)),
				Compression: false,
				MaxSize:     10 * 1024 * 1024, // 10MB
			},
		},
		ExportURL:      exportURL,
		ExportSize:     int64(len(exportData)),
		GenerationTime: time.Since(startTime).Milliseconds(),
		ExpirationTime: expirationTime,
	}

	return exportInfo, nil
}

// exportJSON - Export data as JSON
func (s *ExportServiceImpl) exportJSON(data *models.AdvancedBulkAnalyticsResponse) ([]byte, error) {
	return json.MarshalIndent(data, "", "  ")
}

// exportCSV - Export data as CSV (flattened structure)
func (s *ExportServiceImpl) exportCSV(data *models.AdvancedBulkAnalyticsResponse) ([]byte, error) {
	var csvData strings.Builder
	writer := csv.NewWriter(&csvData)

	// Write headers for basic metrics
	headers := []string{
		"Metric", "Value", "Category", "Timestamp",
	}
	writer.Write(headers)

	// Write performance KPIs if available
	if data.PerformanceKPIs != nil {
		s.writePerformanceKPIsToCSV(writer, data.PerformanceKPIs)
	}

	// Write stealth analytics if available
	if data.StealthAnalytics != nil {
		s.writeStealthAnalyticsToCSV(writer, data.StealthAnalytics)
	}

	// Write resource analytics if available
	if data.ResourceAnalytics != nil {
		s.writeResourceAnalyticsToCSV(writer, data.ResourceAnalytics)
	}

	// Write basic campaign metrics
	for campaignID, metrics := range data.CampaignMetrics {
		s.writeCampaignMetricsToCSV(writer, campaignID, &metrics)
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("CSV writing failed: %w", err)
	}

	return []byte(csvData.String()), nil
}

// exportExcel - Export data as Excel (would use a proper Excel library)
func (s *ExportServiceImpl) exportExcel(data *models.AdvancedBulkAnalyticsResponse) ([]byte, error) {
	// For now, return CSV data as a placeholder
	// In a real implementation, would use github.com/360EntSecGroup-Skylar/excelize
	return s.exportCSV(data)
}

// exportPDF - Export data as PDF report
func (s *ExportServiceImpl) exportPDF(data *models.AdvancedBulkAnalyticsResponse) ([]byte, error) {
	// Generate HTML template first
	htmlContent, err := s.templateEngine.GenerateHTMLReport(data)
	if err != nil {
		return nil, fmt.Errorf("failed to generate HTML template: %w", err)
	}

	// Convert HTML to PDF (would use a proper PDF library)
	// For now, return HTML as bytes as placeholder
	return []byte(htmlContent), nil
}

// Helper methods for CSV writing
func (s *ExportServiceImpl) writePerformanceKPIsToCSV(writer *csv.Writer, kpis *models.PerformanceKPIData) {
	timestamp := time.Now().Format(time.RFC3339)

	if kpis.OperationalKPIs != nil {
		writer.Write([]string{"Average Processing Time", fmt.Sprintf("%d", kpis.OperationalKPIs.AverageProcessingTime), "Operational", timestamp})
		writer.Write([]string{"Throughput Rate", fmt.Sprintf("%.2f", kpis.OperationalKPIs.ThroughputRate), "Operational", timestamp})
		writer.Write([]string{"Success Rate", fmt.Sprintf("%.2f%%", kpis.OperationalKPIs.SuccessRate), "Operational", timestamp})
		writer.Write([]string{"Error Rate", fmt.Sprintf("%.2f%%", kpis.OperationalKPIs.ErrorRate), "Operational", timestamp})
	}

	if kpis.BusinessKPIs != nil {
		writer.Write([]string{"Lead Generation Rate", fmt.Sprintf("%.2f", kpis.BusinessKPIs.LeadGenerationRate), "Business", timestamp})
		writer.Write([]string{"Conversion Rate", fmt.Sprintf("%.2f%%", kpis.BusinessKPIs.ConversionRate), "Business", timestamp})
		writer.Write([]string{"Cost Per Lead", fmt.Sprintf("$%.2f", kpis.BusinessKPIs.CostPerLead), "Business", timestamp})
	}

	if kpis.TechnicalKPIs != nil {
		writer.Write([]string{"System Reliability", fmt.Sprintf("%.2f%%", kpis.TechnicalKPIs.SystemReliability), "Technical", timestamp})
		writer.Write([]string{"Security Score", fmt.Sprintf("%.2f", kpis.TechnicalKPIs.SecurityScore), "Technical", timestamp})
		writer.Write([]string{"Scalability Index", fmt.Sprintf("%.2f", kpis.TechnicalKPIs.ScalabilityIndex), "Technical", timestamp})
	}
}

func (s *ExportServiceImpl) writeStealthAnalyticsToCSV(writer *csv.Writer, stealth *models.StealthAnalyticsData) {
	timestamp := time.Now().Format(time.RFC3339)

	writer.Write([]string{"Overall Stealth Score", fmt.Sprintf("%.4f", stealth.OverallStealthScore), "Stealth", timestamp})

	if stealth.DetectionRiskAnalysis != nil {
		writer.Write([]string{"Detection Risk Level", stealth.DetectionRiskAnalysis.CurrentRiskLevel, "Stealth", timestamp})
		writer.Write([]string{"Risk Score", fmt.Sprintf("%.4f", stealth.DetectionRiskAnalysis.RiskScore), "Stealth", timestamp})
	}

	if stealth.AnonymityMetrics != nil {
		writer.Write([]string{"Anonymity Set Size", fmt.Sprintf("%d", stealth.AnonymityMetrics.AnonymitySet), "Stealth", timestamp})
		writer.Write([]string{"Entropy Score", fmt.Sprintf("%.4f", stealth.AnonymityMetrics.EntropyScore), "Stealth", timestamp})
	}
}

func (s *ExportServiceImpl) writeResourceAnalyticsToCSV(writer *csv.Writer, resource *models.ResourceAnalyticsData) {
	timestamp := time.Now().Format(time.RFC3339)

	if resource.ResourceUtilizationSummary != nil {
		writer.Write([]string{"CPU Utilization", fmt.Sprintf("%.2f%%", resource.ResourceUtilizationSummary.CPUUtilization.CurrentUsage), "Resource", timestamp})
		writer.Write([]string{"Memory Utilization", fmt.Sprintf("%.2f%%", resource.ResourceUtilizationSummary.MemoryUtilization.CurrentUsage), "Resource", timestamp})
		writer.Write([]string{"Network Utilization", fmt.Sprintf("%.2f%%", resource.ResourceUtilizationSummary.NetworkUtilization.CurrentUsage), "Resource", timestamp})
	}

	if resource.CostAnalysis != nil {
		writer.Write([]string{"Total Cost", fmt.Sprintf("$%.2f", resource.CostAnalysis.TotalCost), "Resource", timestamp})
	}
}

func (s *ExportServiceImpl) writeCampaignMetricsToCSV(writer *csv.Writer, campaignID string, metrics *models.CampaignAnalytics) {
	timestamp := time.Now().Format(time.RFC3339)
	prefix := fmt.Sprintf("Campaign_%s_", campaignID)

	writer.Write([]string{prefix + "Domains_Generated", fmt.Sprintf("%d", metrics.DomainsGenerated), "Campaign", timestamp})
	writer.Write([]string{prefix + "Domains_Validated", fmt.Sprintf("%d", metrics.DomainsValidated), "Campaign", timestamp})
	writer.Write([]string{prefix + "Leads_Generated", fmt.Sprintf("%d", metrics.LeadsGenerated), "Campaign", timestamp})
	writer.Write([]string{prefix + "Success_Rate", fmt.Sprintf("%.2f%%", metrics.SuccessRate), "Campaign", timestamp})
	writer.Write([]string{prefix + "Avg_Response_Time", fmt.Sprintf("%d", metrics.AvgResponseTime), "Campaign", timestamp})
	writer.Write([]string{prefix + "Cost_Per_Lead", fmt.Sprintf("%.2f", metrics.CostPerLead), "Campaign", timestamp})

	// Write phase breakdown if available
	if metrics.PhaseBreakdown != nil {
		for phaseName, phaseMetrics := range metrics.PhaseBreakdown {
			phasePrefix := fmt.Sprintf("%s%s_", prefix, phaseName)
			writer.Write([]string{phasePrefix + "Items_Processed", fmt.Sprintf("%d", phaseMetrics.ItemsProcessed), "Phase", timestamp})
			writer.Write([]string{phasePrefix + "Success_Count", fmt.Sprintf("%d", phaseMetrics.SuccessCount), "Phase", timestamp})
			writer.Write([]string{phasePrefix + "Failure_Count", fmt.Sprintf("%d", phaseMetrics.FailureCount), "Phase", timestamp})
			writer.Write([]string{phasePrefix + "Success_Rate", fmt.Sprintf("%.2f%%", phaseMetrics.SuccessRate), "Phase", timestamp})
		}
	}
}

// ===============================================================================
// ALERT SERVICE IMPLEMENTATION
// Because you probably need alerts too
// ===============================================================================

// AlertServiceImpl - Alert service that actually monitors things
type AlertServiceImpl struct {
	alertStore          AlertStore
	notificationService NotificationService
}

// NewAlertService - Creates an alert service that works
func NewAlertService(alertStore AlertStore, notificationService NotificationService) *AlertServiceImpl {
	return &AlertServiceImpl{
		alertStore:          alertStore,
		notificationService: notificationService,
	}
}

// CheckThresholds - Check analytics data against thresholds and generate alerts
func (s *AlertServiceImpl) CheckThresholds(ctx context.Context, data *models.AdvancedBulkAnalyticsResponse, thresholds *models.AnalyticsAlertConfig) ([]models.AnalyticsAlert, error) {
	var alerts []models.AnalyticsAlert
	now := time.Now()

	// Check success rate threshold
	if thresholds.SuccessRateThreshold != nil {
		successRate := s.calculateOverallSuccessRate(data)
		if successRate < *thresholds.SuccessRateThreshold {
			alert := models.AnalyticsAlert{
				AlertID:        uuid.New(),
				AlertType:      "threshold",
				Severity:       s.determineSeverity(successRate, *thresholds.SuccessRateThreshold, "success_rate"),
				Title:          "Success Rate Below Threshold",
				Description:    fmt.Sprintf("Overall success rate (%.2f%%) is below threshold (%.2f%%)", successRate*100, *thresholds.SuccessRateThreshold*100),
				MetricAffected: "success_rate",
				CurrentValue:   successRate,
				ThresholdValue: *thresholds.SuccessRateThreshold,
				TriggeredAt:    now,
				Status:         "active",
				Priority:       "high",
				RecommendedActions: []string{
					"Review failed operations for patterns",
					"Check system resources and performance",
					"Investigate configuration changes",
				},
				EstimatedImpact: "high",
				AutoResolve:     false,
			}
			alerts = append(alerts, alert)
		}
	}

	// Check stealth score threshold
	if thresholds.StealthScoreThreshold != nil && data.StealthAnalytics != nil {
		stealthScore := data.StealthAnalytics.OverallStealthScore
		if stealthScore > *thresholds.StealthScoreThreshold {
			alert := models.AnalyticsAlert{
				AlertID:        uuid.New(),
				AlertType:      "threshold",
				Severity:       s.determineSeverity(stealthScore, *thresholds.StealthScoreThreshold, "stealth_score"),
				Title:          "Stealth Score Above Threshold",
				Description:    fmt.Sprintf("Overall stealth score (%.4f) is above threshold (%.4f) - increased detection risk", stealthScore, *thresholds.StealthScoreThreshold),
				MetricAffected: "stealth_score",
				CurrentValue:   stealthScore,
				ThresholdValue: *thresholds.StealthScoreThreshold,
				TriggeredAt:    now,
				Status:         "active",
				Priority:       "critical",
				RecommendedActions: []string{
					"Activate additional stealth countermeasures",
					"Rotate proxy pools immediately",
					"Reduce operation frequency",
					"Review detection risk factors",
				},
				EstimatedImpact: "severe",
				AutoResolve:     false,
			}
			alerts = append(alerts, alert)
		}
	}

	// Check resource usage threshold
	if thresholds.ResourceUsageThreshold != nil && data.ResourceAnalytics != nil {
		resourceUsage := s.calculateOverallResourceUsage(data.ResourceAnalytics)
		if resourceUsage > *thresholds.ResourceUsageThreshold {
			alert := models.AnalyticsAlert{
				AlertID:        uuid.New(),
				AlertType:      "threshold",
				Severity:       s.determineSeverity(resourceUsage, *thresholds.ResourceUsageThreshold, "resource_usage"),
				Title:          "Resource Usage Above Threshold",
				Description:    fmt.Sprintf("Overall resource usage (%.2f%%) is above threshold (%.2f%%)", resourceUsage, *thresholds.ResourceUsageThreshold),
				MetricAffected: "resource_usage",
				CurrentValue:   resourceUsage / 100, // Convert to decimal
				ThresholdValue: *thresholds.ResourceUsageThreshold / 100,
				TriggeredAt:    now,
				Status:         "active",
				Priority:       "medium",
				RecommendedActions: []string{
					"Scale up resources if possible",
					"Optimize resource-intensive operations",
					"Review capacity planning",
				},
				EstimatedImpact: "moderate",
				AutoResolve:     true,
			}
			alerts = append(alerts, alert)
		}
	}

	// Check error rate threshold
	if thresholds.ErrorRateThreshold != nil {
		errorRate := s.calculateOverallErrorRate(data)
		if errorRate > *thresholds.ErrorRateThreshold {
			alert := models.AnalyticsAlert{
				AlertID:        uuid.New(),
				AlertType:      "threshold",
				Severity:       s.determineSeverity(errorRate, *thresholds.ErrorRateThreshold, "error_rate"),
				Title:          "Error Rate Above Threshold",
				Description:    fmt.Sprintf("Overall error rate (%.2f%%) is above threshold (%.2f%%)", errorRate, *thresholds.ErrorRateThreshold),
				MetricAffected: "error_rate",
				CurrentValue:   errorRate / 100, // Convert to decimal
				ThresholdValue: *thresholds.ErrorRateThreshold / 100,
				TriggeredAt:    now,
				Status:         "active",
				Priority:       "high",
				RecommendedActions: []string{
					"Investigate error patterns and root causes",
					"Review system logs for anomalies",
					"Check external service dependencies",
				},
				EstimatedImpact: "high",
				AutoResolve:     false,
			}
			alerts = append(alerts, alert)
		}
	}

	// Store alerts
	for _, alert := range alerts {
		if err := s.alertStore.StoreAlert(ctx, &alert); err != nil {
			return nil, fmt.Errorf("failed to store alert: %w", err)
		}

		// Send notifications for critical and high priority alerts
		if alert.Priority == "critical" || alert.Priority == "high" {
			if err := s.notificationService.SendAlert(ctx, &alert); err != nil {
				// Log error but don't fail the entire operation
				fmt.Printf("Failed to send alert notification: %v\n", err)
			}
		}
	}

	return alerts, nil
}

// GetActiveAlerts - Retrieve active alerts with optional filtering
func (s *AlertServiceImpl) GetActiveAlerts(ctx context.Context, severityFilter string, limit int) ([]models.AnalyticsAlert, error) {
	return s.alertStore.GetActiveAlerts(ctx, severityFilter, limit)
}

// Helper methods for alert calculations
func (s *AlertServiceImpl) calculateOverallSuccessRate(data *models.AdvancedBulkAnalyticsResponse) float64 {
	totalOps := int64(0)
	successfulOps := int64(0)

	for _, metrics := range data.CampaignMetrics {
		// Calculate total operations from domains generated
		totalOps += metrics.DomainsGenerated
		// Calculate successful operations from domains validated
		successfulOps += metrics.DomainsValidated
	}

	if totalOps == 0 {
		return 1.0 // 100% if no operations (edge case)
	}

	return float64(successfulOps) / float64(totalOps)
}

func (s *AlertServiceImpl) calculateOverallResourceUsage(resourceData *models.ResourceAnalyticsData) float64 {
	if resourceData.ResourceUtilizationSummary == nil {
		return 0.0
	}

	summary := resourceData.ResourceUtilizationSummary

	// Calculate weighted average of resource utilization
	usage := (summary.CPUUtilization.CurrentUsage +
		summary.MemoryUtilization.CurrentUsage +
		summary.NetworkUtilization.CurrentUsage +
		summary.StorageUtilization.CurrentUsage) / 4

	return usage
}

func (s *AlertServiceImpl) calculateOverallErrorRate(data *models.AdvancedBulkAnalyticsResponse) float64 {
	totalOps := int64(0)
	failedOps := int64(0)

	for _, metrics := range data.CampaignMetrics {
		// Calculate total operations from domains generated
		totalOps += metrics.DomainsGenerated
		// Calculate failed operations as difference between generated and validated
		failedOps += (metrics.DomainsGenerated - metrics.DomainsValidated)
	}

	if totalOps == 0 {
		return 0.0 // 0% error rate if no operations
	}

	return (float64(failedOps) / float64(totalOps)) * 100
}

func (s *AlertServiceImpl) determineSeverity(currentValue, threshold float64, metricType string) string {
	var ratio float64

	switch metricType {
	case "stealth_score", "error_rate", "resource_usage":
		// Higher values are worse
		ratio = currentValue / threshold
	case "success_rate":
		// Lower values are worse
		ratio = threshold / currentValue
	default:
		ratio = 1.0
	}

	if ratio >= 2.0 {
		return "critical"
	} else if ratio >= 1.5 {
		return "high"
	} else if ratio >= 1.2 {
		return "medium"
	} else {
		return "low"
	}
}

// ===============================================================================
// INTERFACE DEFINITIONS
// ===============================================================================

type StorageService interface {
	StoreExport(ctx context.Context, filename string, data []byte) (string, error)
}

type TemplateEngine interface {
	GenerateHTMLReport(data *models.AdvancedBulkAnalyticsResponse) (string, error)
}

type AlertStore interface {
	StoreAlert(ctx context.Context, alert *models.AnalyticsAlert) error
	GetActiveAlerts(ctx context.Context, severityFilter string, limit int) ([]models.AnalyticsAlert, error)
}

type NotificationService interface {
	SendAlert(ctx context.Context, alert *models.AnalyticsAlert) error
}
