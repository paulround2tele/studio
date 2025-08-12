// src/lib/services/personaService.professional.ts
// ✅ PROFESSIONAL PERSONA SERVICE - Reality-Based Implementation
// Uses ONLY actual generated API methods and types - NO AMATEUR PATTERNS

import { personasApi } from '@/lib/api-client/client';
import type { 
  PersonaResponse as Persona, 
  CreatePersonaRequest, 
  UpdatePersonaRequest, 
  PersonaTestResponse as PersonaTestResult 
} from '@/lib/api-client/professional-types';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

// ===========================================================================================
// PROFESSIONAL SERVICE INTERFACE - Clean, type-safe, reality-based
// ===========================================================================================

interface PersonaServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Professional Persona Service
 * Uses ACTUAL generated API methods - no fantasy method names
 * Uses ACTUAL generated types - no schema path assumptions
 * Clean error handling - no amateur unified response wrappers
 */
class PersonaService {
  private static instance: PersonaService;

  static getInstance(): PersonaService {
    if (!PersonaService.instance) {
      PersonaService.instance = new PersonaService();
    }
    return PersonaService.instance;
  }

  // ===========================================================================================
  // CREATE PERSONA - Using ACTUAL personasPost method
  // ===========================================================================================
  
  async createPersona(payload: CreatePersonaRequest): Promise<PersonaServiceResult<Persona>> {
    logger.info('PERSONA_SERVICE', 'Creating persona', { personaType: payload.personaType });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await personasApi.personasPost(payload);
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const persona = response.data;
      
      logger.info('PERSONA_SERVICE', 'Persona created successfully', { 
        personaId: persona?.id,
        personaType: persona?.personaType 
      });

      return {
        success: true,
        data: persona
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create persona';
      logger.error('PERSONA_SERVICE', 'Create persona failed', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // LIST PERSONAS - Using ACTUAL personasGet method
  // ===========================================================================================
  
  async listPersonas(options: {
    limit?: number;
    offset?: number;
    isEnabled?: boolean;
    personaType?: string;
  } = {}): Promise<PersonaServiceResult<Persona[]>> {
    logger.info('PERSONA_SERVICE', 'Listing personas', options);

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await personasApi.personasGet(
        options.limit,
        options.offset,
        options.isEnabled,
        options.personaType
      );
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const personas = response.data || [];
      
      logger.info('PERSONA_SERVICE', 'Personas listed successfully', { 
        count: Array.isArray(personas) ? personas.length : 0
      });

      return {
        success: true,
        data: Array.isArray(personas) ? personas : []
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list personas';
      logger.error('PERSONA_SERVICE', 'List personas failed', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // GET PERSONA BY ID - Using ACTUAL personasIdGet method
  // ===========================================================================================
  
  async getPersonaById(personaId: string): Promise<PersonaServiceResult<Persona>> {
    logger.info('PERSONA_SERVICE', 'Getting persona by ID', { personaId });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await personasApi.personasIdGet(personaId);
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const persona = response.data;
      
      logger.info('PERSONA_SERVICE', 'Persona retrieved successfully', { 
        personaId,
        personaType: persona?.personaType 
      });

      return {
        success: true,
        data: persona
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get persona';
      logger.error('PERSONA_SERVICE', 'Get persona failed', { personaId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // UPDATE PERSONA - Using ACTUAL personasIdPut method
  // ===========================================================================================
  
  async updatePersona(personaId: string, payload: UpdatePersonaRequest): Promise<PersonaServiceResult<Persona>> {
    logger.info('PERSONA_SERVICE', 'Updating persona', { personaId });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await personasApi.personasIdPut(personaId, payload);
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const persona = response.data;
      
      logger.info('PERSONA_SERVICE', 'Persona updated successfully', { 
        personaId,
        personaType: persona?.personaType 
      });

      return {
        success: true,
        data: persona
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update persona';
      logger.error('PERSONA_SERVICE', 'Update persona failed', { personaId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // DELETE PERSONA - Using ACTUAL personasIdDelete method
  // ===========================================================================================
  
  async deletePersona(personaId: string): Promise<PersonaServiceResult<void>> {
    logger.info('PERSONA_SERVICE', 'Deleting persona', { personaId });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      await personasApi.personasIdDelete(personaId);
      
      logger.info('PERSONA_SERVICE', 'Persona deleted successfully', { personaId });

      return {
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete persona';
      logger.error('PERSONA_SERVICE', 'Delete persona failed', { personaId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // ===========================================================================================
  // TEST PERSONA - Using ACTUAL personasIdTestPost method
  // ===========================================================================================
  
  async testPersona(personaId: string): Promise<PersonaServiceResult<PersonaTestResult>> {
    logger.info('PERSONA_SERVICE', 'Testing persona', { personaId });

    try {
      // ✅ PROFESSIONAL REALITY - Using ACTUAL generated method
      const response = await personasApi.personasIdTestPost(personaId);
      
      // ✅ PROFESSIONAL TYPE HANDLING - Trust the generator
      const testResult = response.data;
      
      logger.info('PERSONA_SERVICE', 'Persona tested successfully', { 
        personaId,
        success: testResult?.success 
      });

      return {
        success: true,
        data: testResult
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test persona';
      logger.error('PERSONA_SERVICE', 'Test persona failed', { personaId, error: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

// ===========================================================================================
// PROFESSIONAL EXPORTS
// ===========================================================================================

export { PersonaService };
export type { PersonaServiceResult };

// Singleton instance for convenience
export const personaService = PersonaService.getInstance();

// ===========================================================================================
// PROFESSIONAL USAGE EXAMPLES
// ===========================================================================================

/*
// ✅ PROFESSIONAL SERVICE USAGE
import { personaService } from '@/lib/services/personaService.professional';

// Create persona
const createResult = await personaService.createPersona({
  personaType: 'http',
  name: 'Test Persona',
  // ... other required fields
});

if (createResult.success && createResult.data) {
  console.log('Persona created:', createResult.data.id);
} else {
  console.error('Creation failed:', createResult.error);
}

// List personas
const listResult = await personaService.listPersonas({ 
  limit: 10, 
  personaType: 'http' 
});

if (listResult.success && listResult.data) {
  console.log('Found personas:', listResult.data.length);
}
*/
