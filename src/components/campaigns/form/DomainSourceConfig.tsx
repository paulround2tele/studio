/**
 * PROFESSIONAL DISASTER RECOVERY
 * 
 * This component represented amateur architecture that tried to "source domains"
 * from other campaigns instead of using proper domain generation phases.
 * 
 * The professional architecture handles domain generation through:
 * - CampaignCreateWizard.tsx: Creates campaigns with DomainGenerationPhaseConfig
 * - CampaignControls.tsx: Authoritative phase orchestration UI (config + start)
 * - Phase-specific config modals/components in /configuration/ and /modals
 * 
 * This component has been professionally decommissioned.
 */

import React from 'react';
import Alert from '@/components/ta/ui/alert/Alert';

const DomainSourceConfig = () => {
  return (
    <Alert 
      variant="warning"
      title="Component Decommissioned"
      message="This amateur component has been replaced by unified PipelineWorkspace phase-centric architecture. Domain generation is now handled inline in the workspace discovery configuration form."
    />
  );
};

DomainSourceConfig.displayName = 'DomainSourceConfig';

export default DomainSourceConfig;