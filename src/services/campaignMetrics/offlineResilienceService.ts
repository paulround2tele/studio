/**
 * Offline Resilience Service (Phase 9)
 * Offline cache, deferred action queue, and replay-safe governance/audit events
 */

import { telemetryService } from './telemetryService';

// Declare process for Node.js environment variables
declare const process: NodeJS.Process;

/**
 * Offline cache entry
 */
interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  checksum?: string;
}

/**
 * Deferred action types
 */
export type DeferredActionType = 
  | 'governance_event'
  | 'audit_log'
  | 'metric_update'
  | 'forecast_request'
  | 'anomaly_report'
  | 'recommendation_feedback'
  | 'configuration_change';

/**
 * Deferred action entry
 */
export interface DeferredAction {
  id: string;
  type: DeferredActionType;
  // Use unknown to enforce explicit narrowing at execution time
  payload: unknown;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  dependencies?: string[]; // Other action IDs this depends on
  isIdempotent: boolean;
  replayKey?: string; // For deduplication on replay
}

/**
 * Governance event for replay safety
 */
export interface GovernanceEvent {
  id: string;
  eventType: 'approval' | 'rejection' | 'modification' | 'escalation';
  resourceType: 'campaign' | 'persona' | 'proxy' | 'configuration';
  resourceId: string;
  userId: string;
  timestamp: string;
  // Governance event payload structure may vary; keep as Record<string, unknown> for now
  payload: Record<string, unknown>;
  contextHash: string; // For replay safety
  sequenceNumber: number;
}

/**
 * Offline sync status
 */
export interface OfflineSyncStatus {
  isOnline: boolean;
  lastSyncAt: string;
  pendingActions: number;
  failedActions: number;
  queueSize: number;
  cacheEntries: number;
  storageUsage: number; // in bytes
}

/**
 * Replay result
 */
interface ReplayResult {
  actionId: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Offline resilience configuration
 */
interface OfflineConfig {
  maxCacheSize: number; // in bytes
  maxCacheAge: number; // in milliseconds
  maxQueueSize: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  syncIntervalMs: number;
  enableCompression: boolean;
}

/**
 * Offline resilience service class
 */
class OfflineResilienceService {
  private cache = new Map<string, CacheEntry>();
  private actionQueue: DeferredAction[] = [];
  private governanceLog: GovernanceEvent[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private sequenceCounter = 0;

  private config: OfflineConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
    maxQueueSize: 1000,
    retryDelayMs: 5000,
    backoffMultiplier: 2,
    syncIntervalMs: 30000, // 30 seconds
    enableCompression: true,
  };

  constructor() {
    this.initializeOfflineHandling();
    this.loadPersistedState();
    this.startSyncLoop();
  }

  /**
   * Cache data for offline access
   */
  cacheData<T>(key: string, data: T, ttlMs?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttlMs || this.config.maxCacheAge);
    
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: now,
      expiresAt,
      version: '1.0',
      checksum: this.calculateChecksum(data),
    };

    // Check cache size limits
    if (this.getCacheSize() + this.estimateEntrySize(entry) > this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, entry);
    this.persistState();

    telemetryService.emitTelemetry('offline_cache_set', {
      key,
      size: this.estimateEntrySize(entry),
      totalEntries: this.cache.size,
    });
  }

  /**
   * Retrieve cached data
   */
  getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.persistState();
      return null;
    }

    // Verify data integrity
    if (entry.checksum && entry.checksum !== this.calculateChecksum(entry.data)) {
      console.warn('[OfflineResilienceService] Checksum mismatch for cached entry:', key);
      this.cache.delete(key);
      this.persistState();
      return null;
    }

    return entry.data as T;
  }

  /**
   * Queue action for deferred execution
   */
  queueAction(action: Omit<DeferredAction, 'id' | 'createdAt' | 'retryCount'>): string {
    if (this.actionQueue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority actions to make room
      this.evictLowPriorityActions();
      
      if (this.actionQueue.length >= this.config.maxQueueSize) {
        throw new Error('Action queue is full');
      }
    }

    const actionId = this.generateActionId();
    const deferredAction: DeferredAction = {
      ...action,
      id: actionId,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.actionQueue.push(deferredAction);
    this.sortActionsByPriority();
    this.persistState();

    telemetryService.emitTelemetry('action_queued', {
      actionId,
      type: action.type,
      priority: action.priority,
      queueSize: this.actionQueue.length,
    });

    // Try immediate execution if online
    if (this.isOnline) {
      this.processActionQueue();
    }

    return actionId;
  }

  /**
   * Record governance event with replay safety
   */
  recordGovernanceEvent(event: Omit<GovernanceEvent, 'id' | 'sequenceNumber' | 'contextHash'>): string {
    const governanceEvent: GovernanceEvent = {
      ...event,
      id: this.generateEventId(),
      sequenceNumber: ++this.sequenceCounter,
      contextHash: this.calculateContextHash(event),
    };

    this.governanceLog.push(governanceEvent);

    // Queue for server sync
    this.queueAction({
      type: 'governance_event',
      payload: governanceEvent,
      priority: 'high',
      maxRetries: 5,
      isIdempotent: true,
      replayKey: `governance_${governanceEvent.id}`,
    });

    this.persistState();

    telemetryService.emitTelemetry('governance_event_recorded', {
      eventId: governanceEvent.id,
      eventType: event.eventType,
      resourceType: event.resourceType,
    });

    return governanceEvent.id;
  }

  /**
   * Process the action queue (attempt to sync with server)
   */
  async processActionQueue(): Promise<void> {
    if (!this.isOnline || this.actionQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const readyActions = this.actionQueue.filter(action => {
      // Check if action is ready for retry
      if (action.nextRetryAt && new Date(action.nextRetryAt).getTime() > now) {
        return false;
      }

      // Check dependencies
      if (action.dependencies && action.dependencies.length > 0) {
        const dependenciesMet = action.dependencies.every(depId => 
          !this.actionQueue.find(a => a.id === depId)
        );
        if (!dependenciesMet) {
          return false;
        }
      }

      return true;
    });

    const replayResults: ReplayResult[] = [];

    for (const action of readyActions.slice(0, 10)) { // Process max 10 actions per batch
      try {
        const result = await this.executeAction(action);
        replayResults.push(result);

        if (result.success || result.skipped) {
          // Remove from queue
          this.actionQueue = this.actionQueue.filter(a => a.id !== action.id);
        } else {
          // Schedule retry
          this.scheduleRetry(action);
        }
      } catch (error) {
        console.error('[OfflineResilienceService] Error executing action:', action.id, error);
        this.scheduleRetry(action);
        
        replayResults.push({
          actionId: action.id,
          success: false,
          error: String(error),
        });
      }
    }

    this.persistState();

    telemetryService.emitTelemetry('action_queue_processed', {
      processedCount: replayResults.length,
      successCount: replayResults.filter(r => r.success).length,
      queueRemaining: this.actionQueue.length,
    });
  }

  /**
   * Get current offline sync status
   */
  getOfflineStatus(): OfflineSyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncAt: this.getLastSyncTime(),
      pendingActions: this.actionQueue.length,
      failedActions: this.actionQueue.filter(a => a.retryCount > 0).length,
      queueSize: this.actionQueue.length,
      cacheEntries: this.cache.size,
      storageUsage: this.getCacheSize(),
    };
  }

  /**
   * Force sync attempt
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.processActionQueue();
    
    // Also try to refresh critical cached data
    await this.refreshCriticalCache();
  }

  /**
   * Clear all offline data
   */
  clearOfflineData(): void {
    this.cache.clear();
    this.actionQueue = [];
    this.governanceLog = [];
    this.clearPersistedState();

    telemetryService.emitTelemetry('offline_data_cleared', {
      clearedAt: new Date().toISOString(),
    });
  }

  /**
   * Initialize offline handling
   */
  private initializeOfflineHandling(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      telemetryService.emitTelemetry('connection_restored', {
        restoredAt: new Date().toISOString(),
        queueSize: this.actionQueue.length,
      });
      
      // Attempt to process queued actions
      this.processActionQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      telemetryService.emitTelemetry('connection_lost', {
        lostAt: new Date().toISOString(),
        queueSize: this.actionQueue.length,
      });
    });

    // Listen for storage events (for cross-tab synchronization)
    window.addEventListener('storage', (event) => {
      if (event.key === 'offline_resilience_state') {
        this.loadPersistedState();
      }
    });
  }

  /**
   * Execute a deferred action
   */
  private async executeAction(action: DeferredAction): Promise<ReplayResult> {
    // Check for replay safety using replayKey
    if (action.replayKey && await this.isActionAlreadyProcessed(action.replayKey)) {
      return {
        actionId: action.id,
        success: true,
        skipped: true,
        skipReason: 'Already processed (idempotency)',
      };
    }

    switch (action.type) {
      case 'governance_event':
        return this.executeGovernanceEvent(action);
      
      case 'audit_log':
        return this.executeAuditLog(action);
      
      case 'metric_update':
        return this.executeMetricUpdate(action);
      
      case 'forecast_request':
        return this.executeForecastRequest(action);
      
      case 'anomaly_report':
        return this.executeAnomalyReport(action);
      
      case 'recommendation_feedback':
        return this.executeRecommendationFeedback(action);
      
      case 'configuration_change':
        return this.executeConfigurationChange(action);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute governance event action
   */
  private async executeGovernanceEvent(action: DeferredAction): Promise<ReplayResult> {
    try {
      const apiUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/governance/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        actionId: action.id,
        success: true,
      };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Execute audit log action
   */
  private async executeAuditLog(action: DeferredAction): Promise<ReplayResult> {
    try {
      const apiUrl = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/audit/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        actionId: action.id,
        success: true,
      };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        error: String(error),
      };
    }
  }

  /**
   * Execute other action types (simplified implementations)
   */
  private async executeMetricUpdate(action: DeferredAction): Promise<ReplayResult> {
    // Simplified implementation - would send metric updates to server
    return { actionId: action.id, success: true };
  }

  private async executeForecastRequest(action: DeferredAction): Promise<ReplayResult> {
    // Simplified implementation - would send forecast request to server
    return { actionId: action.id, success: true };
  }

  private async executeAnomalyReport(action: DeferredAction): Promise<ReplayResult> {
    // Simplified implementation - would send anomaly report to server
    return { actionId: action.id, success: true };
  }

  private async executeRecommendationFeedback(action: DeferredAction): Promise<ReplayResult> {
    // Simplified implementation - would send recommendation feedback to server
    return { actionId: action.id, success: true };
  }

  private async executeConfigurationChange(action: DeferredAction): Promise<ReplayResult> {
    // Simplified implementation - would send configuration change to server
    return { actionId: action.id, success: true };
  }

  /**
   * Check if action was already processed (for idempotency)
   */
  private async isActionAlreadyProcessed(replayKey: string): Promise<boolean> {
    // In a real implementation, this would check with the server
    // For now, just check if we have a record locally
    if (typeof localStorage === 'undefined') return false;
    const processed = localStorage.getItem(`processed_${replayKey}`);
    return processed === 'true';
  }

  /**
   * Schedule retry for a failed action
   */
  private scheduleRetry(action: DeferredAction): void {
    action.retryCount++;
    
    if (action.retryCount >= action.maxRetries) {
      // Move to failed actions log
      console.error('[OfflineResilienceService] Action failed after max retries:', action.id);
      this.actionQueue = this.actionQueue.filter(a => a.id !== action.id);
      return;
    }

    // Calculate exponential backoff delay
    const delay = this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, action.retryCount - 1);
    action.nextRetryAt = new Date(Date.now() + delay).toISOString();
  }

  /**
   * Start the sync loop
   */
  private startSyncLoop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = (typeof window !== 'undefined' && window.setInterval ? window.setInterval : setInterval)(() => {
      if (this.isOnline && this.actionQueue.length > 0) {
        this.processActionQueue();
      }
    }, this.config.syncIntervalMs);
  }

  /**
   * Sort actions by priority and creation time
   */
  private sortActionsByPriority(): void {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    this.actionQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Evict least recently used cache entries
   */
  private evictLeastRecentlyUsed(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const entry = entries[i];
      if (!entry) continue;
      this.cache.delete(entry[0]);
    }
  }

  /**
   * Evict low priority actions to make room
   */
  private evictLowPriorityActions(): void {
    const lowPriorityActions = this.actionQueue.filter(a => a.priority === 'low');
    
    // Remove oldest low priority actions
    lowPriorityActions
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, Math.ceil(lowPriorityActions.length * 0.5))
      .forEach(action => {
        this.actionQueue = this.actionQueue.filter(a => a.id !== action.id);
      });
  }

  /**
   * Calculate cache size in bytes
   */
  private getCacheSize(): number {
    let size = 0;
    const cacheEntries = Array.from(this.cache.values());
    for (const entry of cacheEntries) {
      size += this.estimateEntrySize(entry);
    }
    return size;
  }

  /**
   * Estimate entry size in bytes
   */
  private estimateEntrySize(entry: CacheEntry): number {
    return JSON.stringify(entry).length * 2; // Rough estimate (UTF-16)
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: unknown): string {
    // Safely stringify; for non-serializable values fall back to type tag
    let str: string;
    try {
      str = JSON.stringify(data);
    } catch {
      str = Object.prototype.toString.call(data);
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Calculate context hash for governance events
   */
  private calculateContextHash(event: Pick<GovernanceEvent, 'eventType' | 'resourceType' | 'resourceId' | 'userId'>): string {
    const contextString = `${event.eventType}_${event.resourceType}_${event.resourceId}_${event.userId}`;
    return this.calculateChecksum(contextString);
  }

  /**
   * Generate unique action ID
   */
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Persist state to localStorage
   */
  private persistState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const state = {
        cache: Array.from(this.cache.entries()),
        actionQueue: this.actionQueue,
        governanceLog: this.governanceLog,
        sequenceCounter: this.sequenceCounter,
        lastPersisted: Date.now(),
      };

      localStorage.setItem('offline_resilience_state', JSON.stringify(state));
    } catch (error) {
      console.error('[OfflineResilienceService] Failed to persist state:', error);
    }
  }

  /**
   * Load persisted state from localStorage
   */
  private loadPersistedState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stateStr = localStorage.getItem('offline_resilience_state');
      if (!stateStr) return;

      const state = JSON.parse(stateStr);
      
      this.cache = new Map(state.cache || []);
      this.actionQueue = state.actionQueue || [];
      this.governanceLog = state.governanceLog || [];
      this.sequenceCounter = state.sequenceCounter || 0;

      // Clean up expired cache entries
      this.cleanupExpiredEntries();
    } catch (error) {
      console.error('[OfflineResilienceService] Failed to load persisted state:', error);
    }
  }

  /**
   * Clear persisted state
   */
  private clearPersistedState(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('offline_resilience_state');
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Get last sync time
   */
  private getLastSyncTime(): string {
    if (typeof localStorage === 'undefined') return new Date(0).toISOString();
    const state = localStorage.getItem('offline_resilience_state');
    if (state) {
      const parsed = JSON.parse(state);
      return new Date(parsed.lastPersisted || 0).toISOString();
    }
    return new Date(0).toISOString();
  }

  /**
   * Refresh critical cached data when coming back online
   */
  private async refreshCriticalCache(): Promise<void> {
    // Implementation would refresh important cached data from server
    // For now, just emit telemetry
    telemetryService.emitTelemetry('critical_cache_refresh', {
      refreshedAt: new Date().toISOString(),
      cacheEntries: this.cache.size,
    });
  }
}

// Export singleton instance
export const offlineResilienceService = new OfflineResilienceService();