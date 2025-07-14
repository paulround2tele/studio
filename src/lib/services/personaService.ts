// src/lib/services/personaService.ts
// Production-ready Persona Service using OpenAPI types directly
import { personasApi } from '@/lib/api-client/client';
import { CookieHandlingModeEnum } from '@/lib/api-client/models/cookie-handling';
import type { components } from '@/lib/api-client/types';

// Use OpenAPI types directly
type Persona = components["schemas"]["api.PersonaResponse"];
type CreatePersonaRequest = components["schemas"]["api.CreatePersonaRequest"];
type UpdatePersonaRequest = components["schemas"]["api.UpdatePersonaRequest"];
type PersonaTestResult = components["schemas"]["api.PersonaTestResultData"];

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';

// Cookie mode conversion utility
const convertCookieMode = (mode: string): CookieHandlingModeEnum => {
  switch (mode) {
    case 'preserve': return CookieHandlingModeEnum.Preserve;
    case 'ignore': return CookieHandlingModeEnum.Ignore;
    case 'custom': return CookieHandlingModeEnum.Custom;
    case 'clear': return CookieHandlingModeEnum.Clear;
    case 'session_only': return CookieHandlingModeEnum.SessionOnly;
    default: return CookieHandlingModeEnum.Preserve;
  }
};

// Convert payload to ensure enums are properly typed
const convertPersonaPayload = (payload: any): any => {
  if (!payload.configDetails) return payload;
  
  const converted = { ...payload };
  if (converted.configDetails.cookieHandling?.mode) {
    converted.configDetails = {
      ...converted.configDetails,
      cookieHandling: {
        ...converted.configDetails.cookieHandling,
        mode: convertCookieMode(converted.configDetails.cookieHandling.mode)
      }
    };
  }
  
  return converted;
};

// Import additional OpenAPI persona types
export type PersonaListResponse = components["schemas"]["api.PersonaResponse"];

export async function createPersona(payload: CreatePersonaRequest): Promise<ApiResponse<Persona>> {
  try {
    const convertedPayload = convertPersonaPayload(payload);
    const response = await personasApi.personasPost(convertedPayload);
    // Axios response structure: response.data = API wrapper object
    const apiResponse = 'data' in response ? response.data : response;
    
    // Extract persona from API response structure: { status, data: Persona, message }
    const persona = (apiResponse as any)?.data || apiResponse;
    const message = (apiResponse as any)?.message || 'Persona created successfully';
    
    return {
      status: 'success',
      data: persona as Persona,
      message: message
    };
  } catch (error: any) {
    // Extract error message from API response
    const apiError = error?.response?.data;
    const errorMessage = apiError?.message || error?.message || 'Unknown error occurred';
    
    return {
      status: 'error',
      message: errorMessage
    };
  }
}

export async function listPersonas(options?: {
  limit?: number;
  offset?: number;
  isEnabled?: boolean;
  personaType?: string;
}): Promise<ApiResponse<Persona[]>> {
  try {
    // Request all personas with high limit to avoid pagination truncation
    // Database has 39 total personas (7 DNS + 32 HTTP), so 100 is safe
    const response = await personasApi.personasGet(
      options?.limit || 100,
      options?.offset,
      options?.isEnabled,
      options?.personaType
    );
    // Axios response structure: response.data = PersonaListResponse
    const personaListResponse = 'data' in response ? response.data : response;
    
    // Extract personas array from PersonaListResponse.data
    const personasArray = (personaListResponse?.data || []) as Persona[];
    
    return {
      status: 'success',
      data: personasArray,
      message: personaListResponse?.message || 'Personas retrieved successfully'
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
    const convertedPayload = convertPersonaPayload(payload);
    const response = await personasApi.updatePersona(personaId, convertedPayload);
    // Axios response structure: response.data = API wrapper object
    const apiResponse = 'data' in response ? response.data : response;
    
    // Extract persona from API response structure: { status, data: Persona, message }
    const persona = (apiResponse as any)?.data || apiResponse;
    const message = (apiResponse as any)?.message || 'Persona updated successfully';
    
    return {
      status: 'success',
      data: persona as Persona,
      message: message
    };
  } catch (error: any) {
    // Extract error message from API response
    const apiError = error?.response?.data;
    const errorMessage = apiError?.message || error?.message || 'Unknown error occurred';
    
    return {
      status: 'error',
      message: errorMessage
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