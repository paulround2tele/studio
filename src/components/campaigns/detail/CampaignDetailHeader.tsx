"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Play, Pause, StopCircle, Settings, RefreshCw } from "lucide-react";
import Badge from "@/components/ta/ui/badge/Badge";

type CampaignStatus = "draft" | "running" | "paused" | "completed" | "failed" | "cancelled";

const STATUS_COLORS: Record<CampaignStatus, "success" | "warning" | "error" | "info" | "light"> = {
  draft: "light",
  running: "success",
  paused: "warning",
  completed: "info",
  failed: "error",
  cancelled: "error"
};

interface CampaignDetailHeaderProps {
  name: string;
  status: CampaignStatus;
  currentPhase?: string;
  onBack?: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  isLoading?: boolean;
}

export function CampaignDetailHeader({
  name,
  status,
  currentPhase,
  onBack,
  onStart,
  onPause,
  onResume,
  onStop,
  isLoading
}: CampaignDetailHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left side: Back button and title */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">
                {name}
              </h1>
              <Badge color={STATUS_COLORS[status]}>
                {status}
              </Badge>
            </div>
            {currentPhase && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Current phase: <span className="capitalize font-medium">{currentPhase}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex items-center gap-2">
          {status === "draft" && onStart && (
            <button
              onClick={onStart}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
          {status === "running" && onPause && (
            <button
              onClick={onPause}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}
          {status === "paused" && onResume && (
            <button
              onClick={onResume}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}
          {(status === "running" || status === "paused") && onStop && (
            <button
              onClick={onStop}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              Stop
            </button>
          )}
          <Link
            href={`/campaigns/${name}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
