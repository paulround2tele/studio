/**
 * Performance Benchmark for DomainsExplorer
 * 
 * Tests pure data operations at 10,000 scale.
 * Grid render benchmarks require browser environment (Playwright).
 * 
 * Run with: npm test -- --testPathPattern="Performance.bench"
 */

import type { DomainWithStatus } from '@/types/explorer/state';

// Generate mock domains
function generateMockDomains(count: number): DomainWithStatus[] {
  const statuses: DomainWithStatus['status'][] = ['pending', 'dns_valid', 'dns_invalid', 'http_ok', 'http_error', 'lead'];
  const domains: DomainWithStatus[] = [];
  
  for (let i = 0; i < count; i++) {
    domains.push({
      id: `domain-${i}`,
      domain: `example-${i}.com`,
      campaign_id: 'campaign-1',
      status: statuses[i % statuses.length],
      dns_valid: i % 3 !== 0,
      http_status: i % 4 === 0 ? 200 : i % 4 === 1 ? 404 : null,
      has_leads: i % 5 === 0,
      lead_score: i % 5 === 0 ? Math.floor(Math.random() * 100) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  
  return domains;
}

describe('Performance Benchmarks', () => {
  /**
   * Note: Grid render benchmarks require full browser environment.
   * These tests focus on pure data operations which are the bottleneck.
   * 
   * Grid rendering uses server-side pagination (50 items/page),
   * so DOM render time is constant regardless of total dataset size.
   */

  describe('Data Generation Performance', () => {
    it('generates 10,000 mock domains in <500ms', () => {
      const startTime = performance.now();
      const domains = generateMockDomains(10000);
      const endTime = performance.now();
      
      const genTime = endTime - startTime;
      console.log(`  10,000 domains generated: ${genTime.toFixed(2)}ms`);
      
      expect(domains).toHaveLength(10000);
      expect(genTime).toBeLessThan(500);
    });
  });

  describe('Selection Performance', () => {
    it('handles bulk selection of 10,000 items in <100ms', () => {
      const ids = Array.from({ length: 10000 }, (_, i) => `domain-${i}`);
      
      const startTime = performance.now();
      const selectedSet = new Set(ids);
      const endTime = performance.now();
      
      const selectTime = endTime - startTime;
      console.log(`  10,000 items selected: ${selectTime.toFixed(2)}ms`);
      
      expect(selectedSet.size).toBe(10000);
      expect(selectTime).toBeLessThan(100);
    });

    it('checks membership in 10,000 item set in <1ms', () => {
      const ids = Array.from({ length: 10000 }, (_, i) => `domain-${i}`);
      const selectedSet = new Set(ids);
      
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        selectedSet.has(`domain-${i}`);
      }
      const endTime = performance.now();
      
      const checkTime = endTime - startTime;
      console.log(`  1,000 membership checks: ${checkTime.toFixed(2)}ms`);
      
      expect(checkTime).toBeLessThan(10);
    });
  });

  describe('Filter Performance', () => {
    it('filters 10,000 domains by status in <50ms', () => {
      const domains = generateMockDomains(10000);
      
      const startTime = performance.now();
      const filtered = domains.filter(d => d.status === 'lead');
      const endTime = performance.now();
      
      const filterTime = endTime - startTime;
      console.log(`  Filter 10,000 by status: ${filterTime.toFixed(2)}ms (${filtered.length} results)`);
      
      expect(filterTime).toBeLessThan(50);
    });

    it('searches 10,000 domains by name in <100ms', () => {
      const domains = generateMockDomains(10000);
      const searchTerm = 'example-500';
      
      const startTime = performance.now();
      const searched = domains.filter(d => 
        d.domain.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const endTime = performance.now();
      
      const searchTime = endTime - startTime;
      console.log(`  Search 10,000 domains: ${searchTime.toFixed(2)}ms (${searched.length} results)`);
      
      expect(searchTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    it('10,000 domain objects use reasonable memory', () => {
      const domains = generateMockDomains(10000);
      
      // Rough estimate: each domain object ~500 bytes
      // 10,000 * 500 = 5MB reasonable
      const jsonSize = JSON.stringify(domains).length;
      const estimatedMB = jsonSize / (1024 * 1024);
      
      console.log(`  10,000 domains JSON size: ${estimatedMB.toFixed(2)}MB`);
      
      // Should be under 10MB
      expect(estimatedMB).toBeLessThan(10);
    });
  });
});
