"use client";

import React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ta/ui/table";
import Badge from "@/components/ta/ui/badge/Badge";
import { PlusIcon } from "@/icons";
import { useRTKCampaignsList } from "@/providers/RTKCampaignDataProvider";
import {
  TABLE_HEADER_CLASSES,
  TABLE_HEADER_CELL_CLASSES,
  TABLE_BODY_CLASSES,
  TABLE_BODY_CELL_CLASSES,
  TABLE_ROW_CLASSES,
} from "@/components/shared/Card";
import type { CampaignLite } from "@/providers/RTKCampaignDataProvider";

// TailAdmin inline SVG icons
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.167 5.83325C13.0004 4.66659 11.3337 3.83325 9.50039 3.83325C5.91706 3.83325 3.00039 6.74992 3.00039 10.3333C3.00039 13.9166 5.91706 16.8333 9.50039 16.8333C12.5004 16.8333 15.0004 14.7499 15.7504 11.9166M14.167 5.83325H10.8337M14.167 5.83325V2.49992" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4.16675C3.75 4.16675 1.25 10.0001 1.25 10.0001C1.25 10.0001 3.75 15.8334 10 15.8334C16.25 15.8334 18.75 10.0001 18.75 10.0001C18.75 10.0001 16.25 4.16675 10 4.16675Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 12.5001C11.3807 12.5001 12.5 11.3808 12.5 10.0001C12.5 8.61937 11.3807 7.50008 10 7.50008C8.61929 7.50008 7.5 8.61937 7.5 10.0001C7.5 11.3808 8.61929 12.5001 10 12.5001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.16669 2.5L15.8334 10L4.16669 17.5V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.33331 3.33325H5.83331V16.6666H8.33331V3.33325Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.1667 3.33325H11.6667V16.6666H14.1667V3.33325Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

type CampaignStatus = CampaignLite['metadata']['status'];

const STATUS_COLORS: Record<CampaignStatus, "success" | "warning" | "error" | "info" | "light"> = {
  draft: "light",
  running: "success",
  paused: "warning",
  completed: "info",
  failed: "error",
  cancelled: "error"
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export function CampaignsTable() {
  const { campaigns, loading, error, refetch } = useRTKCampaignsList();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading campaigns...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading campaigns</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">No campaigns found</p>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          <PlusIcon className="w-4 h-4" />
          Create Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className={TABLE_HEADER_CLASSES}>
            <TableRow>
              <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                Name
              </TableCell>
              <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                Status
              </TableCell>
              <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                Phase
              </TableCell>
              <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                Progress
              </TableCell>
              <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                Created
              </TableCell>
              <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-right`}>
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className={TABLE_BODY_CLASSES}>
            {campaigns.map((campaign) => {
              // Use metadata for progress if available
              const progressPercent = 0; // Will be calculated from phase status in detail view

              return (
                <TableRow
                  key={campaign.id}
                  className={TABLE_ROW_CLASSES}
                >
                  <TableCell className={TABLE_BODY_CELL_CLASSES}>
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      <p className="font-medium text-gray-800 dark:text-white/90 hover:text-blue-500">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {campaign.id.substring(0, 8)}...
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell className={TABLE_BODY_CELL_CLASSES}>
                    <Badge color={STATUS_COLORS[campaign.metadata?.status ?? 'draft']}>
                      {campaign.metadata?.status ?? 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className={TABLE_BODY_CELL_CLASSES}>
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {campaign.currentPhase || "-"}
                    </span>
                  </TableCell>
                  <TableCell className={TABLE_BODY_CELL_CLASSES}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[36px]">
                        {progressPercent}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={TABLE_BODY_CELL_CLASSES}>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(campaign.metadata?.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="p-2 text-gray-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                        title="View campaign"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Link>
                      {campaign.metadata?.status === "running" && (
                        <button
                          className="p-2 text-gray-500 hover:text-warning-500 hover:bg-warning-50 dark:hover:bg-warning-900/20 rounded-lg transition-colors"
                          title="Pause campaign"
                        >
                          <PauseIcon className="w-4 h-4" />
                        </button>
                      )}
                      {campaign.metadata?.status === "paused" && (
                        <button
                          className="p-2 text-gray-500 hover:text-success-500 hover:bg-success-50 dark:hover:bg-success-900/20 rounded-lg transition-colors"
                          title="Resume campaign"
                        >
                          <PlayIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CampaignsPageHeader({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Campaigns
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your domain generation and validation campaigns
        </p>
      </div>
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshIcon className="w-4 h-4" />
            Refresh
          </button>
        )}
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 shadow-sm transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          New Campaign
        </Link>
      </div>
    </div>
  );
}
