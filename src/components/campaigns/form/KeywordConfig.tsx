/**
 * PROFESSIONAL DISASTER RECOVERY
 * 
 * This component was part of the amateur monolithic form architecture
 * that tried to configure everything in one massive form.
 * 
 * The professional architecture handles keyword configuration through:
 * - Phase-specific components in /configuration/ directory
 * - HTTPKeywordValidationConfig.tsx for HTTP keyword validation
 * - Proper OpenAPI integration with phase management
 * 
 * This component has been professionally decommissioned.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const KeywordConfig = () => {
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <strong>Component Decommissioned</strong><br/>
        This amateur component has been replaced by professional phase-centric keyword configuration
        in HTTPKeywordValidationConfig.tsx with proper OpenAPI integration.
      </AlertDescription>
    </Alert>
  );
};

KeywordConfig.displayName = 'KeywordConfig';

export default KeywordConfig;