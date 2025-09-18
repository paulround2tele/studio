/**
 * Capabilities Negotiation Service (Phase 7)
 * Handles version detection, capability bootstrapping, and compatibility matrix
 */

import { telemetryService } from './telemetryService';

/**
 * Server capabilities response structure
 */
export interface ServerCapabilities {
  versions: {
    metricsSchema?: string;
    anomaliesModel?: string;
    recModel?: string;
    forecastModel?: string;
  };
  features: {
    timeline?: boolean;
    forecasting?: boolean;
    anomalies?: boolean;
    recommendations?: boolean;
    benchmarks?: boolean;
    pagination?: boolean;
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
  ]);

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
   * Initialize capabilities service
   */
  async initialize(): Promise<void> {
    try {
      await this.fetchCapabilities();
    } catch (error) {
      console.warn('[CapabilitiesService] Failed to initialize:', error);
    }
  }
}

// Export singleton instance
export const capabilitiesService = new CapabilitiesService();