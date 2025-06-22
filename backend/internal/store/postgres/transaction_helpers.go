// File: backend/internal/store/postgres/transaction_helpers.go
package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"runtime"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// TransactionManager provides comprehensive transaction lifecycle management
type TransactionManager struct {
	db          *sqlx.DB
	activeCount int64
	mu          sync.RWMutex
	leakTracker map[string]*TransactionInfo
}

// TransactionInfo tracks transaction metadata for leak detection
type TransactionInfo struct {
	ID        string
	StartTime time.Time
	Stack     string
	Context   string
}

// NewTransactionManager creates a new transaction manager with leak detection
func NewTransactionManager(db *sqlx.DB) *TransactionManager {
	return &TransactionManager{
		db:          db,
		leakTracker: make(map[string]*TransactionInfo),
	}
}

// SafeTransaction executes a function within a transaction with comprehensive cleanup
func (tm *TransactionManager) SafeTransaction(ctx context.Context, opts *sql.TxOptions, operation string, fn func(*sqlx.Tx) error) error {
	// Add timeout if not present
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
	}

	// Start transaction with monitoring
	tx, err := tm.beginWithTracking(ctx, opts, operation)
	if err != nil {
		return fmt.Errorf("failed to begin transaction for %s: %w", operation, err)
	}

	// Ensure cleanup regardless of outcome
	var txErr error
	defer func() {
		if err := tm.cleanupTransaction(tx, txErr, operation); err != nil {
			log.Printf("ERROR: Transaction cleanup failed for %s: %v", operation, err)
		}
	}()

	// Execute operation
	txErr = fn(tx)
	if txErr != nil {
		return fmt.Errorf("transaction operation %s failed: %w", operation, txErr)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		txErr = err // Set for cleanup
		return fmt.Errorf("failed to commit transaction for %s: %w", operation, err)
	}

	return nil
}

// beginWithTracking starts a transaction and tracks it for leak detection
func (tm *TransactionManager) beginWithTracking(ctx context.Context, opts *sql.TxOptions, operation string) (*sqlx.Tx, error) {
	tx, err := tm.db.BeginTxx(ctx, opts)
	if err != nil {
		return nil, err
	}

	// Track transaction for leak detection
	txID := fmt.Sprintf("%p", tx)
	tm.mu.Lock()
	defer tm.mu.Unlock()

	tm.activeCount++
	tm.leakTracker[txID] = &TransactionInfo{
		ID:        txID,
		StartTime: time.Now(),
		Stack:     getCallerStack(),
		Context:   operation,
	}

	log.Printf("TRANSACTION_START: %s [ID: %s] [Active: %d]", operation, txID, tm.activeCount)
	return tx, nil
}

// cleanupTransaction handles transaction cleanup with proper rollback/commit
func (tm *TransactionManager) cleanupTransaction(tx *sqlx.Tx, opErr error, operation string) error {
	if tx == nil {
		return nil
	}

	txID := fmt.Sprintf("%p", tx)

	// Remove from tracking
	tm.mu.Lock()
	defer tm.mu.Unlock()

	info, exists := tm.leakTracker[txID]
	if exists {
		duration := time.Since(info.StartTime)
		delete(tm.leakTracker, txID)
		tm.activeCount--

		log.Printf("TRANSACTION_CLEANUP: %s [ID: %s] [Duration: %v] [Active: %d]", operation, txID, duration, tm.activeCount)

		// Check for long-running transactions
		if duration > 5*time.Minute {
			log.Printf("WARNING: Long-running transaction detected: %s [Duration: %v]", operation, duration)
		}
	}

	// Perform cleanup - rollback if there was an error, otherwise ensure transaction is closed
	if opErr != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			// Both operation and rollback failed
			log.Printf("ERROR: Transaction rollback failed for %s: %v (original error: %v)", operation, rollbackErr, opErr)
			return fmt.Errorf("rollback failed: %w (original error: %v)", rollbackErr, opErr)
		}
		log.Printf("TRANSACTION_ROLLBACK: %s [ID: %s] due to error: %v", operation, txID, opErr)
	}

	return nil
}

// PreparedStatementManager provides safe prepared statement lifecycle management
type PreparedStatementManager struct {
	activeStatements map[string]*PreparedStatementInfo
	mu               sync.RWMutex
}

// PreparedStatementInfo tracks prepared statement metadata
type PreparedStatementInfo struct {
	Query     string
	StartTime time.Time
	Context   string
	Stack     string
}

// NewPreparedStatementManager creates a new prepared statement manager
func NewPreparedStatementManager() *PreparedStatementManager {
	return &PreparedStatementManager{
		activeStatements: make(map[string]*PreparedStatementInfo),
	}
}

// SafePreparedStatement executes a function with a prepared statement and ensures cleanup
func (psm *PreparedStatementManager) SafePreparedStatement(ctx context.Context, exec Querier, query, operation string, fn func(*sqlx.NamedStmt) error) error {
	// Prepare statement with tracking
	stmt, err := psm.prepareWithTracking(ctx, exec, query, operation)
	if err != nil {
		return fmt.Errorf("failed to prepare statement for %s: %w", operation, err)
	}

	// Ensure cleanup
	defer func() {
		if err := psm.cleanupStatement(stmt, operation); err != nil {
			log.Printf("ERROR: Prepared statement cleanup failed for %s: %v", operation, err)
		}
	}()

	// Execute operation
	if err := fn(stmt); err != nil {
		return fmt.Errorf("prepared statement operation %s failed: %w", operation, err)
	}

	return nil
}

// prepareWithTracking prepares a statement and tracks it for leak detection
func (psm *PreparedStatementManager) prepareWithTracking(ctx context.Context, exec Querier, query, operation string) (*sqlx.NamedStmt, error) {
	stmt, err := exec.PrepareNamedContext(ctx, query)
	if err != nil {
		return nil, err
	}

	// Track statement for leak detection
	stmtID := fmt.Sprintf("%p", stmt)
	psm.mu.Lock()
	defer psm.mu.Unlock()

	psm.activeStatements[stmtID] = &PreparedStatementInfo{
		Query:     query,
		StartTime: time.Now(),
		Context:   operation,
		Stack:     getCallerStack(),
	}

	log.Printf("PREPARED_STATEMENT_CREATE: %s [ID: %s]", operation, stmtID)
	return stmt, nil
}

// cleanupStatement handles prepared statement cleanup
func (psm *PreparedStatementManager) cleanupStatement(stmt *sqlx.NamedStmt, operation string) error {
	if stmt == nil {
		return nil
	}

	stmtID := fmt.Sprintf("%p", stmt)

	// Remove from tracking
	psm.mu.Lock()
	defer psm.mu.Unlock()

	info, exists := psm.activeStatements[stmtID]
	if exists {
		duration := time.Since(info.StartTime)
		delete(psm.activeStatements, stmtID)
		log.Printf("PREPARED_STATEMENT_CLEANUP: %s [ID: %s] [Duration: %v]", operation, stmtID, duration)
	}

	// Close statement
	if err := stmt.Close(); err != nil {
		log.Printf("ERROR: Failed to close prepared statement for %s: %v", operation, err)
		return fmt.Errorf("statement close failed: %w", err)
	}

	return nil
}

// Querier interface for prepared statement operations
type Querier interface {
	PrepareNamedContext(ctx context.Context, query string) (*sqlx.NamedStmt, error)
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	GetContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	SelectContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	NamedExecContext(ctx context.Context, query string, arg interface{}) (sql.Result, error)
}

// GetActiveTransactionCount returns the current number of active transactions
func (tm *TransactionManager) GetActiveTransactionCount() int64 {
	tm.mu.RLock()
	defer tm.mu.RUnlock()
	return tm.activeCount
}

// GetActiveTransactions returns information about currently active transactions
func (tm *TransactionManager) GetActiveTransactions() map[string]*TransactionInfo {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	result := make(map[string]*TransactionInfo)
	for k, v := range tm.leakTracker {
		result[k] = &TransactionInfo{
			ID:        v.ID,
			StartTime: v.StartTime,
			Stack:     v.Stack,
			Context:   v.Context,
		}
	}
	return result
}

// DetectLeaks identifies potential transaction leaks
func (tm *TransactionManager) DetectLeaks(maxDuration time.Duration) []string {
	tm.mu.RLock()
	defer tm.mu.RUnlock()

	var leaks []string
	now := time.Now()

	for _, info := range tm.leakTracker {
		if now.Sub(info.StartTime) > maxDuration {
			leaks = append(leaks, fmt.Sprintf(
				"LEAK: Transaction %s [Context: %s] [Duration: %v] [Stack: %s]",
				info.ID, info.Context, now.Sub(info.StartTime), info.Stack,
			))
		}
	}

	return leaks
}

// getCallerStack returns a stack trace for debugging
func getCallerStack() string {
	buf := make([]byte, 1024)
	n := runtime.Stack(buf, false)
	return string(buf[:n])
}

// WithTimeout creates a context with timeout for database operations
func WithTimeout(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithTimeout(ctx, timeout)
}

// DefaultTimeout for database operations
const DefaultTimeout = 30 * time.Second
