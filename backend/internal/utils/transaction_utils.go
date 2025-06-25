package utils

import (
	"context"
	"fmt"
	"log"

	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/jmoiron/sqlx"
)

// TransactionManager handles common SQL transaction patterns
type TransactionManager struct {
	db *sqlx.DB
}

// NewTransactionManager creates a new transaction manager
func NewTransactionManager(db *sqlx.DB) *TransactionManager {
	return &TransactionManager{db: db}
}

// WithTransaction executes a function within a SQL transaction if SQL mode is enabled
func (tm *TransactionManager) WithTransaction(ctx context.Context, operationName string, fn func(store.Querier) error) error {
	if tm.db == nil {
		log.Printf("Operating in non-SQL mode for %s", operationName)
		return fn(nil)
	}

	sqlTx, err := tm.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin SQL transaction for %s: %w", operationName, err)
	}

	log.Printf("SQL Transaction started for %s", operationName)

	var opErr error
	defer func() {
		if p := recover(); p != nil {
			log.Printf("Panic recovered during SQL %s, rolling back: %v", operationName, p)
			_ = sqlTx.Rollback()
			panic(p)
		} else if opErr != nil {
			log.Printf("Error occurred for %s (SQL), rolling back: %v", operationName, opErr)
			_ = sqlTx.Rollback()
		} else {
			if commitErr := sqlTx.Commit(); commitErr != nil {
				log.Printf("Error committing SQL transaction for %s: %v", operationName, commitErr)
				opErr = commitErr
			} else {
				log.Printf("SQL Transaction committed for %s", operationName)
			}
		}
	}()

	opErr = fn(sqlTx)
	return opErr
}

// WithOptionalTransaction executes a function with an optional transaction based on isSQL flag
func WithOptionalTransaction(ctx context.Context, db *sqlx.DB, isSQL bool, operationName string, fn func(store.Querier) error) error {
	if !isSQL || db == nil {
		log.Printf("Operating in non-SQL mode for %s", operationName)
		return fn(nil)
	}

	tm := NewTransactionManager(db)
	return tm.WithTransaction(ctx, operationName, fn)
}

// TransactionResult contains the result of executing a function within a transaction
type TransactionResult struct {
	Success bool
	Error   error
}

// WithSQLTransactionIfSQL executes a function within a SQL transaction if in SQL mode
func WithSQLTransactionIfSQL(ctx context.Context, db *sqlx.DB, isSQL bool, operationName string, fn func(store.Querier) error) error {
	if !isSQL {
		log.Printf("Operating in Firestore mode for %s (no service-level transaction).", operationName)
		return fn(nil)
	}

	var opErr error
	sqlTx, startTxErr := db.BeginTxx(ctx, nil)
	if startTxErr != nil {
		return fmt.Errorf("failed to begin SQL transaction for %s: %w", operationName, startTxErr)
	}
	log.Printf("SQL Transaction started for %s.", operationName)

	defer func() {
		if p := recover(); p != nil {
			log.Printf("Panic recovered during SQL %s, rolling back: %v", operationName, p)
			_ = sqlTx.Rollback()
			panic(p)
		} else if opErr != nil {
			log.Printf("%s: Rolled back SQL transaction due to error: %v", operationName, opErr)
			_ = sqlTx.Rollback()
		} else {
			if commitErr := sqlTx.Commit(); commitErr != nil {
				log.Printf("%s: Failed to commit SQL transaction: %v", operationName, commitErr)
				opErr = fmt.Errorf("failed to commit SQL transaction: %w", commitErr)
			} else {
				log.Printf("SQL Transaction committed for %s.", operationName)
			}
		}
	}()

	opErr = fn(sqlTx)
	return opErr
}
