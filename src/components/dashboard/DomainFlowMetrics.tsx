"use client";
import React from "react";
import Link from "next/link";
import Badge from "@/components/ta/ui/badge/Badge";
import { ArrowUpIcon } from "@/icons";
import { Target, Users, Zap, Database, ArrowRight } from "lucide-react";
import { useListCampaignsQuery } from "@/store/api/cleanCampaignApi";
import type { components } from '@/lib/api-client/types';

type CampaignResponse = components['schemas']['CampaignResponse'];

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  href?: string;
}

function MetricCard({ icon, label, value, trend, href }: MetricCardProps) {
  const content = (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700">
      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        {icon}
      </div>

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {value}
          </h4>
        </div>
        {trend && (
          <Badge color={trend.positive ? "success" : "error"}>
            <ArrowUpIcon className={trend.positive ? "" : "rotate-180"} />
            {trend.value}
          </Badge>
        )}
        {href && (
          <ArrowRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function DomainFlowMetrics() {
  const { data: campaigns, isLoading } = useListCampaignsQuery();

  const totalCampaigns = campaigns?.length ?? 0;
  const activeCampaigns = campaigns?.filter(
    (c: CampaignResponse) => c.status === "running" || c.status === "draft"
  ).length ?? 0;
  const completedCampaigns = campaigns?.filter(
    (c: CampaignResponse) => c.status === "completed"
  ).length ?? 0;

  // Calculate total domains - use createdAt count as a proxy for now
  const totalDomains = campaigns?.length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
      <MetricCard
        icon={<Target className="text-blue-500 size-6" />}
        label="Total Campaigns"
        value={isLoading ? "..." : totalCampaigns}
        href="/campaigns"
      />
      <MetricCard
        icon={<Zap className="text-green-500 size-6" />}
        label="Active Campaigns"
        value={isLoading ? "..." : activeCampaigns}
        trend={activeCampaigns > 0 ? { value: "Active", positive: true } : undefined}
      />
      <MetricCard
        icon={<Database className="text-purple-500 size-6" />}
        label="Domains Generated"
        value={isLoading ? "..." : totalDomains.toLocaleString()}
      />
      <MetricCard
        icon={<Users className="text-orange-500 size-6" />}
        label="Completed"
        value={isLoading ? "..." : completedCampaigns}
        trend={completedCampaigns > 0 ? { value: `${completedCampaigns}`, positive: true } : undefined}
      />
    </div>
  );
}
