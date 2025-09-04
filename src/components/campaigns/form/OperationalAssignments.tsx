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
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const OperationalAssignments = () => {
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <strong>Component Decommissioned</strong><br/>
        This amateur component has been replaced by professional persona assignment
        in PersonaAssignmentSection.tsx with proper phase-centric architecture.
      </AlertDescription>
    </Alert>
  );
};

OperationalAssignments.displayName = 'OperationalAssignments';

export default OperationalAssignments;