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
import Alert from '@/components/ta/ui/alert/Alert';

const KeywordConfig = () => {
  return (
    <Alert 
      variant="warning"
      title="Component Decommissioned"
      message="This amateur component has been replaced by professional phase-centric keyword configuration in HTTPKeywordValidationConfig.tsx with proper OpenAPI integration."
    />
  );
};

KeywordConfig.displayName = 'KeywordConfig';

export default KeywordConfig;