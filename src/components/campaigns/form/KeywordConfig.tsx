import React, { memo } from 'react';
import { Control } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
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

interface KeywordConfigProps {
  control: Control<CampaignFormValues>;
}

/**
 * Memoized keyword configuration component
 * Handles keyword settings for HTTP validation campaigns
 */
const KeywordConfig = memo<KeywordConfigProps>(({ control }) => {
  return (
    <Card className="p-4 pt-2 border-dashed">
      <CardHeader className="p-2">
        <CardTitle className="text-base">Keyword Configuration</CardTitle>
        <CardDescription className="text-xs">Configure keywords to search for during HTTP validation.</CardDescription>
      </CardHeader>
      <CardContent className="p-2 space-y-4">
        <FormField control={control} name="targetKeywordsInput" render={({ field }) => (
          <FormItem>
            <FormLabel>Target Keywords (comma-separated)</FormLabel>
            <FormControl>
              <Textarea placeholder="e.g., telecom, voip, saas, technology" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </CardContent>
    </Card>
  );
});

KeywordConfig.displayName = 'KeywordConfig';

export default KeywordConfig;