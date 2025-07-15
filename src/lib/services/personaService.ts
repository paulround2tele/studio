// src/lib/services/personaService.ts
// Production-ready Persona Service using OpenAPI types directly
import { personasApi } from '@/lib/api-client/client';
import { CookieHandling } from '@/lib/api-client/models/cookie-handling';

// Use proper OpenAPI types from models (not the broken schemas)
import type { CreatePersonaRequest } from '@/lib/api-client/models/create-persona-request';
import type { UpdatePersonaRequest } from '@/lib/api-client/models/update-persona-request';

type Persona = FrontendPersona;
type PersonaTestResult = FrontendPersonaTestResult;

// Export the types for use in other files
export type { CreatePersonaRequest, UpdatePersonaRequest };

// Import unified API response wrapper
import type { ApiResponse } from '@/lib/types';
import type { FrontendPersona, FrontendPersonaTestResult } from '@/lib/types/frontend-safe-types';

// Cookie mode conversion utility
const convertCookieMode = (mode: string): CookieHandling => {
  switch (mode) {
    case 'preserve': return 'preserve' as any;
    case 'ignore': return 'ignore' as any;
    case 'custom': return 'custom' as any;
    case 'clear': return 'clear' as any;
    case 'session_only': return 'session_only' as any;
    default: return 'preserve' as any;
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
export type PersonaListResponse = FrontendPersona;

export async function createPersona(payload: CreatePersonaRequest): Promise<ApiResponse<Persona>> {
  try {
    const convertedPayload = convertPersonaPayload(payload);
    const response = await personasApi.createPersona(convertedPayload);
    
    // Handle new Swagger-generated API response format: { success: true, data: Persona }
    const responseData = 'data' in response ? response.data : response;
    let personaData: Persona | null = null;
    let message = 'Persona created successfully';
    
    if (responseData && typeof responseData === 'object') {
      if ('success' in responseData && responseData.success === true && 'data' in responseData) {
        // New format: { success: true, data: Persona, requestId: string }
        const nestedData = responseData.data;
        if (nestedData && typeof nestedData === 'object') {
          personaData = nestedData as Persona;
        }
        message = (responseData as any)?.message || message;
      } else if ('id' in responseData) {
        // Legacy direct persona format
        personaData = responseData as Persona;
        message = (responseData as any)?.message || message;
      } else {
        // Legacy API wrapper format: { status, data: Persona, message }
        personaData = (responseData as any)?.data || responseData;
        message = (responseData as any)?.message || message;
      }
    }
    
    if (!personaData) {
      throw new Error('Persona not found in response');
    }
    
    return {
      status: 'success',
      data: personaData,
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
    const response = await personasApi.listAllPersonas(
      options?.limit || 100,
      options?.offset,
      options?.isEnabled,
      options?.personaType
    );
    
    // Handle new Swagger-generated API response format: { success: true, data: Persona[] }
    const responseData = 'data' in response ? response.data : response;
    let personasArray: Persona[] = [];
    
    if (responseData && typeof responseData === 'object') {
      if ('success' in responseData && responseData.success === true && 'data' in responseData) {
        // New format: { success: true, data: Persona[], requestId: string }
        const nestedData = responseData.data;
        if (Array.isArray(nestedData)) {
          personasArray = nestedData as Persona[];
        }
      } else if (Array.isArray(responseData)) {
        // Legacy direct array format
        personasArray = responseData as Persona[];
      }
    }
    
    return {
      status: 'success',
      data: personasArray,
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
    const response = await personasApi.getPersonaByID(personaId);
    
    // Handle new Swagger-generated API response format: { success: true, data: Persona }
    const responseData = 'data' in response ? response.data : response;
    let personaData: Persona | null = null;
    
    if (responseData && typeof responseData === 'object') {
      if ('success' in responseData && responseData.success === true && 'data' in responseData) {
        // New format: { success: true, data: Persona, requestId: string }
        const nestedData = responseData.data;
        if (nestedData && typeof nestedData === 'object') {
          personaData = nestedData as Persona;
        }
      } else if ('id' in responseData) {
        // Legacy direct persona format
        personaData = responseData as Persona;
      }
    }
    
    if (!personaData) {
      throw new Error('Persona not found in response');
    }
    
    return {
      status: 'success',
      data: personaData,
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
    
    // Handle new Swagger-generated API response format: { success: true, data: Persona }
    const responseData = 'data' in response ? response.data : response;
    let personaData: Persona | null = null;
    let message = 'Persona updated successfully';
    
    if (responseData && typeof responseData === 'object') {
      if ('success' in responseData && responseData.success === true && 'data' in responseData) {
        // New format: { success: true, data: Persona, requestId: string }
        const nestedData = responseData.data;
        if (nestedData && typeof nestedData === 'object') {
          personaData = nestedData as Persona;
        }
        message = (responseData as any)?.message || message;
      } else if ('id' in responseData) {
        // Legacy direct persona format
        personaData = responseData as Persona;
        message = (responseData as any)?.message || message;
      } else {
        // Legacy API wrapper format: { status, data: Persona, message }
        personaData = (responseData as any)?.data || responseData;
        message = (responseData as any)?.message || message;
      }
    }
    
    if (!personaData) {
      throw new Error('Persona not found in response');
    }
    
    return {
      status: 'success',
      data: personaData,
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
    
    // Handle new Swagger-generated API response format: { success: true, data: PersonaTestResult }
    const responseData = 'data' in response ? response.data : response;
    let testResult: PersonaTestResult | null = null;
    
    if (responseData && typeof responseData === 'object') {
      if ('success' in responseData && responseData.success === true && 'data' in responseData) {
        // New format: { success: true, data: PersonaTestResult, requestId: string }
        const nestedData = responseData.data;
        if (nestedData && typeof nestedData === 'object') {
          testResult = nestedData as PersonaTestResult;
        }
      } else {
        // Legacy direct result format
        testResult = responseData as PersonaTestResult;
      }
    }
    
    if (!testResult) {
      throw new Error('Test result not found in response');
    }
    
    return {
      status: 'success',
      data: testResult,
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