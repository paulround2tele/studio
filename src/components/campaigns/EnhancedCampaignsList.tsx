"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Button from '@/components/ta/ui/button/Button';
import Input from '@/components/ta/form/input/InputField';
import Badge from '@/components/ta/ui/badge/Badge';
import { SearchIcon, FilterIcon, SortAscIcon, SortDescIcon, ChevronLeftIcon, ChevronRightIcon } from '@/icons';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import CampaignListItem from './CampaignListItem';

type PaginationContext = 'dashboard' | 'full-page' | 'modal';
const DEFAULT_PAGE_SIZE = 10;

interface EnhancedCampaignsListProps {
  campaigns: Campaign[];
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
  context: _context = 'dashboard'
}) => {
  const effectivePageSize = pageSize || DEFAULT_PAGE_SIZE;
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name?.toLowerCase().includes(query) ||
        campaign.currentPhase?.toLowerCase().includes(query) ||
        campaign.id?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => (campaign.status as string) === statusFilter);
    }

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
          aValue = (a.status as string) || '';
          bValue = (b.status as string) || '';
          break;
        case 'progress':
          aValue = a.progress?.percentComplete ?? 0;
          bValue = b.progress?.percentComplete ?? 0;
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

  const totalPages = Math.ceil(filteredAndSortedCampaigns.length / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = startIndex + effectivePageSize;
  const paginatedCampaigns = filteredAndSortedCampaigns.slice(startIndex, endIndex);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<globalThis.HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
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

  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(campaigns.map(c => c.status as string).filter(Boolean))];
    return statuses.sort();
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Enhanced Controls Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800 dark:text-white/90">Campaign Filters & Search</h3>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search campaigns by name, type, or ID..."
                defaultValue={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select 
              value={statusFilter} 
              onChange={handleStatusFilterChange}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((status) => status && (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange('name')}
            >
              Name
              {sortField === 'name' && (
                sortOrder === 'asc' ? <SortAscIcon className="ml-2 h-4 w-4" /> : <SortDescIcon className="ml-2 h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange('createdAt')}
            >
              Date
              {sortField === 'createdAt' && (
                sortOrder === 'asc' ? <SortAscIcon className="ml-2 h-4 w-4" /> : <SortDescIcon className="ml-2 h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange('progress')}
            >
              Progress
              {sortField === 'progress' && (
                sortOrder === 'asc' ? <SortAscIcon className="ml-2 h-4 w-4" /> : <SortDescIcon className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>
            Showing {paginatedCampaigns.length} of {filteredAndSortedCampaigns.length} campaigns
            {searchQuery && ` (filtered from ${campaigns.length} total)`}
          </div>
          <div className="flex items-center gap-2">
            <Badge color="light">
              Page {currentPage} of {Math.max(1, totalPages)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading campaigns...</div>
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
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">
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
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>

          {/* Page Numbers */}
          <div className="flex gap-1">
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
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnhancedCampaignsList;
