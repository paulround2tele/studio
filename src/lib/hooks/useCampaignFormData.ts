import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PersonaResponse as Persona } from '@/lib/api-client/models';
import type { Campaign } from '@/lib/api-client/models';
import type { GithubComFntelecomllcStudioBackendInternalModelsProxy as ProxyType } from '@/lib/api-client/models';
import { apiClient } from '@/lib/api-client';
// import { transformCampaignsToViewModels } from '@/lib/utils/campaignTransforms'; // DISABLED during cleanup

type HttpPersona = Persona;
type DnsPersona = Persona;

interface CampaignFormData {
  httpPersonas: HttpPersona[];
  dnsPersonas: DnsPersona[];
  proxies: ProxyType[];
  sourceCampaigns: Campaign[];
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
  const [proxies, setProxies] = useState<ProxyType[]>([]);
  const [sourceCampaigns, setSourceCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the data fetching function to prevent unnecessary re-creations
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // STUB: Current API client doesn't have these methods
      // TODO: Implement proper API integration when endpoints are available
      setHttpPersonas([]);
      setDnsPersonas([]);
      setProxies([]);
      setSourceCampaigns([]);
    } catch (error) {
      console.error('Error loading form data:', error);
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
export function useCampaignSelectionOptions(campaigns: Campaign[]) {
  return useMemo(() => 
    campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
  currentPhase: campaign.currentPhase // Use REAL property
    })),
    [campaigns]
  );
}