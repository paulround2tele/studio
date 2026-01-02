/**
 * Portfolio Trends Panel (Phase 5)
 * Displays portfolio aggregates and outliers for multi-campaign view
 */

import React from 'react';
import { BarChart3Icon, TrendingUpIcon, TrendingDownIcon, WarningTriangleIcon, UsersIcon } from '@/icons';
import { cn } from '@/lib/utils';
import { PortfolioSummary, PortfolioOutlier } from '@/services/campaignMetrics/portfolioMetricsService';

interface PortfolioTrendsPanelProps {
  summary: PortfolioSummary | null;
  outliers: PortfolioOutlier[];
  loading?: boolean;
  className?: string;
}

const PortfolioTrendsPanel: React.FC<PortfolioTrendsPanelProps> = ({
  summary,
  outliers,
  loading = false,
  className
}) => {
  // Don't render if portfolio feature is disabled or insufficient data
  if (process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO_METRICS === 'false' || !summary) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("p-6 bg-white dark:bg-gray-800 rounded-lg border", className)}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3Icon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Portfolio Overview
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  const outliersToShow = outliers.slice(0, 5); // Show top 5 outliers

  return (
    <div className={cn("p-6 bg-white dark:bg-gray-800 rounded-lg border space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3Icon className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Portfolio Overview
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({summary.totalCampaigns} campaigns)
        </span>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Domains"
          value={summary.totalDomains.toLocaleString()}
          icon={<UsersIcon className="w-4 h-4" />}
        />
        <MetricCard
          label="Avg Success Rate"
          value={`${(summary.avgSuccessRate * 100).toFixed(1)}%`}
          trend={summary.avgSuccessRate > 0.8 ? 'up' : summary.avgSuccessRate < 0.6 ? 'down' : 'stable'}
        />
        <MetricCard
          label="Total Leads"
          value={summary.totalLeads.toLocaleString()}
          icon={<TrendingUpIcon className="w-4 h-4" />}
        />
        <MetricCard
          label="High Potential"
          value={summary.totalHighPotential.toLocaleString()}
          icon={<TrendingUpIcon className="w-4 h-4 text-green-600" />}
        />
      </div>

      {/* Performance Comparison */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Performance Comparison
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampaignPerformanceCard
            title="Best Performing"
            campaign={summary.performanceMetrics.bestPerforming}
            type="best"
          />
          <CampaignPerformanceCard
            title="Needs Attention"
            campaign={summary.performanceMetrics.worstPerforming}
            type="worst"
          />
        </div>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Avg Richness"
          value={summary.performanceMetrics.avgRichness.toFixed(2)}
          subText="content quality"
        />
        <MetricCard
          label="Keyword Coverage"
          value={`${(summary.performanceMetrics.avgKeywordCoverage * 100).toFixed(1)}%`}
          subText="extraction rate"
        />
      </div>

      {/* Outliers Section */}
      {outliersToShow.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <WarningTriangleIcon className="w-4 h-4 text-yellow-600" />
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Portfolio Outliers
            </h4>
          </div>
          <div className="space-y-2">
            {outliersToShow.map((outlier, index) => (
              <OutlierCard key={index} outlier={outlier} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components

interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  subText?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, trend, subText }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="w-3 h-3 text-green-600" />;
      case 'down':
        return <TrendingDownIcon className="w-3 h-3 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        {icon || getTrendIcon()}
      </div>
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {subText && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subText}
        </div>
      )}
    </div>
  );
};

interface CampaignPerformanceCardProps {
  title: string;
  campaign: {
    campaignId: string;
    campaignName?: string;
    successRate: number;
    totalDomains: number;
    trend: 'up' | 'down' | 'stable';
  };
  type: 'best' | 'worst';
}

const CampaignPerformanceCard: React.FC<CampaignPerformanceCardProps> = ({
  title,
  campaign,
  type
}) => {
  const getBorderColor = () => {
    return type === 'best' 
      ? 'border-green-200 dark:border-green-700' 
      : 'border-yellow-200 dark:border-yellow-700';
  };

  const getTrendIcon = () => {
    switch (campaign.trend) {
      case 'up':
        return <TrendingUpIcon className="w-3 h-3 text-green-600" />;
      case 'down':
        return <TrendingDownIcon className="w-3 h-3 text-red-600" />;
      default:
        return <div className="w-3 h-3" />; // Spacer
    }
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border-2",
      getBorderColor(),
      type === 'best' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
    )}>
      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {campaign.campaignName || `Campaign ${campaign.campaignId.slice(0, 8)}`}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {(campaign.successRate * 100).toFixed(1)}% success
          </span>
          {getTrendIcon()}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {campaign.totalDomains.toLocaleString()} domains
        </div>
      </div>
    </div>
  );
};

interface OutlierCardProps {
  outlier: PortfolioOutlier;
}

const OutlierCard: React.FC<OutlierCardProps> = ({ outlier }) => {
  const getSeverityColor = () => {
    switch (outlier.severity) {
      case 'extreme':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'moderate':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'mild':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700';
    }
  };

  return (
    <div className={cn(
      "p-3 rounded-lg text-sm",
      getSeverityColor()
    )}>
      <div className="flex items-center justify-between">
        <span className="font-medium">
          Campaign {outlier.campaignId.slice(0, 8)}
        </span>
        <span className="text-xs capitalize">
          {outlier.severity} outlier
        </span>
      </div>
      <div className="text-xs mt-1 opacity-75">
        {outlier.description}
      </div>
    </div>
  );
};

export default PortfolioTrendsPanel;