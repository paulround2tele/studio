"use client";

import React from 'react';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import { useListScoringProfilesQuery } from '@/store/api/scoringApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCampaignSSE } from '@/hooks/useCampaignSSE';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_DOMAIN_PAGE_SIZE, DOMAIN_PAGE_SIZE_OPTIONS } from '@/lib/constants';
import { usePaginatedDomains } from '@/lib/hooks/usePaginatedDomains';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import RichnessBadge from '@/components/domains/RichnessBadge';
import TopKeywordsList from '@/components/domains/TopKeywordsList';
import MicrocrawlGainChip from '@/components/domains/MicrocrawlGainChip';
import { Switch } from '@/components/ui/switch';

type DomainsListProps = {
  campaignId: string;
};

export const DomainsList: React.FC<DomainsListProps> = ({ campaignId }) => {
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_DOMAIN_PAGE_SIZE);
  const [paginated, api] = usePaginatedDomains(campaignId, { pageSize, infinite: false, virtualizationThreshold: 2000 });
  const { items, page, pageCount, total, loading, hasNext, hasPrev, infinite, shouldVirtualize, cursorMode } = paginated;

  // Sorting state (persisted)
  type SortKey = 'richness' | 'microcrawl' | 'keywords';
  const SORT_STORAGE_KEY = 'campaignDomains.sort';
  const [sortKey, setSortKey] = React.useState<SortKey>(() => {
    if (typeof window === 'undefined') return 'richness';
    try { const raw = localStorage.getItem(SORT_STORAGE_KEY); if (raw) { const p = JSON.parse(raw); if (['richness','microcrawl','keywords'].includes(p.key)) return p.key; } } catch {}
    return 'richness';
  });
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>(() => {
    if (typeof window === 'undefined') return 'desc';
    try { const raw = localStorage.getItem(SORT_STORAGE_KEY); if (raw) { const p = JSON.parse(raw); if (p.dir === 'asc' || p.dir === 'desc') return p.dir; } } catch {}
    return 'desc';
  });
  const persistSort = React.useCallback((key: SortKey, dir: 'asc'|'desc') => { try { localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ key, dir })); } catch {} }, []);
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) { const nd = sortDir === 'asc' ? 'desc' : 'asc'; setSortDir(nd); persistSort(key, nd); return; }
    setSortKey(key); setSortDir('desc'); persistSort(key, 'desc');
  };
  const sortedItems = React.useMemo(() => {
    const arr = [...items];
    const val = (d: any): number => {
      const f = d.features;
      switch (sortKey) {
        case 'richness': return typeof f?.richness?.score === 'number' ? f.richness.score : -Infinity;
        case 'microcrawl': return typeof f?.microcrawl?.gain_ratio === 'number' ? f.microcrawl.gain_ratio : -Infinity;
        case 'keywords': return typeof f?.keywords?.unique_count === 'number' ? f.keywords.unique_count : -Infinity;
      }
    };
    arr.sort((a,b)=>{ const av = val(a), bv = val(b); if (av===bv) return 0; return av < bv ? -1 : 1; });
    if (sortDir === 'desc') arr.reverse();
    return arr;
  }, [items, sortKey, sortDir]);
  const ariaSort = (key: SortKey): React.AriaAttributes['aria-sort'] => sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
  // Enriched campaign to surface scoring association + aggregates if backend provides
  const { data: enriched } = useGetCampaignEnrichedQuery(campaignId, { skip: !campaignId });
  // Scoring profiles list (to resolve profile display name)
  const { data: scoringProfiles } = useListScoringProfilesQuery(undefined, { skip: !campaignId });

  const hasMore = hasNext; // semantic alignment

  // Auto-refresh when SSE notifies new domains or phase completion
  useCampaignSSE({
    campaignId,
    events: {
      onDomainGenerated: (cid) => {
        if (cid === campaignId) {
          api.first();
          api.refresh();
        }
      },
      onPhaseCompleted: (cid) => {
        if (cid === campaignId) {
          api.refresh();
        }
      },
    },
  });

  // Derive aggregates (defensive extraction)
  const aggregates = (enriched as any)?.domainAggregates || {};
  const discovered = aggregates.discovered ?? aggregates.totalDiscovered ?? total;
  const validated = aggregates.validated ?? aggregates.totalValidated;
  const analyzed = aggregates.analyzed ?? aggregates.totalAnalyzed;
  const scoringAssoc = (enriched as any)?.scoringProfile || (enriched as any)?.scoringProfileId || (enriched as any)?.scoring?.profileId;
  const profileObj = scoringProfiles?.items?.find?.((p: any) => p.id === scoringAssoc);
  const profileLabel = profileObj?.name || scoringAssoc || '—';
  const avgScore = (enriched as any)?.scoring?.averageScore ?? (aggregates.averageScore);
  const lastRescore = (enriched as any)?.scoring?.lastRescoreAt;

  return (
    <Card data-testid="campaign-domains-card">
      <CardHeader className="flex flex-row items-center justify-between" data-testid="campaign-domains-header">
        <div data-testid="campaign-domains-header-left">
          <CardTitle data-testid="campaign-domains-title">Generated Domains</CardTitle>
          <CardDescription className="space-y-0.5" data-testid="campaign-domains-description">
            <div data-testid="campaign-domains-count-line">
              {((total ?? items.length)).toLocaleString()} total{total == null && cursorMode ? ' (so far)' : ''} • showing {items.length.toLocaleString()} {loading ? '(loading...)' : ''}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-3" data-testid="campaign-domains-aggregates">
              <span data-testid="campaign-domains-agg-discovered">Discovered: {discovered ?? '—'}</span>
              {validated !== undefined && <span data-testid="campaign-domains-agg-validated">Validated: {validated}</span>}
              {analyzed !== undefined && <span data-testid="campaign-domains-agg-analyzed">Analyzed: {analyzed}</span>}
              <span data-testid="campaign-domains-agg-scoring-profile">Scoring Profile: {profileLabel}</span>
              {avgScore !== undefined && <span data-testid="campaign-domains-agg-avg-score">Avg Score: {typeof avgScore === 'number' ? avgScore.toFixed(1) : avgScore}</span>}
              {lastRescore && <span data-testid="campaign-domains-agg-last-rescore">Last Rescore: {new Date(lastRescore).toLocaleDateString()}</span>}
            </div>
          </CardDescription>
        </div>
        <div className="flex gap-2 items-center" data-testid="campaign-domains-controls-cluster">
          <div className="flex flex-col gap-2 items-end" data-testid="campaign-domains-controls">
            <div className="flex items-center gap-2" data-testid="campaign-domains-page-size-control">
              <span className="text-xs text-muted-foreground" data-testid="campaign-domains-page-size-label">Page size</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  const n = parseInt(v, 10) || DEFAULT_DOMAIN_PAGE_SIZE;
                  setPageSize(n);
                  api.setPageSize(n);
                }}
                data-testid="campaign-domains-page-size-select"
              >
                <SelectTrigger className="h-8 w-[100px]" data-testid="campaign-domains-page-size-trigger">
                  <SelectValue data-testid="campaign-domains-page-size-value" />
                </SelectTrigger>
                <SelectContent data-testid="campaign-domains-page-size-options">
                  {DOMAIN_PAGE_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={String(opt)} data-testid={`campaign-domains-page-size-option-${opt}`}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => api.refresh()} disabled={loading} data-testid="campaign-domains-refresh">Refresh</Button>
            </div>
            <div className="flex items-center gap-3 text-xs" data-testid="campaign-domains-pagination-cluster">
              <div className="flex items-center gap-1" data-testid="campaign-domains-pagination-buttons">
                <Button size="sm" variant="ghost" onClick={api.first} disabled={!hasPrev || loading} data-testid="campaign-domains-first">⏮</Button>
                <Button size="sm" variant="ghost" onClick={api.prev} disabled={!hasPrev || loading} data-testid="campaign-domains-prev">◀</Button>
                <span data-testid="campaign-domains-page-indicator">Page {page}{pageCount ? ` / ${pageCount}` : (cursorMode ? ' (…)' : '')}</span>
                <Button size="sm" variant="ghost" onClick={api.next} disabled={!hasMore || loading} data-testid="campaign-domains-next">▶</Button>
                <Button size="sm" variant="ghost" onClick={api.last} disabled={!pageCount || page===pageCount || loading} data-testid="campaign-domains-last">⏭</Button>
              </div>
              <div className="flex items-center gap-1" data-testid="campaign-domains-infinite-toggle">
                <Switch checked={infinite} onCheckedChange={(v)=>api.toggleInfinite(v)} data-testid="campaign-domains-infinite-switch" />
                <span data-testid="campaign-domains-infinite-label">Infinite</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent data-testid="campaign-domains-content">
        {loading && items.length === 0 ? (
          <div className="text-sm text-muted-foreground" data-testid="campaign-domains-loading-initial">Loading domains...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground" data-testid="campaign-domains-empty">No domains yet. Start Discovery to generate domains.</div>
        ) : (
          <div className="overflow-x-auto" data-testid="campaign-domains-table-wrapper">
            {!infinite || !shouldVirtualize ? (
              <Table data-testid="campaign-domains-table">
                <caption className="sr-only" id="campaign-domains-warnings-legend">Warnings legend: S = Keyword stuffing penalty applied. R = High repetition index (&gt;0.30). A = High anchor share (&gt;40%).</caption>
                <TableHeader data-testid="campaign-domains-thead">
                  <TableRow data-testid="campaign-domains-header-row">
                    <TableHead data-testid="campaign-domains-col-domain">Domain</TableHead>
                    <TableHead data-testid="campaign-domains-col-dns">DNS</TableHead>
                    <TableHead data-testid="campaign-domains-col-http">HTTP</TableHead>
                    <TableHead aria-sort={ariaSort('richness')} data-testid="campaign-domains-col-richness">
                      <button type="button" className="underline text-xs" onClick={()=>toggleSort('richness')} data-testid="campaign-domains-sort-richness">Richness</button>
                    </TableHead>
                    <TableHead aria-sort={ariaSort('keywords')} data-testid="campaign-domains-col-topkeywords">
                      <button type="button" className="underline text-xs" onClick={()=>toggleSort('keywords')} data-testid="campaign-domains-sort-keywords">Top Keywords</button>
                    </TableHead>
                    <TableHead aria-sort={ariaSort('microcrawl')} data-testid="campaign-domains-col-microcrawl">
                      <button type="button" className="underline text-xs" onClick={()=>toggleSort('microcrawl')} data-testid="campaign-domains-sort-microcrawl">Microcrawl</button>
                    </TableHead>
                    <TableHead data-testid="campaign-domains-col-warnings">Warnings</TableHead>
                    <TableHead data-testid="campaign-domains-col-lead">Lead</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="campaign-domains-tbody">
                  {sortedItems.map((d: any, idx: number) => (
                    <TableRow key={`${d.id || d.domain || idx}`} data-row-index={idx} data-testid="campaign-domains-row">
                      <TableCell className="font-medium" data-testid="campaign-domains-cell-domain">{d.domain || d.name || d.domainName}</TableCell>
                      <TableCell data-testid="campaign-domains-cell-dns">{d.dnsStatus || '—'}</TableCell>
                      <TableCell data-testid="campaign-domains-cell-http">{d.httpStatus || '—'}</TableCell>
                      <TableCell data-testid="campaign-domains-cell-richness"><RichnessBadge features={d.features} /></TableCell>
                      <TableCell data-testid="campaign-domains-cell-topkeywords"><TopKeywordsList features={d.features} /></TableCell>
                      <TableCell data-testid="campaign-domains-cell-microcrawl"><MicrocrawlGainChip features={d.features} /></TableCell>
                      <TableCell data-testid="campaign-domains-cell-warnings">
                        {(() => {
                          const f = d.features;
                          const r = f?.richness;
                          if (!r) return '—';
                          const warns: { key: string; label: string; title: string; }[] = [];
                          if ((r as any).stuffing_penalty && (r as any).stuffing_penalty > 0) {
                            warns.push({ key: 'stuff', label: 'S', title: 'Keyword stuffing penalty applied' });
                          }
                          if (typeof (r as any).repetition_index === 'number' && (r as any).repetition_index > 0.30) {
                            warns.push({ key: 'rep', label: 'R', title: 'High repetition index (>0.30)' });
                          }
                          if (typeof (r as any).anchor_share === 'number' && (r as any).anchor_share > 0.40) {
                            warns.push({ key: 'anc', label: 'A', title: 'High anchor share proportion (>40%)' });
                          }
                          if (warns.length === 0) return '—';
                          return (
                            <div className="flex gap-1" data-testid="campaign-domains-warnings-icons">
                              {warns.map(w => (
                                <span key={w.key} title={w.title} aria-label={w.title} aria-describedby="campaign-domains-warnings-legend" data-testid={`campaign-domains-warning-${w.key}`} className="w-4 h-4 text-[10px] rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center font-semibold border border-amber-600/30">{w.label}</span>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell data-testid="campaign-domains-cell-lead">{d.leadStatus || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div style={{ height: 400 }} data-testid="campaign-domains-virtualized">
                <Table data-testid="campaign-domains-virtual-table">
                  <caption className="sr-only" id="campaign-domains-warnings-legend">Warnings legend: S = Keyword stuffing penalty applied. R = High repetition index (&gt;0.30). A = High anchor share (&gt;40%).</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="campaign-domains-col-domain">Domain</TableHead>
                      <TableHead data-testid="campaign-domains-col-dns">DNS</TableHead>
                      <TableHead data-testid="campaign-domains-col-http">HTTP</TableHead>
                      <TableHead data-testid="campaign-domains-col-richness">Richness</TableHead>
                      <TableHead data-testid="campaign-domains-col-topkeywords">Top Keywords</TableHead>
                      <TableHead data-testid="campaign-domains-col-microcrawl">Microcrawl</TableHead>
                      <TableHead data-testid="campaign-domains-col-warnings">Warnings</TableHead>
                      <TableHead data-testid="campaign-domains-col-lead">Lead</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <List height={360} itemCount={sortedItems.length} itemSize={40} width={'100%'} itemData={sortedItems}>
                  {({ index, style, data }: ListChildComponentProps<any[]>) => {
                    const d = data[index];
                    return (
                      <div style={style} data-virtual-row data-testid="campaign-domains-virtual-row">
                        <Table className="table-fixed w-full">
                          <TableBody>
                            <TableRow key={`${d.id || d.domain || index}`}> 
                              <TableCell className="font-medium truncate max-w-[180px]" data-testid="campaign-domains-virtual-cell-domain">{d.domain || d.name || d.domainName}</TableCell>
                              <TableCell className="truncate" data-testid="campaign-domains-virtual-cell-dns">{d.dnsStatus || '—'}</TableCell>
                              <TableCell className="truncate" data-testid="campaign-domains-virtual-cell-http">{d.httpStatus || '—'}</TableCell>
                              <TableCell className="truncate" data-testid="campaign-domains-virtual-cell-richness"><RichnessBadge features={d.features} /></TableCell>
                              <TableCell className="truncate" data-testid="campaign-domains-virtual-cell-topkeywords"><TopKeywordsList features={d.features} /></TableCell>
                              <TableCell className="truncate" data-testid="campaign-domains-virtual-cell-microcrawl"><MicrocrawlGainChip features={d.features} /></TableCell>
                              <TableCell className="truncate" data-testid="campaign-domains-virtual-cell-warnings">
                                {(() => {
                                  const f = d.features;
                                  const r = f?.richness;
                                  if (!r) return '—';
                                  const warns: { key: string; label: string; title: string; }[] = [];
                                  if ((r as any).stuffing_penalty && (r as any).stuffing_penalty > 0) {
                                    warns.push({ key: 'stuff', label: 'S', title: 'Keyword stuffing penalty applied' });
                                  }
                                  if (typeof (r as any).repetition_index === 'number' && (r as any).repetition_index > 0.30) {
                                    warns.push({ key: 'rep', label: 'R', title: 'High repetition index (>0.30)' });
                                  }
                                  if (typeof (r as any).anchor_share === 'number' && (r as any).anchor_share > 0.40) {
                                    warns.push({ key: 'anc', label: 'A', title: 'High anchor share proportion (>40%)' });
                                  }
                                  if (warns.length === 0) return '—';
                                  return (
                                    <div className="flex gap-1" data-testid="campaign-domains-virtual-warnings-icons">
                                      {warns.map(w => (
                                        <span key={w.key} title={w.title} aria-label={w.title} aria-describedby="campaign-domains-warnings-legend" data-testid={`campaign-domains-virtual-warning-${w.key}`} className="w-4 h-4 text-[10px] rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center font-semibold border border-amber-600/30">{w.label}</span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="truncate" data-testid="campaign-domains-virtual-cell-lead">{d.leadStatus || '—'}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    );
                  }}
                </List>
              </div>
            )}
            {loading && <div className="py-2 text-xs text-muted-foreground" data-testid="campaign-domains-loading-more">Loading…</div>}
            {infinite && hasMore && !loading && (
              <div className="py-3 flex justify-center" data-testid="campaign-domains-load-more-wrapper">
                <Button size="sm" onClick={api.next} disabled={loading} data-testid="campaign-domains-load-more">Load more</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DomainsList;
