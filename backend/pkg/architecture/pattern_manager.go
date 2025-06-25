package architecture

import (
	"database/sql"
	"fmt"
)

type ArchitecturePattern string

const (
	PatternMicroservice ArchitecturePattern = "microservice"
	PatternModular      ArchitecturePattern = "modular_monolith"
	PatternHybrid       ArchitecturePattern = "hybrid"
)

type ComplianceReport struct {
	ServiceName     string
	CouplingScore   float64
	Dependencies    []string
	Recommendations []string
	RefactorPlan    string
}

type PatternManager struct {
	db *sql.DB
}

func NewPatternManager(db *sql.DB) *PatternManager {
	return &PatternManager{db: db}
}

func (pm *PatternManager) calculateCouplingScore(serviceName string) (float64, error) {
	var score float64
	err := pm.db.QueryRow(`SELECT coupling_score FROM service_architecture_metrics WHERE service_name=$1`, serviceName).Scan(&score)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return score, err
}

func (pm *PatternManager) analyzeDependencies(serviceName string) ([]string, error) {
	rows, err := pm.db.Query(`SELECT target_service FROM service_dependencies WHERE source_service=$1`, serviceName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	deps := []string{}
	for rows.Next() {
		var tgt string
		if err := rows.Scan(&tgt); err != nil {
			return nil, err
		}
		deps = append(deps, tgt)
	}
	return deps, rows.Err()
}

func (pm *PatternManager) generateRecommendations(score float64, deps []string) []string {
	rec := []string{}
	if score > 70.0 {
		rec = append(rec, "REDUCE_COUPLING")
	}
	if len(deps) > 10 {
		rec = append(rec, "EXCESSIVE_DEPENDENCIES")
	}
	return rec
}

func (pm *PatternManager) createRefactorPlan(serviceName string, score float64) string {
	if score > 70.0 {
		return fmt.Sprintf("Investigate modularization of %s", serviceName)
	}
	return ""
}

func (pm *PatternManager) AnalyzeServiceCompliance(serviceName string) (*ComplianceReport, error) {
	couplingScore, err := pm.calculateCouplingScore(serviceName)
	if err != nil {
		return nil, fmt.Errorf("coupling analysis failed: %w", err)
	}

	dependencies, err := pm.analyzeDependencies(serviceName)
	if err != nil {
		return nil, fmt.Errorf("dependency analysis failed: %w", err)
	}

	return &ComplianceReport{
		ServiceName:     serviceName,
		CouplingScore:   couplingScore,
		Dependencies:    dependencies,
		Recommendations: pm.generateRecommendations(couplingScore, dependencies),
		RefactorPlan:    pm.createRefactorPlan(serviceName, couplingScore),
	}, nil
}
