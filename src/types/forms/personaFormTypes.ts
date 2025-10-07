import type { PersonaConfigDetails } from '@/lib/api-client/models/persona-config-details';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';

export type PersonaConfigVariant = PersonaConfigDetails; // Reuse generated union directly

export interface PersonaFormValues {
  name: string;
  description?: string;
  isEnabled: boolean;
  configDetails: PersonaConfigVariant | null;
}

export function personaToFormValues(persona: PersonaResponse): PersonaFormValues {
  return {
    name: persona.name || '',
    description: persona.description || '',
    isEnabled: Boolean(persona.isEnabled),
    configDetails: persona.configDetails ?? null
  };
}

export function formValuesToPersonaUpdate(values: PersonaFormValues) {
  return {
    name: values.name,
    description: values.description,
    isEnabled: values.isEnabled,
    configDetails: values.configDetails || undefined
  };
}
