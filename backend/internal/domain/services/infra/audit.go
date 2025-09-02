package infra

// Minimal no-op AuditService implementing the existing AuditLogger interface in services.

// AuditService is a no-op implementation; can be extended to use store.AuditLogStore.
type AuditService struct{}

// NewAuditService returns a no-op audit service to satisfy current constructors.
func NewAuditService() *AuditService { return &AuditService{} }

// LogEvent logs an audit event (no-op).
func (a *AuditService) LogEvent(event string) error { return nil }

// GetLogs returns stored audit logs (no-op empty slice).
func (a *AuditService) GetLogs() ([]string, error) { return []string{}, nil }

// ValidateEvent validates an event (always true as no-op).
func (a *AuditService) ValidateEvent(event string) bool { return true }
