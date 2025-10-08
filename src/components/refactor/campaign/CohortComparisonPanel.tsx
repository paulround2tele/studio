/**
 * CohortComparisonPanel Component (Phase 6)
 * Time-aligned campaign comparison with growth curves and benchmarks
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, LineChart, TrendingUp, TrendingDown, Users, Calendar, Info, Settings } from 'lucide-react';
import { AggregateSnapshot } from '@/types/campaignMetrics';
import { 
  useCohortComparison, 
  CohortCampaignInput,
  GrowthCurveData,
  CohortBenchmarkData 
} from '@/hooks/useCohortComparison';
import { isCohortComparisonAvailable } from '@/services/campaignMetrics/cohortService';

/**
 * Cohort comparison panel props
 */
export interface CohortComparisonPanelProps {
  campaigns: CohortCampaignInput[];
  onClose?: () => void;
  className?: string;
}

/**
 * Metric selection options
 */
const METRIC_OPTIONS = [
  { key: 'avgLeadScore', label: 'Average Lead Score', format: (v: number) => v.toFixed(1) },
  { key: 'successRate', label: 'Success Rate', format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: 'totalDomains', label: 'Total Domains', format: (v: number) => v.toFixed(0) },
  { key: 'dnsSuccessRate', label: 'DNS Success Rate', format: (v: number) => `${(v * 100).toFixed(1)}%` },
  { key: 'httpSuccessRate', label: 'HTTP Success Rate', format: (v: number) => `${(v * 100).toFixed(1)}%` }
] as const;

/**
 * Cohort comparison panel component
 */
export function CohortComparisonPanel({
  campaigns,
  onClose,
  className = ''
}: CohortComparisonPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<keyof AggregateSnapshot['aggregates']>('avgLeadScore');
  const [enableInterpolation, setEnableInterpolation] = useState(false);
  const [viewType, setViewType] = useState<'curves' | 'benchmarks'>('curves');

  // Cohort comparison hook
  const {
    cohortMatrix,
    loading,
    error,
    canCompare,
    matrixDensity,
    getGrowthCurves,
    getBenchmarks,
    updateConfig
  } = useCohortComparison(campaigns, {
    enableInterpolation
  });

  // Update interpolation setting
  const handleInterpolationToggle = (enabled: boolean) => {
    setEnableInterpolation(enabled);
    updateConfig({ enableInterpolation: enabled });
  };

  // Get current metric data
  const growthCurves = useMemo(() => {
    return getGrowthCurves(selectedMetric);
  }, [getGrowthCurves, selectedMetric]);

  const benchmarks = useMemo(() => {
    return getBenchmarks(selectedMetric);
  }, [getBenchmarks, selectedMetric]);

  // Format metric value
  const formatValue = (value: number) => {
    const metric = METRIC_OPTIONS.find(m => m.key === selectedMetric);
    return metric ? metric.format(value) : value.toFixed(2);
  };

  if (!isCohortComparisonAvailable()) {
    return null;
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Cohort Comparison
            </CardTitle>
            <CardDescription>
              Compare campaign performance by relative days since launch
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {matrixDensity > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-help">
                      {matrixDensity.toFixed(1)}% density
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Percentage of cohort matrix cells with data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Metric:</label>
            <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as keyof AggregateSnapshot['aggregates'])}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map(option => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="interpolation"
              checked={enableInterpolation}
              onCheckedChange={handleInterpolationToggle}
              size="sm"
            />
            <label htmlFor="interpolation" className="text-sm font-medium">
              Interpolate missing days
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Fill gaps in data using linear interpolation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!canCompare && !loading && (
          <Alert className="mb-4">
            <AlertDescription>
              Need at least 2 campaigns with snapshot data for cohort comparison
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border border-gray-300 border-t-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">Building cohort matrix...</span>
            </div>
          </div>
        )}

        {canCompare && !loading && cohortMatrix && (
          <Tabs value={viewType} onValueChange={(value) => setViewType(value as 'curves' | 'benchmarks')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="curves" className="flex items-center gap-2">
                <LineChart className="w-4 h-4" />
                Growth Curves
              </TabsTrigger>
              <TabsTrigger value="benchmarks" className="flex items-center gap-2">
                <BarChart className="w-4 h-4" />
                Benchmarks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curves" className="mt-4">
              <CohortGrowthCurvesView
                growthCurves={growthCurves}
                maxDays={cohortMatrix.maxDays}
                formatValue={formatValue}
                metricLabel={METRIC_OPTIONS.find(m => m.key === selectedMetric)?.label || selectedMetric}
              />
            </TabsContent>

            <TabsContent value="benchmarks" className="mt-4">
              <CohortBenchmarksView
                benchmarks={benchmarks}
                formatValue={formatValue}
                metricLabel={METRIC_OPTIONS.find(m => m.key === selectedMetric)?.label || selectedMetric}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Campaign summary */}
        {canCompare && cohortMatrix && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Campaign Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cohortMatrix.campaigns.map(campaign => (
                <CampaignSummaryCard
                  key={campaign.campaignId}
                  campaign={campaign}
                  selectedMetric={selectedMetric}
                  formatValue={formatValue}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Growth curves visualization component
 */
function CohortGrowthCurvesView({
  growthCurves,
  maxDays,
  formatValue,
  metricLabel
}: {
  growthCurves: GrowthCurveData[];
  maxDays: number;
  formatValue: (value: number) => string;
  metricLabel: string;
}) {
  if (growthCurves.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No growth curve data available
      </div>
    );
  }

  // Simple text-based visualization (in a real implementation, you'd use a charting library)
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        {metricLabel} progression by days since launch
      </div>
      
      <div className="space-y-3">
        {growthCurves.map(curve => (
          <div key={curve.campaignId} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium">{curve.campaignName}</h5>
              <Badge variant="outline">
                {curve.curve.length} days
              </Badge>
            </div>
            
            <div className="space-y-1">
              {curve.curve.slice(0, 5).map(point => (
                <div key={point.dayIndex} className="flex justify-between text-sm">
                  <span>Day {point.dayIndex}:</span>
                  <span className={point.interpolated ? 'text-gray-500 italic' : ''}>
                    {formatValue(point.value)}
                    {point.interpolated && ' (est.)'}
                  </span>
                </div>
              ))}
              {curve.curve.length > 5 && (
                <div className="text-xs text-gray-500">
                  ... and {curve.curve.length - 5} more days
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Benchmarks visualization component
 */
function CohortBenchmarksView({
  benchmarks,
  formatValue,
  metricLabel
}: {
  benchmarks: CohortBenchmarkData[];
  formatValue: (value: number) => string;
  metricLabel: string;
}) {
  if (benchmarks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No benchmark data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        {metricLabel} percentiles by cohort day
      </div>
      
      <div className="space-y-2">
        {benchmarks.slice(0, 10).map(benchmark => (
          <div key={benchmark.dayIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Day {benchmark.dayIndex}</span>
              <Badge variant="outline" className="text-xs">
                n={benchmark.count}
              </Badge>
            </div>
            
            <div className="flex gap-4 text-sm">
              <span>P25: {formatValue(benchmark.p25)}</span>
              <span className="font-medium">P50: {formatValue(benchmark.median)}</span>
              <span>P75: {formatValue(benchmark.p75)}</span>
            </div>
          </div>
        ))}
        
        {benchmarks.length > 10 && (
          <div className="text-center text-xs text-gray-500">
            ... and {benchmarks.length - 10} more days
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Campaign summary card component
 */
function CampaignSummaryCard({
  campaign,
  selectedMetric,
  formatValue
}: {
  campaign: CohortCampaignInput;
  selectedMetric: keyof AggregateSnapshot['aggregates'];
  formatValue: (value: number) => string;
}) {
  const launchDate = new Date(campaign.launchDate).toLocaleDateString();
  const dayCount = campaign.normalizedSnapshots.length;
  
  // Get latest value
  const latestSnapshot = campaign.normalizedSnapshots[campaign.normalizedSnapshots.length - 1];
  const latestValue = latestSnapshot?.snapshot.aggregates[selectedMetric];

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-medium truncate">{campaign.campaignName}</h5>
        <Badge variant="secondary" className="text-xs">
          {dayCount}d
        </Badge>
      </div>
      
      <div className="space-y-1 text-sm text-gray-600">
        <div>Launch: {launchDate}</div>
        {latestValue !== undefined && (
          <div>Current: {formatValue(latestValue)}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact cohort panel for dashboard use
 */
export function CompactCohortPanel({
  campaigns,
  className = ''
}: Pick<CohortComparisonPanelProps, 'campaigns' | 'className'>) {
  const { canCompare, matrixDensity } = useCohortComparison(campaigns);

  if (!isCohortComparisonAvailable() || !canCompare) {
    return null;
  }

  return (
    <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">Cohort</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {campaigns.length} campaigns
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {matrixDensity.toFixed(0)}%
          </Badge>
        </div>
      </div>
      
      <div className="mt-2">
        <Progress value={matrixDensity} className="h-1" />
      </div>
    </div>
  );
}