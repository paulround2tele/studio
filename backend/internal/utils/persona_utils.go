package utils

import (
	"context"
	"fmt"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// PersonaValidator provides common persona validation functionality
type PersonaValidator struct {
	personaStore store.PersonaStore
}

// NewPersonaValidator creates a new persona validator
func NewPersonaValidator(personaStore store.PersonaStore) *PersonaValidator {
	return &PersonaValidator{personaStore: personaStore}
}

// ValidatePersonaIDs validates that all provided persona IDs exist, are enabled, and match the expected type
func (pv *PersonaValidator) ValidatePersonaIDs(ctx context.Context, querier store.Querier, personaIDs []uuid.UUID, expectedType models.PersonaTypeEnum) error {
	if len(personaIDs) == 0 {
		return fmt.Errorf("%s Persona IDs required", expectedType)
	}

	for _, pID := range personaIDs {
		persona, err := pv.personaStore.GetPersonaByID(ctx, querier, pID)
		if err != nil {
			if err == store.ErrNotFound {
				return fmt.Errorf("%s persona ID '%s' not found", expectedType, pID)
			}
			return fmt.Errorf("verifying %s persona ID '%s': %w", expectedType, pID, err)
		}
		if persona.PersonaType != expectedType {
			return fmt.Errorf("persona ID '%s' type '%s', expected '%s'", pID, persona.PersonaType, expectedType)
		}
		if !persona.IsEnabled {
			return fmt.Errorf("%s persona ID '%s' disabled", expectedType, pID)
		}
	}
	return nil
}

// ValidatePersonaID validates a single persona ID
func (pv *PersonaValidator) ValidatePersonaID(ctx context.Context, querier store.Querier, personaID uuid.UUID, expectedType models.PersonaTypeEnum) (*models.Persona, error) {
	persona, err := pv.personaStore.GetPersonaByID(ctx, querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			return nil, fmt.Errorf("%s persona ID '%s' not found", expectedType, personaID)
		}
		return nil, fmt.Errorf("verifying %s persona ID '%s': %w", expectedType, personaID, err)
	}
	if persona.PersonaType != expectedType {
		return nil, fmt.Errorf("persona ID '%s' type '%s', expected '%s'", personaID, persona.PersonaType, expectedType)
	}
	if !persona.IsEnabled {
		return nil, fmt.Errorf("%s persona ID '%s' disabled", expectedType, personaID)
	}
	return persona, nil
}
