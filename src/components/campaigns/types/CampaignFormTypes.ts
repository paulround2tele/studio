// Shared types for Campaign Forms to prevent conflicts
import type { components } from '@/lib/api-client/types';

export type CampaignSelectedType = components['schemas']['CreateCampaignRequest']['campaignType'];
export type DomainGenerationPattern = "prefix_variable" | "suffix_variable" | "both_variable";
export type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
export type CampaignPhase = components['schemas']['Campaign']['currentPhase'];

// Unified CampaignFormValues interface used across all form components
export interface CampaignFormValues {
  name: string;
  description?: string;
  selectedType: CampaignSelectedType;
  domainSourceSelectionMode: DomainSourceSelectionMode;
  sourceCampaignId?: string;
  sourcePhase?: string;
  uploadedDomainsFile?: File | null;
  uploadedDomainsContentCache?: string[];
  initialDomainsToProcessCount?: number;
  generationPattern: DomainGenerationPattern;
  constantPart: string;
  allowedCharSet: string;
  tldsInput: string;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  maxDomainsToGenerate?: number;
  targetKeywordsInput?: string;
  scrapingRateLimitRequests?: number;
  scrapingRateLimitPer?: 'second' | 'minute';
  requiresJavaScriptRendering?: boolean;
  rotationIntervalSeconds: number;
  processingSpeedPerMinute: number;
  batchSize: number;
  retryAttempts: number;
  targetHttpPorts?: number[];
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode: 'none' | 'single' | 'rotate_active';
  assignedProxyId?: string;
  launchSequence?: boolean;
}