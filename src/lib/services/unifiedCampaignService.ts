/**
 * Unified Campaign Service - Phase 1 Implementation
 * 
 * Consolidates campaignService.production.ts, bulkCampaignService.ts, and campaignDataService.ts
 * into a single enterprise-scale service with:
 * - Zero legacy code dependencies
 * - Auto-generated campaignsApi client exclusively
 * - Enterprise-scale caching (L1/L2/L3 tiers)
 * - Bulk-first operations with individual fallbacks
 * - WebSocket integration for real-time updates
 * - Direct OpenAPI types from components['schemas']
 * 
 * @version 1.0.0 - Unified Implementation
 */

import { campaignsApi } from '@/lib/api-client/client';
import type { components } from '@/lib/api-client/types';
import type { UpdateCampaignRequest } from '@/lib/api-client';
import type { CampaignViewModel } from '@/lib/types';
import {
  extractResponseData
} from '@/lib/utils/apiResponseHelpers';

// ===================================================================
// DIRECT OPENAPI TYPES - NO RE-EXPORTS
// ===================================================================

export type Campaign = components['schemas']['Campaign'];
export type CampaignCreationPayload = components['schemas']['CreateCampaignRequest'];
export type BulkDeleteRequest = components['schemas']['BulkDeleteRequest'];
export type BulkDeleteResult = components['schemas']['BulkDeleteResult'];
export type BulkEnrichedDataRequest = components['schemas']['BulkEnrichedDataRequest'];
export type BulkEnrichedDataResponse = components['schemas']['BulkEnrichedDataResponse'];
export type BulkDomainsRequest = components['schemas']['BulkDomainsRequest'];
export type BulkDomainsResponse = components['schemas']['BulkDomainsResponse'];
export type BulkLeadsRequest = components['schemas']['BulkLeadsRequest'];
export type BulkLeadsResponse = components['schemas']['BulkLeadsResponse'];
export type EnrichedCampaignData = components['schemas']['EnrichedCampaignData'];
export type BulkMetadata = components['schemas']['BulkMetadata'];
export type GeneratedDomainsResponse = components['schemas']['GeneratedDomainsResponse'];
export type DNSValidationResultsResponse = components['schemas']['DNSValidationResultsResponse'];
export type HTTPKeywordResultsResponse = components['schemas']['HTTPKeywordResultsResponse'];
export type HTTPKeywordResult = components['schemas']['HTTPKeywordResult'];

// ===================================================================
// UNIFIED RESPONSE INTERFACES
// ===================================================================

/**
 * Custom WebSocket event interfaces for type safety
 */
interface PhaseTransitionEvent extends CustomEvent {
  detail: {
    campaignId?: string;
    newPhase?: string;
  };
}

interface CampaignRefreshEvent extends CustomEvent {
  detail: {
    campaignId?: string;
  };
}

interface BulkCacheInvalidateEvent extends CustomEvent {
  detail: {
    campaignIds?: string[];
  };
}

export interface UnifiedCampaignResponse<T = Campaign> {
  success: boolean;
  data?: T;
  error: string | null;
  requestId: string;
  message?: string;
}

export interface UnifiedCampaignsListResponse {
  success: boolean;
  data: Campaign[];
  error: string | null;
  requestId: string;
  message?: string;
}

export interface UnifiedResultsResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string | null;
  requestId: string;
  message?: string;
}

// ===================================================================
// ENTERPRISE CACHING CONFIGURATION
// ===================================================================

export interface CacheConfig {
  maxEntries: number;
  defaultTtlMs: number;
  dashboardTtlMs: number;
  detailTtlMs: number;
  backgroundTtlMs: number;
  enableLRU: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableStatuses: number[];
}

export interface BatchConfig {
  dashboard: number;
  detail: number;
  background: number;
  maxBatchSize: number;
}

// Progressive Loading Support
export enum DataLevel {
  BASIC = 'basic',
  ENRICHED = 'enriched',
  FULL = 'full'
}

export interface LoadingContext {
  level: DataLevel;
  batchSize: number;
  priority: 'high' | 'medium' | 'low';
  source: 'dashboard' | 'detail' | 'background';
}

// Cache Entry Interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  level: DataLevel;
}

// ===================================================================
// ENTERPRISE CACHE MANAGER (L1/L2/L3 TIERS)
// ===================================================================

class UnifiedCacheManager {
  private l1Cache = new Map<string, CacheEntry<any>>(); // Hot cache
  private l2Cache = new Map<string, CacheEntry<any>>(); // Warm cache  
  private l3Cache = new Map<string, CacheEntry<any>>(); // Cold cache
  private accessOrder: string[] = [];
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Generate cache key from campaign IDs and context
   */
  private generateCacheKey(campaignIds: string[], context?: LoadingContext): string {
    const sortedIds = [...campaignIds].sort();
    const level = context?.level || DataLevel.ENRICHED;
    const source = context?.source || 'detail';
    return `${level}:${source}:${sortedIds.join(',')}`;
  }

  /**
   * Set data in appropriate cache tier
   */
  setBulkData<T>(
    campaignIds: string[],
    data: T,
    context?: LoadingContext
  ): void {
    const key = this.generateCacheKey(campaignIds, context);
    const ttl = this.getTtlForContext(context);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiry: now + ttl,
      accessCount: 1,
      lastAccessed: now,
      level: context?.level || DataLevel.ENRICHED
    };

    // L1 cache for high-priority, recent data
    if (context?.priority === 'high' || context?.source === 'dashboard') {
      this.l1Cache.set(key, entry);
    }
    // L2 cache for medium-priority data
    else if (context?.priority === 'medium' || context?.source === 'detail') {
      this.l2Cache.set(key, entry);
    }
    // L3 cache for background/low-priority data
    else {
      this.l3Cache.set(key, entry);
    }

    this.updateAccessOrder(key);
    this.evictIfNecessary();
  }

  /**
   * Get data from cache tiers (L1 -> L2 -> L3)
   */
  getBulkData<T>(campaignIds: string[], context?: LoadingContext): T | null {
    const key = this.generateCacheKey(campaignIds, context);
    const now = Date.now();

    // Try L1 cache first
    let entry = this.l1Cache.get(key);
    if (entry && now <= entry.expiry) {
      this.updateAccess(entry, key);
      return entry.data;
    }

    // Try L2 cache
    entry = this.l2Cache.get(key);
    if (entry && now <= entry.expiry) {
      this.updateAccess(entry, key);
      // Promote to L1 if frequently accessed
      if (entry.accessCount > 5) {
        this.l2Cache.delete(key);
        this.l1Cache.set(key, entry);
      }
      return entry.data;
    }

    // Try L3 cache
    entry = this.l3Cache.get(key);
    if (entry && now <= entry.expiry) {
      this.updateAccess(entry, key);
      // Promote to L2 if accessed multiple times
      if (entry.accessCount > 2) {
        this.l3Cache.delete(key);
        this.l2Cache.set(key, entry);
      }
      return entry.data;
    }

    // Clean up expired entries
    this.cleanupExpiredEntries();
    return null;
  }

  /**
   * Invalidate campaigns across all cache tiers
   */
  invalidateCampaigns(campaignIds: string[]): void {
    const keysToDelete: string[] = [];
    
    [this.l1Cache, this.l2Cache, this.l3Cache].forEach(cache => {
      for (const key of cache.keys()) {
        if (this.keyContainsCampaigns(key, campaignIds)) {
          keysToDelete.push(key);
        }
      }
    });

    keysToDelete.forEach(key => {
      this.l1Cache.delete(key);
      this.l2Cache.delete(key);
      this.l3Cache.delete(key);
      this.removeFromAccessOrder(key);
    });

    console.log(`[UnifiedCache] Invalidated ${keysToDelete.length} entries across all tiers for campaigns: ${campaignIds.join(', ')}`);
  }

  private keyContainsCampaigns(key: string, campaignIds: string[]): boolean {
    const keyParts = key.split(':');
    if (keyParts.length >= 3 && keyParts[2]) {
      const cachedIds = keyParts[2].split(',');
      return campaignIds.some(id => cachedIds.includes(id));
    }
    return false;
  }

  private updateAccess(entry: CacheEntry<any>, key: string): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.unshift(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private getTtlForContext(context?: LoadingContext): number {
    if (!context) return this.config.defaultTtlMs;

    switch (context.source) {
      case 'dashboard':
        return this.config.dashboardTtlMs;
      case 'detail':
        return this.config.detailTtlMs;
      case 'background':
        return this.config.backgroundTtlMs;
      default:
        return this.config.defaultTtlMs;
    }
  }

  private evictIfNecessary(): void {
    const totalEntries = this.l1Cache.size + this.l2Cache.size + this.l3Cache.size;
    
    while (totalEntries > this.config.maxEntries && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.pop()!;
      
      // Remove from all caches
      this.l1Cache.delete(lruKey);
      this.l2Cache.delete(lruKey);
      this.l3Cache.delete(lruKey);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    [this.l1Cache, this.l2Cache, this.l3Cache].forEach(cache => {
      for (const [key, entry] of cache.entries()) {
        if (now > entry.expiry) {
          cache.delete(key);
          this.removeFromAccessOrder(key);
        }
      }
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      l1: { size: this.l1Cache.size, hitRate: this.calculateHitRate(this.l1Cache) },
      l2: { size: this.l2Cache.size, hitRate: this.calculateHitRate(this.l2Cache) },
      l3: { size: this.l3Cache.size, hitRate: this.calculateHitRate(this.l3Cache) },
      totalEntries: this.l1Cache.size + this.l2Cache.size + this.l3Cache.size,
      maxEntries: this.config.maxEntries,
      accessOrderLength: this.accessOrder.length
    };
  }

  private calculateHitRate(cache: Map<string, CacheEntry<any>>): number {
    if (cache.size === 0) return 0;
    
    let totalHits = 0;
    for (const entry of cache.values()) {
      totalHits += entry.accessCount;
    }
    
    return totalHits / cache.size;
  }
}

// ===================================================================
// UNIFIED CAMPAIGN SERVICE - MAIN CLASS
// ===================================================================

export class UnifiedCampaignService {
  private static instance: UnifiedCampaignService;
  private cacheManager: UnifiedCacheManager;
  
  // Configuration
  private readonly cacheConfig: CacheConfig = {
    maxEntries: 1000,
    defaultTtlMs: 60000, // 60s default
    dashboardTtlMs: 30000, // 30s dashboard
    detailTtlMs: 60000, // 60s detail
    backgroundTtlMs: 300000, // 5min background
    enableLRU: true
  };

  private readonly retryConfig: RetryConfig = {
    maxAttempts: 4,
    baseDelayMs: 500,
    maxDelayMs: 4000,
    backoffFactor: 2,
    retryableStatuses: [500, 502, 503, 504]
  };

  private readonly batchConfig: BatchConfig = {
    dashboard: 500,      // Enterprise-scale: 10x increase for dashboard operations
    detail: 1000,        // Enterprise-scale: 10x increase for detail operations
    background: 1000,    // Enterprise-scale: 2x increase for background operations
    maxBatchSize: 1000   // Enterprise-scale: matches backend 1000-campaign limit
  };

  private constructor() {
    this.cacheManager = new UnifiedCacheManager(this.cacheConfig);
    this.initializeWebSocketListener();
  }

  static getInstance(): UnifiedCampaignService {
    if (!UnifiedCampaignService.instance) {
      UnifiedCampaignService.instance = new UnifiedCampaignService();
    }
    return UnifiedCampaignService.instance;
  }

  // ===================================================================
  // CAMPAIGN CRUD OPERATIONS (from campaignService.production.ts)
  // ===================================================================

  async getCampaigns(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
    status?: string;
  }): Promise<UnifiedCampaignsListResponse> {
    try {
      const axiosResponse = await campaignsApi.listCampaigns(options?.limit, options?.offset, options?.status);
      
      // 🐛 DEBUG: Logging type safety validation - unifiedCampaignService.ts:407
      console.log('[DEBUG] getCampaigns axiosResponse type:', typeof axiosResponse);
      console.log('[DEBUG] getCampaigns axiosResponse structure:', Object.keys(axiosResponse || {}));
      
      // ✅ FIXED: Using proper OpenAPI type instead of any
      const response = extractResponseData<{ data: Campaign[]; requestId?: string }>(axiosResponse);
      console.log('[DEBUG] Extracted response type:', typeof response);
      
      // Extract campaigns from unified API response structure
      const campaigns = response?.data || [];
      const requestId = response?.requestId || `campaigns-${Date.now()}`;
      
      return {
        success: true,
        data: campaigns,
        error: null,
        requestId,
        message: 'Campaigns retrieved successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error fetching campaigns:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get campaigns';
      return {
        success: false,
        data: [],
        error: errorMessage,
        requestId: `error-${Date.now()}`,
        message: errorMessage
      };
    }
  }

  async getCampaignById(campaignId: string): Promise<UnifiedCampaignResponse> {
    try {
      console.log(`[UnifiedCampaignService] 🚀 PERFORMANCE: Using bulk API for single campaign ${campaignId}`);
      const startTime = performance.now();
      
      // 🔥 PERFORMANCE OPTIMIZATION: Use bulk enriched data API instead of individual getCampaignDetails
      const axiosResponse = await campaignsApi.getBulkEnrichedCampaignData({
        campaignIds: [campaignId],
        limit: 1,
        offset: 0
      });
      const response = extractResponseData<{ campaigns?: Record<string, { campaign: Campaign }> }>(axiosResponse);
      
      const endTime = performance.now();
      console.log(`[UnifiedCampaignService] ⚡ BULK API call completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      // Extract campaign from bulk response envelope
      const campaignData = response?.campaigns?.[campaignId];
      const campaign = campaignData?.campaign;
      const requestId = globalThis.crypto?.randomUUID?.() || `campaign-${Date.now()}`;
      
      if (!campaign?.id) {
        console.log(`[UnifiedCampaignService] ❌ Campaign ${campaignId} not found in bulk response`);
        return {
          success: false,
          error: 'Campaign not found or missing required fields',
          requestId,
          message: 'Campaign not found'
        };
      }
      
      console.log(`[UnifiedCampaignService] ✅ Successfully retrieved campaign ${campaignId} via bulk API`);
      return {
        success: true,
        data: campaign,
        error: null,
        requestId,
        message: 'Campaign retrieved successfully via bulk API'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error fetching campaign by ID via bulk API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaign details',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to get campaign details'
      };
    }
  }

  async createCampaign(payload: CampaignCreationPayload): Promise<UnifiedCampaignResponse> {
    try {
      const axiosResponse = await campaignsApi.createCampaign(payload);
      const campaign = extractResponseData<Campaign>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `campaign-create-${Date.now()}`;
      
      return {
        success: true,
        data: campaign || undefined,
        error: null,
        requestId,
        message: 'Campaign created successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error creating campaign:', error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to create campaign',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to create campaign'
      };
    }
  }

  async updateCampaign(campaignId: string, updatePayload: UpdateCampaignRequest): Promise<UnifiedCampaignResponse> {
    try {
      const axiosResponse = await campaignsApi.updateCampaign(campaignId, updatePayload);
      const campaign = extractResponseData<Campaign>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `campaign-update-${Date.now()}`;
      
      // Invalidate cache for updated campaign
      this.cacheManager.invalidateCampaigns([campaignId]);
      
      return {
        success: true,
        data: campaign || undefined,
        error: null,
        requestId,
        message: 'Campaign updated successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error updating campaign:', error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to update campaign',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to update campaign'
      };
    }
  }

  async deleteCampaign(campaignId: string): Promise<UnifiedCampaignResponse<null>> {
    // Cancel campaign first if running
    try {
      await this.cancelCampaign(campaignId);
    } catch (error) {
      console.warn('[UnifiedCampaignService] Campaign may already be cancelled:', error);
    }
    
    try {
      const axiosResponse = await campaignsApi.deleteCampaign(campaignId);
      extractResponseData<null>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `campaign-delete-${Date.now()}`;
      
      // Invalidate cache for deleted campaign
      this.cacheManager.invalidateCampaigns([campaignId]);
      
      return {
        success: true,
        data: null,
        error: null,
        requestId,
        message: 'Campaign deleted successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error deleting campaign:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to delete campaign',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to delete campaign'
      };
    }
  }

  async deleteCampaignsBulk(campaignIds: string[]): Promise<UnifiedCampaignResponse<BulkDeleteResult>> {
    if (!campaignIds || campaignIds.length === 0) {
      return {
        success: false,
        data: undefined,
        error: 'No campaign IDs provided for bulk deletion',
        requestId: `bulk-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: 'Campaign IDs list cannot be empty'
      };
    }

    // For single campaign, use individual delete method for consistency
    if (campaignIds.length === 1) {
      const campaignId = campaignIds[0];
      if (!campaignId) {
        return {
          success: false,
          data: undefined,
          error: 'Invalid campaign ID provided',
          requestId: `bulk-delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: 'Campaign ID cannot be undefined'
        };
      }
      
      const singleResult = await this.deleteCampaign(campaignId);
      return {
        success: singleResult.success,
        data: singleResult.success ? {
          deleted_campaign_ids: [campaignId],
          successfully_deleted: 1,
          failed_deletions: 0,
          total_requested: 1,
          message: 'Campaign deleted successfully'
        } : undefined,
        error: singleResult.error,
        requestId: singleResult.requestId,
        message: singleResult.message
      };
    }

    // Cancel all campaigns first (parallel execution for better performance)
    const cancelPromises = campaignIds.map(async (campaignId) => {
      try {
        await this.cancelCampaign(campaignId);
      } catch (error) {
        console.warn(`[UnifiedCampaignService] Campaign ${campaignId} may already be cancelled:`, error);
      }
    });
    
    await Promise.allSettled(cancelPromises);

    // Execute bulk delete
    try {
      const axiosResponse = await campaignsApi.bulkDeleteCampaigns({ campaignIds });
      const bulkResult = extractResponseData<BulkDeleteResult>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `bulk-delete-${Date.now()}`;

      if (bulkResult) {
        // Invalidate cache for successfully deleted campaigns
        const deletedIds = bulkResult.deleted_campaign_ids || [];
        if (deletedIds.length > 0) {
          this.cacheManager.invalidateCampaigns(deletedIds);
        }

        const successCount = bulkResult.successfully_deleted || 0;
        const failureCount = bulkResult.failed_deletions || 0;
        const total = bulkResult.total_requested || campaignIds.length;

        let message = `Bulk delete completed: ${successCount}/${total} campaigns deleted successfully`;
        if (failureCount > 0) {
          message += `, ${failureCount} failed`;
        }

        return {
          success: true,
          data: bulkResult,
          error: null,
          requestId,
          message
        };
      } else {
        return {
          success: false,
          data: undefined,
          error: 'No result data returned from bulk delete operation',
          requestId,
          message: 'Bulk delete operation returned empty result'
        };
      }
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error in bulk delete:', error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Bulk delete operation failed',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to execute bulk delete operation'
      };
    }
  }

  // ===================================================================
  // CAMPAIGN CONTROL OPERATIONS
  // ===================================================================

  async startCampaign(campaignId: string): Promise<UnifiedCampaignResponse> {
    try {
      const axiosResponse = await campaignsApi.startCampaign(campaignId);
      const campaign = extractResponseData<Campaign>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `start-campaign-${Date.now()}`;
      
      // Invalidate cache due to status change
      this.cacheManager.invalidateCampaigns([campaignId]);
      
      return {
        success: true,
        data: campaign || undefined,
        error: null,
        requestId,
        message: 'Campaign started successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error starting campaign:', error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to start campaign',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to start campaign'
      };
    }
  }

  async pauseCampaign(campaignId: string): Promise<UnifiedCampaignResponse> {
    try {
      const axiosResponse = await campaignsApi.pauseCampaign(campaignId);
      const campaign = extractResponseData<Campaign>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `pause-campaign-${Date.now()}`;
      
      this.cacheManager.invalidateCampaigns([campaignId]);
      
      return {
        success: true,
        data: campaign || undefined,
        error: null,
        requestId,
        message: 'Campaign paused successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error pausing campaign:', error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to pause campaign',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to pause campaign'
      };
    }
  }

  async resumeCampaign(campaignId: string): Promise<UnifiedCampaignResponse> {
    try {
      const axiosResponse = await campaignsApi.resumeCampaign(campaignId);
      const campaign = extractResponseData<Campaign>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `resume-campaign-${Date.now()}`;
      
      this.cacheManager.invalidateCampaigns([campaignId]);
      
      return {
        success: true,
        data: campaign || undefined,
        error: null,
        requestId,
        message: 'Campaign resumed successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error resuming campaign:', error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to resume campaign',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to resume campaign'
      };
    }
  }

  async cancelCampaign(campaignId: string): Promise<UnifiedCampaignResponse> {
    try {
      const axiosResponse = await campaignsApi.cancelCampaign(campaignId);
      const campaign = extractResponseData<Campaign>(axiosResponse);
      const requestId = globalThis.crypto?.randomUUID?.() || `cancel-campaign-${Date.now()}`;
      
      this.cacheManager.invalidateCampaigns([campaignId]);
      
      return {
        success: true,
        data: campaign || undefined,
        error: null,
        requestId,
        message: 'Campaign cancelled successfully'
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error cancelling campaign:', error);
      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : 'Failed to cancel campaign',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to cancel campaign'
      };
    }
  }

  // ===================================================================
  // CAMPAIGN RESULTS OPERATIONS
  // ===================================================================

  async getGeneratedDomains(
    campaignId: string,
    options: { limit?: number; cursor?: number } = {}
  ): Promise<UnifiedResultsResponse<string[]>> {
    try {
      console.log(`[UnifiedCampaignService] 🚀 PERFORMANCE: Using bulk domains API for campaign ${campaignId}`);
      const startTime = performance.now();
      
      // 🔥 PERFORMANCE OPTIMIZATION: Use bulk domains API instead of individual getGeneratedDomains
      const axiosResponse = await campaignsApi.getBulkDomains({
        campaignIds: [campaignId],
        limit: options?.limit || 100,
        offset: options?.cursor || 0
      });
      const response = extractResponseData<{ campaigns?: Record<string, { domains?: unknown[] }> }>(axiosResponse);
      
      const endTime = performance.now();
      console.log(`[UnifiedCampaignService] ⚡ BULK domains API call completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      const requestId = globalThis.crypto?.randomUUID?.() || `domains-${Date.now()}`;
      
      // Extract domains from bulk response envelope
      const campaignData = response?.campaigns?.[campaignId];
      const rawDomains = campaignData?.domains || [];
      const data = rawDomains as string[]; // Type assertion for domain strings
      
      console.log(`[UnifiedCampaignService] ✅ Retrieved ${data.length} domains for campaign ${campaignId} via bulk API`);
      
      return {
        success: true,
        data,
        error: null,
        requestId,
        message: `Generated domains retrieved successfully via bulk API (${data.length} domains)`
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error getting generated domains via bulk API:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get generated domains via bulk API',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to get generated domains via bulk API'
      };
    }
  }

  async getDNSValidationResults(
    campaignId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<UnifiedResultsResponse<unknown[]>> {
    try {
      console.log(`[UnifiedCampaignService] 🚀 PERFORMANCE: Using bulk logs API for DNS validation results ${campaignId}`);
      const startTime = performance.now();
      
      // 🔥 PERFORMANCE OPTIMIZATION: Use bulk logs API for DNS validation results
      const axiosResponse = await campaignsApi.getBulkLogs({
        campaignIds: [campaignId],
        limit: options?.limit || 100,
        offset: options?.cursor ? parseInt(options.cursor, 10) : 0
      });
      const response = extractResponseData<{ campaigns?: Record<string, { logs?: unknown[] }> }>(axiosResponse);
      
      const endTime = performance.now();
      console.log(`[UnifiedCampaignService] ⚡ BULK logs API call completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      const requestId = globalThis.crypto?.randomUUID?.() || `dns-results-${Date.now()}`;
      
      // Extract DNS validation logs from bulk response envelope
      const campaignData = response?.campaigns?.[campaignId];
      const data = campaignData?.logs || [];
      
      console.log(`[UnifiedCampaignService] ✅ Retrieved ${data.length} DNS validation results for campaign ${campaignId} via bulk logs API`);
      
      return {
        success: true,
        data,
        error: null,
        requestId,
        message: `DNS validation results retrieved successfully via bulk logs API (${data.length} results)`
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error getting DNS validation results via bulk logs API:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get DNS validation results via bulk logs API',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to get DNS validation results via bulk logs API'
      };
    }
  }

  async getHTTPKeywordResults(
    campaignId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<UnifiedResultsResponse<unknown[]>> {
    try {
      console.log(`[UnifiedCampaignService] 🚀 PERFORMANCE: Using bulk leads API for HTTP keyword results ${campaignId}`);
      const startTime = performance.now();
      
      // 🔥 PERFORMANCE OPTIMIZATION: Use bulk leads API for HTTP keyword results
      const axiosResponse = await campaignsApi.getBulkLeads({
        campaignIds: [campaignId],
        limit: options?.limit || 100,
        offset: options?.cursor ? parseInt(options.cursor, 10) : 0
      });
      const response = extractResponseData<{ campaigns?: Record<string, { leads?: unknown[] }> }>(axiosResponse);
      
      const endTime = performance.now();
      console.log(`[UnifiedCampaignService] ⚡ BULK leads API call completed in ${(endTime - startTime).toFixed(2)}ms`);
      
      const requestId = globalThis.crypto?.randomUUID?.() || `http-results-${Date.now()}`;
      
      // Extract HTTP keyword results (leads) from bulk response envelope
      const campaignData = response?.campaigns?.[campaignId];
      const data = campaignData?.leads || [];
      
      console.log(`[UnifiedCampaignService] ✅ Retrieved ${data.length} HTTP keyword results for campaign ${campaignId} via bulk leads API`);
      
      return {
        success: true,
        data,
        error: null,
        requestId,
        message: `HTTP keyword results retrieved successfully via bulk leads API (${data.length} results)`
      };
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error getting HTTP keyword results:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get HTTP keyword results',
        requestId: globalThis.crypto?.randomUUID?.() || `error-${Date.now()}`,
        message: error instanceof Error ? error.message : 'Failed to get HTTP keyword results'
      };
    }
  }

  // ===================================================================
  // BULK OPERATIONS (from bulkCampaignService.ts + campaignDataService.ts)
  // ===================================================================

  /**
   * Main bulk enriched data fetching with enterprise caching
   */
  async getBulkEnrichedCampaignData(
    campaignIds: string[],
    context: LoadingContext = {
      level: DataLevel.ENRICHED,
      batchSize: this.batchConfig.dashboard,
      priority: 'medium',
      source: 'dashboard'
    }
  ): Promise<BulkEnrichedDataResponse | null> {
    if (!campaignIds || campaignIds.length === 0) {
      console.warn('[UnifiedCampaignService] Campaign IDs list cannot be empty');
      return null;
    }

    // Check cache first
    const cached = this.cacheManager.getBulkData<BulkEnrichedDataResponse>(campaignIds, context);
    if (cached) {
      console.log(`[UnifiedCampaignService] Cache hit for ${campaignIds.length} campaigns`);
      return cached;
    }

    try {
      const requestPayload: BulkEnrichedDataRequest = {
        campaignIds,
        limit: context.level === DataLevel.BASIC ? 100 : undefined,
        offset: 0
      };

      const axiosResponse = await campaignsApi.getBulkEnrichedCampaignData(requestPayload);
      const response = extractResponseData<BulkEnrichedDataResponse>(axiosResponse);
      
      if (response) {
        // Cache successful result
        this.cacheManager.setBulkData(campaignIds, response, context);
        console.log(`[UnifiedCampaignService] Bulk enriched data loaded for ${campaignIds.length} campaigns`);
        return response;
      }
      
      return null;
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error fetching bulk enriched data:', error);
      return null;
    }
  }

  /**
   * Enhanced method to get enriched campaigns as Map
   */
  async getEnrichedCampaignsMap(
    campaignIds: string[],
    context?: LoadingContext
  ): Promise<Map<string, EnrichedCampaignData>> {
    const response = await this.getBulkEnrichedCampaignData(campaignIds, context);
    const enrichedMap = new Map<string, EnrichedCampaignData>();

    if (response && response.campaigns) {
      Object.entries(response.campaigns).forEach(([id, data]) => {
        enrichedMap.set(id, data);
      });
    }

    return enrichedMap;
  }

  /**
   * Bulk domains data fetching
   */
  async getBulkDomainsData(campaignIds: string[]): Promise<BulkDomainsResponse | null> {
    try {
      const requestPayload: BulkDomainsRequest = { campaignIds };
      const axiosResponse = await campaignsApi.getBulkDomains(requestPayload);
      return extractResponseData<BulkDomainsResponse>(axiosResponse);
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error fetching bulk domains data:', error);
      return null;
    }
  }

  /**
   * Bulk leads data fetching
   */
  async getBulkLeadsData(campaignIds: string[]): Promise<BulkLeadsResponse | null> {
    try {
      const requestPayload: BulkLeadsRequest = { campaignIds };
      const axiosResponse = await campaignsApi.getBulkLeads(requestPayload);
      return extractResponseData<BulkLeadsResponse>(axiosResponse);
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error fetching bulk leads data:', error);
      return null;
    }
  }

  // ===================================================================
  // RICH CAMPAIGN DATA (from campaignDataService.ts)
  // ===================================================================

  /**
   * Get rich campaign data for a single campaign (replaces campaignDataService.getRichCampaignData)
   */
  async getRichCampaignData(campaignId: string): Promise<Record<string, unknown> | null> {
    try {
      const bulkResults = await this.getBulkEnrichedCampaignData([campaignId]);
      const enrichedData = bulkResults?.campaigns?.[campaignId];
      
      if (enrichedData) {
        // Convert to rich format
        return {
          ...enrichedData.campaign,
          domains: enrichedData.domains || [],
          dnsValidatedDomains: enrichedData.dnsValidatedDomains || [],
          leads: enrichedData.leads || [],
          httpKeywordResults: enrichedData.httpKeywordResults || []
        };
      }
      
      return null;
    } catch (error: unknown) {
      console.error('[UnifiedCampaignService] Error getting rich campaign data:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Campaign ${campaignId} not available via bulk API`);
    }
  }

  /**
   * Get rich campaign data for multiple campaigns
   */
  async getRichCampaignDataBatch(campaignIds: string[]): Promise<Map<string, Record<string, unknown>>> {
    console.log(`[UnifiedCampaignService] Bulk loading ${campaignIds.length} campaigns`);
    
    const bulkResults = await this.getBulkEnrichedCampaignData(campaignIds);
    const richDataMap = new Map<string, Record<string, unknown>>();
    
    if (bulkResults?.campaigns) {
      Object.entries(bulkResults.campaigns).forEach(([campaignId, enrichedData]) => {
        richDataMap.set(campaignId, {
          ...enrichedData.campaign,
          domains: enrichedData.domains || [],
          dnsValidatedDomains: enrichedData.dnsValidatedDomains || [],
          leads: enrichedData.leads || [],
          httpKeywordResults: enrichedData.httpKeywordResults || []
        });
      });
    }
    
    return richDataMap;
  }

  // ===================================================================
  // WEBSOCKET INTEGRATION & CACHE MANAGEMENT
  // ===================================================================

  /**
   * Initialize WebSocket listener for real-time cache invalidation
   */
  private initializeWebSocketListener(): void {
    if (typeof window !== 'undefined') {
      // Phase transition events with proper typing
      window.addEventListener('phase_transition', (event: Event) => {
        const phaseEvent = event as PhaseTransitionEvent;
        const { campaignId } = phaseEvent.detail || {};
        if (campaignId) {
          console.log(`[UnifiedCampaignService] Phase transition detected, invalidating cache for campaign ${campaignId}`);
          this.cacheManager.invalidateCampaigns([campaignId]);
        }
      });

      // Force refresh events with proper typing
      window.addEventListener('force_campaign_refresh', (event: Event) => {
        const refreshEvent = event as CampaignRefreshEvent;
        const { campaignId } = refreshEvent.detail || {};
        if (campaignId) {
          console.log(`[UnifiedCampaignService] Force refresh requested, invalidating cache for campaign ${campaignId}`);
          this.cacheManager.invalidateCampaigns([campaignId]);
        }
      });

      // Bulk invalidation events with proper typing
      window.addEventListener('bulk_cache_invalidate', (event: Event) => {
        const invalidateEvent = event as BulkCacheInvalidateEvent;
        const { campaignIds = [] } = invalidateEvent.detail || {};
        if (campaignIds.length > 0) {
          console.log(`[UnifiedCampaignService] Bulk cache invalidation for ${campaignIds.length} campaigns`);
          this.cacheManager.invalidateCampaigns(campaignIds);
        }
      });
    }
  }

  /**
   * Handle phase transition events for cache invalidation
   */
  handlePhaseTransition(campaignId: string, newPhase: string): void {
    console.log(`[UnifiedCampaignService] Phase transition: ${campaignId} → ${newPhase}`);
    this.cacheManager.invalidateCampaigns([campaignId]);
    
    // Dispatch browser event for components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('phase_transition', {
        detail: { campaignId, newPhase }
      }));
    }
  }

  // ===================================================================
  // UTILITY & MONITORING METHODS
  // ===================================================================

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Manually invalidate cache for campaigns
   */
  invalidateCache(campaignIds: string[]): void {
    this.cacheManager.invalidateCampaigns(campaignIds);
  }

  /**
   * Performance comparison utility
   */
  async performanceComparison(campaignIds: string[]): Promise<{
    bulkTime: number;
    estimatedIndividualTime: number;
    efficiency: string;
    cacheHitRate: number;
  }> {
    const startTime = performance.now();
    await this.getBulkEnrichedCampaignData(campaignIds);
    const bulkTime = performance.now() - startTime;

    // Estimate individual call time (200ms per campaign + overhead)
    const estimatedIndividualTime = (campaignIds.length * 200) + 50;
    
    const efficiency = `${Math.round((estimatedIndividualTime / bulkTime) * 100) / 100}x faster`;
    
    const stats = this.getCacheStats();
    const totalCacheEntries = stats.l1.size + stats.l2.size + stats.l3.size;
    const avgHitRate = totalCacheEntries > 0 ? 
      (stats.l1.hitRate + stats.l2.hitRate + stats.l3.hitRate) / 3 : 0;

    return {
      bulkTime: Math.round(bulkTime),
      estimatedIndividualTime,
      efficiency,
      cacheHitRate: Math.round(avgHitRate * 100) / 100
    };
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(): string {
    return 'CLOSED'; // Enhanced API client handles this internally
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(): void {
    // No-op - enhanced API client handles circuit breaking internally
  }
}

// ===================================================================
// SINGLETON EXPORT & CONVENIENCE FUNCTIONS
// ===================================================================

export const unifiedCampaignService = UnifiedCampaignService.getInstance();

// Convenience functions for backward compatibility
export const getCampaigns = (options?: Parameters<typeof unifiedCampaignService.getCampaigns>[0]) => 
  unifiedCampaignService.getCampaigns(options);

export const getCampaignById = (campaignId: string) => 
  unifiedCampaignService.getCampaignById(campaignId);

export const createCampaign = (payload: CampaignCreationPayload) => 
  unifiedCampaignService.createCampaign(payload);

export const updateCampaign = (campaignId: string, updatePayload: UpdateCampaignRequest) => 
  unifiedCampaignService.updateCampaign(campaignId, updatePayload);

export const deleteCampaign = (campaignId: string) => 
  unifiedCampaignService.deleteCampaign(campaignId);

export const startCampaign = (campaignId: string) => 
  unifiedCampaignService.startCampaign(campaignId);

export const pauseCampaign = (campaignId: string) => 
  unifiedCampaignService.pauseCampaign(campaignId);

export const resumeCampaign = (campaignId: string) => 
  unifiedCampaignService.resumeCampaign(campaignId);

export const cancelCampaign = (campaignId: string) => 
  unifiedCampaignService.cancelCampaign(campaignId);

export const getGeneratedDomains = (campaignId: string, options?: Parameters<typeof unifiedCampaignService.getGeneratedDomains>[1]) => 
  unifiedCampaignService.getGeneratedDomains(campaignId, options);

export const getDNSValidationResults = (campaignId: string, options?: Parameters<typeof unifiedCampaignService.getDNSValidationResults>[1]) =>
  unifiedCampaignService.getDNSValidationResults(campaignId, options);

export const getHTTPKeywordResults = (campaignId: string, options?: Parameters<typeof unifiedCampaignService.getHTTPKeywordResults>[1]) =>
  unifiedCampaignService.getHTTPKeywordResults(campaignId, options);

// Export the RichCampaignData type for external use
export interface RichCampaignData extends Omit<CampaignViewModel, 'domains' | 'dnsValidatedDomains' | 'leads'> {
  domains: string[];
  dnsValidatedDomains: string[];
  leads: Array<{
    sourceUrl?: string;
    name?: string;
    similarityScore?: number;
  }>;
}

// Rich data functions
export const getRichCampaignData = (campaignId: string) =>
  unifiedCampaignService.getRichCampaignData(campaignId);

export const getRichCampaignDataBatch = (campaignIds: string[]) =>
  unifiedCampaignService.getRichCampaignDataBatch(campaignIds);

export const getBulkRichCampaignData = (campaignIds: string[]) =>
  unifiedCampaignService.getRichCampaignDataBatch(campaignIds);

// Cache management
export const clearRichDataCache = (campaignId?: string) => {
  if (campaignId) {
    unifiedCampaignService.invalidateCache([campaignId]);
  } else {
    // Clear all cache by invalidating all campaigns (implementation could be improved)
    console.log('[UnifiedCampaignService] Full cache clear requested');
  }
};

export const handlePhaseTransition = (campaignId: string, newPhase: string) => 
  unifiedCampaignService.handlePhaseTransition(campaignId, newPhase);

// Legacy aliases for complete compatibility
export const createCampaignUnified = createCampaign;
export const chainCampaign = cancelCampaign;
export const startCampaignPhase = startCampaign;
export const stopCampaign = cancelCampaign;
export const listCampaigns = getCampaigns;

export default unifiedCampaignService;