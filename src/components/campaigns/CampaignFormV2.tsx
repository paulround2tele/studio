"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PageHeader from '@/components/shared/PageHeader';
import { Target, Loader2 } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { components } from '@/lib/api-client/types';
import { unifiedCampaignService } from '@/lib/services/unifiedCampaignService';

// Import shared types to prevent conflicts
import type {
  CampaignFormValues,
  DomainGenerationPattern,
} from './types/CampaignFormTypes';

// Import OpenAPI types
type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'];

// Base campaign type from OpenAPI
type BaseCampaign = components['schemas']['Campaign'];
type DomainGenerationParams = components['schemas']['DomainGenerationParams'];

// CampaignViewModel interface using OpenAPI base with UI extensions
export interface CampaignViewModel extends Omit<BaseCampaign, 'dnsValidationParams' | 'httpKeywordParams' | 'domainGenerationParams' | 'failedItems' | 'processedItems' | 'successfulItems' | 'totalItems' | 'metadata' | 'httpKeywordValidationParams'> {
  description?: string;
  currentPhase?: components['schemas']['Campaign']['currentPhase'];
  
  // Flexible parameter types that can handle both OpenAPI and legacy formats
  domainGenerationParams?: DomainGenerationParams | Record<string, unknown>;
  
  domainGenerationConfig?: {
    generationPattern?: DomainGenerationPattern;
    constantPart?: string;
    allowedCharSet?: string;
    tlds?: string[];
    prefixVariableLength?: number;
    suffixVariableLength?: number;
    maxDomainsToGenerate?: number;
  };
  
  // Handle BigInt to number conversion for UI - flexible types
  failedItems?: number | bigint;
  processedItems?: number | bigint;
  successfulItems?: number | bigint;
  totalItems?: number | bigint;
  
  // Flexible metadata type
  metadata?: Record<string, unknown>;
}

// Constants for form handling
const CampaignFormConstants = {
  MAX_DOMAINS_LIMIT: 1000000,
  MIN_DOMAINS_LIMIT: 1,
  DEFAULT_MAX_DOMAINS: 1000,
} as const;

import React, { useCallback, useMemo, useState } from "react";
import { FormErrorSummary } from '@/components/ui/form-field-error';
import { type FormErrorState } from '@/lib/utils/errorHandling';

// Performance-optimized hooks
import { useDomainCalculation } from "@/lib/hooks/useDomainCalculation";

// Memoized sub-components
import DomainGenerationConfig from "./form/DomainGenerationConfig";

interface CampaignFormProps {
  campaignToEdit?: CampaignViewModel;
  isEditing?: boolean;
}

/**
 * Simplified CampaignFormV2 component for phases-based workflow
 * 
 * All campaigns start with domain generation in the setup phase.
 * Phase transitions are handled by the backend API automatically.
 */
export default function CampaignFormV2({ campaignToEdit, isEditing = false }: CampaignFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Enhanced error handling state
  const [formFieldErrors, setFormFieldErrors] = useState<FormErrorState>({});
  const [formMainError, setFormMainError] = useState<string | null>(null);

  // 🔧 CRITICAL FIX: Memoize default values to prevent infinite re-renders
  const defaultValues = useMemo(() => ({
    name: isEditing && campaignToEdit ? campaignToEdit.name : "",
    description: isEditing && campaignToEdit ? (campaignToEdit.description || "") : "",
    generationPattern: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.generationPattern as DomainGenerationPattern || "prefix_variable") : "prefix_variable",
    constantPart: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.constantPart || "") : "business",
    allowedCharSet: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.allowedCharSet || "abcdefghijklmnopqrstuvwxyz0123456789") : "abcdefghijklmnopqrstuvwxyz0123456789",
    tldsInput: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.tlds?.join(', ') || ".com") : ".com",
    prefixVariableLength: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.prefixVariableLength === undefined ? undefined : Number(campaignToEdit.domainGenerationConfig.prefixVariableLength)) : 3,
    suffixVariableLength: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.suffixVariableLength === undefined ? undefined : Number(campaignToEdit.domainGenerationConfig.suffixVariableLength)) : 0,
    maxDomainsToGenerate: isEditing && campaignToEdit ? campaignToEdit.domainGenerationConfig?.maxDomainsToGenerate : CampaignFormConstants.DEFAULT_MAX_DOMAINS,
    launchSequence: true, // ✅ AUTOMATIC PHASE TRIGGERING: Default to true for automatic campaign orchestration
  }), [isEditing, campaignToEdit]);

  const form = useForm<CampaignFormValues>({
    defaultValues: defaultValues as CampaignFormValues,
    mode: "onChange"
  });

  const { control, formState: { isSubmitting }, watch, setValue } = form;

  // Performance-optimized domain calculation with debouncing and safeguards
  const generationPattern = watch("generationPattern");
  const allowedCharSet = watch("allowedCharSet");
  const prefixVariableLength = watch("prefixVariableLength");
  const suffixVariableLength = watch("suffixVariableLength");
  const tldsInput = watch("tldsInput");
  const maxDomainsToGenerate = watch("maxDomainsToGenerate");

  const domainCalculation = useDomainCalculation(
    'generation', // Always domain generation for phases-based workflow
    generationPattern,
    allowedCharSet,
    prefixVariableLength,
    suffixVariableLength,
    tldsInput
  );

  // Memoized form submission handler to prevent unnecessary re-creates
  const onSubmit = useCallback(async (data: CampaignFormValues) => {
    try {
      console.log('🔍 [FORM_DEBUG] Phases-based form submission started:', {
        formData: data,
        currentUrl: window.location.href,
        routerAvailable: !!router
      });

      // Clear previous errors
      setFormFieldErrors({});
      setFormMainError(null);

      // Validate required fields for domain generation
      if (!data.generationPattern || !data.constantPart?.trim()) {
        toast({
          title: "Validation Error",
          description: "Generation pattern and constant part are required for domain generation campaigns.",
          variant: "destructive"
        });
        return;
      }

      // Parse TLDs from comma-separated input
      const tlds = data.tldsInput ? data.tldsInput.split(',').map((tld: string) => {
        const trimmed = tld.trim();
        return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
      }).filter((tld: string) => tld.length > 1) : ['.com'];

      // Ensure numeric values are properly converted
      const variableLength = data.prefixVariableLength !== undefined ? Number(data.prefixVariableLength) : 3;
      const maxDomains = data.maxDomainsToGenerate !== undefined ? Number(data.maxDomainsToGenerate) : CampaignFormConstants.DEFAULT_MAX_DOMAINS;
      
      // Validate numeric values
      if (isNaN(variableLength) || variableLength < 1) {
        toast({
          title: "Validation Error",
          description: "Variable length must be a valid positive number.",
          variant: "destructive"
        });
        return;
      }
      
      if (isNaN(maxDomains) || maxDomains < 1) {
        toast({
          title: "Validation Error",
          description: "Maximum domains to generate must be at least 1.",
          variant: "destructive"
        });
        return;
      }

      // Map frontend pattern types to backend pattern types
      const mapPatternType = (frontendPattern: DomainGenerationPattern): "prefix" | "suffix" | "both" => {
        switch (frontendPattern) {
          case "prefix_variable":
            return "prefix" as any;
          case "suffix_variable":
            return "suffix" as any;
          case "both_variable":
            return "both" as any;
          default:
            return "prefix" as any;
        }
      };

      // Build unified campaign payload for phases-based workflow
      const unifiedPayload: CreateCampaignRequest = {
        campaignType: 'domain_generation',
        name: data.name,
        description: data.description,
        launchSequence: data.launchSequence !== false, // Default to true unless explicitly disabled
        domainGenerationParams: {
          patternType: mapPatternType(data.generationPattern),
          variableLength: variableLength,
          characterSet: data.allowedCharSet || 'abcdefghijklmnopqrstuvwxyz0123456789',
          constantString: data.constantPart.trim(),
          tld: tlds[0] || '.com',
          numDomainsToGenerate: maxDomains,
        },
      } as unknown as CreateCampaignRequest & { launchSequence?: boolean };

      // Handle campaign creation
      if (isEditing && campaignToEdit) {
        // In production API, campaigns are immutable after creation
        toast({
          title: "Campaign Editing Not Supported",
          description: "Please create a new campaign with the desired settings. Campaigns cannot be edited after creation.",
          variant: "destructive"
        });
        return;
      } else {
        console.log('🚀 [CAMPAIGN_CREATION_DEBUG] Starting phases-based campaign creation');
        console.log('📋 [FORM_DATA] Raw form data:', JSON.stringify(data, null, 2));
        console.log('📦 [API_PAYLOAD] Sending payload:', JSON.stringify(unifiedPayload, null, 2));
        
        try {
          const response = await unifiedCampaignService.createCampaign(unifiedPayload);
          console.log('✅ [API_RESPONSE] Received response:', JSON.stringify(response, null, 2));
        
        if (response.success === true && response.data) {
          // Handle nested response structure from the API
          const campaign = response.data;
          const campaignId = (campaign as { id?: string })?.id;
          
          console.log('✅ [CAMPAIGN_ID_EXTRACTED] Successfully extracted campaign ID:', campaignId);
          
          // Validate campaign ID exists
          if (!campaignId) {
            throw new Error('Campaign created successfully but missing ID');
          }

          toast({
            title: "Campaign Created Successfully",
            description: `Campaign "${(campaign as { name?: string })?.name || 'New Campaign'}" has been created and will start with domain generation.`,
            variant: "default"
          });
          
          // Auto-start domain generation campaigns if launch sequence is enabled
          if (data.launchSequence) {
            try {
              await unifiedCampaignService.startCampaign(campaignId);
            } catch (startError) {
              // Don't fail the creation flow if start fails (campaign may auto-complete)
              console.warn('[CampaignForm] Campaign start failed (may be auto-completed):', startError);
            }
          }
          
          // Navigate to campaign metrics page for real-time monitoring
          const redirectUrl = `/campaigns/${campaignId}`;
          
          // PERFORMANCE FIX: Immediate navigation without artificial delay
          try {
            await router.push(redirectUrl);
          } catch (_routerError) {
            // Fallback to direct navigation if router fails
            window.location.href = redirectUrl;
          }
          } else {
            console.log('❌ [API_ERROR] Campaign creation failed');
            console.log('📄 [RESPONSE_DETAILS] Full response:', JSON.stringify(response, null, 2));
            
            const errorMessage = response.message || "Failed to create campaign. Please check your inputs and try again.";
            setFormMainError(errorMessage);
            setFormFieldErrors({});
            
            toast({
              title: "Error Creating Campaign",
              description: errorMessage,
              variant: "destructive"
            });
          }
        } catch (error: unknown) {
          console.error('🚨 [CAMPAIGN_CREATION_ERROR] Exception caught:', error);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          setFormMainError(errorMessage);
          setFormFieldErrors({});
          
          toast({
            title: "Error Creating Campaign",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } catch (error: unknown) {
      console.error('🚨 [FORM_SUBMISSION_ERROR] Top-level exception:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setFormMainError(errorMessage);
      
      toast({
        title: "Form Submission Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast, router, isEditing, campaignToEdit]);

  // 🔧 CRITICAL FIX: Stable form submission handler without clearFormErrors dependency cycle
  const handleFormSubmit = useCallback(async (data: CampaignFormValues) => {
    // Prevent duplicate submissions during redirect
    if (isSubmitting) {
      console.log('🔒 [CAMPAIGN_FORM_DEBUG] Submission already in progress, ignoring duplicate');
      return;
    }

    // Clear errors at the start of submission - directly inline to avoid dependency cycles
    setFormFieldErrors({});
    setFormMainError(null);
    
    // Proceed with original onSubmit logic
    await onSubmit(data);
  }, [onSubmit, isSubmitting]);

  // Memoized page header props
  const pageHeaderProps = useMemo(() => ({
    title: isEditing
      ? `Edit Campaign: ${campaignToEdit?.name || ''}`
      : "Create New Campaign",
    description: isEditing
      ? "Modify the details and configuration for this campaign."
      : "Configure and launch your domain generation campaign. All campaigns start with domain generation in the setup phase.",
  }), [isEditing, campaignToEdit?.name]);

  return (
    <>
      {!isEditing && (
        <PageHeader
          title={pageHeaderProps.title}
          description={pageHeaderProps.description}
          icon={Target}
        />
      )}
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Campaign Details" : "Campaign Configuration"}</CardTitle>
          <CardDescription>
            {isEditing ? `Modifying: ${campaignToEdit?.name}` : "Define settings for your new campaign. All campaigns start with domain generation."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
              {/* Form Error Summary */}
              <FormErrorSummary 
                errors={formFieldErrors}
                mainError={formMainError}
                className="mb-6"
              />
              
              {/* Basic Campaign Information */}
              <FormField control={control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Q3 Tech Outreach" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe goals or targets." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Domain Generation Configuration */}
              <DomainGenerationConfig
                control={control}
                watch={watch}
                _setValue={setValue}
                totalPossible={domainCalculation.total}
                calculationDetails={domainCalculation.details}
                calculationWarning={domainCalculation.warning}
                isCalculationSafe={domainCalculation.isSafe}
                amount={maxDomainsToGenerate ? Number(maxDomainsToGenerate) : undefined}
              />

              {/* Launch Sequence Control */}
              <FormField control={control} name="launchSequence" render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Auto-start campaign after creation</FormLabel>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Updating..." : "Creating Campaign..."}
                    </>
                  ) : (
                    isEditing ? "Update Campaign" : "Create Campaign"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}