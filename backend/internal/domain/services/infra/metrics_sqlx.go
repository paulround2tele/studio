package infra

import "database/sql"

// MetricsSQLX is a minimal adapter to match services.MetricsRecorder.
type MetricsSQLX struct{ db *sql.DB }

func NewMetricsSQLX(db *sql.DB) *MetricsSQLX { return &MetricsSQLX{db: db} }

func (m *MetricsSQLX) RecordMetric(name string, value float64) error { return nil }
func (m *MetricsSQLX) GetMetric(name string) (float64, error)        { return 0, nil }
func (m *MetricsSQLX) ListMetrics() ([]string, error)                { return []string{}, nil }
