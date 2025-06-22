package monitoring

import (
	"context"
	"log"
	"runtime"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// ConnectionLeak represents a detected connection leak
type ConnectionLeak struct {
	ID          string    `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	StackTrace  string    `json:"stack_trace"`
	Duration    time.Duration `json:"duration"`
	QueryInfo   string    `json:"query_info,omitempty"`
}

// ConnectionLeakDetector detects and tracks connection leaks
type ConnectionLeakDetector struct {
	db                *sqlx.DB
	leakTimeout       time.Duration
	activeConnections map[string]*connectionInfo
	mutex             sync.RWMutex
	stopCh            chan struct{}
	wg                sync.WaitGroup
}

// connectionInfo tracks information about active connections
type connectionInfo struct {
	ID         string
	StartTime  time.Time
	StackTrace string
	QueryInfo  string
}

// NewConnectionLeakDetector creates a new connection leak detector
func NewConnectionLeakDetector(db *sqlx.DB) *ConnectionLeakDetector {
	return &ConnectionLeakDetector{
		db:                db,
		leakTimeout:       10 * time.Minute, // Default 10 minute timeout
		activeConnections: make(map[string]*connectionInfo),
		stopCh:            make(chan struct{}),
	}
}

// Start begins leak detection monitoring
func (cld *ConnectionLeakDetector) Start(ctx context.Context) error {
	log.Println("Starting connection leak detector")
	
	cld.wg.Add(1)
	go cld.monitorLoop(ctx)
	
	return nil
}

// Stop stops the leak detector
func (cld *ConnectionLeakDetector) Stop() {
	log.Println("Stopping connection leak detector")
	close(cld.stopCh)
	cld.wg.Wait()
}

// monitorLoop runs the leak detection monitoring loop
func (cld *ConnectionLeakDetector) monitorLoop(ctx context.Context) {
	defer cld.wg.Done()
	
	ticker := time.NewTicker(1 * time.Minute) // Check every minute
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-cld.stopCh:
			return
		case <-ticker.C:
			cld.checkForLeaks()
		}
	}
}

// checkForLeaks checks for connections that have been held too long
func (cld *ConnectionLeakDetector) checkForLeaks() {
	cld.mutex.Lock()
	defer cld.mutex.Unlock()
	
	now := time.Now()
	var leaks []*ConnectionLeak
	
	for id, conn := range cld.activeConnections {
		if now.Sub(conn.StartTime) > cld.leakTimeout {
			leak := &ConnectionLeak{
				ID:         id,
				Timestamp:  now,
				StackTrace: conn.StackTrace,
				Duration:   now.Sub(conn.StartTime),
				QueryInfo:  conn.QueryInfo,
			}
			leaks = append(leaks, leak)
			
			// Log the leak
			log.Printf("CONNECTION LEAK DETECTED: ID=%s, Duration=%v, Stack=%s",
				leak.ID, leak.Duration, leak.StackTrace)
			
			// Remove from active connections
			delete(cld.activeConnections, id)
		}
	}
	
	// Store leaks in database
	if len(leaks) > 0 {
		cld.storeLeaks(leaks)
	}
}

// TrackConnection starts tracking a connection
func (cld *ConnectionLeakDetector) TrackConnection(connID string, queryInfo string) {
	cld.mutex.Lock()
	defer cld.mutex.Unlock()
	
	// Get stack trace
	buf := make([]byte, 4096)
	n := runtime.Stack(buf, false)
	stackTrace := string(buf[:n])
	
	cld.activeConnections[connID] = &connectionInfo{
		ID:         connID,
		StartTime:  time.Now(),
		StackTrace: stackTrace,
		QueryInfo:  queryInfo,
	}
}

// UntrackConnection stops tracking a connection
func (cld *ConnectionLeakDetector) UntrackConnection(connID string) {
	cld.mutex.Lock()
	defer cld.mutex.Unlock()
	
	delete(cld.activeConnections, connID)
}

// GetActiveConnections returns current active connections
func (cld *ConnectionLeakDetector) GetActiveConnections() map[string]*connectionInfo {
	cld.mutex.RLock()
	defer cld.mutex.RUnlock()
	
	// Return a copy
	result := make(map[string]*connectionInfo)
	for k, v := range cld.activeConnections {
		info := *v // Copy the struct
		result[k] = &info
	}
	
	return result
}

// storeLeaks stores detected leaks in the database
func (cld *ConnectionLeakDetector) storeLeaks(leaks []*ConnectionLeak) {
	for _, leak := range leaks {
		query := `
			INSERT INTO si004_connection_leak_detection (
				timestamp, connection_id, duration_ms, stack_trace, query_info
			) VALUES ($1, $2, $3, $4, $5)
		`
		
		_, err := cld.db.Exec(query,
			leak.Timestamp,
			leak.ID,
			int64(leak.Duration/time.Millisecond),
			leak.StackTrace,
			leak.QueryInfo,
		)
		
		if err != nil {
			log.Printf("Failed to store connection leak: %v", err)
		}
	}
}

// GetLeakHistory returns leak history from the database
func (cld *ConnectionLeakDetector) GetLeakHistory(since time.Time) ([]*ConnectionLeak, error) {
	query := `
		SELECT timestamp, connection_id, duration_ms, stack_trace, query_info
		FROM si004_connection_leak_detection
		WHERE timestamp >= $1
		ORDER BY timestamp DESC
		LIMIT 100
	`
	
	rows, err := cld.db.Query(query, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var leaks []*ConnectionLeak
	for rows.Next() {
		var leak ConnectionLeak
		var durationMs int64
		
		err = rows.Scan(
			&leak.Timestamp,
			&leak.ID,
			&durationMs,
			&leak.StackTrace,
			&leak.QueryInfo,
		)
		if err != nil {
			return nil, err
		}
		
		leak.Duration = time.Duration(durationMs) * time.Millisecond
		leaks = append(leaks, &leak)
	}
	
	return leaks, rows.Err()
}

// SetLeakTimeout sets the timeout for connection leak detection
func (cld *ConnectionLeakDetector) SetLeakTimeout(timeout time.Duration) {
	cld.mutex.Lock()
	defer cld.mutex.Unlock()
	cld.leakTimeout = timeout
}