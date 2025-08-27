"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Info } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Use ONLY auto-generated types and new simplified form types
import type { SimpleCampaignFormValues } from './types/SimpleCampaignFormTypes';
import { formToApiRequest, defaultFormValues } from './types/SimpleCampaignFormTypes';
import { useCreateCampaignMutation } from '@/store/api/campaignApi';
import { calculateMaxTheoreticalDomains, calculateRemainingDomains } from '@/lib/utils/domainCalculation';
import type { CampaignResponse } from '@/lib/api-client/models/campaign-response';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

// Common TLD options
const COMMON_TLDS = [
  'com', 'net', 'org', 'io', 'co', 'app', 'dev', 'tech', 'info', 'biz',
  'me', 'tv', 'cc', 'ai', 'xyz', 'online', 'site', 'website', 'store'
];

interface CampaignFormV2Props {
  editMode?: boolean;
  campaignData?: CampaignResponse;
}

export default function CampaignFormV2({ editMode = false, campaignData }: CampaignFormV2Props) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Professional RTK Query mutation instead of direct API calls
  const [createCampaign, { isLoading: isCreatingCampaign }] = useCreateCampaignMutation();
  
  // Domain calculation state
  const [totalRemainingDomains, setTotalRemainingDomains] = useState<number>(0);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [calculatingDomains, setCalculatingDomains] = useState(false);

  // Helper function to convert campaign data to form values
  const campaignToFormValues = (campaign: CampaignResponse): SimpleCampaignFormValues => {
    // In phase-centric architecture, we can only edit basic info
    // Domain generation config is read-only after creation
    return {
      name: campaign.name || "",
      description: "", // Description not available in LeadGenerationCampaignResponse
      // For edit mode, we just use defaults for domain config (will be disabled)
      patternType: "prefix",
      constantString: "",
      characterSet: "abcdefghijklmnopqrstuvwxyz0123456789",
      variableLength: 3,
      tlds: ["com"],
      numDomainsToGenerate: 1000,
      tldsInput: "com",
    };
  };

  // Form initialization using simplified types
  const form = useForm<SimpleCampaignFormValues>({
    defaultValues: editMode && campaignData ? campaignToFormValues(campaignData) : defaultFormValues
  });

  // Check if domain generation has started (restricts editing)
  const domainGenerationStarted = !!(editMode && campaignData && campaignData.currentPhase && campaignData.currentPhase !== 'discovery');

  // Domain calculation function
  const calculateDomainStatistics = async (formData: SimpleCampaignFormValues) => {
    if (!formData.constantString || !formData.characterSet) return;
    
    setCalculatingDomains(true);
    try {
      // Build domain generation config for calculation
      const config = {
        patternType: formData.patternType,
        characterSet: formData.characterSet,
        constantString: formData.constantString,
        tld: formData.tlds[0] ? (formData.tlds[0].startsWith('.') ? formData.tlds[0] : '.' + formData.tlds[0]) : '.com',
        variableLength: formData.variableLength,
        numDomainsToGenerate: formData.numDomainsToGenerate || 1000
      };

      // Get current offset from backend and calculate remaining domains
      let offset = 0;
      try {
        // Not present in OpenAPI spec; call backend directly
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const res = await fetch(`${apiUrl}/campaigns/domain-generation/pattern-offset`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patternType: config.patternType,
            characterSet: config.characterSet,
            constantString: config.constantString,
            tld: config.tld,
            variableLength: config.variableLength,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          offset = json?.data?.currentOffset || 0;
          setCurrentOffset(offset);
        } else {
          throw new Error(`Pattern offset request failed: ${res.status}`);
        }
      } catch (offsetError) {
        console.warn('Could not fetch current offset, using 0:', offsetError);
        setCurrentOffset(0);
      }

      // Calculate remaining domains - transform to schema format
      const schemaConfig = {
        patternType: config.patternType,
        characterSet: config.characterSet,
        constantString: config.constantString,
        tlds: [config.tld], // Convert singular tld to array for schema compatibility
        variableLength: config.variableLength,
        numDomainsToGenerate: config.numDomainsToGenerate || 1000
      };
      const remaining = calculateRemainingDomains(schemaConfig, offset);
      setTotalRemainingDomains(remaining);

    } catch (error) {
      console.error('Error calculating domain statistics:', error);
      setCurrentOffset(0);
      setTotalRemainingDomains(0);
    } finally {
      setCalculatingDomains(false);
    }
  };

  // Watch form changes for real-time domain calculation
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    
    const subscription = form.watch((data) => {
      if (data.constantString && data.characterSet && data.patternType) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          calculateDomainStatistics(data as SimpleCampaignFormValues);
        }, 500); // Debounce for 500ms
      }
    });
    
    return () => {
      clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [form]);

  // TLD management functions
  const addTld = (tld: string) => {
    const currentTlds = form.getValues('tlds');
    const cleanTld = tld.replace('.', ''); // Remove dot for storage
    if (!currentTlds.includes(cleanTld)) {
      const updatedTlds = [...currentTlds, cleanTld];
      form.setValue('tlds', updatedTlds);
      form.setValue('tldsInput', updatedTlds.join(','));
    }
  };

  const removeTld = (tld: string) => {
    const currentTlds = form.getValues('tlds');
    const updatedTlds = currentTlds.filter(t => t !== tld);
    form.setValue('tlds', updatedTlds);
    form.setValue('tldsInput', updatedTlds.join(','));
  };

  // Form submission - phase-centric approach
  const onSubmit = async (data: SimpleCampaignFormValues) => {
    try {
      if (editMode) {
        // Edit mode is not supported in phase-centric architecture
        // Campaigns are immutable after creation - only phases can be configured
        toast({
          title: "Edit Not Supported",
          description: "Campaigns cannot be modified after creation in the phase-centric architecture. Use the Phase Dashboard to configure individual phases.",
          variant: "destructive"
        });
        return;
      } else {
        // Create mode: Full campaign creation
        // Convert TLDs from comma-separated input to array
        const tlds = data.tldsInput.split(',')
          .map(tld => tld.trim())
          .filter(Boolean)
          .map(tld => tld.startsWith('.') ? tld.slice(1) : tld); // Remove dots for API

        // Update form data with processed TLDs
        const processedData = { ...data, tlds };

        // Convert to API request using auto-generated types
        const apiRequest = formToApiRequest(processedData);

        // Use professional RTK Query mutation with proper type casting
        // TODO: Fix schema mismatches between enums - using any for now
        const newCampaignData = await createCampaign(apiRequest as any).unwrap();
        
        // The response is wrapped in a data field - classic OpenAPI amateur design
        // Cast to any because the auto-generated types are completely wrong
        const campaignData = (newCampaignData as any).data || newCampaignData;
        if (!campaignData || !campaignData.id) {
          throw new Error('Campaign creation succeeded but no campaign ID returned');
        }
        
        toast({
          title: "Campaign Created",
          description: `Lead generation campaign "${data.name}" has been created successfully. Configure phases on the next page.`,
        });

        // DEBUG: Log redirect data before attempting navigation
        console.log('🚀 Campaign creation successful!');
        console.log('📊 newCampaignData:', JSON.stringify(newCampaignData, null, 2));
        console.log('🆔 Campaign ID:', campaignData.id);
        console.log('🧭 About to redirect to:', `/campaigns/${campaignData.id}`);

        // Redirect to campaign details page (which includes PhaseDashboard)
        try {
          router.push(`/campaigns/${campaignData.id}`);
          console.log('✅ Router.push called successfully');
        } catch (routerError) {
          console.error('❌ Router.push failed:', routerError);
          throw routerError;
        }
      }
    } catch (error: any) {
      console.error('Campaign operation error:', error);
      
      // RTK Query provides standardized error format
      let errorMessage = editMode ? "Failed to update campaign. Please try again." : "Failed to create campaign. Please try again.";
      
      // Handle RTK Query error format
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.error?.message) {
        errorMessage = error.data.error.message;
      }
      
      toast({
        title: editMode ? "Update Failed" : "Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Watch form values for UI updates
  const watchTlds = form.watch('tlds');
  const watchPatternType = form.watch('patternType');

  return (
    <>
      <PageHeader
        title={editMode ? "Edit Campaign" : "Create New Campaign"}
        description={editMode
          ? "Edit basic campaign information. Domain generation and phase configurations are managed separately."
          : "Create a new lead generation campaign. Configure phases after creation using the Phase Dashboard."
        }
      />

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{editMode ? "Edit Campaign" : "Campaign Configuration"}</CardTitle>
          <CardDescription>
            {editMode
              ? "Update basic campaign information. Domain generation configuration cannot be changed after creation."
              : "Set up your campaign with basic information and domain generation configuration. Individual phases (DNS, HTTP, Analysis) will be configured separately."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter campaign name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter campaign description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Domain Statistics Display - Only in create mode */}
                {!editMode && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {calculatingDomains ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        ) : (
                          totalRemainingDomains.toLocaleString()
                        )}
                      </div>
                      <div className="text-sm text-foreground/80 font-medium">Total Remaining Domains</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {calculatingDomains ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                          </div>
                        ) : (
                          currentOffset.toLocaleString()
                        )}
                      </div>
                      <div className="text-sm text-foreground/80 font-medium">Current Offset</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Phase Information Alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase-Centric Architecture:</strong> After creating your campaign, you'll configure 
                  individual phases (DNS Validation, HTTP Keyword Validation, Analysis) through the Phase Dashboard. 
                  Each phase can be configured and started independently.
                </AlertDescription>
              </Alert>

              {/* Domain Generation Parameters */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Domain Generation Configuration</h3>
                
                <FormField
                  control={form.control}
                  name="numDomainsToGenerate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Domains to Generate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="1000"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patternType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pattern Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prefix">Prefix Variable</SelectItem>
                          <SelectItem value="suffix">Suffix Variable</SelectItem>
                          <SelectItem value="both">Both Variable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="constantString"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Constant Part *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., mycompany" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="characterSet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed Character Set</FormLabel>
                      <FormControl>
                        <Input placeholder="abcdefghijklmnopqrstuvwxyz0123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="variableLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Variable Length</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="3"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tldsInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Top Level Domains</FormLabel>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-3 border rounded-lg bg-background">
                          {watchTlds?.map((tld: string) => (
                            <Badge key={tld} variant="secondary" className="flex items-center gap-1">
                              .{tld}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeTld(tld)}
                              />
                            </Badge>
                          ))}
                          {(!watchTlds || watchTlds.length === 0) && (
                            <span className="text-muted-foreground text-sm">Select TLDs...</span>
                          )}
                        </div>
                        <Select onValueChange={addTld}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add TLD" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_TLDS.map((tld) => (
                              <SelectItem key={tld} value={tld}>
                                .{tld}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/campaigns')}
                  disabled={isCreatingCampaign}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreatingCampaign}
                >
                  {isCreatingCampaign ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}