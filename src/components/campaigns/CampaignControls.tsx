/**
 * PROFESSIONAL DISASTER RECOVERY
 * 
 * The original CampaignControls.tsx was a CRIMINAL FANTASY that tried to
 * manage campaign.phases arrays that DON'T EXIST in the real Campaign model.
 * 
 * The real Campaign model has:
 * ✅ currentPhase: CampaignCurrentPhaseEnum
 * ✅ phaseStatus: CampaignPhaseStatusEnum
 * 
 * NOT amateur fantasy arrays:
 * ❌ campaign.phases[].status
 * ❌ campaign.fullSequenceMode
 * 
 * This component needs complete reconstruction based on REAL backend data.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Use the single source of truth
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';

interface CampaignControlsProps {
  campaign: Campaign;
}

const CampaignControls: React.FC<CampaignControlsProps> = ({ campaign }) => {
  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <strong>Component Under Reconstruction</strong><br/>
  This amateur component was built on fantasy data structures (campaign.phases)
  that don't exist in the real backend. Being reconstructed with actual Campaign schema:
  currentPhase={campaign.currentPhase}
      </AlertDescription>
    </Alert>
  );
};

export default CampaignControls;
