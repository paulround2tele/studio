/**
 * Tests for aggregate data transformation logic
 */

import type { CampaignDomain, ClassificationBucket, PipelineSegment } from '../types';

// Mock domain data for testing
const mockDomains: CampaignDomain[] = [
  {
    id: '1',
    domain_name: 'example1.com',
    dns_status: 'ok',
    http_status: 'ok',
    lead_score: 85,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    domain_name: 'example2.com',
    dns_status: 'ok',
    http_status: 'error',
    lead_score: 45,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    domain_name: 'example3.com',
    dns_status: 'error',
    http_status: 'pending',
    lead_score: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    domain_name: 'example4.com',
    dns_status: 'pending',
    http_status: 'pending',
    lead_score: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Utility function to generate classification buckets
export function generateClassificationBuckets(domains: CampaignDomain[]): ClassificationBucket[] {
  if (domains.length === 0) return [];

  const highQuality = domains.filter(d => d.lead_score >= 70).length;
  const mediumQuality = domains.filter(d => d.lead_score >= 30 && d.lead_score < 70).length;
  const lowQuality = domains.filter(d => d.lead_score < 30).length;
  const total = domains.length;

  return [
    {
      label: 'High Quality',
      count: highQuality,
      percentage: Math.round((highQuality / total) * 100),
      color: '#10b981'
    },
    {
      label: 'Medium Quality',
      count: mediumQuality,
      percentage: Math.round((mediumQuality / total) * 100),
      color: '#f59e0b'
    },
    {
      label: 'Low Quality',
      count: lowQuality,
      percentage: Math.round((lowQuality / total) * 100),
      color: '#ef4444'
    }
  ].filter(bucket => bucket.count > 0);
}

// Utility function to generate pipeline segments
export function generatePipelineSegments(domains: CampaignDomain[]): PipelineSegment[] {
  if (domains.length === 0) return [];

  const dnsOk = domains.filter(d => d.dns_status === 'ok').length;
  const dnsError = domains.filter(d => d.dns_status === 'error').length;
  const dnsPending = domains.filter(d => d.dns_status === 'pending').length;
  
  const httpOk = domains.filter(d => d.http_status === 'ok').length;
  const httpError = domains.filter(d => d.http_status === 'error').length;
  const httpPending = domains.filter(d => d.http_status === 'pending').length;

  const total = domains.length;
  const segments: PipelineSegment[] = [];

  if (dnsOk > 0) {
    segments.push({
      phase: 'DNS OK',
      status: 'completed',
      count: dnsOk,
      percentage: Math.round((dnsOk / total) * 100),
      color: '#10b981'
    });
  }

  if (dnsError > 0) {
    segments.push({
      phase: 'DNS Error',
      status: 'failed',
      count: dnsError,
      percentage: Math.round((dnsError / total) * 100),
      color: '#ef4444'
    });
  }

  if (dnsPending > 0) {
    segments.push({
      phase: 'DNS Pending',
      status: 'in_progress',
      count: dnsPending,
      percentage: Math.round((dnsPending / total) * 100),
      color: '#f59e0b'
    });
  }

  if (httpOk > 0) {
    segments.push({
      phase: 'HTTP OK',
      status: 'completed',
      count: httpOk,
      percentage: Math.round((httpOk / total) * 100),
      color: '#10b981'
    });
  }

  if (httpError > 0) {
    segments.push({
      phase: 'HTTP Error',
      status: 'failed',
      count: httpError,
      percentage: Math.round((httpError / total) * 100),
      color: '#ef4444'
    });
  }

  if (httpPending > 0) {
    segments.push({
      phase: 'HTTP Pending',
      status: 'in_progress',
      count: httpPending,
      percentage: Math.round((httpPending / total) * 100),
      color: '#f59e0b'
    });
  }

  return segments;
}

describe('Aggregate Data Transformations', () => {
  describe('generateClassificationBuckets', () => {
    it('should return empty array for no domains', () => {
      const result = generateClassificationBuckets([]);
      expect(result).toEqual([]);
    });

    it('should classify domains by lead score', () => {
      const result = generateClassificationBuckets(mockDomains);
      
      expect(result).toHaveLength(3); // High, medium, and low quality domains in mock data
      
      const highQuality = result.find(b => b.label === 'High Quality');
      expect(highQuality).toBeDefined();
      expect(highQuality?.count).toBe(1); // One domain with score 85
      expect(highQuality?.percentage).toBe(25); // 1/4 = 25%

      const mediumQuality = result.find(b => b.label === 'Medium Quality');
      expect(mediumQuality).toBeDefined();
      expect(mediumQuality?.count).toBe(1); // One domain with score 45
      expect(mediumQuality?.percentage).toBe(25); // 1/4 = 25%

      const lowQuality = result.find(b => b.label === 'Low Quality');
      expect(lowQuality).toBeDefined();
      expect(lowQuality?.count).toBe(2); // Two domains with score < 30 (0 and 0)
      expect(lowQuality?.percentage).toBe(50); // 2/4 = 50%
    });

    it('should have correct color codes', () => {
      const result = generateClassificationBuckets(mockDomains);
      
      const highQuality = result.find(b => b.label === 'High Quality');
      expect(highQuality?.color).toBe('#10b981');

      const lowQuality = result.find(b => b.label === 'Low Quality');
      expect(lowQuality?.color).toBe('#ef4444');
    });
  });

  describe('generatePipelineSegments', () => {
    it('should return empty array for no domains', () => {
      const result = generatePipelineSegments([]);
      expect(result).toEqual([]);
    });

    it('should create segments for different DNS statuses', () => {
      const result = generatePipelineSegments(mockDomains);
      
      const dnsOk = result.find(s => s.phase === 'DNS OK');
      expect(dnsOk).toBeDefined();
      expect(dnsOk?.count).toBe(2); // Two domains with dns_status 'ok'

      const dnsError = result.find(s => s.phase === 'DNS Error');
      expect(dnsError).toBeDefined();
      expect(dnsError?.count).toBe(1); // One domain with dns_status 'error'

      const dnsPending = result.find(s => s.phase === 'DNS Pending');
      expect(dnsPending).toBeDefined();
      expect(dnsPending?.count).toBe(1); // One domain with dns_status 'pending'
    });

    it('should create segments for different HTTP statuses', () => {
      const result = generatePipelineSegments(mockDomains);
      
      const httpOk = result.find(s => s.phase === 'HTTP OK');
      expect(httpOk).toBeDefined();
      expect(httpOk?.count).toBe(1); // One domain with http_status 'ok'

      const httpError = result.find(s => s.phase === 'HTTP Error');
      expect(httpError).toBeDefined();
      expect(httpError?.count).toBe(1); // One domain with http_status 'error'

      const httpPending = result.find(s => s.phase === 'HTTP Pending');
      expect(httpPending).toBeDefined();
      expect(httpPending?.count).toBe(2); // Two domains with http_status 'pending'
    });

    it('should calculate correct percentages', () => {
      const result = generatePipelineSegments(mockDomains);
      
      const dnsOk = result.find(s => s.phase === 'DNS OK');
      expect(dnsOk?.percentage).toBe(50); // 2/4 = 50%

      const httpPending = result.find(s => s.phase === 'HTTP Pending');
      expect(httpPending?.percentage).toBe(50); // 2/4 = 50%
    });
  });
});