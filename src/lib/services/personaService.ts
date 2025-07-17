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
  safeApiCall
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
  const convertedPayload = convertPersonaPayload(payload);
  return await safeApiCall<Persona>(
    () => personasApi.createPersona(convertedPayload),
    'Creating persona'
  );
}

export async function listPersonas(options?: {
  limit?: number;
  offset?: number;
  isEnabled?: boolean;
  personaType?: string;
}): Promise<ApiResponse<Persona[]>> {
  return await safeApiCall<Persona[]>(
    () => personasApi.listAllPersonas(
      options?.limit,
      options?.offset,
      options?.isEnabled,
      options?.personaType
    ),
    'Listing personas'
  );
}

export async function getPersonaById(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<Persona>> {
  return await safeApiCall<Persona>(
    () => personasApi.getPersonaByID(personaId),
    'Getting persona by ID'
  );
}

export async function updatePersona(personaId: string, payload: UpdatePersonaRequest, _personaType?: 'http' | 'dns'): Promise<ApiResponse<Persona>> {
  const convertedPayload = convertPersonaPayload(payload);
  return await safeApiCall<Persona>(
    () => personasApi.updatePersona(personaId, convertedPayload),
    'Updating persona'
  );
}

export async function deletePersona(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<null>> {
  return await safeApiCall<null>(
    () => personasApi.deletePersona(personaId),
    'Deleting persona'
  );
}

export async function testPersona(personaId: string, _personaType?: 'http' | 'dns'): Promise<ApiResponse<PersonaTestResult>> {
  return await safeApiCall<PersonaTestResult>(
    () => personasApi.testPersona(personaId),
    'Testing persona'
  );
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