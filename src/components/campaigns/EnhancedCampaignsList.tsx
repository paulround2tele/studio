"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import type { CampaignViewModel, PaginationContext } from '@/lib/api-client/types-bridge';
import { getDefaultPageSize } from '@/lib/api-client/types-bridge';
import CampaignListItem from './CampaignListItem';

interface EnhancedCampaignsListProps {
  campaigns: CampaignViewModel[];
  loading?: boolean;
  onDeleteCampaign: (campaignId: string) => void;
  onPauseCampaign?: (campaignId: string) => void;
  onResumeCampaign?: (campaignId: string) => void;
  onStopCampaign?: (campaignId: string) => void;
  isActionLoading?: Record<string, boolean>;
  selectedCampaigns?: Set<string>;
  onSelectCampaign?: (campaignId: string, selected: boolean) => void;
  pageSize?: number;
  context?: PaginationContext;
}

type SortField = 'name' | 'createdAt' | 'status' | 'progress';
type SortOrder = 'asc' | 'desc';

const EnhancedCampaignsList: React.FC<EnhancedCampaignsListProps> = ({
  campaigns,
  loading = false,
  onDeleteCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onStopCampaign,
  isActionLoading = {},
  selectedCampaigns = new Set(),
  onSelectCampaign,
  pageSize,
  context = 'dashboard'
}) => {
  // Use context-aware default page size
  const effectivePageSize = pageSize || getDefaultPageSize(context);
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filtered and sorted campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name?.toLowerCase().includes(query) ||
        campaign.currentPhase?.toLowerCase().includes(query) ||
        campaign.id?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.phaseStatus === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        case 'status':
          aValue = a.phaseStatus || '';
          bValue = b.phaseStatus || '';
          break;
        case 'progress':
          aValue = a.progressPercentage || 0;
          bValue = b.progressPercentage || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [campaigns, searchQuery, statusFilter, sortField, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedCampaigns.length / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = startIndex + effectivePageSize;
  const paginatedCampaigns = filteredAndSortedCampaigns.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  }, [sortField, sortOrder]);

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(campaigns.map(c => c.phaseStatus).filter(Boolean))];
    return statuses.sort();
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Enhanced Controls Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Campaign Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns by name, type, or ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map(status => status && (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('name')}
                className="flex items-center gap-2"
              >
                Name
                {sortField === 'name' && (
                  sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('createdAt')}
                className="flex items-center gap-2"
              >
                Date
                {sortField === 'createdAt' && (
                  sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('progress')}
                className="flex items-center gap-2"
              >
                Progress
                {sortField === 'progress' && (
                  sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {paginatedCampaigns.length} of {filteredAndSortedCampaigns.length} campaigns
              {searchQuery && ` (filtered from ${campaigns.length} total)`}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Page {currentPage} of {totalPages}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Grid */}
      {loading ? (
        <div className="text-center py-8">Loading campaigns...</div>
      ) : paginatedCampaigns.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedCampaigns.map(campaign => (
            <CampaignListItem
              key={campaign.id}
              campaign={campaign}
              onDeleteCampaign={onDeleteCampaign}
              onPauseCampaign={onPauseCampaign}
              onResumeCampaign={onResumeCampaign}
              onStopCampaign={onStopCampaign}
              isActionLoading={isActionLoading}
              isSelected={campaign.id ? selectedCampaigns.has(campaign.id) : false}
              onSelect={onSelectCampaign}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' 
                ? 'No campaigns match your filters.' 
                : 'No campaigns found.'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="mt-2"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(pageNum);
                      }}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default EnhancedCampaignsList;