/**
 * Capabilities Negotiation Service (Phase 7 + Phase 9)
 * Handles version detection, capability bootstrapping, compatibility matrix,
 * and live capability negotiation via Server-Sent Events
 */

import { telemetryService } from './telemetryService';

// Declare process for Node.js environment variables

/**
 * Server capabilities response structure
 */
export interface ServerCapabilities {
  versions: {
    metricsSchema?: string;
    anomaliesModel?: string;
    recModel?: string;
    forecastModel?: string;
    // Phase 9: Additional version tracking
    blendingEngine?: string;
    rootCauseAnalytics?: string;
    offlineResilience?: string;
  };
  features: {
    timeline?: boolean;
    forecasting?: boolean;
    anomalies?: boolean;
    recommendations?: boolean;
    benchmarks?: boolean;
    pagination?: boolean;
    // Phase 9: New features
    bayesianBlending?: boolean;
    rootCauseAnalysis?: boolean;
    liveCapabilityNegotiation?: boolean;
    serverSentEvents?: boolean;
    offlineSupport?: boolean;
  };
  // Phase 9: Server push configuration
  serverPush?: {
    enabled: boolean;
    endpoint?: string;
    supportedEvents: string[];
  };
}

/**
 * Cached capabilities with metadata
 */
interface CachedCapabilities extends ServerCapabilities {
  lastFetched: number;
  cacheExpiry: number;
}

/**
 * Phase 9: Capability diff for live updates
 */
export interface CapabilityDiff {
  type: 'feature_added' | 'feature_removed' | 'version_updated' | 'config_changed';
  path: string; // JSONPath to the changed field
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: string;
}

/**
 * Phase 9: Live capability update
 */
export interface LiveCapabilityUpdate {
  capabilities: ServerCapabilities;
  diffs: CapabilityDiff[];
  updateId: string;
  timestamp: string;
  requiresReload?: boolean;
}

/**
 * Compatibility decision for a domain
 */
export type DomainResolution = 'server' | 'client-fallback' | 'skip';

/**
 * Domain types for resolution decisions
 */
export type DomainType = 'forecast' | 'anomalies' | 'recommendations' | 'timeline' | 'benchmarks';

const CAPABILITIES_STORAGE_KEY = 'capabilities:v1';
const CACHE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Capabilities service class
 */
class CapabilitiesService {
  private capabilities: ServerCapabilities | null = null;
  private compatibilityMatrix: Map<string, number> = new Map([
    ['forecastModel', 2], // Server forecast required if forecastModel >= 2
    ['anomaliesModel', 1], // Server anomalies required if model >= 1
    ['recModel', 1], // Server recommendations required if model >= 1
    // Phase 9: New model requirements
    ['blendingEngine', 1], // Bayesian blending if available
    ['rootCauseAnalytics', 1], // Root cause analysis if available
  ]);

  // Phase 9: SSE for live capability negotiation
  private sseConnection: EventSource | null = null;
  private capabilityUpdateCallbacks = new Set<(update: LiveCapabilityUpdate) => void>();
  private rollbackStack: ServerCapabilities[] = [];
  private maxRollbackDepth = 5;

  /**
   * Fetch capabilities from server with caching
   */
  async fetchCapabilities(force: boolean = false): Promise<ServerCapabilities> {
    // Check cache first unless force refresh
    if (!force) {
      const cached = this.getCachedCapabilities();
      if (cached && Date.now() < cached.cacheExpiry) {
        this.capabilities = {
          versions: cached.versions,
          features: cached.features,
        };
        return this.capabilities;
      }
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/meta/capabilities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Capabilities fetch failed: ${response.status}`);
      }

      const newCapabilities: ServerCapabilities = await response.json();
      
      // Check for version changes
      const oldCapabilities = this.capabilities;
      if (oldCapabilities) {
        this.detectVersionChanges(oldCapabilities.versions, newCapabilities.versions);
      }

      this.capabilities = newCapabilities;
      this.setCachedCapabilities(newCapabilities);
      
      return newCapabilities;
    } catch (error) {
      console.warn('[CapabilitiesService] Failed to fetch capabilities:', error);
      
      // Return cached if available, or minimal fallback
      const cached = this.getCachedCapabilities();
      if (cached) {
        this.capabilities = cached;
        return cached;
      }
      
      // Fallback capabilities (all client-side)
      const fallback: ServerCapabilities = {
        versions: {},
        features: {
          timeline: false,
          forecasting: false,
          anomalies: false,
          recommendations: false,
          benchmarks: false,
          pagination: false,
        },
      };
      
      this.capabilities = fallback;
      return fallback;
    }
  }

  /**
   * Get cached capabilities from localStorage
   */
  private getCachedCapabilities(): CachedCapabilities | null {
    try {
      const cached = localStorage.getItem(CAPABILITIES_STORAGE_KEY);
      if (!cached) return null;

      const parsed: CachedCapabilities = JSON.parse(cached);
      
      // Validate cache structure
      if (!parsed.versions || !parsed.features || !parsed.lastFetched || !parsed.cacheExpiry) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('[CapabilitiesService] Failed to read cached capabilities:', error);
      localStorage.removeItem(CAPABILITIES_STORAGE_KEY);
      return null;
    }
  }

  /**
   * Cache capabilities in localStorage
   */
  private setCachedCapabilities(capabilities: ServerCapabilities): void {
    try {
      const now = Date.now();
      const cached: CachedCapabilities = {
        ...capabilities,
        lastFetched: now,
        cacheExpiry: now + CACHE_VALIDITY_MS,
      };

      localStorage.setItem(CAPABILITIES_STORAGE_KEY, JSON.stringify(cached));
    } catch (error) {
      console.warn('[CapabilitiesService] Failed to cache capabilities:', error);
    }
  }

  /**
   * Detect version changes and emit telemetry
   */
  private detectVersionChanges(
    oldVersions: ServerCapabilities['versions'],
    newVersions: ServerCapabilities['versions']
  ): void {
    const allKeys = [...Object.keys(oldVersions), ...Object.keys(newVersions)];
    const keys = Array.from(new Set(allKeys));
    
    for (const key of keys) {
      const oldVersion = oldVersions[key as keyof typeof oldVersions];
      const newVersion = newVersions[key as keyof typeof newVersions];
      
      if (oldVersion !== newVersion) {
        telemetryService.emitTelemetry('capability_version_change', {
          key,
          oldVersion: oldVersion || 'undefined',
          newVersion: newVersion || 'undefined',
        });
      }
    }
  }

  /**
   * Determine domain resolution based on capabilities and compatibility matrix
   */
  resolveDomain(domain: DomainType): DomainResolution {
    if (!this.capabilities) {
      // No capabilities available, use client fallback
      this.emitDomainResolution(domain, 'client-fallback');
      return 'client-fallback';
    }

    const { versions, features } = this.capabilities;

    let resolution: DomainResolution = 'client-fallback';

    switch (domain) {
      case 'forecast':
        if (features.forecasting && versions.forecastModel) {
          const modelVersion = parseInt(versions.forecastModel, 10);
          const requiredVersion = this.compatibilityMatrix.get('forecastModel') || 2;
          resolution = modelVersion >= requiredVersion ? 'server' : 'client-fallback';
        }
        break;

      case 'anomalies':
        if (features.anomalies && versions.anomaliesModel) {
          const modelVersion = parseInt(versions.anomaliesModel, 10);
          const requiredVersion = this.compatibilityMatrix.get('anomaliesModel') || 1;
          resolution = modelVersion >= requiredVersion ? 'server' : 'client-fallback';
        }
        break;

      case 'recommendations':
        if (features.recommendations && versions.recModel) {
          const modelVersion = parseInt(versions.recModel, 10);
          const requiredVersion = this.compatibilityMatrix.get('recModel') || 1;
          resolution = modelVersion >= requiredVersion ? 'server' : 'client-fallback';
        }
        break;

      case 'timeline':
        resolution = features.timeline ? 'server' : 'client-fallback';
        break;

      case 'benchmarks':
        resolution = features.benchmarks ? 'server' : 'client-fallback';
        break;

      default:
        resolution = 'skip';
    }

    this.emitDomainResolution(domain, resolution);
    return resolution;
  }

  /**
   * Emit domain resolution telemetry
   */
  private emitDomainResolution(domain: DomainType, mode: DomainResolution): void {
    telemetryService.emitTelemetry('domain_resolution', {
      domain,
      mode,
    });
  }

  /**
   * Get current capabilities (cached)
   */
  getCurrentCapabilities(): ServerCapabilities | null {
    return this.capabilities;
  }

  /**
   * Clear capabilities cache
   */
  clearCache(): void {
    this.capabilities = null;
    localStorage.removeItem(CAPABILITIES_STORAGE_KEY);
  }

  /**
   * Initialize capabilities service with optional live negotiation
   */
  async initialize(): Promise<void> {
    try {
      await this.fetchCapabilities();
      
      // Phase 9: Start live capability negotiation if supported
      if (this.capabilities?.serverPush?.enabled && this.capabilities.features.liveCapabilityNegotiation) {
        this.initializeLiveNegotiation();
      }
    } catch (error) {
      console.warn('[CapabilitiesService] Failed to initialize:', error);
    }
  }

  /**
   * Phase 9: Initialize live capability negotiation via SSE
   */
  private initializeLiveNegotiation(): void {
    if (!this.capabilities?.serverPush?.endpoint) {
      console.warn('[CapabilitiesService] No SSE endpoint configured for live negotiation');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const sseUrl = `${apiUrl}${this.capabilities.serverPush.endpoint}`;
      
      this.sseConnection = new EventSource(sseUrl);

      this.sseConnection.addEventListener('capability-update', (event) => {
        this.handleLiveCapabilityUpdate(event);
      });

      this.sseConnection.addEventListener('capability-rollback', (event) => {
        this.handleCapabilityRollback(event);
      });

      this.sseConnection.onerror = (error) => {
        console.error('[CapabilitiesService] SSE error:', error);
        telemetryService.emitTelemetry('sse_capability_error', {
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      };

      this.sseConnection.onopen = () => {
        telemetryService.emitTelemetry('sse_capability_connected', {
          timestamp: new Date().toISOString(),
        });
      };

    } catch (error) {
      console.error('[CapabilitiesService] Failed to initialize SSE:', error);
    }
  }

  /**
   * Phase 9: Handle live capability updates
   */
  private handleLiveCapabilityUpdate(event: MessageEvent): void {
    try {
      const update: LiveCapabilityUpdate = JSON.parse(event.data);
      
      // Store current capabilities for rollback
      if (this.capabilities) {
        this.rollbackStack.push(JSON.parse(JSON.stringify(this.capabilities)));
        if (this.rollbackStack.length > this.maxRollbackDepth) {
          this.rollbackStack.shift();
        }
      }

      // Validate the update before applying
      if (this.validateCapabilityUpdate(update)) {
        // Apply the update
        this.capabilities = update.capabilities;
        this.setCachedCapabilities(update.capabilities);

        // Notify callbacks
        this.capabilityUpdateCallbacks.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error('[CapabilitiesService] Error in update callback:', error);
          }
        });

        telemetryService.emitTelemetry('capability_update_applied', {
          updateId: update.updateId,
          diffsCount: update.diffs.length,
          requiresReload: update.requiresReload,
        });

        // If update requires reload, emit warning
        if (update.requiresReload) {
          console.warn('[CapabilitiesService] Capability update requires page reload for full effect');
        }
      } else {
        console.error('[CapabilitiesService] Invalid capability update rejected:', update);
        telemetryService.emitTelemetry('capability_update_rejected', {
          updateId: update.updateId,
          reason: 'validation_failed',
        });
      }
    } catch (error) {
      console.error('[CapabilitiesService] Error processing capability update:', error);
    }
  }

  /**
   * Phase 9: Handle capability rollback requests
   */
  private handleCapabilityRollback(event: MessageEvent): void {
    try {
      const rollbackData = JSON.parse(event.data);
      const { steps = 1 } = rollbackData;

      if (this.rollbackStack.length >= steps) {
        // Rollback to previous state
        const previousCapabilities = this.rollbackStack[this.rollbackStack.length - steps];
        if (previousCapabilities) {
          this.capabilities = JSON.parse(JSON.stringify(previousCapabilities));
          if (this.capabilities) {
            this.setCachedCapabilities(this.capabilities);
          }

          // Remove rolled back states
          this.rollbackStack = this.rollbackStack.slice(0, -steps);

          telemetryService.emitTelemetry('capability_rollback_applied', {
            steps,
            timestamp: new Date().toISOString(),
          });

          console.info(`[CapabilitiesService] Rolled back ${steps} capability updates`);
        }
      } else {
        console.warn('[CapabilitiesService] Cannot rollback: insufficient history');
      }
    } catch (error) {
      console.error('[CapabilitiesService] Error processing rollback:', error);
    }
  }

  /**
   * Phase 9: Validate capability update before applying
   */
  private validateCapabilityUpdate(update: LiveCapabilityUpdate): boolean {
    // Basic structure validation
    if (!update.capabilities || !Array.isArray(update.diffs) || !update.updateId) {
      return false;
    }

    // Validate that versions are either missing or valid
    if (update.capabilities.versions) {
      for (const version of Object.values(update.capabilities.versions)) {
        if (version && typeof version !== 'string') {
          return false;
        }
      }
    }

    // Validate features structure
    if (update.capabilities.features) {
      for (const feature of Object.values(update.capabilities.features)) {
        if (feature !== undefined && typeof feature !== 'boolean') {
          return false;
        }
      }
    }

    // Validate diffs structure
    for (const diff of update.diffs) {
      if (!diff.type || !diff.path || !diff.timestamp) {
        return false;
      }
      
      if (!['feature_added', 'feature_removed', 'version_updated', 'config_changed'].includes(diff.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Phase 9: Subscribe to live capability updates
   */
  subscribeTo(callback: (update: LiveCapabilityUpdate) => void): () => void {
    this.capabilityUpdateCallbacks.add(callback);
    
    return () => {
      this.capabilityUpdateCallbacks.delete(callback);
    };
  }

  /**
   * Phase 9: Manual rollback trigger
   */
  rollbackCapabilities(steps: number = 1): boolean {
    if (this.rollbackStack.length >= steps) {
      const previousCapabilities = this.rollbackStack[this.rollbackStack.length - steps];
      if (previousCapabilities) {
        this.capabilities = JSON.parse(JSON.stringify(previousCapabilities));
        if (this.capabilities) {
          this.setCachedCapabilities(this.capabilities);
        }
        this.rollbackStack = this.rollbackStack.slice(0, -steps);

        telemetryService.emitTelemetry('manual_capability_rollback', {
          steps,
          timestamp: new Date().toISOString(),
        });

        return true;
      }
    }
    return false;
  }

  /**
   * Phase 9: Close SSE connection
   */
  disconnect(): void {
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
      telemetryService.emitTelemetry('sse_capability_disconnected', {
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Export singleton instance
export const capabilitiesService = new CapabilitiesService();