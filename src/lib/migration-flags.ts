/**
 * Frontend Migration Feature Flags
 * Controls rollout of migrated components for stability
 */

export const MIGRATION_FLAGS = {
  // Phase 1: Atomic Components - Conservative rollout
  BUTTON_V2: process.env.NEXT_PUBLIC_ENABLE_BUTTON_V2 === 'true',
  INPUT_V2: process.env.NEXT_PUBLIC_ENABLE_INPUT_V2 === 'true',
  LABEL_V2: process.env.NEXT_PUBLIC_ENABLE_LABEL_V2 === 'true',
  BADGE_V2: process.env.NEXT_PUBLIC_ENABLE_BADGE_V2 === 'true',
  SEPARATOR_V2: process.env.NEXT_PUBLIC_ENABLE_SEPARATOR_V2 === 'true',
  
  // Additional Phase 1 components
  CHECKBOX_V2: process.env.NEXT_PUBLIC_ENABLE_CHECKBOX_V2 === 'true',
  RADIO_V2: process.env.NEXT_PUBLIC_ENABLE_RADIO_V2 === 'true',
  SWITCH_V2: process.env.NEXT_PUBLIC_ENABLE_SWITCH_V2 === 'true',
  SLIDER_V2: process.env.NEXT_PUBLIC_ENABLE_SLIDER_V2 === 'true',
  PROGRESS_V2: process.env.NEXT_PUBLIC_ENABLE_PROGRESS_V2 === 'true',
  
  // Phase 2: Molecular Components (Planned)
  SELECT_V2: false,
  DIALOG_V2: false,
  CARD_V2: false,
  
  // Phase 3: Organism Components (Planned)
  FORM_V2: false,
  TABLE_V2: false,
} as const;

export type MigrationFlag = keyof typeof MIGRATION_FLAGS;

/**
 * Hook to check if a migration flag is enabled
 * @param flag - The migration flag to check
 * @returns boolean indicating if the flag is enabled
 */
export function useMigrationFlag(flag: MigrationFlag): boolean {
  return MIGRATION_FLAGS[flag];
}

/**
 * Utility to get all enabled migration flags
 * @returns Array of enabled flag names
 */
export function getEnabledFlags(): MigrationFlag[] {
  return Object.entries(MIGRATION_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag as MigrationFlag);
}

/**
 * Utility to check if any migration flags are enabled
 * @returns boolean indicating if any migrations are active
 */
export function hasMigrationsEnabled(): boolean {
  return Object.values(MIGRATION_FLAGS).some(Boolean);
}
