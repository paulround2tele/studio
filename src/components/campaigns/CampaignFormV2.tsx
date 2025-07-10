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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PageHeader from '@/components/shared/PageHeader';
import { Target, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { CAMPAIGN_SELECTED_TYPES } from "@/lib/constants";
import type { components } from '@/lib/api-client/types';
import { campaignService } from '@/lib/services/campaignService.production';

// Import shared types to prevent conflicts
import type {
  CampaignFormValues,
  CampaignSelectedType,
  DomainGenerationPattern,
  DomainSourceSelectionMode
} from './types/CampaignFormTypes';

// Import OpenAPI types
type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'];

// Base campaign type from OpenAPI
type BaseCampaign = components['schemas']['Campaign'];
type DnsValidationParams = components['schemas']['DnsValidationParams'];
type HttpKeywordParams = components['schemas']['HttpKeywordParams'];
type DomainGenerationParams = components['schemas']['DomainGenerationParams'];

// CampaignViewModel interface using OpenAPI base with UI extensions
export interface CampaignViewModel extends Omit<BaseCampaign, 'dnsValidationParams' | 'httpKeywordParams' | 'domainGenerationParams' | 'failedItems' | 'processedItems' | 'successfulItems' | 'totalItems' | 'metadata'> {
  description?: string;
  selectedType?: CampaignSelectedType;
  currentPhase?: components['schemas']['Campaign']['currentPhase'];
  
  // Flexible parameter types that can handle both OpenAPI and legacy formats
  dnsValidationParams?: DnsValidationParams | Record<string, unknown>;
  httpKeywordValidationParams?: HttpKeywordParams | Record<string, unknown>;
  domainGenerationParams?: DomainGenerationParams | Record<string, unknown>;
  
  domainSourceConfig?: {
    type: string;
    sourceCampaignId?: string;
    sourcePhase?: string;
    uploadedDomains?: string[];
  };
  domainGenerationConfig?: {
    generationPattern?: DomainGenerationPattern;
    constantPart?: string;
    allowedCharSet?: string;
    tlds?: string[];
    prefixVariableLength?: number;
    suffixVariableLength?: number;
    maxDomainsToGenerate?: number;
  };
  leadGenerationSpecificConfig?: {
    targetKeywords?: string[];
    scrapingRateLimit?: {
      requests: number;
      per: string;
    };
    requiresJavaScriptRendering?: boolean;
  };
  initialDomainsToProcessCount?: number;
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignment?: {
    mode: string;
    proxyId?: string;
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
  NONE_VALUE_PLACEHOLDER: "__none__" as const,
  MAX_DOMAINS_LIMIT: 1000000,
  MIN_DOMAINS_LIMIT: 1,
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_PROCESSING_SPEED: 60,
  DEFAULT_ROTATION_INTERVAL: 300,
} as const;

// CampaignFormValues interface now imported from shared types file

// Helper functions
function getDefaultSourceMode(campaignType?: CampaignSelectedType | null): DomainSourceSelectionMode {
  switch (campaignType) {
    case 'domain_generation':
      return 'none';
    case 'dns_validation':
    case 'http_keyword_validation':
      return 'campaign_output';
    default:
      return 'none';
  }
}

function needsHttpPersona(campaignType?: CampaignSelectedType | null): boolean {
  return campaignType === 'http_keyword_validation';
}

function needsDnsPersona(campaignType?: CampaignSelectedType | null): boolean {
  return campaignType === 'dns_validation';
}
import React, { useCallback, useMemo, useState } from "react";
import { FormErrorSummary } from '@/components/ui/form-field-error';
import { type FormErrorState } from '@/lib/utils/errorHandling';

// Performance-optimized hooks
import { useDomainCalculation } from "@/lib/hooks/useDomainCalculation";
import { useCampaignFormData } from "@/lib/hooks/useCampaignFormData";

// Memoized sub-components
import DomainGenerationConfig from "./form/DomainGenerationConfig";
import DomainSourceConfig from "./form/DomainSourceConfig";
import KeywordConfig from "./form/KeywordConfig";
import OperationalAssignments from "./form/OperationalAssignments";
import CampaignTuningConfig from "./form/CampaignTuningConfig";

interface CampaignFormProps {
  campaignToEdit?: CampaignViewModel;
  isEditing?: boolean;
}

/**
 * Performance-optimized CampaignFormV2 component
 * 
 * Key optimizations implemented:
 * 1. Domain calculation uses debounced useMemo with performance safeguards
 * 2. Async data loading optimized with proper error handling and caching
 * 3. Component split into memoized sub-components to reduce re-renders
 * 4. Form validation optimized to reduce computation overhead
 * 5. React concurrent features best practices implemented
 */
export default function CampaignFormV2({ campaignToEdit, isEditing = false }: CampaignFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Enhanced error handling state
  const [formFieldErrors, setFormFieldErrors] = useState<FormErrorState>({});
  const [formMainError, setFormMainError] = useState<string | null>(null);

  // Optimized data loading with improved error handling and caching
  const {
    httpPersonas,
    dnsPersonas,
    sourceCampaigns,
    isLoading: loadingSelectData,
    error: dataLoadError
  } = useCampaignFormData(isEditing);

  // 🔧 CRITICAL FIX: Memoize preselected type to prevent infinite re-renders
  const preselectedType = useMemo(() => {
    return !isEditing ? (searchParams.get('type') as CampaignSelectedType | null) : null;
  }, [isEditing, searchParams]);

  // 🔧 CRITICAL FIX: Memoize default values to prevent infinite re-renders
  const defaultValues = useMemo(() => ({
    name: isEditing && campaignToEdit ? campaignToEdit.name : "",
    description: isEditing && campaignToEdit ? (campaignToEdit.description || "") : "",
    selectedType: isEditing && campaignToEdit ? campaignToEdit.selectedType : (preselectedType && Object.values(CAMPAIGN_SELECTED_TYPES).includes(preselectedType) ? preselectedType : undefined),
    domainSourceSelectionMode: isEditing && campaignToEdit ?
      (campaignToEdit.domainSourceConfig?.type === 'current_campaign_output' ? 'campaign_output' as const : (campaignToEdit.domainSourceConfig?.type as DomainSourceSelectionMode || getDefaultSourceMode(campaignToEdit.selectedType))) :
      getDefaultSourceMode(preselectedType),
    sourceCampaignId: isEditing && campaignToEdit ? (campaignToEdit.domainSourceConfig?.sourceCampaignId || CampaignFormConstants.NONE_VALUE_PLACEHOLDER) : CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
    sourcePhase: isEditing && campaignToEdit ? campaignToEdit.domainSourceConfig?.sourcePhase : undefined,
    uploadedDomainsFile: null,
    uploadedDomainsContentCache: isEditing && campaignToEdit ? (campaignToEdit.domainSourceConfig?.type === 'upload' ? campaignToEdit.domainSourceConfig.uploadedDomains : []) : [],
    initialDomainsToProcessCount: isEditing && campaignToEdit ? campaignToEdit.initialDomainsToProcessCount : 100,
    
    generationPattern: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.generationPattern as DomainGenerationPattern || "prefix_variable") : "prefix_variable",
    constantPart: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.constantPart || "") : "business",
    allowedCharSet: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.allowedCharSet || "abcdefghijklmnopqrstuvwxyz0123456789") : "abcdefghijklmnopqrstuvwxyz0123456789",
    tldsInput: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.tlds?.join(', ') || ".com") : ".com",
    prefixVariableLength: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.prefixVariableLength === undefined ? undefined : Number(campaignToEdit.domainGenerationConfig.prefixVariableLength)) : 3,
    suffixVariableLength: isEditing && campaignToEdit ? (campaignToEdit.domainGenerationConfig?.suffixVariableLength === undefined ? undefined : Number(campaignToEdit.domainGenerationConfig.suffixVariableLength)) : 0,
    maxDomainsToGenerate: isEditing && campaignToEdit ? campaignToEdit.domainGenerationConfig?.maxDomainsToGenerate : 1000,
    
    targetKeywordsInput: isEditing && campaignToEdit ? (campaignToEdit.leadGenerationSpecificConfig?.targetKeywords?.join(', ') || "") : "telecom, voip, saas",
    scrapingRateLimitRequests: isEditing && campaignToEdit ? campaignToEdit.leadGenerationSpecificConfig?.scrapingRateLimit?.requests : 1,
    scrapingRateLimitPer: isEditing && campaignToEdit ? (campaignToEdit.leadGenerationSpecificConfig?.scrapingRateLimit?.per as "second" | "minute" || 'second') : 'second',
    requiresJavaScriptRendering: isEditing && campaignToEdit ? (campaignToEdit.leadGenerationSpecificConfig?.requiresJavaScriptRendering || false) : false,

    rotationIntervalSeconds: isEditing && campaignToEdit ? Number(
      campaignToEdit.dnsValidationParams?.rotationIntervalSeconds ??
      campaignToEdit.httpKeywordValidationParams?.rotationIntervalSeconds ??
      300
    ) : 300,
    processingSpeedPerMinute: isEditing && campaignToEdit ? Number(
      campaignToEdit.dnsValidationParams?.processingSpeedPerMinute ??
      campaignToEdit.httpKeywordValidationParams?.processingSpeedPerMinute ??
      60
    ) : 60,
    batchSize: isEditing && campaignToEdit ? Number(
      campaignToEdit.dnsValidationParams?.batchSize ??
      campaignToEdit.httpKeywordValidationParams?.batchSize ??
      10
    ) : 10,
    retryAttempts: isEditing && campaignToEdit ? Number(
      campaignToEdit.dnsValidationParams?.retryAttempts ??
      campaignToEdit.httpKeywordValidationParams?.retryAttempts ??
      3
    ) : 3,
    targetHttpPorts: isEditing && campaignToEdit ? (
      Array.isArray(campaignToEdit.httpKeywordValidationParams?.targetHttpPorts)
        ? campaignToEdit.httpKeywordValidationParams.targetHttpPorts
        : [80, 443]
    ) : [80, 443],
    
    assignedHttpPersonaId: isEditing && campaignToEdit ? (campaignToEdit.assignedHttpPersonaId || CampaignFormConstants.NONE_VALUE_PLACEHOLDER) : CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
    assignedDnsPersonaId: isEditing && campaignToEdit ? (campaignToEdit.assignedDnsPersonaId || CampaignFormConstants.NONE_VALUE_PLACEHOLDER) : CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
    proxyAssignmentMode: isEditing && campaignToEdit ? (campaignToEdit.proxyAssignment?.mode as "none" | "single" | "rotate_active" || 'none') : 'none',
    assignedProxyId: isEditing && campaignToEdit ? ((campaignToEdit.proxyAssignment?.mode === 'single' && campaignToEdit.proxyAssignment.proxyId) ? campaignToEdit.proxyAssignment.proxyId : CampaignFormConstants.NONE_VALUE_PLACEHOLDER) : CampaignFormConstants.NONE_VALUE_PLACEHOLDER,
    launchSequence: true, // ✅ AUTOMATIC PHASE TRIGGERING: Default to true for automatic campaign orchestration
  }), [isEditing, campaignToEdit, preselectedType]);

  const form = useForm<CampaignFormValues>({
    defaultValues: defaultValues as CampaignFormValues,
    mode: "onChange"
  });

  const { control, formState: { isSubmitting }, watch, setValue } = form;
  const selectedCampaignType = watch("selectedType");

  // Performance-optimized domain calculation with debouncing and safeguards
  const generationPattern = watch("generationPattern");
  const allowedCharSet = watch("allowedCharSet");
  const prefixVariableLength = watch("prefixVariableLength");
  const suffixVariableLength = watch("suffixVariableLength");
  const tldsInput = watch("tldsInput");
  const maxDomainsToGenerate = watch("maxDomainsToGenerate");

  const domainCalculation = useDomainCalculation(
    selectedCampaignType,
    generationPattern,
    allowedCharSet,
    prefixVariableLength,
    suffixVariableLength,
    tldsInput
  );

  // Memoized form submission handler to prevent unnecessary re-creates
  const onSubmit = useCallback(async (data: CampaignFormValues) => {
    try {
      console.log('🔍 [FORM_DEBUG] Form submission started:', {
        formData: data.selectedType,
        currentUrl: window.location.href,
        routerAvailable: !!router
      });

      // Clear previous errors
      setFormFieldErrors({});
      setFormMainError(null);

      // Build unified campaign payload based on campaign type
      let unifiedPayload: CreateCampaignRequest;

      switch (data.selectedType) {
        case 'domain_generation': {
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
          const maxDomains = data.maxDomainsToGenerate !== undefined ? Number(data.maxDomainsToGenerate) : 1000;
          
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
                return "prefix";
              case "suffix_variable":
                return "suffix";
              case "both_variable":
                return "both";
              default:
                return "prefix";
            }
          };

          unifiedPayload = {
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
          break;
        }

        case 'dns_validation': {
          // Validate required fields for DNS validation
          if (!data.sourceCampaignId || data.sourceCampaignId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
            toast({
              title: "Validation Error",
              description: "Source campaign is required for DNS validation campaigns.",
              variant: "destructive"
            });
            return;
          }

          if (!data.assignedDnsPersonaId || data.assignedDnsPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
            toast({
              title: "Validation Error",
              description: "DNS persona assignment is required for DNS validation campaigns.",
              variant: "destructive"
            });
            return;
          }

          unifiedPayload = {
            campaignType: 'dns_validation',
            name: data.name,
            description: data.description,
            launchSequence: data.launchSequence || false,
            dnsValidationParams: {
              sourceCampaignId: data.sourceCampaignId,
              personaIds: [data.assignedDnsPersonaId],
              rotationIntervalSeconds: Number(data.rotationIntervalSeconds),
              processingSpeedPerMinute: Number(data.processingSpeedPerMinute),
              batchSize: Number(data.batchSize),
              retryAttempts: Number(data.retryAttempts),
            },
          } as CreateCampaignRequest & { launchSequence?: boolean };
          break;
        }

        case 'http_keyword_validation': {
          // Validate required fields for HTTP keyword validation
          if (!data.sourceCampaignId || data.sourceCampaignId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
            toast({
              title: "Validation Error",
              description: "Source campaign is required for HTTP keyword validation campaigns.",
              variant: "destructive"
            });
            return;
          }

          if (!data.assignedHttpPersonaId || data.assignedHttpPersonaId === CampaignFormConstants.NONE_VALUE_PLACEHOLDER) {
            toast({
              title: "Validation Error",
              description: "HTTP persona assignment is required for HTTP keyword validation campaigns.",
              variant: "destructive"
            });
            return;
          }

          // Parse keywords from input
          const adHocKeywords = data.targetKeywordsInput
            ? data.targetKeywordsInput.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
            : [];

          if (adHocKeywords.length === 0) {
            toast({
              title: "Validation Error",
              description: "At least one keyword is required for HTTP keyword validation campaigns.",
              variant: "destructive"
            });
            return;
          }

          // Determine source campaign type
          const sourceCampaign = sourceCampaigns.find(campaign => campaign.id === data.sourceCampaignId);
          const _sourceType = sourceCampaign?.selectedType === 'domain_generation' ? 'DomainGeneration' : 'DNSValidation';

          unifiedPayload = {
            campaignType: 'http_keyword_validation',
            name: data.name,
            description: data.description,
            launchSequence: data.launchSequence || false,
            httpKeywordParams: {
              sourceCampaignId: data.sourceCampaignId,
              adHocKeywords: adHocKeywords,
              personaIds: [data.assignedHttpPersonaId],
              proxyPoolId: (data.assignedProxyId && data.assignedProxyId !== CampaignFormConstants.NONE_VALUE_PLACEHOLDER)
                ? data.assignedProxyId
                : undefined,
              rotationIntervalSeconds: Number(data.rotationIntervalSeconds),
              processingSpeedPerMinute: Number(data.processingSpeedPerMinute),
              batchSize: Number(data.batchSize),
              retryAttempts: Number(data.retryAttempts),
              targetHttpPorts: data.targetHttpPorts,
            },
          } as CreateCampaignRequest & { launchSequence?: boolean };
          break;
        }

        default:
          toast({
            title: "Validation Error",
            description: "Invalid campaign type selected.",
            variant: "destructive"
          });
          return;
      }

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
        console.log('🚀 [CAMPAIGN_CREATION] Sending payload:', JSON.stringify(unifiedPayload, null, 2));
        
        const response = await campaignService.createCampaign(unifiedPayload);
        
        if (response.status === 'success' && response.data) {
          // Handle nested response structure from the API
          const apiResponse = response.data as any;
          const campaign = apiResponse.data || response.data;
          const campaignId = campaign?.id;
          
          // Validate campaign ID exists
          if (!campaignId) {
            throw new Error('Campaign created successfully but missing ID');
          }

          toast({
            title: "Campaign Created Successfully",
            description: `Campaign "${campaign.name || 'New Campaign'}" has been created.`,
            variant: "default"
          });
          
          // Auto-start domain generation campaigns if launch sequence is enabled
          if (data.launchSequence && data.selectedType === 'domain_generation') {
            try {
              await campaignService.startCampaign(campaignId);
            } catch (startError) {
              // Don't fail the creation flow if start fails (campaign may auto-complete)
              console.warn('[CampaignForm] Campaign start failed (may be auto-completed):', startError);
            }
          }
          
          // Navigate to campaign metrics page for real-time monitoring
          const redirectUrl = `/campaigns/${campaignId}?type=${data.selectedType}`;
          
          // Use setTimeout to ensure proper navigation after form submission
          setTimeout(async () => {
            try {
              await router.push(redirectUrl);
            } catch (routerError) {
              // Fallback to direct navigation if router fails
              window.location.href = redirectUrl;
            }
          }, 100);
        } else {
          const errorMessage = response.message || "Failed to create campaign. Please check your inputs and try again.";
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
      console.error('[CampaignForm] Campaign creation error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed')) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive"
          });
          router.push('/login');
        } else if (error.message.includes('Validation error')) {
          toast({
            title: "Validation Error",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error Creating Campaign",
            description: error.message || "An unexpected error occurred. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error Creating Campaign",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [toast, router, isEditing, campaignToEdit, sourceCampaigns]);

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

  // Memoized persona requirements to prevent unnecessary recalculations
  const needsHttp = useMemo(() => needsHttpPersona(selectedCampaignType), [selectedCampaignType]);
  const needsDns = useMemo(() => needsDnsPersona(selectedCampaignType), [selectedCampaignType]);

  // Memoized page header props
  const pageHeaderProps = useMemo(() => ({
    title: isEditing
      ? `Edit Campaign: ${campaignToEdit?.name || ''}`
      : selectedCampaignType
      ? `Create New ${selectedCampaignType} Campaign`
      : "Create New Campaign",
    description: isEditing
      ? "Modify the details and configuration for this campaign."
      : "Configure and launch your domain intelligence or lead generation initiative.",
  }), [isEditing, campaignToEdit?.name, selectedCampaignType]);

  // Show data loading error if critical data failed to load
  if (dataLoadError) {
    return (
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Form Data</h3>
            <p className="text-muted-foreground mb-4">{dataLoadError}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            {isEditing ? `Modifying: ${campaignToEdit?.name}` : "Define settings for your new campaign."}
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
              
              <FormField control={control} name="selectedType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Type</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    setValue("domainSourceSelectionMode", getDefaultSourceMode(value as CampaignSelectedType));
                  }} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(CAMPAIGN_SELECTED_TYPES).map((type: string) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Performance-optimized Domain Generation Configuration */}
              {selectedCampaignType === 'domain_generation' && (
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
              )}

              {/* Optimized Domain Source Configuration */}
              {(selectedCampaignType === 'dns_validation' || selectedCampaignType === 'http_keyword_validation') && (
                <DomainSourceConfig
                  control={control}
                  watch={watch}
                  sourceCampaigns={sourceCampaigns}
                  isLoading={loadingSelectData}
                />
              )}

              {/* Optimized Keyword Configuration */}
              {selectedCampaignType === 'http_keyword_validation' && (
                <KeywordConfig control={control} />
              )}

              {(selectedCampaignType === 'dns_validation' || selectedCampaignType === 'http_keyword_validation') && (
                <CampaignTuningConfig
                  control={control}
                  showHttpPorts={selectedCampaignType === 'http_keyword_validation'}
                />
              )}

              {/* Optimized Operational Assignments */}
              {(needsHttp || needsDns) && (
                <OperationalAssignments
                  control={control}
                  needsHttp={needsHttp}
                  needsDns={needsDns}
                  httpPersonas={httpPersonas}
                  dnsPersonas={dnsPersonas}
                  isLoading={loadingSelectData}
                />
              )}

              {selectedCampaignType === 'domain_generation' && (
                <FormField control={control} name="launchSequence" render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Launch full sequence</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || loadingSelectData}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Campaign")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}