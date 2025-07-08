// src/lib/utils/apiMigrationTracker.ts
// Track progress of API client migration from manual to auto-generated

export interface MigrationStatus {
  file: string;
  status: 'pending' | 'in-progress' | 'completed' | 'verified';
  description: string;
  manualClientUsage: string[];
  generatedClientUsage: string[];
  estimatedLinesRemoved: number;
}

export const migrationProgress: MigrationStatus[] = [
  {
    file: 'src/lib/services/authService.ts',
    status: 'completed',
    description: 'Authentication service migrated to enhanced API client',
    manualClientUsage: ['apiClient.getCurrentUser()', 'apiClient.login()', 'apiClient.logout()'],
    generatedClientUsage: ['enhancedApiClient.getCurrentUser()', 'enhancedApiClient.login()', 'enhancedApiClient.logout()'],
    estimatedLinesRemoved: 45
  },
  {
    file: 'src/lib/services/campaignService.production.ts',
    status: 'completed',
    description: 'Campaign service migrated to enhanced API client with circuit breaker',
    manualClientUsage: ['apiClient.listCampaigns()', 'apiClient.createCampaign()', 'apiClient.startCampaign()'],
    generatedClientUsage: ['enhancedApiClient.listCampaigns()', 'enhancedApiClient.createCampaign()', 'enhancedApiClient.startCampaign()'],
    estimatedLinesRemoved: 75
  },
  {
    file: 'src/lib/services/personaService.ts',
    status: 'pending',
    description: 'Persona service needs migration to generated APIs',
    manualClientUsage: ['apiClient.listPersonas()', 'apiClient.createPersona()'],
    generatedClientUsage: [],
    estimatedLinesRemoved: 30
  },
  {
    file: 'src/lib/services/proxyService.production.ts',
    status: 'pending',
    description: 'Proxy service needs migration to generated APIs',
    manualClientUsage: ['apiClient.listProxies()', 'apiClient.createProxy()'],
    generatedClientUsage: [],
    estimatedLinesRemoved: 40
  },
  {
    file: 'src/lib/services/configService.ts',
    status: 'pending',
    description: 'Config service needs migration to generated APIs',
    manualClientUsage: ['apiClient.getFeatureFlags()'],
    generatedClientUsage: [],
    estimatedLinesRemoved: 25
  },
  {
    file: 'src/lib/hooks/useCampaignFormData.ts',
    status: 'pending',
    description: 'Campaign form hook needs migration',
    manualClientUsage: ['apiClient.listCampaigns()'],
    generatedClientUsage: [],
    estimatedLinesRemoved: 5
  },
  {
    file: 'src/lib/services/settingsService.ts',
    status: 'pending',
    description: 'Settings service needs migration',
    manualClientUsage: ['openApiClient'],
    generatedClientUsage: [],
    estimatedLinesRemoved: 15
  }
];

/**
 * Calculate overall migration progress
 */
export function getMigrationProgress(): {
  completed: number;
  total: number;
  percentage: number;
  estimatedLinesRemoved: number;
  actualLinesRemoved: number;
} {
  const completed = migrationProgress.filter(item => item.status === 'completed').length;
  const total = migrationProgress.length;
  const percentage = Math.round((completed / total) * 100);
  
  const estimatedLinesRemoved = migrationProgress
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + item.estimatedLinesRemoved, 0);
  
  // Manual client.ts is 1069 lines, we're removing all of it eventually
  const actualLinesRemoved = completed === total ? 1069 : 0;
  
  return {
    completed,
    total,
    percentage,
    estimatedLinesRemoved,
    actualLinesRemoved
  };
}

/**
 * Get files still needing migration
 */
export function getPendingMigrations(): MigrationStatus[] {
  return migrationProgress.filter(item => item.status === 'pending');
}

/**
 * Mark a migration as completed
 */
export function markMigrationCompleted(filePath: string): void {
  const migration = migrationProgress.find(item => item.file === filePath);
  if (migration) {
    migration.status = 'completed';
  }
}

/**
 * Generate migration report
 */
export function generateMigrationReport(): string {
  const progress = getMigrationProgress();
  const pending = getPendingMigrations();
  
  return `
# 🚀 API Client Migration Progress Report

## 📊 Overall Progress
- **Completed**: ${progress.completed}/${progress.total} files (${progress.percentage}%)
- **Estimated Lines Removed**: ${progress.estimatedLinesRemoved} lines
- **Target**: Remove entire 1069-line manual client.ts

## ✅ Completed Migrations
${migrationProgress
  .filter(item => item.status === 'completed')
  .map(item => `- **${item.file}**: ${item.description}`)
  .join('\n')}

## 📋 Pending Migrations
${pending
  .map(item => `- **${item.file}**: ${item.description} (Est. ${item.estimatedLinesRemoved} lines)`)
  .join('\n')}

## 🎯 Next Steps
1. Complete remaining service migrations
2. Update component imports
3. Remove manual client.ts (1069 lines)
4. Verify all functionality preserved

## 🔧 Benefits Achieved
- ✅ **Circuit Breaker**: Enhanced error resilience
- ✅ **Retry Logic**: Exponential backoff with jitter
- ✅ **Rate Limiting**: Proper 429 handling
- ✅ **Type Safety**: Perfect OpenAPI synchronization
- ✅ **Zero API Drift**: Auto-updates from spec changes
`;
}