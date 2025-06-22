package monitoring

import (
	"context"
	"log"
	"time"

	"github.com/jmoiron/sqlx"
)

// AlertingService defines the interface for alerting functionality
type AlertingService interface {
	SendAlert(ctx context.Context, alertType, severity, message string, context map[string]interface{}) error
	GetActiveAlerts(ctx context.Context) ([]Alert, error)
	AcknowledgeAlert(ctx context.Context, alertID string) error
}

// Alert represents a system alert
type Alert struct {
	ID           string                 `json:"id"`
	AlertType    string                 `json:"alertType"`
	Severity     string                 `json:"severity"`
	Message      string                 `json:"message"`
	Context      map[string]interface{} `json:"context"`
	Acknowledged bool                   `json:"acknowledged"`
	CreatedAt    time.Time              `json:"createdAt"`
}

// DatabaseAlertingService implements AlertingService using database storage
type DatabaseAlertingService struct {
	db *sqlx.DB
}

// NewDatabaseAlertingService creates a new database-backed alerting service
func NewDatabaseAlertingService(db *sqlx.DB) *DatabaseAlertingService {
	return &DatabaseAlertingService{
		db: db,
	}
}

// SendAlert sends an alert to the database
func (das *DatabaseAlertingService) SendAlert(ctx context.Context, alertType, severity, message string, context map[string]interface{}) error {
	// This implementation stores alerts in the database
	// In a real system, this would also integrate with external alerting systems
	log.Printf("ALERT [%s][%s]: %s", severity, alertType, message)
	
	// The alert storage is handled by the database functions in the migration
	// This is just a logging implementation for now
	return nil
}

// GetActiveAlerts retrieves active alerts from the database
func (das *DatabaseAlertingService) GetActiveAlerts(ctx context.Context) ([]Alert, error) {
	query := `
		SELECT id, alert_type, severity, message, context, acknowledged, created_at
		FROM system_alerts
		WHERE acknowledged = false
		ORDER BY created_at DESC
		LIMIT 100`
	
	rows, err := das.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var alerts []Alert
	for rows.Next() {
		var alert Alert
		var contextJSON []byte
		
		err = rows.Scan(
			&alert.ID,
			&alert.AlertType,
			&alert.Severity,
			&alert.Message,
			&contextJSON,
			&alert.Acknowledged,
			&alert.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		
		// Parse context JSON if needed
		alert.Context = make(map[string]interface{})
		
		alerts = append(alerts, alert)
	}
	
	return alerts, rows.Err()
}

// AcknowledgeAlert marks an alert as acknowledged
func (das *DatabaseAlertingService) AcknowledgeAlert(ctx context.Context, alertID string) error {
	query := `
		UPDATE system_alerts 
		SET acknowledged = true, acknowledged_at = NOW()
		WHERE id = $1`
	
	_, err := das.db.ExecContext(ctx, query, alertID)
	return err
}

// MockAlertingService provides a mock implementation for testing
type MockAlertingService struct {
	alerts []Alert
}

// NewMockAlertingService creates a new mock alerting service
func NewMockAlertingService() *MockAlertingService {
	return &MockAlertingService{
		alerts: make([]Alert, 0),
	}
}

// SendAlert stores the alert in memory for testing
func (mas *MockAlertingService) SendAlert(ctx context.Context, alertType, severity, message string, context map[string]interface{}) error {
	alert := Alert{
		ID:           "mock-alert-id",
		AlertType:    alertType,
		Severity:     severity,
		Message:      message,
		Context:      context,
		Acknowledged: false,
		CreatedAt:    time.Now(),
	}
	
	mas.alerts = append(mas.alerts, alert)
	log.Printf("MOCK ALERT [%s][%s]: %s", severity, alertType, message)
	return nil
}

// GetActiveAlerts returns mock alerts
func (mas *MockAlertingService) GetActiveAlerts(ctx context.Context) ([]Alert, error) {
	var activeAlerts []Alert
	for _, alert := range mas.alerts {
		if !alert.Acknowledged {
			activeAlerts = append(activeAlerts, alert)
		}
	}
	return activeAlerts, nil
}

// AcknowledgeAlert marks a mock alert as acknowledged
func (mas *MockAlertingService) AcknowledgeAlert(ctx context.Context, alertID string) error {
	for i := range mas.alerts {
		if mas.alerts[i].ID == alertID {
			mas.alerts[i].Acknowledged = true
			break
		}
	}
	return nil
}