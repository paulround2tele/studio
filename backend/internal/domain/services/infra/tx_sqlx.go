package infra

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

// TxSQLX adapts sqlx.DB to the services TxManager interface.
type TxSQLX struct{ db *sqlx.DB }

func NewTxSQLX(db *sqlx.DB) *TxSQLX { return &TxSQLX{db: db} }

func (t *TxSQLX) BeginTx(ctx context.Context) (*sql.Tx, error) {
	if t == nil || t.db == nil {
		return nil, nil
	}
	// BeginTxx returns *sqlx.Tx; expose underlying *sql.Tx using .Tx
	x, err := t.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	return x.Tx, nil
}

func (t *TxSQLX) Commit(tx *sql.Tx) error {
	if tx == nil {
		return nil
	}
	return tx.Commit()
}

func (t *TxSQLX) Rollback(tx *sql.Tx) error {
	if tx == nil {
		return nil
	}
	return tx.Rollback()
}

func (t *TxSQLX) ExecuteInTx(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := t.BeginTx(ctx)
	if err != nil {
		return err
	}
	if tx == nil {
		return fn(nil)
	}
	if err := fn(tx); err != nil {
		_ = t.Rollback(tx)
		return err
	}
	return t.Commit(tx)
}
