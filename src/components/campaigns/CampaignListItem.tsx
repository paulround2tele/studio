"use client";

import React, { memo, useMemo, useCallback, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ta/ui/button/Button';
import Badge from '@/components/ta/ui/badge/Badge';
import { Modal } from '@/components/ta/ui/modal';
import { Dropdown } from '@/components/ta/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ta/ui/dropdown/DropdownItem';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  WarningTriangleIcon,
  PlayIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashBinIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  StopCircleIcon,
  LoaderIcon
} from '@/icons';

interface CampaignListItemProps {
  campaign: Campaign;
  onDeleteCampaign: (campaignId: string) => void;
  onPauseCampaign?: (campaignId: string) => void;
  onResumeCampaign?: (campaignId: string) => void;
  onStopCampaign?: (campaignId: string) => void;
  isActionLoading?: Record<string, boolean>;
  isSelected?: boolean;
  onSelect?: (campaignId: string, selected: boolean) => void;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};

const getOverallCampaignProgress = (campaign: Campaign): number => {
  const apiPercent = campaign.progress?.percentComplete;
  if (typeof apiPercent === 'number') return Math.max(0, Math.min(100, apiPercent));
  return 0;
};

const getStatusBadgeInfo = (campaign: Campaign): { text: string, color: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark', icon: JSX.Element } => {
  switch (campaign.status) {
    case 'completed':
      return { text: 'Campaign Completed', color: 'success', icon: <CheckCircleIcon className="h-4 w-4" /> };
    case 'failed':
      return { text: `Failed: ${campaign.currentPhase || 'Unknown'}`, color: 'error', icon: <WarningTriangleIcon className="h-4 w-4" /> };
    case 'paused':
      return { text: `Paused: ${campaign.currentPhase || 'Unknown'}`, color: 'warning', icon: <PauseCircleIcon className="h-4 w-4" /> };
    case 'running':
      return { text: `Active: ${campaign.currentPhase || 'Unknown'}`, color: 'info', icon: <LoaderIcon className="h-4 w-4 animate-spin" /> };
    case 'draft':
    default:
      return { text: 'Pending Start', color: 'light', icon: <PlayIcon className="h-4 w-4" /> };
  }
};

const CampaignListItem = memo(({ campaign, onDeleteCampaign, onPauseCampaign, onResumeCampaign, onStopCampaign, isActionLoading = {}, isSelected = false, onSelect }: CampaignListItemProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const overallProgress = useMemo(() => getOverallCampaignProgress(campaign), [campaign]);
  const statusInfo = useMemo(() => getStatusBadgeInfo(campaign), [campaign]);
  const formattedDate = useMemo(() => formatDate(campaign.createdAt || ''), [campaign.createdAt]);

  const loadingStates = useMemo(() => ({
    isDeleting: !!isActionLoading[`delete-${campaign.id}`],
    isPausing: !!isActionLoading[`pause-${campaign.id}`],
    isResuming: !!isActionLoading[`resume-${campaign.id}`],
    isStopping: !!isActionLoading[`stop-${campaign.id}`]
  }), [isActionLoading, campaign.id]);

  const anyActionLoading = useMemo(() => {
    return loadingStates.isDeleting || loadingStates.isPausing || loadingStates.isResuming || loadingStates.isStopping;
  }, [loadingStates]);

  const handleDeleteCampaign = useCallback(() => {
    if (loadingStates.isDeleting || anyActionLoading || !campaign.id) {
      return;
    }
    onDeleteCampaign(campaign.id);
    setIsDeleteModalOpen(false);
  }, [onDeleteCampaign, campaign.id, loadingStates.isDeleting, anyActionLoading]);

  const handlePauseCampaign = useCallback(() => {
    if (campaign.id) onPauseCampaign?.(campaign.id);
    setIsDropdownOpen(false);
  }, [onPauseCampaign, campaign.id]);

  const handleResumeCampaign = useCallback(() => {
    if (campaign.id) onResumeCampaign?.(campaign.id);
    setIsDropdownOpen(false);
  }, [onResumeCampaign, campaign.id]);

  const handleStopCampaign = useCallback(() => {
    if (campaign.id) onStopCampaign?.(campaign.id);
    setIsDropdownOpen(false);
  }, [onStopCampaign, campaign.id]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (campaign.id && onSelect) {
      onSelect(campaign.id, e.target.checked);
    }
  }, [onSelect, campaign.id]);

  const showActions = useMemo(() => ({
    showPause: campaign.status === 'running' && onPauseCampaign,
    showResume: campaign.status === 'paused' && onResumeCampaign,
    showStop: (campaign.status === 'running' || campaign.status === 'paused') && onStopCampaign
  }), [campaign.status, onPauseCampaign, onResumeCampaign, onStopCampaign]);

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1">
              {onSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={handleSelect}
                  className="mt-1.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`Select campaign ${campaign.name}`}
                />
              )}
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-1">{campaign.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={statusInfo.color} size="sm">
                {statusInfo.icon}
                <span className="ml-1.5">{statusInfo.text}</span>
              </Badge>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={anyActionLoading}
                  className="h-8 w-8 p-0 flex-shrink-0 dropdown-toggle"
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
                <Dropdown isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)}>
                  <div className="p-1 min-w-[140px]">
                    <DropdownItem tag="a" href={`/campaigns/${campaign.id}/edit`}>
                      <span className="flex items-center">
                        <PencilIcon className="mr-2 h-4 w-4" /> Edit
                      </span>
                    </DropdownItem>

                    {showActions.showPause && (
                      <DropdownItem onClick={handlePauseCampaign}>
                        <span className="flex items-center">
                          <PauseCircleIcon className="mr-2 h-4 w-4" /> Pause
                        </span>
                      </DropdownItem>
                    )}
                    {showActions.showResume && (
                      <DropdownItem onClick={handleResumeCampaign}>
                        <span className="flex items-center">
                          <PlayCircleIcon className="mr-2 h-4 w-4" /> Resume
                        </span>
                      </DropdownItem>
                    )}
                    {showActions.showStop && (
                      <DropdownItem onClick={handleStopCampaign} className="text-amber-600">
                        <span className="flex items-center">
                          <StopCircleIcon className="mr-2 h-4 w-4" /> Stop
                        </span>
                      </DropdownItem>
                    )}
                    
                    {(showActions.showPause || showActions.showResume || showActions.showStop) && (
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    )}

                    <DropdownItem 
                      onClick={() => { setIsDropdownOpen(false); setIsDeleteModalOpen(true); }}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <span className="flex items-center">
                        {loadingStates.isDeleting ? (
                          <><LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                        ) : (
                          <><TrashBinIcon className="mr-2 h-4 w-4" /> Delete</>
                        )}
                      </span>
                    </DropdownItem>
                  </div>
                </Dropdown>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{`Campaign ${campaign.currentPhase || 'in progress'}`}</p>
        </div>

        {/* Content */}
        <div className="flex-grow space-y-3 px-5 pt-0">
          <div>
            <div className="flex justify-between items-center mb-1 text-sm">
              <span className="font-medium text-gray-500 dark:text-gray-400">Overall Progress</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className={`h-2 rounded-full transition-all ${overallProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{overallProgress}% complete</p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <strong>Phase:</strong> {campaign.currentPhase}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-gray-200 dark:border-gray-700 p-5 pt-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <CalendarDaysIcon className="mr-1.5 h-3.5 w-3.5" /> Created: {formattedDate}
          </div>
          <Link href={`/campaigns/${campaign.id}`}>
            <Button variant="outline" size="sm" disabled={anyActionLoading}>
              View Dashboard <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Are you sure?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This action cannot be undone. Campaign &quot;{campaign.name}&quot; will be permanently deleted.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={loadingStates.isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleDeleteCampaign}
              disabled={loadingStates.isDeleting || anyActionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loadingStates.isDeleting ? (
                <><LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                "Delete Campaign"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

CampaignListItem.displayName = 'CampaignListItem';

export default CampaignListItem;
