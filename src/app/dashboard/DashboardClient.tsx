'use client';

import { DomainFlowMetrics } from '@/components/dashboard/DomainFlowMetrics';
import { QuickActions } from '@/components/dashboard/QuickActions';
import LatestActivityTable from '@/components/dashboard/LatestActivityTable';
import ProductionReadinessCheck from '@/components/system/ProductionReadinessCheck';

export default function DashboardClient() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Orchestrate your domain intelligence and lead generation campaigns.
        </p>
      </div>

      {/* Metrics Grid */}
      <DomainFlowMetrics />

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Quick Actions
        </h2>
        <QuickActions />
      </div>

      {/* System Status Check */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          System Status
        </h2>
        <ProductionReadinessCheck />
      </div>

      {/* Latest Activity Table Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Recent Activity
        </h2>
        <LatestActivityTable />
      </div>
    </div>
  );
}
