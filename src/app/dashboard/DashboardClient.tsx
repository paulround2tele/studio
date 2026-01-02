'use client';

import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import { DomainFlowMetrics } from '@/components/dashboard/DomainFlowMetrics';
import { QuickActions } from '@/components/dashboard/QuickActions';
import LatestActivityTable from '@/components/dashboard/LatestActivityTable';
import ProductionReadinessCheck from '@/components/system/ProductionReadinessCheck';

export default function DashboardClient() {
  return (
    <>
      {/* TailAdmin Page Header */}
      <PageBreadcrumb pageTitle="Dashboard" />

      <div className="space-y-6">
        {/* Metrics Grid */}
        <DomainFlowMetrics />

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Quick Actions
          </h2>
          <QuickActions />
        </div>

        {/* System Status Check */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            System Status
          </h2>
          <ProductionReadinessCheck />
        </div>

        {/* Latest Activity Table Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Recent Activity
          </h2>
          <LatestActivityTable />
        </div>
      </div>
    </>
  );
}
