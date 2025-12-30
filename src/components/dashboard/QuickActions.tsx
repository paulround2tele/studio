"use client";
import React from "react";
import Link from "next/link";
import { Target, Users, Settings, Zap, ArrowRight, Plus } from "lucide-react";

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  variant?: "default" | "primary" | "accent";
}

function QuickActionCard({ icon, title, description, href, variant = "default" }: QuickActionCardProps) {
  const baseClasses = "rounded-2xl border p-5 md:p-6 transition-all hover:shadow-lg group";
  const variantClasses = {
    default: "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-gray-700",
    primary: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700",
    accent: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700",
  };

  return (
    <Link href={href} className={`${baseClasses} ${variantClasses[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all" />
      </div>

      <div className="mt-5">
        <h4 className="font-semibold text-gray-800 text-lg dark:text-white/90">
          {title}
        </h4>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      <QuickActionCard
        icon={<Plus className="text-green-500 size-6" />}
        title="New Campaign"
        description="Launch a new domain generation and lead discovery campaign."
        href="/campaigns/new"
        variant="accent"
      />
      <QuickActionCard
        icon={<Target className="text-blue-500 size-6" />}
        title="View Campaigns"
        description="Monitor active campaigns, review results, and manage your pipeline."
        href="/campaigns"
        variant="primary"
      />
      <QuickActionCard
        icon={<Users className="text-purple-500 size-6" />}
        title="Personas"
        description="Create and manage synthetic personas for HTTP validation."
        href="/personas"
      />
      <QuickActionCard
        icon={<Settings className="text-gray-500 size-6" />}
        title="Keyword Sets"
        description="Configure keyword patterns for domain generation."
        href="/keyword-sets"
      />
      <QuickActionCard
        icon={<Zap className="text-orange-500 size-6" />}
        title="Proxies"
        description="Manage proxy configurations for distributed validation."
        href="/proxies"
      />
    </div>
  );
}
