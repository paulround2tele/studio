// src/lib/services/personaService.ts
// Production-ready Persona Service using OpenAPI types directly
import { apiClient, type components } from '@/lib/api-client/client';

// Use OpenAPI types directly
type PersonaResponse = components["schemas"]["PersonaResponse"];
type CreatePersonaRequest = components["schemas"]["CreatePersonaRequest"];
type UpdatePersonaRequest = components["schemas"]["UpdatePersonaRequest"];
type PersonaTestResult = components["schemas"]["PersonaTestResult"];

// API Response wrapper type
interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export async function createPersona(payload: CreatePersonaRequest): Promise<ApiResponse<PersonaResponse>> {
  try {
    const result = await apiClient.createPersona(payload);
    return {
      status: 'success',
      data: result,
      message: 'Persona created successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function listPersonas(): Promise<ApiResponse<PersonaResponse[]>> {
  try {
    const result = await apiClient.listPersonas();
    return {
      status: 'success',
      data: result.data || [],
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

export async function getPersonaById(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<PersonaResponse>> {
  try {
    const result = await apiClient.getPersonaById(personaId);
    return {
      status: 'success',
      data: result,
      message: 'Persona retrieved successfully'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function updatePersona(personaId: string, payload: UpdatePersonaRequest, _personaType?: 'http' | 'dns'): Promise<ApiResponse<PersonaResponse>> {
  try {
    const result = await apiClient.updatePersona(personaId, payload);
    return {
      status: 'success',
      data: result,
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
    await apiClient.deletePersona(personaId);
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
    const result = await apiClient.testPersona(personaId);
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
export async function getPersonasByType(personaType: 'dns' | 'http'): Promise<ApiResponse<PersonaResponse[]>> {
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
export async function getPersonas(type: 'http' | 'dns'): Promise<ApiResponse<PersonaResponse[]>> {
  return getPersonasByType(type);
}