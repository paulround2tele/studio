"use client";

import React from "react";
import Badge from "@/components/ta/ui/badge/Badge";
import { ArrowUpIcon } from "@/icons";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: string; positive: boolean };
  color?: "blue" | "green" | "purple" | "orange" | "red" | "gray";
}

const COLOR_CLASSES = {
  blue: "text-blue-500",
  green: "text-green-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  red: "text-red-500",
  gray: "text-gray-500",
};

export function StatCard({ icon, label, value, subValue, trend, color = "blue" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        <div className={COLOR_CLASSES[color]}>
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h4>
          {subValue && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {subValue}
            </p>
          )}
        </div>
        {trend && (
          <Badge color={trend.positive ? "success" : "error"}>
            <ArrowUpIcon className={`h-3 w-3 ${trend.positive ? "" : "rotate-180"}`} />
            {trend.value}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface CampaignStatsGridProps {
  domainsTotal?: number;
  domainsProcessed?: number;
  domainsSuccessful?: number;
  domainsFailed?: number;
  leadsFound?: number;
  currentPhase?: string;
}

export function CampaignStatsGrid({
  domainsTotal = 0,
  domainsProcessed = 0,
  domainsSuccessful = 0,
  domainsFailed: _domainsFailed = 0,
  leadsFound = 0,
  currentPhase: _currentPhase
}: CampaignStatsGridProps) {
  const successRate = domainsProcessed > 0 
    ? ((domainsSuccessful / domainsProcessed) * 100).toFixed(1)
    : "0";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6 mb-6">
      <StatCard
        icon={<svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 16V8" /></svg>}
        label="Total Domains"
        value={domainsTotal}
        color="blue"
      />
      <StatCard
        icon={<svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        label="Processed"
        value={domainsProcessed}
        subValue={`${((domainsProcessed / Math.max(domainsTotal, 1)) * 100).toFixed(0)}% complete`}
        color="green"
      />
      <StatCard
        icon={<svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        label="Successful"
        value={domainsSuccessful}
        trend={domainsSuccessful > 0 ? { value: `${successRate}%`, positive: true } : undefined}
        color="green"
      />
      <StatCard
        icon={<svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        label="Leads Found"
        value={leadsFound}
        color="purple"
      />
    </div>
  );
}
