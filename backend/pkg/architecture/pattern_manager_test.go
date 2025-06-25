package architecture

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
)

func TestPatternManager_AnalyzeServiceCompliance(t *testing.T) {
	db, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer db.Close()

	mock.ExpectQuery("SELECT coupling_score").WithArgs("svc").
		WillReturnRows(sqlmock.NewRows([]string{"coupling_score"}).AddRow(80.0))
	mock.ExpectQuery("SELECT target_service").WithArgs("svc").
		WillReturnRows(sqlmock.NewRows([]string{"target_service"}).AddRow("dep1").AddRow("dep2"))

	pm := NewPatternManager(db)
	report, err := pm.AnalyzeServiceCompliance("svc")
	assert.NoError(t, err)
	assert.Equal(t, 80.0, report.CouplingScore)
	assert.Len(t, report.Dependencies, 2)
	assert.Contains(t, report.Recommendations, "REDUCE_COUPLING")
	assert.NoError(t, mock.ExpectationsWereMet())
}
