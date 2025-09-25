/**
 * PROFESSIONAL DISASTER RECOVERY
 * 
 * This component was part of the amateur monolithic form architecture
 * that tried to configure low-level tuning parameters in the main form.
 * 
 * The professional architecture handles tuning through:
 * - Environment configuration files
 * - Phase-specific configuration components
 * - Proper OpenAPI integration with validated parameters
 * 
 * This component has been professionally decommissioned.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CampaignTuningConfig = () => {
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <strong>Component Decommissioned</strong><br/>
        This amateur component has been replaced by professional environment configuration
        and phase-specific tuning parameters with proper OpenAPI validation.
      </AlertDescription>
    </Alert>
  );
};

CampaignTuningConfig.displayName = 'CampaignTuningConfig';

export default CampaignTuningConfig;
