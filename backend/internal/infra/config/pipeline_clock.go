package config

import "time"

// Clock provides an abstraction over time operations for testability
type Clock interface {
	Now() time.Time
}

// RealClock implements Clock using the system time
type RealClock struct{}

// Now returns the current system time
func (RealClock) Now() time.Time {
	return time.Now()
}

// MockClock implements Clock with a fixed time for testing
type MockClock struct {
	currentTime time.Time
}

// NewMockClock creates a new MockClock with the given time
func NewMockClock(t time.Time) *MockClock {
	return &MockClock{currentTime: t}
}

// Now returns the mock time
func (m *MockClock) Now() time.Time {
	return m.currentTime
}

// SetTime updates the mock time
func (m *MockClock) SetTime(t time.Time) {
	m.currentTime = t
}

// Advance moves the mock time forward by the given duration
func (m *MockClock) Advance(d time.Duration) {
	m.currentTime = m.currentTime.Add(d)
}