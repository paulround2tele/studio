// src/lib/services/personaService.ts
// Production-ready Persona Service using OpenAPI types directly
import { personasApi } from '@/lib/api-client/client';
import { CookieHandling } from '@/lib/api-client/models/cookie-handling';

// Use proper OpenAPI types from models (not the broken schemas)
import type { CreatePersonaRequest } from '@/lib/api-client/models/create-persona-request';
import type { UpdatePersonaRequest } from '@/lib/api-client/models/update-persona-request';
import type { components } from '@/lib/api-client/types';

type Persona = components['schemas']['PersonaResponse'];
type PersonaTestResult = components['schemas']['PersonaTestResponse'];

// Export the types for use in other files
export type { CreatePersonaRequest, UpdatePersonaRequest };

// Import unified API response wrapper and utilities
import type { ApiResponse } from '@/lib/types';
import {
  extractResponseData
} from '@/lib/utils/apiResponseHelpers';

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
export type PersonaListResponse = components['schemas']['PersonaResponse'];

export async function createPersona(payload: CreatePersonaRequest): Promise<ApiResponse<Persona>> {
  try {
    const convertedPayload = convertPersonaPayload(payload);
    const axiosResponse = await personasApi.createPersona(convertedPayload);
    const persona = extractResponseData<Persona>(axiosResponse);
    const requestId = globalThis.crypto?.randomUUID?.() || `create-persona-${Date.now()}`;
    
    return {
      success: true,
      data: persona!,
      error: null,
      requestId
    };
  } catch (error: any) {
    console.error('[PersonaService] Error creating persona:', error);
    return {
      success: false,
      data: undefined as any,
      error: error.message || 'Failed to create persona',
      requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
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
    const axiosResponse = await personasApi.listAllPersonas(
      options?.limit,
      options?.offset,
      options?.isEnabled,
      options?.personaType
    );
    const personas = extractResponseData<Persona[]>(axiosResponse);
    const requestId = globalThis.crypto?.randomUUID?.() || `list-personas-${Date.now()}`;
    
    return {
      success: true,
      data: personas || [],
      error: null,
      requestId
    };
  } catch (error: any) {
    console.error('[PersonaService] Error listing personas:', error);
    return {
      success: false,
      data: undefined as any,
      error: error.message || 'Failed to list personas',
      requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
    };
  }
}

export async function getPersonaById(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<Persona>> {
  try {
    const axiosResponse = await personasApi.getPersonaByID(personaId);
    const persona = extractResponseData<Persona>(axiosResponse);
    const requestId = globalThis.crypto?.randomUUID?.() || `get-persona-${Date.now()}`;
    
    return {
      success: true,
      data: persona!,
      error: null,
      requestId
    };
  } catch (error: any) {
    console.error('[PersonaService] Error getting persona by ID:', error);
    return {
      success: false,
      data: undefined as any,
      error: error.message || 'Failed to get persona',
      requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
    };
  }
}

export async function updatePersona(personaId: string, payload: UpdatePersonaRequest, _personaType?: 'http' | 'dns'): Promise<ApiResponse<Persona>> {
  try {
    const convertedPayload = convertPersonaPayload(payload);
    const axiosResponse = await personasApi.updatePersona(personaId, convertedPayload);
    const persona = extractResponseData<Persona>(axiosResponse);
    const requestId = globalThis.crypto?.randomUUID?.() || `update-persona-${Date.now()}`;
    
    return {
      success: true,
      data: persona!,
      error: null,
      requestId
    };
  } catch (error: any) {
    console.error('[PersonaService] Error updating persona:', error);
    return {
      success: false,
      data: undefined as any,
      error: error.message || 'Failed to update persona',
      requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
    };
  }
}

export async function deletePersona(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<null>> {
  try {
    const axiosResponse = await personasApi.deletePersona(personaId);
    extractResponseData<null>(axiosResponse);
    const requestId = globalThis.crypto?.randomUUID?.() || `delete-persona-${Date.now()}`;
    
    return {
      success: true,
      data: null,
      error: null,
      requestId
    };
  } catch (error: any) {
    console.error('[PersonaService] Error deleting persona:', error);
    return {
      success: false,
      data: undefined as any,
      error: error.message || 'Failed to delete persona',
      requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
    };
  }
}

export async function testPersona(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<PersonaTestResult>> {
  try {
    const axiosResponse = await personasApi.testPersona(personaId);
    const testResult = extractResponseData<PersonaTestResult>(axiosResponse);
    const requestId = globalThis.crypto?.randomUUID?.() || `test-persona-${Date.now()}`;
    
    return {
      success: true,
      data: testResult!,
      error: null,
      requestId
    };
  } catch (error: any) {
    console.error('[PersonaService] Error testing persona:', error);
    return {
      success: false,
      data: undefined as any,
      error: error.message || 'Failed to test persona',
      requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`
    };
  }
}

// Helper functions for filtering personas by type
export async function getPersonasByType(personaType: 'dns' | 'http'): Promise<ApiResponse<Persona[]>> {
  const allPersonas = await listPersonas();
  if (allPersonas.success && allPersonas.data) {
    const filteredPersonas = allPersonas.data.filter(persona => persona.personaType === personaType);
    return {
      ...allPersonas,
      data: filteredPersonas,
      message: `${personaType.toUpperCase()} personas retrieved successfully`
    };
  }
  return allPersonas;
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