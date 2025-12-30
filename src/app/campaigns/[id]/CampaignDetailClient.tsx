"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetCampaignEnrichedQuery } from "@/store/api/campaignApi";
import {
  CampaignDetailHeader,
  CampaignStatsGrid,
  CampaignPipeline,
} from "@/components/campaigns/detail";
import type { CampaignResponse } from "@/lib/api-client/models";

type CampaignStatus = "draft" | "running" | "paused" | "completed" | "failed" | "cancelled";

// Loading skeleton with TailAdmin styling
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
      {/* Pipeline skeleton */}
      <div className="animate-pulse rounded-xl border border-gray-200 dark:bg-gray-800 p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error state with TailAdmin styling
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Error Loading Campaign
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-blue-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Try Again
      </button>
    </div>
  );
}

// Not found state with TailAdmin styling
function NotFoundState({ campaignId, onBack }: { campaignId: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8">
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Campaign Not Found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
        The campaign with ID &quot;{campaignId}&quot; was not found.
      </p>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-theme-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Campaigns
      </button>
    </div>
  );
}

// Helper to map API status to component status type
function mapStatus(status: string | undefined): CampaignStatus {
  const validStatuses: CampaignStatus[] = ["draft", "running", "paused", "completed", "failed", "cancelled"];
  if (status && validStatuses.includes(status as CampaignStatus)) {
    return status as CampaignStatus;
  }
  return "draft";
}

// Helper to get current phase name
function getCurrentPhaseName(campaign: CampaignResponse): string {
  const phases = (campaign as unknown as { phases?: Array<{ phaseName: string; status?: string }> }).phases || [];
  const runningPhase = phases.find(p => p.status === "running");
  return runningPhase?.phaseName || phases[0]?.phaseName || "Domain Generation";
}

export default function CampaignDetailClient() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  const { data: enriched, isLoading, error, refetch } = useGetCampaignEnrichedQuery(campaignId);
  const campaign: CampaignResponse | null = enriched?.campaign ?? null;

  const handleBack = () => {
    router.push("/campaigns");
  };

  // Build stats from campaign data
  const buildStats = (c: CampaignResponse) => {
    const phases = (c as unknown as { phases?: Array<{ domainsProcessed?: number; domainsQueued?: number; domainsSuccessful?: number; domainsFailed?: number }> }).phases || [];
    
    let totalQueued = 0;
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    phases.forEach((p) => {
      totalQueued += p.domainsQueued || 0;
      totalProcessed += p.domainsProcessed || 0;
      totalSuccessful += p.domainsSuccessful || 0;
      totalFailed += p.domainsFailed || 0;
    });

    // Fallback to campaign-level data if phases don't have data
    const campaignAny = c as unknown as { totalDomains?: number; leadsFound?: number };

    return {
      domainsTotal: totalQueued > 0 ? totalQueued : campaignAny.totalDomains || 0,
      domainsProcessed: totalProcessed,
      domainsSuccessful: totalSuccessful,
      domainsFailed: totalFailed,
      leadsFound: campaignAny.leadsFound || 0,
    };
  };

  // Build phases from campaign data
  const buildPhases = (c: CampaignResponse) => {
    const rawPhases = (c as unknown as { phases?: Array<{ phaseName: string; status?: string; progress?: number; domainsProcessed?: number; domainsQueued?: number }> }).phases || [];
    
    type PhaseStatus = "pending" | "running" | "paused" | "completed" | "failed" | "skipped";
    
    // Map status helper
    const mapPhaseStatus = (status: string | undefined): PhaseStatus => {
      const validStatuses: PhaseStatus[] = ["pending", "running", "paused", "completed", "failed", "skipped"];
      if (status && validStatuses.includes(status as PhaseStatus)) {
        return status as PhaseStatus;
      }
      return "pending";
    };
    
    // Default phases if none in data
    if (rawPhases.length === 0) {
      const campaignStatus = mapStatus(c.status);
      return [
        { name: "domain_generation", displayName: "Domain Generation", status: campaignStatus === "draft" ? "pending" as const : "completed" as const, progress: 100 },
        { name: "dns_validation", displayName: "DNS Validation", status: campaignStatus === "running" ? "running" as const : campaignStatus === "completed" ? "completed" as const : "pending" as const, progress: campaignStatus === "completed" ? 100 : 0 },
        { name: "http_validation", displayName: "HTTP Validation", status: "pending" as const, progress: 0 },
        { name: "lead_extraction", displayName: "Lead Extraction", status: "pending" as const, progress: 0 },
      ];
    }

    return rawPhases.map((p) => ({
      name: p.phaseName.toLowerCase().replace(/\s+/g, "_"),
      displayName: p.phaseName,
      status: mapPhaseStatus(p.status),
      progress: p.progress || 0,
      processed: p.domainsProcessed || 0,
      total: p.domainsQueued || 0,
    }));
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    const errorMessage = typeof error === "string" ? error : "Failed to load campaign details";
    return <ErrorState message={errorMessage} onRetry={refetch} />;
  }

  if (!campaign) {
    return <NotFoundState campaignId={campaignId} onBack={handleBack} />;
  }

  const stats = buildStats(campaign);
  const phases = buildPhases(campaign);
  const currentPhaseName = getCurrentPhaseName(campaign);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <CampaignDetailHeader
        name={campaign.name || "Untitled Campaign"}
        status={mapStatus(campaign.status)}
        currentPhase={currentPhaseName}
        onBack={handleBack}
      />

      {/* Stats Grid */}
      <CampaignStatsGrid
        domainsTotal={stats.domainsTotal}
        domainsProcessed={stats.domainsProcessed}
        domainsSuccessful={stats.domainsSuccessful}
        domainsFailed={stats.domainsFailed}
        leadsFound={stats.leadsFound}
        currentPhase={currentPhaseName}
      />

      {/* Pipeline Progress */}
      <CampaignPipeline
        phases={phases}
        currentPhase={currentPhaseName}
      />

      {/* TODO: Add LeadResultsPanel, RecommendationPanel, etc. */}
    </div>
  );
}
