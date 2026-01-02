/**
 * PROFESSIONAL DISASTER RECOVERY
 * 
 * This component was part of the amateur monolithic form architecture
 * that tried to assign operational personas in the main form.
 * 
 * The professional architecture handles persona assignments through:
 * - PersonaAssignmentSection.tsx in /configuration/ directory
 * - Phase-specific persona management via CampaignControls modals
 * - Proper OpenAPI integration with validated persona types
 * 
 * This component has been professionally decommissioned.
 */

import React from 'react';
import Alert from '@/components/ta/ui/alert/Alert';

const OperationalAssignments = () => {
  return (
    <Alert 
      variant="warning"
      title="Component Decommissioned"
      message="This amateur component has been replaced by professional persona assignment in PersonaAssignmentSection.tsx with proper phase-centric architecture."
    />
  );
};

OperationalAssignments.displayName = 'OperationalAssignments';

export default OperationalAssignments;