// Simplified Campaign Operations Hook - Backend-driven architecture
// Provides basic campaign control operations using standalone services API

"use client";

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';
import { validateCampaignId, validateBulkEnrichedDataRequest } from '@/lib/utils/uuidValidation';
import { assertBulkEnrichedDataResponse, extractDomainName } from '@/lib/utils/typeGuards';

export const useCampaignOperations = (campaignId: string) => {
  const { toast } = useToast();
  const [startPhaseMutation] = useStartPhaseStandaloneMutation();

  // Start a specific phase using standalone services API
  const startPhase = useCallback(async (phaseType: string) => {
    try {
      // Validate campaign ID before making API call
      const campaignValidationResult = validateCampaignId(campaignId);
      if (!campaignValidationResult.isValid) {
        // Toast notification already shown by validateCampaignId
        throw new Error(campaignValidationResult.error || 'Invalid campaign ID');
      }

  await startPhaseMutation({ campaignId, phase: phaseType }).unwrap();
      
      toast({
        title: "Phase Started",
        description: `${phaseType.replace('_', ' ')} phase has been started successfully.`,
      });

      // Trigger page refresh to get updated data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('force_campaign_refresh', {
          detail: { campaignId }
        }));
      }
    } catch (error) {
      toast({
        title: "Start Failed",
        description: error instanceof Error ? error.message : 'Failed to start phase',
        variant: "destructive"
      });
      throw error;
    }
  }, [campaignId, toast]);

  // Simplified pause operation (Note: Not available in standalone services)
  const pauseCampaign = useCallback(async () => {
    toast({
      title: "Not Available",
      description: "Pause operation not available in standalone services architecture",
      variant: "destructive"
    });
  }, [toast]);

  // Simplified resume operation (Note: Not available in standalone services)
  const resumeCampaign = useCallback(async () => {
    toast({
      title: "Not Available", 
      description: "Resume operation not available in standalone services architecture",
      variant: "destructive"
    });
  }, [toast]);

  // Simplified stop operation (Note: Not available in standalone services)
  const stopCampaign = useCallback(async () => {
    toast({
      title: "Not Available",
      description: "Stop operation not available in standalone services architecture", 
      variant: "destructive"
    });
  }, [toast]);

  // Simple download domains operation
  const downloadDomains = useCallback(async (fileNamePrefix: string = 'domains') => {
    try {
      // Validate campaign ID before making bulk request
      const campaignValidationResult = validateCampaignId(campaignId);
      if (!campaignValidationResult.isValid) {
        // Toast notification already shown by validateCampaignId
        throw new Error(campaignValidationResult.error || 'Invalid campaign ID');
      }

      // Validate bulk request
      const bulkValidationResult = validateBulkEnrichedDataRequest([campaignId]);
      if (!bulkValidationResult.isValid) {
        throw new Error(bulkValidationResult.error || 'Invalid bulk request');
      }

      // ENTERPRISE FIX: Use bulk enriched data instead of individual getCampaignProgressStandalone
      const bulkRequest = {
        campaignIds: [campaignId],
        limit: 1,
        offset: 0
      };
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/campaigns/bulk/enriched-data`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkRequest),
      });
      if (!res.ok) throw new Error(`Bulk enriched data failed: ${res.status}`);
      const enrichedData = assertBulkEnrichedDataResponse(await res.json());
      
      // Extract domains from bulk enriched data
      let domainsText = '';
      const campaignData = enrichedData?.campaigns?.[campaignId];
      if (campaignData?.domains && Array.isArray(campaignData.domains)) {
        domainsText = campaignData.domains.map((domain: any) => extractDomainName(domain)).join('\n') + '\n';
      }
      
      if (!domainsText) {
        domainsText = 'No domains available for download\n';
      }

      // Create and trigger download
      const blob = new Blob([domainsText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileNamePrefix}_${campaignId}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Domain export has been initiated.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : 'Failed to download domains',
        variant: "destructive"
      });
    }
  }, [campaignId, toast]);

  return {
    startPhase,
    pauseCampaign,
    resumeCampaign, 
    stopCampaign,
    downloadDomains
  };
};

export default useCampaignOperations;