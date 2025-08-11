"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BarChart3, FileText, Camera } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import types and services - using the new auto-generated API client
import { campaignsApi } from '@/lib/api-client/client';
import { ConfigurePhaseStandalonePhaseEnum } from '@/lib/api-client/apis/campaigns-api';
import type { AnalysisConfig } from '@/lib/api-client/models/analysis-config';
import type { PhaseConfigureRequest } from '@/lib/api-client/models/phase-configure-request';

interface AnalysisFormValues {
  analysisType: string;
  includeScreenshots: boolean;
  generateReport: boolean;
  customRules: string[];
}

interface AnalysisConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  onConfigured: () => void;
}

export default function AnalysisConfigModal({ 
  isOpen, 
  onClose, 
  campaignId, 
  onConfigured 
}: AnalysisConfigModalProps) {
  const { toast } = useToast();
  const [configuring, setConfiguring] = useState(false);

  // Form initialization with smart defaults from the plan
  const form = useForm<AnalysisFormValues>({
    defaultValues: {
      analysisType: 'comprehensive',
      includeScreenshots: true,
      generateReport: true,
      customRules: [],
    }
  });

  const handleSubmit = async (values: AnalysisFormValues) => {
    try {
      setConfiguring(true);

      // Build the analysis configuration using auto-generated types
      const analysisConfig: AnalysisConfig = {
        analysisType: values.analysisType as any, // Convert to enum
        includeScreenshots: values.includeScreenshots,
        generateReport: values.generateReport,
        customRules: values.customRules.filter(rule => rule.trim() !== ''),
      };

      // Create the phase configuration request using auto-generated types
      const configRequest: PhaseConfigureRequest = {
        phaseType: 'analysis',
        config: analysisConfig,
      };

      // Use the generated API client method
      await campaignsApi.configurePhaseStandalone(campaignId, ConfigurePhaseStandalonePhaseEnum.analysis, configRequest);

      toast({
        title: "Analysis Configuration Saved",
        description: "Analysis phase has been configured successfully.",
      });

      onConfigured();
      onClose();
    } catch (error) {
      console.error('Failed to configure analysis phase:', error);
      toast({
        title: "Configuration failed",
        description: "Failed to save analysis configuration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfiguring(false);
    }
  };

  const addCustomRule = () => {
    const currentRules = form.getValues('customRules');
    form.setValue('customRules', [...currentRules, '']);
  };

  const updateCustomRule = (index: number, value: string) => {
    const currentRules = form.getValues('customRules');
    const newRules = [...currentRules];
    newRules[index] = value;
    form.setValue('customRules', newRules);
  };

  const removeCustomRule = (index: number) => {
    const currentRules = form.getValues('customRules');
    const newRules = currentRules.filter((_, i) => i !== index);
    form.setValue('customRules', newRules);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Configure Analysis Phase
          </DialogTitle>
          <DialogDescription>
            Configure analysis parameters for comprehensive results processing and report generation.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Analysis Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="analysisType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Analysis Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select analysis type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Basic Analysis</div>
                                <div className="text-sm text-muted-foreground">
                                  Standard data analysis and basic reporting
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="comprehensive">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Comprehensive Analysis</div>
                                <div className="text-sm text-muted-foreground">
                                  Advanced analysis with detailed insights and cross-references
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="custom">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Custom Analysis</div>
                                <div className="text-sm text-muted-foreground">
                                  Custom analysis rules and specialized processing
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Analysis Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="includeScreenshots"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          Include Screenshots
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Capture visual screenshots of analyzed content for documentation
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="generateReport"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Generate Final Report
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Create a comprehensive final report with all analysis results
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Custom Rules (for custom analysis type) */}
            {form.watch('analysisType') === 'custom' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Custom Analysis Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {form.watch('customRules').map((rule, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          placeholder="Enter custom analysis rule..."
                          value={rule}
                          onChange={(e) => updateCustomRule(index, e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomRule(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomRule}
                    className="w-full"
                  >
                    Add Custom Rule
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Configuration Summary */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Configuration Summary:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {form.watch('analysisType')} analysis
                    </Badge>
                    {form.watch('includeScreenshots') && (
                      <Badge variant="secondary">Screenshots enabled</Badge>
                    )}
                    {form.watch('generateReport') && (
                      <Badge variant="secondary">Report generation enabled</Badge>
                    )}
                    {form.watch('analysisType') === 'custom' && form.watch('customRules').length > 0 && (
                      <Badge variant="secondary">
                        {form.watch('customRules').filter(r => r.trim()).length} custom rules
                      </Badge>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={configuring}>
                {configuring ? "Configuring..." : "Configure Analysis"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}