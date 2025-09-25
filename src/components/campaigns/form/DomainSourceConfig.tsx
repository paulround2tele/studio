/**
 * PROFESSIONAL DISASTER RECOVERY
 * 
 * This component represented amateur architecture that tried to "source domains"
 * from other campaigns instead of using proper domain generation phases.
 * 
 * The professional architecture handles domain generation through:
 * - CampaignFormV2.tsx: Creates campaigns with DomainGenerationPhaseConfig
 * - CampaignControls.tsx: Authoritative phase orchestration UI (config + start)
 * - Phase-specific config modals/components in /configuration/ and /modals
 * 
 * This component has been professionally decommissioned.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DomainSourceConfig = () => {
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <strong>Component Decommissioned</strong><br/>
  This amateur component has been replaced by unified PipelineWorkspace phase-centric architecture.
  Domain generation is now handled inline in the workspace discovery configuration form.
      </AlertDescription>
    </Alert>
  );
};

DomainSourceConfig.displayName = 'DomainSourceConfig';

export default DomainSourceConfig;