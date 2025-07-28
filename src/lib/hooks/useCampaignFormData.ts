import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CampaignViewModel } from '@/lib/types';
import type { components } from '@/lib/api-client/types';

type HttpPersona = components['schemas']['PersonaResponse'] & { personaType: 'http' };
type DnsPersona = components['schemas']['PersonaResponse'] & { personaType: 'dns' };
import { getPersonas } from "@/lib/services/personaService";
import { getProxies } from "@/lib/services/proxyService.production";
import { campaignsApi } from '@/lib/api-client/client';
import { transformCampaignsToViewModels } from '@/lib/utils/campaignTransforms';

type Campaign = components['schemas']['LeadGenerationCampaign'];
type Proxy = components['schemas']['Proxy'];

interface CampaignFormData {
  httpPersonas: HttpPersona[];
  dnsPersonas: DnsPersona[];
  proxies: Proxy[];
  sourceCampaigns: CampaignViewModel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Performance-optimized hook for loading campaign form data
 * Combines all async data loading with proper error handling and caching
 */
export function useCampaignFormData(_isEditing?: boolean): CampaignFormData {
  const [httpPersonas, setHttpPersonas] = useState<HttpPersona[]>([]);
  const [dnsPersonas, setDnsPersonas] = useState<DnsPersona[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [sourceCampaigns, setSourceCampaigns] = useState<CampaignViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the data fetching function to prevent unnecessary re-creations
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use Promise.allSettled to prevent one failed request from blocking others
      const [httpResult, dnsResult, proxiesResult, campaignsResult] = await Promise.allSettled([
        getPersonas('http'),
        getPersonas('dns'),
        getProxies(),
        // TEMPORARY: Campaign listing disabled during legacy cleanup - only standalone services remain
        // TODO: Implement campaign listing using standalone service endpoints after cleanup is complete
        Promise.resolve({ data: { data: { data: [] } } }) // Mock empty campaigns response
      ]);

      // Process HTTP personas result
      if (httpResult.status === 'fulfilled' && httpResult.value.success === true && httpResult.value.data) {
        setHttpPersonas(httpResult.value.data as HttpPersona[]);
      } else {
        console.warn('[useCampaignFormData] Failed to load HTTP personas:', 
          httpResult.status === 'rejected' ? httpResult.reason : httpResult.value);
      }

      // Process DNS personas result
      if (dnsResult.status === 'fulfilled' && dnsResult.value.success === true && dnsResult.value.data) {
        setDnsPersonas(dnsResult.value.data as DnsPersona[]);
      } else {
        console.warn('[useCampaignFormData] Failed to load DNS personas:',
          dnsResult.status === 'rejected' ? dnsResult.reason : dnsResult.value);
      }

      // Process proxies result
      if (proxiesResult.status === 'fulfilled' && proxiesResult.value.success === true && proxiesResult.value.data) {
        setProxies(proxiesResult.value.data as Proxy[]);
      } else {
        console.warn('[useCampaignFormData] Failed to load proxies:',
          proxiesResult.status === 'rejected' ? proxiesResult.reason : proxiesResult.value);
      }

      // Process campaigns result - enhanced API client returns axios response directly
      if (campaignsResult.status === 'fulfilled' && campaignsResult.value && campaignsResult.value.data) {
        // Handle wrapped response format: { success: true, data: { campaigns: [...] } }
        const responseData = campaignsResult.value.data;
        let campaignsArray: Campaign[] = [];
        
        // Check if data is wrapped with campaigns property
        if (responseData && typeof responseData === 'object' && 'campaigns' in responseData) {
          const campaigns = (responseData as { campaigns: unknown }).campaigns;
          if (Array.isArray(campaigns)) {
            campaignsArray = campaigns;
          }
        }
        // Check if data is directly an array
        else if (Array.isArray(responseData)) {
          campaignsArray = responseData;
        }
        
        if (campaignsArray.length > 0 || (responseData && typeof responseData === 'object')) {
          // Transform OpenAPI campaigns to view models first
          const campaignViewModels = transformCampaignsToViewModels(campaignsArray);
          // Filter campaigns that can be used as source (only domain_generation and dns_validation)
          const validSourceCampaigns = campaignViewModels.filter(c =>
            c.selectedType === 'domain_generation' || c.selectedType === 'dns_validation'
          );
          setSourceCampaigns(validSourceCampaigns);
        } else {
          console.warn('[useCampaignFormData] Campaigns data is not in expected format:', responseData);
          setSourceCampaigns([]);
        }
      } else {
        console.warn('[useCampaignFormData] Failed to load campaigns:',
          campaignsResult.status === 'rejected' ? campaignsResult.reason : campaignsResult.value);
        setSourceCampaigns([]);
      }

      // Check if any critical failures occurred
      const failures = [httpResult, dnsResult, proxiesResult, campaignsResult].filter(
        result => result.status === 'rejected'
      );

      if (failures.length === 4) {
        // All requests failed
        setError('Failed to load form data. Please check your connection and try again.');
      } else if (failures.length > 0) {
        // Some requests failed
        const failureMessages = failures.map(f => 
          f.status === 'rejected' ? f.reason?.message || 'Unknown error' : ''
        ).filter(Boolean);
        console.warn('[useCampaignFormData] Partial failures:', failureMessages);
        // Don't set error for partial failures - let the form work with what we have
      }

    } catch (error) {
      console.error('[useCampaignFormData] Unexpected error loading form data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps - this function doesn't depend on external values

  // Load data on mount, with dependency on isEditing to prevent unnecessary reloads
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Only refetch if fetchData function changes (which it won't due to empty deps)

  // Memoize active personas for better performance in selects
  const activeHttpPersonas = useMemo(() =>
    httpPersonas.filter(p => p.isEnabled !== false),
    [httpPersonas]
  );

  const activeDnsPersonas = useMemo(() =>
    dnsPersonas.filter(p => p.isEnabled !== false),
    [dnsPersonas]
  );

  return {
    httpPersonas: activeHttpPersonas,
    dnsPersonas: activeDnsPersonas,
    proxies,
    sourceCampaigns,
    isLoading,
    error,
    refetch: fetchData
  };
}

/**
 * Hook for getting memoized persona selection options
 * Reduces re-renders when personas haven't changed
 */
export function usePersonaSelectionOptions(personas: HttpPersona[] | DnsPersona[]) {
  return useMemo(() =>
    personas.map(persona => ({
      id: persona.id,
      name: persona.name,
      isEnabled: persona.isEnabled
    })),
    [personas]
  );
}

/**
 * Hook for getting memoized campaign selection options
 * Reduces re-renders when campaigns haven't changed
 */
export function useCampaignSelectionOptions(campaigns: CampaignViewModel[]) {
  return useMemo(() => 
    campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      selectedType: campaign.selectedType
    })),
    [campaigns]
  );
}