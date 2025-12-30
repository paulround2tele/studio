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
import { Plus, RefreshCw, Eye, Play, Pause } from "lucide-react";
import { useRTKCampaignsList } from "@/providers/RTKCampaignDataProvider";
import type { CampaignLite } from "@/providers/RTKCampaignDataProvider";

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
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-start text-sm font-medium text-gray-500 dark:text-gray-400">
                Name
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-start text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-start text-sm font-medium text-gray-500 dark:text-gray-400">
                Phase
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-start text-sm font-medium text-gray-500 dark:text-gray-400">
                Progress
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-start text-sm font-medium text-gray-500 dark:text-gray-400">
                Created
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-end text-sm font-medium text-gray-500 dark:text-gray-400">
                Actions
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {campaigns.map((campaign) => {
              // Use metadata for progress if available
              const progressPercent = 0; // Will be calculated from phase status in detail view

              return (
                <TableRow
                  key={campaign.id}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <TableCell className="px-5 py-4">
                    <Link href={`/campaigns/${campaign.id}`} className="block">
                      <p className="font-medium text-gray-800 dark:text-white/90 hover:text-blue-500">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {campaign.id.substring(0, 8)}...
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge color={STATUS_COLORS[campaign.metadata?.status ?? 'draft']}>
                      {campaign.metadata?.status ?? 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {campaign.currentPhase || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
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
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(campaign.metadata?.createdAt)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View campaign"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {campaign.metadata?.status === "running" && (
                        <button
                          className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                          title="Pause campaign"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {campaign.metadata?.status === "paused" && (
                        <button
                          className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Resume campaign"
                        >
                          <Play className="w-4 h-4" />
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
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>
    </div>
  );
}
