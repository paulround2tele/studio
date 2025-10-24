"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Info } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Use ONLY auto-generated types and new simplified form types
import type { SimpleCampaignFormValues } from './types/SimpleCampaignFormTypes';
import { formToApiRequest, defaultFormValues } from './types/SimpleCampaignFormTypes';
import { useCreateCampaignMutation } from '@/store/api/campaignApi';
import type { CampaignResponse } from '@/lib/api-client/models/campaign-response';
// Removed domain generation preview logic for Option A

// Option A: no TLD options on create page

interface CampaignFormV2Props {
  editMode?: boolean;
  campaignData?: CampaignResponse;
}

export default function CampaignFormV2({ editMode = false, campaignData }: CampaignFormV2Props) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Professional RTK Query mutation instead of direct API calls
  const [createCampaign, { isLoading: isCreatingCampaign }] = useCreateCampaignMutation();
  // Option A: No discovery fields on create; configuration happens on the dashboard

  // Helper function to convert campaign data to form values
  const campaignToFormValues = (campaign: CampaignResponse): SimpleCampaignFormValues => {
    // In phase-centric architecture, we can only edit basic info
    // Domain generation config is read-only after creation
    return {
      name: campaign.name || "",
      description: "", // Description may not be available in response
    };
  };

  // Form initialization using simplified types
  const form = useForm<SimpleCampaignFormValues>({
    defaultValues: editMode && campaignData ? campaignToFormValues(campaignData) : defaultFormValues
  });

  // Check if domain generation has started (restricts editing)
  // const domainGenerationStarted = !!(editMode && campaignData && campaignData.currentPhase && campaignData.currentPhase !== 'discovery');

  // Option A: No domain statistics / offset computation on create page

  // No Discovery field management on create page

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
        // Convert to API request using auto-generated types
        const apiRequest = formToApiRequest(data);

  // Use professional RTK Query mutation with correct types (no any)
  const campaignData = await createCampaign(apiRequest).unwrap();
        if (!campaignData || !campaignData.id) {
          throw new Error('Campaign creation succeeded but no campaign ID returned');
        }
        toast({
          title: "Campaign Created",
          description: `Lead generation campaign "${data.name}" has been created successfully. Configure phases on the dashboard next.`,
        });

        // DEBUG: Log redirect data before attempting navigation
  console.log('🚀 Campaign creation successful!');
  console.log('📊 newCampaignData:', JSON.stringify(campaignData, null, 2));
        console.log('🆔 Campaign ID:', campaignData.id);
        console.log('🧭 About to redirect to:', `/campaigns/${campaignData.id}`);

  // Redirect to campaign details page (PipelineWorkspace now authoritative)
        try {
          router.push(`/campaigns/${campaignData.id}`);
          console.log('✅ Router.push called successfully');
        } catch (routerError) {
          console.error('❌ Router.push failed:', routerError);
          throw routerError;
        }
      }
    } catch (error: unknown) {
      console.error('Campaign operation error:', error);
      let errorMessage = editMode ? 'Failed to update campaign. Please try again.' : 'Failed to create campaign. Please try again.';
      
      // Extract error message with proper type checking
      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = error.data;
        if (errorData && typeof errorData === 'object' && 'message' in errorData) {
          errorMessage = String(errorData.message);
        } else if (errorData && typeof errorData === 'object' && 'error' in errorData) {
          const nestedError = errorData.error;
          if (nestedError && typeof nestedError === 'object' && 'message' in nestedError) {
            errorMessage = String(nestedError.message);
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: editMode ? 'Update Failed' : 'Creation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Watch form values for UI updates
  // No discovery fields to watch on create

  return (
    <>
      <PageHeader
        title={editMode ? "Edit Campaign" : "Create New Campaign"}
        description={editMode
          ? "Edit basic campaign information. Domain generation and phase configurations are managed separately."
          : "Create a new lead generation campaign. Configure phases after creation using the Phase Dashboard."
        }
        data-testid={editMode ? 'campaign-edit-header' : 'campaign-create-header'}
      />

      <Card className="max-w-4xl mx-auto" data-testid={editMode ? 'campaign-edit-card' : 'campaign-create-card'}>
        <CardHeader>
      <CardTitle data-testid="campaign-form-title">{editMode ? "Edit Campaign" : "Campaign"}</CardTitle>
          <CardDescription>
            {editMode
              ? "Update basic campaign information. Domain generation configuration cannot be changed after creation."
        : "Set up your campaign with basic information. Configure phases (Discovery, DNS, HTTP, Analysis) on the dashboard after creation."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="campaign-form">
              {/* Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter campaign name" {...field} data-testid="campaign-name-input" />
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
                        <Textarea placeholder="Enter campaign description" {...field} data-testid="campaign-description-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* No discovery stats/offset preview in Option A */}
              </div>

              {/* Phase Information Alert */}
              <Alert data-testid="campaign-phase-architecture-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase-Centric Architecture:</strong> After creating your campaign, configure phases from the dashboard. 
                  Start with Discovery (domain generation), then DNS Validation, HTTP Keyword Validation, and Analysis.
                </AlertDescription>
              </Alert>

              {/* No Domain Generation fields on create (configure on dashboard) */}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/campaigns')}
                  disabled={isCreatingCampaign}
                  data-testid="campaign-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreatingCampaign}
                  data-testid="campaign-submit"
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