"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CampaignViewModel, LatestDomainActivity, CampaignPhase, DomainActivityStatus, CampaignSelectedType } from '@/lib/types';
import { CAMPAIGN_PHASES_ORDERED } from '@/lib/constants';
import { ScrollArea } from '../ui/scroll-area';
import { ExternalLink, Activity } from 'lucide-react';
import Link from 'next/link';
import { useCampaignsList } from '@/providers/CampaignDataProvider';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LeadScoreDisplay } from '@/components/shared/LeadScoreDisplay';

// ENTERPRISE FIX: Define enriched campaign data type
type RichCampaignData = {
  id: string;
  name: string;
  domains?: any[];
  currentPhase?: string;
  phaseStatus?: string;
  statistics?: any;
  [key: string]: any;
};

const MAX_ITEMS_DISPLAY_INITIAL_LOAD = 200;

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA');
  } catch {
    return 'Invalid Date';
  }
};

const convertBackendStatus = (backendStatus?: string): DomainActivityStatus => {
  if (!backendStatus) return 'not_validated' as any;
  const normalized = backendStatus.toLowerCase();
  switch (normalized) {
    case 'ok':
    case 'validated':
    case 'success':
      return 'validated' as any;
    case 'error':
    case 'failed':
    case 'timeout':
      return 'validation_error' as any;
    case 'pending':
    case 'in_progress':
      return 'validating' as any;
    default:
      return 'not_validated' as any;
  }
};

const getLeadScoreForLatestActivity = (domainName: string, generatedDomains: any[]): number => {
  if (!Array.isArray(generatedDomains)) return 0;
  
  for (const domain of generatedDomains) {
    const domainValue = domain?.name || domain?.domainName || domain;
    if (domainValue === domainName && domain?.leadScore !== undefined) {
      return Number(domain.leadScore) || 0;
    }
  }
  
  return 0;
};

const getSimilarityBadgeVariant = (score: number | undefined) => {
  if (score === undefined) return "outline";
  if (score > 75) return "default";
  if (score > 50) return "secondary" as any;
  if (score > 25) return "outline";
  return "destructive";
};

export default function LatestActivityTable() {
  // SINGLE GLOBAL PROVIDER: No more individual bulk calls!
  const { campaigns: enrichedCampaigns, loading } = useCampaignsList();

  // Process campaigns into activity data
  const allActivityData = useMemo(() => {
    const processedActivities: LatestDomainActivity[] = [];
    
    enrichedCampaigns.forEach((campaign) => {
      const apiDomains = campaign.domains || [];
      
      if (!Array.isArray(apiDomains) || apiDomains.length === 0) {
        return;
      }

      // Process each GeneratedDomain object directly from API
      apiDomains.forEach((domainObject: any) => {
        // Use proper GeneratedDomain structure
        const domainName = domainObject?.domainName;
        if (!domainName) return;

        // Extract rich domain data from GeneratedDomain
        const leadScore = typeof domainObject.leadScore === 'string' ?
                         parseFloat(domainObject.leadScore) || 0 :
                         (domainObject.leadScore || 0);
        
        processedActivities.push({
          id: `${campaign.id}-${domainName}`,
          domain: domainName,
          domainName: domainName,
          campaignId: campaign.id,
          campaignName: campaign.name,
          phase: campaign.currentPhase || 'domain_generation',
          status: convertBackendStatus(domainObject?.dnsStatus || domainObject?.httpStatus || domainObject?.leadStatus),
          timestamp: domainObject?.generatedAt || domainObject?.createdAt || new Date().toISOString(),
          activity: 'Domain processed',
          generatedDate: domainObject?.createdAt || new Date().toISOString(),
          dnsStatus: convertBackendStatus(domainObject?.dnsStatus),
          httpStatus: convertBackendStatus(domainObject?.httpStatus),
          leadScanStatus: convertBackendStatus(domainObject?.leadStatus),
          leadScore: leadScore > 0 ? leadScore : undefined,
          sourceUrl: domainObject?.sourceUrl || `https://${domainName}`,
        });
      });
    });

    // Sort by most recent first
    return processedActivities
      .sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime())
      .slice(0, MAX_ITEMS_DISPLAY_INITIAL_LOAD);
  }, [enrichedCampaigns]);

  const displayedActivities = allActivityData;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Latest Domain Activity
          </CardTitle>
          <CardDescription>
            Loading recent domain activities from all campaigns...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Latest Domain Activity
        </CardTitle>
        <CardDescription>
          Recent domain activities from all campaigns ({displayedActivities.length} items)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lead Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No domain activities found
                  </TableCell>
                </TableRow>
              ) : (
                displayedActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      <Link 
                        href={activity.sourceUrl} 
                        target="_blank" 
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {activity.domainName}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/campaigns/${activity.campaignId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {activity.campaignName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {activity.phase?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={activity.status} />
                    </TableCell>
                    <TableCell>
                      {activity.leadScore !== undefined ? (
                        <LeadScoreDisplay score={activity.leadScore} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(activity.generatedDate)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/campaigns/${activity.campaignId}`}>
                        <Badge variant="outline" className="cursor-pointer">
                          View
                        </Badge>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
