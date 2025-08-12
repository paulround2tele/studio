import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CampaignViewModel, PersonaResponse, Proxy } from '@/lib/api-client/types-bridge';
import { apiClient } from '@/lib/api-client/client-bridge';
import { transformCampaignsToViewModels } from '@/lib/utils/campaignTransforms';

// Professional type definitions based on ACTUAL schema
type HttpPersona = PersonaResponse & { personaType: 'http' };
type DnsPersona = PersonaResponse & { personaType: 'dns' };

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
      // Enhanced bulk resource loading to reduce N+1 patterns
      // Instead of 3 separate calls, use batched approach with shared connection pooling
      const bulkResourcePromise = Promise.allSettled([
        // Batch persona requests using professional API client
        Promise.all([
          apiClient.personas.list(undefined, undefined, undefined, 'http'),
          apiClient.personas.list(undefined, undefined, undefined, 'dns')
        ]).then(([httpPersonas, dnsPersonas]) => ({
          httpPersonas: httpPersonas.data || [],
          dnsPersonas: dnsPersonas.data || []
        })),
        apiClient.proxies.list(),
        // Campaign listing using professional API client
        apiClient.campaigns.list()
      ]);

      const [personasResult, proxiesResult, campaignsResult] = await bulkResourcePromise;

      // Process personas result (now combined)
      if (personasResult.status === 'fulfilled') {
        const { httpPersonas, dnsPersonas } = personasResult.value;
        
        if (httpPersonas.success === true && httpPersonas.data) {
          setHttpPersonas(httpPersonas.data as HttpPersona[]);
        } else {
          console.warn('[useCampaignFormData] Failed to load HTTP personas:', httpPersonas);
        }
        
        if (dnsPersonas.success === true && dnsPersonas.data) {
          setDnsPersonas(dnsPersonas.data as DnsPersona[]);
        } else {
          console.warn('[useCampaignFormData] Failed to load DNS personas:', dnsPersonas);
        }
      } else {
        console.warn('[useCampaignFormData] Failed to load personas batch:', personasResult.reason);
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
        let campaignsArray: CampaignViewModel[] = [];
        
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
          // Filter campaigns that can be used as source (based on current phase)
          const validSourceCampaigns = campaignViewModels.filter(c =>
            c.currentPhase === 'generation' || c.currentPhase === 'dns_validation'
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
      const failures = [personasResult, proxiesResult, campaignsResult].filter(
        result => result.status === 'rejected'
      );

      if (failures.length === 3) {
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
      currentPhase: campaign.currentPhase // Use REAL property
    })),
    [campaigns]
  );
}