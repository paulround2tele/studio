"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { ExternalLink, Activity } from 'lucide-react';
import Link from 'next/link';
import { useRTKCampaignsList } from '@/providers/RTKCampaignDataProvider';
import { useGetCampaignDomainsQuery } from '@/store/api/campaignApi';
import { StatusBadge, type DomainActivityStatus } from '@/components/shared/StatusBadge';
import { LeadScoreDisplay } from '@/components/shared/LeadScoreDisplay';
import { DASHBOARD_RECENT_DOMAINS_LIMIT } from '@/lib/constants';

// Local type definitions for activity data
type GeneratedDomainLite = {
  domainName?: string;
  name?: string;
  domain?: string;
  leadScore?: number | string;
  dnsStatus?: string;
  httpStatus?: string;
  leadStatus?: string;
  generatedAt?: string;
  createdAt?: string;
  sourceUrl?: string;
};
interface LatestDomainActivity {
  id: string;
  domain: string;
  domainName: string;
  campaignId: string;
  campaignName: string;
  phase: string;
  status: DomainActivityStatus;
  timestamp: string;
  activity: string;
  generatedDate: string;
  dnsStatus: DomainActivityStatus;
  httpStatus: DomainActivityStatus;
  leadScanStatus: DomainActivityStatus;
  leadScore?: number;
  sourceUrl: string;
}

// (removed unused RichCampaignData type)

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
  if (!backendStatus) return 'not_validated';
  const normalized = backendStatus.toLowerCase();
  switch (normalized) {
    case 'ok':
    case 'validated':
    case 'success':
      return 'validated';
    case 'error':
    case 'failed':
    case 'timeout':
      return 'Failed';
    case 'pending':
    case 'in_progress':
      return 'Pending';
    default:
      return 'not_validated';
  }
};

// Removed unused helpers

export default function LatestActivityTable() {
  // RTK Query: Use centralized campaign data
  const { campaigns: enrichedCampaigns, loading } = useRTKCampaignsList();
  // Fetch domains for up to 5 campaigns without domains (to keep hooks count bounded)
  const campaignsNeedingDomains = useMemo(
    () => enrichedCampaigns.filter(c => (!Array.isArray(c.domains) || c.domains.length === 0) && !!c.id).slice(0, 5),
    [enrichedCampaigns]
  );
  const domainsQueries = useMemo(
    () => campaignsNeedingDomains.map(c => ({ id: c.id as string })),
    [campaignsNeedingDomains]
  );
  const q1 = useGetCampaignDomainsQuery(
    { campaignId: domainsQueries[0]?.id || '', limit: DASHBOARD_RECENT_DOMAINS_LIMIT, offset: 0 },
    { skip: !domainsQueries[0] }
  );
  const q2 = useGetCampaignDomainsQuery(
    { campaignId: domainsQueries[1]?.id || '', limit: DASHBOARD_RECENT_DOMAINS_LIMIT, offset: 0 },
    { skip: !domainsQueries[1] }
  );
  const q3 = useGetCampaignDomainsQuery(
    { campaignId: domainsQueries[2]?.id || '', limit: DASHBOARD_RECENT_DOMAINS_LIMIT, offset: 0 },
    { skip: !domainsQueries[2] }
  );
  const q4 = useGetCampaignDomainsQuery(
    { campaignId: domainsQueries[3]?.id || '', limit: DASHBOARD_RECENT_DOMAINS_LIMIT, offset: 0 },
    { skip: !domainsQueries[3] }
  );
  const q5 = useGetCampaignDomainsQuery(
    { campaignId: domainsQueries[4]?.id || '', limit: DASHBOARD_RECENT_DOMAINS_LIMIT, offset: 0 },
    { skip: !domainsQueries[4] }
  );

  // Build a quick lookup for fetched domains
  const fetchedDomainsByCampaign = useMemo(() => {
    const map = new Map<string, GeneratedDomainLite[]>();
    if (domainsQueries[0] && q1?.data?.items) map.set(domainsQueries[0].id, q1.data.items as GeneratedDomainLite[]);
    if (domainsQueries[1] && q2?.data?.items) map.set(domainsQueries[1].id, q2.data.items as GeneratedDomainLite[]);
    if (domainsQueries[2] && q3?.data?.items) map.set(domainsQueries[2].id, q3.data.items as GeneratedDomainLite[]);
    if (domainsQueries[3] && q4?.data?.items) map.set(domainsQueries[3].id, q4.data.items as GeneratedDomainLite[]);
    if (domainsQueries[4] && q5?.data?.items) map.set(domainsQueries[4].id, q5.data.items as GeneratedDomainLite[]);
    return map;
  }, [domainsQueries, q1?.data?.items, q2?.data?.items, q3?.data?.items, q4?.data?.items, q5?.data?.items]);

  // Process campaigns into activity data
  const allActivityData = useMemo(() => {
    const processedActivities: LatestDomainActivity[] = [];
    
    enrichedCampaigns.forEach((campaign) => {
      const apiDomains: unknown[] = (Array.isArray(campaign.domains) && campaign.domains.length > 0)
        ? (campaign.domains as unknown[])
        : ((fetchedDomainsByCampaign.get(campaign.id) as unknown[]) || []);
      
      if (!Array.isArray(apiDomains) || apiDomains.length === 0) {
        return;
      }

      // Process each GeneratedDomain object directly from API
      apiDomains.forEach((domainObjectUnknown) => {
        const domainObject = domainObjectUnknown as GeneratedDomainLite;
        // Use proper GeneratedDomain structure
        const domainName = domainObject?.domainName || domainObject?.name || domainObject?.domain;
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
  }, [enrichedCampaigns, fetchedDomainsByCampaign]);

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
