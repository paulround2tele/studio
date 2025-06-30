import { getApiBaseUrl } from '@/lib/config';

export interface ExportCampaignFilters {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function exportCampaigns(filters?: ExportCampaignFilters): Promise<Blob> {
  const baseUrl = await getApiBaseUrl();
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(`${baseUrl}/api/v2/campaigns/export?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  return response.blob();
}

const campaignApi = { exportCampaigns };
export default campaignApi;
