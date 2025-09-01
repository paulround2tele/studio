"use client";

import React from 'react';
import { useGetCampaignDomainsQuery } from '@/store/api/campaignApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_DOMAIN_PAGE_SIZE, DOMAIN_PAGE_SIZE_OPTIONS } from '@/lib/constants';

type DomainsListProps = {
  campaignId: string;
};

export const DomainsList: React.FC<DomainsListProps> = ({ campaignId }) => {
  const [offset, setOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_DOMAIN_PAGE_SIZE);
  const { data, isFetching, refetch } = useGetCampaignDomainsQuery({ campaignId, limit: pageSize, offset }, { skip: !campaignId });

  const items = (data?.items as any[]) || [];
  const total = data?.total || 0;
  const hasMore = offset + items.length < total;

  // Auto-refresh when SSE notifies new domains or phase completion
  useCampaignSSE({
    campaignId,
    events: {
      onDomainGenerated: (cid) => {
        if (cid === campaignId) {
          // Reset to first page and refetch
          setOffset(0);
          refetch();
        }
      },
      onPhaseCompleted: (cid) => {
        if (cid === campaignId) {
          refetch();
        }
      },
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Generated Domains</CardTitle>
          <CardDescription>
            {total.toLocaleString()} total • showing {items.length} {isFetching ? '(loading...)' : ''}
          </CardDescription>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Page size</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                const n = parseInt(v, 10) || DEFAULT_DOMAIN_PAGE_SIZE;
                setOffset(0);
                setPageSize(n);
              }}
            >
              <SelectTrigger className="h-8 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_PAGE_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { setOffset(0); refetch(); }} disabled={isFetching}>
            Refresh
          </Button>
          {hasMore && (
            <Button onClick={() => setOffset((o) => o + pageSize)} disabled={isFetching}>
              Load more
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No domains yet. Start Discovery to generate domains.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>DNS</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Lead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d: any, idx: number) => (
                  <TableRow key={`${d.id || d.domain || idx}`}>
                    <TableCell className="font-medium">{d.domain || d.name || d.domainName}</TableCell>
                    <TableCell>{d.dnsStatus || '—'}</TableCell>
                    <TableCell>{d.httpStatus || '—'}</TableCell>
                    <TableCell>{d.leadStatus || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DomainsList;
