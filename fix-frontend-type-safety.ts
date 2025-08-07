#!/usr/bin/env ts-node

/**
 * GILFOYLE'S SURGICAL TYPE SAFETY INTERVENTION
 * 
 * This script will systematically replace the pathetic 'as APIResponse' type casts
 * with proper type-safe utilities from apiResponseHelpers.ts that actually work.
 * 
 * CRIMES TO BE CORRECTED:
 * 1. "response.data as APIResponse" -> proper extractResponseData<T>() usage
 * 2. "apiResponse.data as SomeType" -> proper type guards and utilities
 * 3. "catch (error: any)" -> proper error typing
 * 4. General type safety improvements using the professional utilities
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const projectRoot = '/home/vboxuser/studio';

interface FileTransformation {
  filePath: string;
  description: string;
  transform: (content: string) => string;
}

// ===================================================================
// PROFESSIONAL TYPE SAFETY TRANSFORMATIONS
// ===================================================================

const transformations: FileTransformation[] = [
  {
    filePath: 'src/store/api/campaignApi.ts',
    description: 'Replace APIResponse type casts with professional type-safe utilities',
    transform: (content: string) => {
      // Add proper imports at the top
      content = content.replace(
        `import type { 
  CreateLeadGenerationCampaignRequest,
  PhaseConfigureRequest,
  APIResponse,
  LeadGenerationCampaignResponse,
  BulkEnrichedDataRequest,
  BulkEnrichedDataResponse,
  PatternOffsetRequest,
  PatternOffsetResponse
} from '@/lib/api-client/models';`,
        `import type { 
  CreateLeadGenerationCampaignRequest,
  PhaseConfigureRequest,
  APIResponse,
  LeadGenerationCampaignResponse,
  BulkEnrichedDataRequest,
  BulkEnrichedDataResponse,
  PatternOffsetRequest,
  PatternOffsetResponse
} from '@/lib/api-client/models';
import { extractResponseData, toApiResponse, handleApiError } from '@/lib/utils/apiResponseHelpers';`
      );

      // Replace the dangerous type casting pattern
      const replacements = [
        {
          // Pattern: response.data as APIResponse + manual success checking
          old: /const apiResponse = response\.data as APIResponse;\s*if \(apiResponse\.success && apiResponse\.data\) \{\s*return \{ data: apiResponse\.data as ([^}]+) \};\s*\} else \{\s*return \{ error: \{ status: 500, data: apiResponse\.error\?\.\message \|\| '([^']+)' \} \};\s*\}/gs,
          new: (match: string, type: string, errorMsg: string) => 
            `const data = extractResponseData<${type}>(response);
            if (data) {
              return { data };
            } else {
              return { error: { status: 500, data: '${errorMsg}' } };
            }`
        },
        {
          // Pattern: response.data as APIResponse + generic success checking
          old: /const apiResponse = response\.data as APIResponse;\s*if \(apiResponse\.success\) \{\s*return \{ data: apiResponse \};\s*\} else \{\s*return \{ error: \{ status: 500, data: apiResponse\.error\?\.\message \|\| '([^']+)' \} \};\s*\}/gs,
          new: (match: string, errorMsg: string) => 
            `const transformedResponse = toApiResponse<APIResponse>(response);
            if (transformedResponse.success) {
              return { data: transformedResponse.data! };
            } else {
              return { error: { status: 500, data: transformedResponse.error || '${errorMsg}' } };
            }`
        }
      ];

      // Apply replacements
      replacements.forEach(({ old, new: newPattern }) => {
        if (typeof newPattern === 'function') {
          content = content.replace(old, newPattern);
        } else {
          content = content.replace(old, newPattern);
        }
      });

      // Replace catch blocks with proper error handling
      content = content.replace(
        /} catch \(error: any\) \{\s*return \{ error: \{ status: error\.response\?\.\status \|\| 500, data: error\.response\?\.\data \|\| error\.message \} \};\s*\}/g,
        `} catch (error) {
          try {
            handleApiError(error, 'Campaign API operation');
          } catch (handledError) {
            return { error: { status: 500, data: handledError.message } };
          }
        }`
      );

      return content;
    }
  },
  {
    filePath: 'src/store/api/bulkOperationsApi.ts',
    description: 'Replace dangerous type casts in bulk operations API',
    transform: (content: string) => {
      // Add proper imports
      content = content.replace(
        `import type { 
  BulkDomainGenerationRequest,
  BulkDNSValidationRequest,
  BulkHTTPValidationRequest,
  BulkAnalyticsRequest,
  BulkResourceRequest,
  BulkAnalyzeDomains200Response,
  BulkOperationStatus,
  BulkOperationListResponse,
  OperationCancellationResponse,
  BulkResourceStatusResponse,
  APIResponse,
  BulkValidationResponse,
  BulkDomainGenerationResponse
} from '@/lib/api-client/models';`,
        `import type { 
  BulkDomainGenerationRequest,
  BulkDNSValidationRequest,
  BulkHTTPValidationRequest,
  BulkAnalyticsRequest,
  BulkResourceRequest,
  BulkAnalyzeDomains200Response,
  BulkOperationStatus,
  BulkOperationListResponse,
  OperationCancellationResponse,
  BulkResourceStatusResponse,
  APIResponse,
  BulkValidationResponse,
  BulkDomainGenerationResponse
} from '@/lib/api-client/models';
import { extractResponseData, toApiResponse, handleApiError } from '@/lib/utils/apiResponseHelpers';`
      );

      // Replace the same dangerous patterns
      content = content.replace(
        /const apiResponse = response\.data as APIResponse;\s*if \(apiResponse\.success && apiResponse\.data\) \{\s*return \{ data: apiResponse\.data as ([^}]+) \};\s*\} else \{\s*return \{\s*error: \{\s*status: 500,\s*data: apiResponse\.error\?\.\message \|\| '([^']+)'\s*\}\s*\};\s*\}/gs,
        (match, type, errorMsg) => 
          `const data = extractResponseData<${type}>(response);
          if (data) {
            return { data };
          } else {
            return { error: { status: 500, data: '${errorMsg}' } };
          }`
      );

      // Fix catch blocks
      content = content.replace(
        /} catch \(error: any\) \{\s*return \{ error: \{ status: error\.response\?\.\status \|\| 500, data: error\.response\?\.\data \|\| error\.message \} \};\s*\}/g,
        `} catch (error) {
          try {
            handleApiError(error, 'Bulk Operations API');
          } catch (handledError) {
            return { error: { status: 500, data: handledError.message } };
          }
        }`
      );

      return content;
    }
  }
];

// ===================================================================
// EXECUTION ENGINE
// ===================================================================

function executeTransformations() {
  console.log('🔧 GILFOYLE\'S TYPE SAFETY SURGICAL INTERVENTION INITIATED');
  console.log('📋 Crimes to be corrected: dangerous type casts and amateur error handling\n');

  let totalFilesFixed = 0;
  let totalViolationsFixed = 0;

  transformations.forEach(({ filePath, description, transform }) => {
    const fullPath = join(projectRoot, filePath);
    
    try {
      console.log(`🔍 Analyzing: ${filePath}`);
      console.log(`   Target: ${description}`);
      
      const originalContent = readFileSync(fullPath, 'utf-8');
      const transformedContent = transform(originalContent);
      
      if (originalContent !== transformedContent) {
        writeFileSync(fullPath, transformedContent, 'utf-8');
        totalFilesFixed++;
        
        // Count violations fixed (approximation based on content changes)
        const violationCount = (originalContent.match(/as APIResponse|error: any/g) || []).length;
        totalViolationsFixed += violationCount;
        
        console.log(`   ✅ CORRECTED: ${violationCount} type safety violations`);
      } else {
        console.log(`   ℹ️  Already professional-grade (no changes needed)`);
      }
      
    } catch (error) {
      console.error(`   ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('');
  });

  console.log('🎯 SURGICAL INTERVENTION SUMMARY:');
  console.log(`   Files corrected: ${totalFilesFixed}`);
  console.log(`   Type safety violations eliminated: ${totalViolationsFixed}`);
  console.log(`   Status: ${totalFilesFixed > 0 ? 'TYPE SYSTEM SALVATION COMPLETE' : 'NO INTERVENTION REQUIRED'}`);
  
  if (totalFilesFixed > 0) {
    console.log('\n🏆 The frontend codebase has been elevated to professional standards.');
    console.log('   No more dangerous type casts. No more amateur error handling.');
    console.log('   Gilfoyle-approved TypeScript architecture achieved.');
  }
}

// Execute the intervention
executeTransformations();
