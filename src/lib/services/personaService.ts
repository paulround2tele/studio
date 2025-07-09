// src/lib/services/personaService.ts
// Production-ready Persona Service using OpenAPI types directly
import { PersonasApi, Configuration } from '@/lib/api-client';
import type { components } from '@/lib/api-client/types';

// Create configured PersonasApi instance
const config = new Configuration({
  basePath: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v2'
});
const personasApi = new PersonasApi(config);

// Use OpenAPI types directly
type Persona = components["schemas"]["Persona"];
type CreatePersonaRequest = components["schemas"]["CreatePersonaRequest"];
type UpdatePersonaRequest = components["schemas"]["UpdatePersonaRequest"];
type PersonaTestResult = components["schemas"]["PersonaTestResult"];

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';

// Import additional OpenAPI persona types
export type PersonaListResponse = components["schemas"]["PersonaListResponse"];

export async function createPersona(payload: CreatePersonaRequest): Promise<ApiResponse<Persona>> {
  try {
    const response = await personasApi.createPersona(payload);
    const result = 'data' in response ? response.data : response;
    return {
      status: 'success',
      data: result as Persona,
      message: 'Persona created successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function listPersonas(): Promise<ApiResponse<Persona[]>> {
  try {
    const response = await personasApi.listPersonas();
    const result = 'data' in response ? response.data : response;
    return {
      status: 'success',
      data: Array.isArray(result) ? result : [],
      message: 'Personas retrieved successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

export async function getPersonaById(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<Persona>> {
  try {
    const response = await personasApi.getPersonaById(personaId);
    const result = 'data' in response ? response.data : response;
    return {
      status: 'success',
      data: result as Persona,
      message: 'Persona retrieved successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updatePersona(personaId: string, payload: UpdatePersonaRequest, _personaType?: 'http' | 'dns'): Promise<ApiResponse<Persona>> {
  try {
    const response = await personasApi.updatePersona(personaId, payload);
    const result = 'data' in response ? response.data : response;
    return {
      status: 'success',
      data: result as Persona,
      message: 'Persona updated successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function deletePersona(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<null>> {
  try {
    await personasApi.deletePersona(personaId);
    return {
      status: 'success',
      data: null,
      message: 'Persona deleted successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function testPersona(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<PersonaTestResult>> {
  try {
    const response = await personasApi.testPersona(personaId);
    const result = 'data' in response ? response.data : response;
    return {
      status: 'success',
      data: result,
      message: 'Persona test completed successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper functions for filtering personas by type
export async function getPersonasByType(personaType: 'dns' | 'http'): Promise<ApiResponse<Persona[]>> {
  try {
    const allPersonas = await listPersonas();
    if (allPersonas.status === 'success' && allPersonas.data) {
      const filteredPersonas = allPersonas.data.filter(persona => persona.personaType === personaType);
      return {
        status: 'success',
        data: filteredPersonas,
        message: `${personaType.toUpperCase()} personas retrieved successfully`
      };
    }
    return allPersonas;
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

// Backward compatibility aliases
export const createHttpPersona = createPersona;
export const createDnsPersona = createPersona;
export const listHttpPersonas = () => getPersonasByType('http');
export const listDnsPersonas = () => getPersonasByType('dns');
export const getHttpPersonaById = getPersonaById;
export const getDnsPersonaById = getPersonaById;
export const updateHttpPersona = updatePersona;
export const updateDnsPersona = updatePersona;
export const deleteHttpPersona = deletePersona;
export const deleteDnsPersona = deletePersona;

// Export for backward compatibility
export async function getPersonas(type: 'http' | 'dns'): Promise<ApiResponse<Persona[]>> {
  return getPersonasByType(type);
}