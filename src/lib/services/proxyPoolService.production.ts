import apiClient from "./apiClient.production";
import { TypeTransformer } from "@/lib/types/transform";
import type { ProxyPool } from "@/lib/types/proxyPoolTypes";

const transformPool = (raw: Record<string, unknown>): ProxyPool => {
  return TypeTransformer.transformToProxyPool(raw) as unknown as ProxyPool;
};

const transformPoolArray = (arr: Record<string, unknown>[]): ProxyPool[] =>
  arr.map(transformPool);

class ProxyPoolService {
  private static instance: ProxyPoolService;
  static getInstance(): ProxyPoolService {
    if (!ProxyPoolService.instance)
      ProxyPoolService.instance = new ProxyPoolService();
    return ProxyPoolService.instance;
  }

  async listPools(): Promise<{
    status: string;
    data?: ProxyPool[];
    message?: string;
  }> {
    const resp = await apiClient.get<ProxyPool[]>("/api/v2/proxy-pools");
    if (resp.data)
      resp.data = transformPoolArray(
        resp.data as unknown as Record<string, unknown>[],
      );
    return resp;
  }

  async createPool(
    payload: Partial<ProxyPool>,
  ): Promise<{ status: string; data?: ProxyPool; message?: string }> {
    const resp = await apiClient.post<ProxyPool>(
      "/api/v2/proxy-pools",
      payload as unknown as Record<string, unknown>,
    );
    if (resp.data)
      resp.data = transformPool(
        resp.data as unknown as Record<string, unknown>,
      );
    return resp;
  }

  async updatePool(
    id: string,
    payload: Partial<ProxyPool>,
  ): Promise<{ status: string; data?: ProxyPool; message?: string }> {
    const resp = await apiClient.put<ProxyPool>(
      `/api/v2/proxy-pools/${id}`,
      payload as unknown as Record<string, unknown>,
    );
    if (resp.data)
      resp.data = transformPool(
        resp.data as unknown as Record<string, unknown>,
      );
    return resp;
  }

  async deletePool(id: string) {
    return apiClient.delete(`/api/v2/proxy-pools/${id}`);
  }

  async addProxy(poolId: string, proxyId: string, weight?: number) {
    return apiClient.post(`/api/v2/proxy-pools/${poolId}/proxies`, {
      proxyId,
      weight,
    });
  }

  async removeProxy(poolId: string, proxyId: string) {
    return apiClient.delete(`/api/v2/proxy-pools/${poolId}/proxies/${proxyId}`);
  }
}

export const proxyPoolService = ProxyPoolService.getInstance();
export const listProxyPools = () => proxyPoolService.listPools();
export const createProxyPool = (p: Partial<ProxyPool>) =>
  proxyPoolService.createPool(p);
export const updateProxyPool = (id: string, p: Partial<ProxyPool>) =>
  proxyPoolService.updatePool(id, p);
export const deleteProxyPool = (id: string) => proxyPoolService.deletePool(id);
export const addProxyToPool = (
  poolId: string,
  proxyId: string,
  weight?: number,
) => proxyPoolService.addProxy(poolId, proxyId, weight);
export const removeProxyFromPool = (poolId: string, proxyId: string) =>
  proxyPoolService.removeProxy(poolId, proxyId);
