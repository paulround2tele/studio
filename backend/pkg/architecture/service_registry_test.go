package architecture

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
)

func TestServiceRegistry_RegisterService(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	mock.ExpectExec("INSERT INTO service_contracts").
		WillReturnResult(sqlmock.NewResult(1, 1))

	sr := NewServiceRegistry(db)
	contract := &ServiceContract{
		ServiceName: "test-service",
		Version:     "v1",
		Endpoints:   []EndpointContract{{Path: "/", Method: "GET"}},
	}
	err = sr.RegisterService(contract)
	assert.NoError(t, err)
	stored, ok := sr.GetServiceContract("test-service")
	assert.True(t, ok)
	assert.Equal(t, "v1", stored.Version)
	assert.NoError(t, mock.ExpectationsWereMet())
}
