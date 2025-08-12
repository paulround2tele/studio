#!/usr/bin/env tsx

/*
 * Post-Generation API Client Cleaner (Professional Edition)
 * 
 * This script systematically eliminates legacy garbage from OpenAPI generator
 * and enforces professional patterns throughout the API client.
 * 
 * PURGED LEGACY GARBAGE:
 * - APIResponse from models/apiresponse.ts (replaced with unified-types)
 * - Enum conflicts between bulk-operations-api and monitoring-api
 * - Amateur wildcard exports that cause type conflicts
 */

import { writeFileSync, readFileSync, readdirSync } from 'fs';
import path from 'path';

const API_CLIENT_DIR = path.join(process.cwd(), 'src/lib/api-client');
const INDEX_FILE = path.join(API_CLIENT_DIR, 'index.ts');
const MODELS_DIR = path.join(API_CLIENT_DIR, 'models');
const MODELS_INDEX_FILE = path.join(MODELS_DIR, 'index.ts');
const API_FILE = path.join(API_CLIENT_DIR, 'api.ts');

/**
 * PURGE legacy APIResponse from models index - we use professional unified-types instead
 */
function purgeModelsIndex(): void {
  console.log('🗑️  Purging legacy garbage from models/index.ts...');
  
  try {
    // Get all model files EXCEPT legacy garbage and invalid files
    const modelFiles = readdirSync(MODELS_DIR)
      .filter(file => file.endsWith('.ts') && file !== 'index.ts')
      .filter(file => {
        const modelName = file.replace('.ts', '');
        const legacyGarbage = [
          'apiresponse',       // We have professional APIResponse in unified-types
          'api-response',      // Redundant with above
          'error-detail',      // We have professional ErrorDetail in unified-types
          'errordetail',       // Alternative naming
          'error-info',        // We have professional ErrorInfo in unified-types
          'errorinfo',         // Alternative naming
          'metadata',          // We have professional Metadata in unified-types
          'page-info',         // We have professional PageInfo in unified-types
          'pageinfo',          // Alternative naming
          'processing-info',   // We have professional ProcessingInfo in unified-types
          'processinginfo',    // Alternative naming
          'rate-limit-info',   // We have professional RateLimitInfo in unified-types
          'ratelimitinfo',     // Alternative naming
          'session-data',      // We have professional SessionData in unified-types
          'sessiondata',       // Alternative naming
          'user-public-data',  // We have professional UserPublicData in unified-types
          'userpublicdata',    // Alternative naming
          'success-message',   // We have professional SuccessMessage in unified-types
          'successmessage',    // Alternative naming
          'session-refresh-data', // We have professional SessionRefreshData in unified-types
          'sessionrefreshdata',   // Alternative naming
        ];
        
        if (legacyGarbage.includes(modelName.toLowerCase())) {
          console.log(`🗑️  PURGED legacy garbage: ${modelName}`);
          return false;
        }
        
        // Purge numbered duplicates (generator incompetence) - keep the original, purge the numbered versions
        if (/\d+$/.test(modelName)) {
          console.log(`🗑️  PURGED numbered duplicate: ${modelName}`);
          return false;
        }
        
        // Check if file has valid exports (not empty/broken)
        try {
          const filePath = path.join(MODELS_DIR, file);
          const content = readFileSync(filePath, 'utf8');
          
          // Files without ANY exports are generator garbage
          const hasValidExports = content.includes('export interface ') || 
                                  content.includes('export type ') || 
                                  content.includes('export class ') ||
                                  content.includes('export const ') ||
                                  content.includes('export enum ');
          
          if (!hasValidExports) {
            console.log(`🗑️  PURGED broken generator file: ${modelName}`);
            return false;
          }
          
          return true;
        } catch (error) {
          console.log(`🗑️  PURGED invalid file: ${modelName}`);
          return false;
        }
      })
      .sort();
    
    // Generate clean models index
    const modelsIndexContent = `/* tslint:disable */
/* eslint-disable */
/**
 * Professional Models Index
 * 
 * Exports ALL professional model types
 * EXCLUDES legacy garbage that conflicts with unified-types
 * Generated: ${new Date().toISOString()}
 */

${modelFiles.map(file => {
  const modelName = file.replace('.ts', '');
  return `export * from './${modelName}';`;
}).join('\n')}
`;

    writeFileSync(MODELS_INDEX_FILE, modelsIndexContent, 'utf8');
    console.log(`✅ Models index cleaned! Now exporting ${modelFiles.length} professional models`);
    
  } catch (error) {
    console.error('❌ Failed to purge models index:', error);
    throw error;
  }
}

/**
 * Fix enum conflicts in the legacy api.ts file
 */
function fixLegacyApiFile(): void {
  console.log('🔧 Fixing enum conflicts in legacy api.ts...');
  
  try {
    const cleanApiContent = `/* tslint:disable */
/* eslint-disable */
/**
 * Domain Flow API
 * 
 * FIXED BY POST-GENERATION SCRIPT to remove enum conflicts
 * Generated: ${new Date().toISOString()}
 */

export * from './apis/analytics-api';
export * from './apis/authentication-api';

// Export bulk-operations-api first to take precedence for shared enums
export * from './apis/bulk-operations-api';

export * from './apis/campaigns-api';
export * from './apis/database-api';
export * from './apis/domains-api';
export * from './apis/feature-flags-api';
export * from './apis/health-api';
export * from './apis/keyword-extraction-api';
export * from './apis/keyword-sets-api';
export * from './apis/management-api';

// Export monitoring-api with explicit excludes to avoid enum conflicts
export {
  MonitoringApi,
  MonitoringApiAxiosParamCreator,
  MonitoringApiFp,
  MonitoringApiFactory
} from './apis/monitoring-api';

export * from './apis/personas-api';
export * from './apis/proxies-api';
export * from './apis/proxy-pools-api';
export * from './apis/resources-api';
export * from './apis/server-settings-api';
export * from './apis/sse-api';
export * from './apis/validation-api';
export * from './apis/websocket-api';
`;
    
    writeFileSync(API_FILE, cleanApiContent, 'utf8');
    console.log('✅ Legacy api.ts fixed - enum conflicts eliminated');
    
  } catch (error) {
    console.error('❌ Failed to fix legacy api.ts:', error);
    throw error;
  }
}

/**
 * Generate professional main index
 */
function generateProfessionalIndex(): void {
  console.log('🔧 Generating professional main index...');
  
  const professionalIndexContent = `/* tslint:disable */
/* eslint-disable */
/**
 * Domain Flow API Client - Professional Edition
 * 
 * Generated: ${new Date().toISOString()}
 * 
 * ✅ ALL legacy garbage ELIMINATED
 * ✅ Enum conflicts RESOLVED  
 * ✅ Professional patterns ENFORCED
 */

// ==================================================
// CORE CONFIGURATION
// ==================================================
export * from './configuration';
export * from './base';
export * from './common';

// ==================================================
// ALL API CLASSES (Professional Access)
// ==================================================
export * from './apis/analytics-api';
export * from './apis/authentication-api';

// Export bulk-operations-api first to take precedence for shared enums
export * from './apis/bulk-operations-api';

export * from './apis/campaigns-api';
export * from './apis/database-api';
export * from './apis/domains-api';
export * from './apis/feature-flags-api';
export * from './apis/health-api';
export * from './apis/keyword-extraction-api';
export * from './apis/keyword-sets-api';
export * from './apis/management-api';

// Export monitoring-api with explicit excludes to avoid enum conflicts
export {
  MonitoringApi,
  MonitoringApiAxiosParamCreator,
  MonitoringApiFp,
  MonitoringApiFactory
} from './apis/monitoring-api';

export * from './apis/personas-api';
export * from './apis/proxies-api';
export * from './apis/proxy-pools-api';
export * from './apis/resources-api';
export * from './apis/server-settings-api';
export * from './apis/sse-api';
export * from './apis/validation-api';
export * from './apis/websocket-api';

// ==================================================
// PROFESSIONAL MODELS (No Legacy Garbage)
// ==================================================
export * from './models';

// ==================================================
// PROFESSIONAL UNIFIED TYPES & CLIENT
// ==================================================
export * from './unified-types';

// Export unified-client with explicit excludes to avoid model conflicts
export {
  UnifiedAPIClient,
  apiClient,
  isSuccessResponse,
  isErrorResponse
} from './unified-client';

/* 
 * ✅ PROFESSIONAL USAGE:
 * 
 * import { AuthenticationApi, APIResponse } from '@/lib/api-client';
 * import { apiClient, isSuccessResponse } from '@/lib/api-client';
 * import { Campaign, ProxyPool } from '@/lib/api-client';
 * 
 * 🗑️ LEGACY GARBAGE ELIMINATED:
 * - models/apiresponse.ts APIResponse (use unified-types instead)
 * - Enum conflicts between APIs
 * - Amateur wildcard import patterns
 */
`;

  writeFileSync(INDEX_FILE, professionalIndexContent, 'utf8');
  console.log('✅ Professional main index generated');
}

/**
 * Execute the complete cleanup
 */
function executePurge(): void {
  try {
    console.log('🚀 EXECUTING SYSTEMATIC LEGACY PURGE...\n');
    
    // STEP 1: Purge legacy garbage from models
    purgeModelsIndex();
    
    // STEP 2: Fix enum conflicts in legacy api.ts
    fixLegacyApiFile();
    
    // STEP 3: Generate professional main index
    generateProfessionalIndex();
    
    console.log('\n🎉 LEGACY PURGE COMPLETE!');
    console.log('✅ APIResponse conflicts ELIMINATED');
    console.log('✅ Enum conflicts RESOLVED');
    console.log('✅ Professional patterns ENFORCED');
    console.log('\n📋 Professional imports now work:');
    console.log('   import { APIResponse } from "@/lib/api-client" // unified-types version');
    console.log('   import { Campaign } from "@/lib/api-client" // clean models');
    console.log('   import { apiClient } from "@/lib/api-client" // professional client');
    
  } catch (error) {
    console.error('\n❌ PURGE FAILED:', error);
    process.exit(1);
  }
}

// Execute the purge
executePurge();
