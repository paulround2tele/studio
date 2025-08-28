'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Play } from 'lucide-react';
import { z } from 'zod';

// Section components - clean, modular, and actually maintainable
import { CampaignDetailsSection } from './sections/CampaignDetailsSection';
import { KeywordTargetingSection } from './sections/KeywordTargetingSection';
import { PersonaAssignmentSection } from './sections/PersonaAssignmentSection';
import { PerformanceTuningSection } from './sections/PerformanceTuningSection';

// Backend-driven data types (following the actual API schema)
// Use the single source of truth: OpenAPI generated types

import type { CampaignResponse as Campaign } from '@/lib/api-client/models';

// Form data type - what the form collects vs what API expects
type CampaignFormData = {
  name: string;
  description?: string;
  targetKeywords?: string;
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode?: string;
  assignedProxyId?: string;
  processingSpeed?: string;
  batchSize?: number;
  rotationInterval?: number;
  retryAttempts?: number;
};

interface Persona {
  id: string;
  name: string;
}

interface Proxy {
  id: string;
  name?: string;
  host?: string;
  port?: number;
}

interface CampaignDashboardProps {
  // Existing campaign data (if editing)
  campaign?: Campaign;
  // Backend-driven data
  httpPersonas: Persona[];
  dnsPersonas: Persona[];
  proxies: Proxy[];
  // Backend-driven conditions
  needsKeywords?: boolean;
  needsHttpPersona?: boolean;
  needsDnsPersona?: boolean;
  // Backend-driven constants
  noneValuePlaceholder: string;
  // Loading states
  isLoadingData?: boolean;
  isSubmitting?: boolean;
  // Actions
  onSave: (data: Campaign) => void;
  onSaveAndStart?: (data: Campaign) => void;
}

// Backend-driven validation schema
const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  targetKeywords: z.string().optional(),
  assignedHttpPersonaId: z.string().optional(),
  assignedDnsPersonaId: z.string().optional(),
  proxyAssignmentMode: z.string().optional(),
  assignedProxyId: z.string().optional(),
  processingSpeed: z.string().optional(),
  batchSize: z.number().optional(),
  rotationInterval: z.number().optional(),
  retryAttempts: z.number().optional(),
});

export function CampaignDashboard({
  campaign,
  httpPersonas,
  dnsPersonas,
  proxies,
  needsKeywords = false,
  needsHttpPersona = false,
  needsDnsPersona = false,
  noneValuePlaceholder,
  isLoadingData = false,
  isSubmitting = false,
  onSave,
  onSaveAndStart,
}: CampaignDashboardProps) {
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: campaign?.name || '',
      description: '', // API doesn't have description field
      targetKeywords: '', // Form-specific field
      assignedHttpPersonaId: undefined, // Form-specific field
      assignedDnsPersonaId: undefined, // Form-specific field
      proxyAssignmentMode: 'none',
      assignedProxyId: undefined,
      processingSpeed: 'medium',
      batchSize: 10, // Form default, not from API
      rotationInterval: 30, // Form default, not from API
      retryAttempts: 3, // Form default, not from API
    },
  });

  const handleSave = (data: CampaignFormData) => {
    onSave(data as any);
  };

  const handleSaveAndStart = (data: CampaignFormData) => {
    if (onSaveAndStart) {
      onSaveAndStart(data as any);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {campaign?.id ? 'Edit Campaign' : 'Create Campaign'}
        </h1>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Campaign Details - Always shown */}
          <CampaignDetailsSection 
            control={form.control}
            disabled={isSubmitting}
          />

          {/* Keyword Targeting - Backend-driven visibility */}
          {needsKeywords && (
            <KeywordTargetingSection 
              control={form.control}
              disabled={isSubmitting}
              needsKeywords={needsKeywords}
            />
          )}

          {/* Persona Assignment - The core of your brilliant design */}
          <PersonaAssignmentSection 
            control={form.control}
            disabled={isSubmitting}
            httpPersonas={httpPersonas}
            dnsPersonas={dnsPersonas}
            proxies={proxies}
            needsHttpPersona={needsHttpPersona}
            needsDnsPersona={needsDnsPersona}
            noneValuePlaceholder={noneValuePlaceholder}
            isLoadingData={isLoadingData}
          />

          {/* Performance Tuning - Always shown */}
          <PerformanceTuningSection 
            control={form.control}
            disabled={isSubmitting}
          />

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={form.handleSubmit(handleSave)}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Campaign
            </Button>

            {onSaveAndStart && (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={form.handleSubmit(handleSaveAndStart)}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Save & Start Campaign
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
