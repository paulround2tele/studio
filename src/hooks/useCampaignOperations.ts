// Simplified Campaign Operations Hook - Backend-driven architecture
// Provides basic campaign control operations using standalone services API

"use client";

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { campaignsApi } from '@/lib/api-client/client';

export const useCampaignOperations = (campaignId: string) => {
  const { toast } = useToast();

  // Start a specific phase using standalone services API
  const startPhase = useCallback(async (phaseType: string) => {
    try {
      await campaignsApi.startPhaseStandalone(campaignId, phaseType);
      
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
      // Get campaign progress to access domains data
      const progressResponse = await campaignsApi.getCampaignProgressStandalone(campaignId);
      const progress = progressResponse.data.data as any; // Cast to any for legacy cleanup period
      
      // Extract domains from progress data (backend manages JSONB data)
      let domainsText = '';
      if (progress && progress.phaseProgress) {
        const domainPhase = progress.phaseProgress['domain_generation'];
        if (domainPhase) {
          // Backend provides domains in structured format
          domainsText = 'Domains data available - implement extraction based on backend format\n';
        }
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