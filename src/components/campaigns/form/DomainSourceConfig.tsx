import React, { memo } from 'react';
import { Control, UseFormWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Constants for form handling
const CampaignFormConstants = {
  NONE_VALUE_PLACEHOLDER: "__none__" as const,
} as const;

// Form values type using OpenAPI types directly
type CampaignSelectedType = import('@/lib/api-client/types').components['schemas']['CreateCampaignRequest']['campaignType'];
type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
type CampaignPhase = "domain_generation" | "dns_validation" | "http_keyword_validation" | "completed" | "idle";

interface CampaignFormValues {
  name: string;
  description?: string;
  selectedType: CampaignSelectedType;
  domainSourceSelectionMode: DomainSourceSelectionMode;
  sourceCampaignId?: string;
  sourcePhase?: CampaignPhase;
  uploadedDomainsFile?: File | null;
  uploadedDomainsContentCache?: string[];
  initialDomainsToProcessCount?: number;
  generationPattern: "prefix_variable" | "suffix_variable" | "both_variable" | "constant_only";
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
import type { CampaignViewModel } from '@/lib/types';

interface DomainSourceConfigProps {
  control: Control<CampaignFormValues>;
  watch: UseFormWatch<CampaignFormValues>;
  sourceCampaigns: CampaignViewModel[];
  isLoading: boolean;
}

/**
 * Memoized domain source configuration component
 * Handles domain source selection for validation campaigns
 */
const DomainSourceConfig = memo<DomainSourceConfigProps>(({
  control,
  watch,
  sourceCampaigns,
  isLoading
}) => {
  const domainSourceMode = watch("domainSourceSelectionMode");

  return (
    <Card className="p-4 pt-2 border-dashed">
      <CardHeader className="p-2">
        <CardTitle className="text-base">Domain Source Configuration</CardTitle>
        <CardDescription className="text-xs">Select source of domains to validate.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 space-y-4">
        <FormField control={control} name="domainSourceSelectionMode" render={({ field }) => (
          <FormItem>
            <FormLabel>Domain Source</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="upload">Upload File</SelectItem>
                <SelectItem value="campaign_output">Use Output from Previous Campaign</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {domainSourceMode === "campaign_output" && (
          <FormField control={control} name="sourceCampaignId" render={({ field }) => (
            <FormItem>
              <FormLabel>Source Campaign</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Loading campaigns..." : "Select campaign"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={CampaignFormConstants.NONE_VALUE_PLACEHOLDER}>Select a campaign...</SelectItem>
                  {sourceCampaigns.filter(campaign => campaign.id).map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id!}>
                      {campaign.name} ({campaign.selectedType || campaign.campaignType})
                    </SelectItem>
                  ))}
                  {sourceCampaigns.length === 0 && !isLoading && (
                    <SelectItem value="no-source-campaigns" disabled>
                      No campaigns available as source
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </CardContent>
    </Card>
  );
});

DomainSourceConfig.displayName = 'DomainSourceConfig';

export default DomainSourceConfig;