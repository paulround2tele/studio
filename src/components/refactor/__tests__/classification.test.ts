/**
 * Tests for domain classification logic
 */

import type { CampaignDomain, DomainStatus } from '../types';

// Classification functions to test
export function classifyDomainByScore(domain: CampaignDomain): 'high' | 'medium' | 'low' {
  if (domain.lead_score >= 70) return 'high';
  if (domain.lead_score >= 30) return 'medium';
  return 'low';
}

export function classifyDomainByStatus(domain: CampaignDomain): 'operational' | 'issues' | 'pending' {
  if (domain.dns_status === 'ok' && domain.http_status === 'ok') return 'operational';
  if (domain.dns_status === 'error' || domain.http_status === 'error') return 'issues';
  return 'pending';
}

export function getDomainHealth(domain: CampaignDomain): number {
  let health = 0;
  
  // DNS status contributes 40%
  switch (domain.dns_status) {
    case 'ok':
      health += 40;
      break;
    case 'timeout':
      health += 20;
      break;
    case 'error':
    case 'pending':
    default:
      health += 0;
      break;
  }
  
  // HTTP status contributes 40%
  switch (domain.http_status) {
    case 'ok':
      health += 40;
      break;
    case 'timeout':
      health += 20;
      break;
    case 'error':
    case 'pending':
    default:
      health += 0;
      break;
  }
  
  // Lead score contributes 20% (normalized)
  health += Math.min(20, Math.round((domain.lead_score / 100) * 20));
  
  return Math.min(100, health);
}

export function filterDomainsByQuality(
  domains: CampaignDomain[], 
  minScore: number = 0,
  requiredStatuses?: { dns?: DomainStatus; http?: DomainStatus }
): CampaignDomain[] {
  return domains.filter(domain => {
    // Score filter
    if (domain.lead_score < minScore) return false;
    
    // Status filters
    if (requiredStatuses?.dns && domain.dns_status !== requiredStatuses.dns) return false;
    if (requiredStatuses?.http && domain.http_status !== requiredStatuses.http) return false;
    
    return true;
  });
}

describe('Domain Classification Logic', () => {
  const mockDomains: CampaignDomain[] = [
    {
      id: '1',
      domain_name: 'high-quality.com',
      dns_status: 'ok',
      http_status: 'ok',
      lead_score: 85,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      domain_name: 'medium-quality.com',
      dns_status: 'ok',
      http_status: 'timeout',
      lead_score: 45,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '3',
      domain_name: 'low-quality.com',
      dns_status: 'error',
      http_status: 'error',
      lead_score: 15,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '4',
      domain_name: 'pending.com',
      dns_status: 'pending',
      http_status: 'pending',
      lead_score: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  describe('classifyDomainByScore', () => {
    it('should classify high score domains correctly', () => {
      const result = classifyDomainByScore(mockDomains[0]!);
      expect(result).toBe('high');
    });

    it('should classify medium score domains correctly', () => {
      const result = classifyDomainByScore(mockDomains[1]!);
      expect(result).toBe('medium');
    });

    it('should classify low score domains correctly', () => {
      const result = classifyDomainByScore(mockDomains[2]!);
      expect(result).toBe('low');
    });

    it('should handle boundary cases', () => {
      const domain70: CampaignDomain = { ...mockDomains[0]!, lead_score: 70 };
      expect(classifyDomainByScore(domain70)).toBe('high');

      const domain30: CampaignDomain = { ...mockDomains[0]!, lead_score: 30 };
      expect(classifyDomainByScore(domain30)).toBe('medium');

      const domain29: CampaignDomain = { ...mockDomains[0]!, lead_score: 29 };
      expect(classifyDomainByScore(domain29)).toBe('low');
    });
  });

  describe('classifyDomainByStatus', () => {
    it('should identify operational domains', () => {
      const result = classifyDomainByStatus(mockDomains[0]!);
      expect(result).toBe('operational');
    });

    it('should identify domains with issues', () => {
      const result = classifyDomainByStatus(mockDomains[2]!);
      expect(result).toBe('issues');
    });

    it('should identify pending domains', () => {
      const result = classifyDomainByStatus(mockDomains[3]!);
      expect(result).toBe('pending');
    });

    it('should treat mixed status as issues when one fails', () => {
      const mixedDomain: CampaignDomain = { ...mockDomains[0]!, http_status: 'error' as DomainStatus };
      const result = classifyDomainByStatus(mixedDomain);
      expect(result).toBe('issues');
    });
  });

  describe('getDomainHealth', () => {
    it('should calculate 100% health for perfect domain', () => {
      const perfectDomain: CampaignDomain = { ...mockDomains[0]!, lead_score: 100 };
      const health = getDomainHealth(perfectDomain);
      expect(health).toBe(100);
    });

    it('should calculate 0% health for completely failed domain', () => {
      const failedDomain: CampaignDomain = { ...mockDomains[0]!, dns_status: 'error' as DomainStatus, http_status: 'error' as DomainStatus, lead_score: 0 };
      const health = getDomainHealth(failedDomain);
      expect(health).toBe(0);
    });

    it('should handle partial success correctly', () => {
      // DNS ok (40%) + HTTP timeout (20%) + lead score 50 (10%) = 70%
      const partialDomain: CampaignDomain = { ...mockDomains[0]!, http_status: 'timeout' as DomainStatus, lead_score: 50 };
      const health = getDomainHealth(partialDomain);
      expect(health).toBe(70);
    });

    it('should not exceed 100% health', () => {
      const perfectDomain: CampaignDomain = { ...mockDomains[0]!, lead_score: 200 }; // Impossible but testing bounds
      const health = getDomainHealth(perfectDomain);
      expect(health).toBe(100);
    });
  });

  describe('filterDomainsByQuality', () => {
    it('should filter by minimum score', () => {
      const result = filterDomainsByQuality(mockDomains, 50);
      expect(result).toHaveLength(1);
      expect(result[0]!.domain_name).toBe('high-quality.com');
    });

    it('should filter by DNS status', () => {
      const result = filterDomainsByQuality(mockDomains, 0, { dns: 'ok' });
      expect(result).toHaveLength(2);
      expect(result.every(d => d.dns_status === 'ok')).toBe(true);
    });

    it('should filter by HTTP status', () => {
      const result = filterDomainsByQuality(mockDomains, 0, { http: 'ok' });
      expect(result).toHaveLength(1);
      expect(result[0]!.domain_name).toBe('high-quality.com');
    });

    it('should apply multiple filters', () => {
      const result = filterDomainsByQuality(mockDomains, 40, { dns: 'ok', http: 'ok' });
      expect(result).toHaveLength(1);
      expect(result[0]!.domain_name).toBe('high-quality.com');
    });

    it('should return empty array when no domains match', () => {
      const result = filterDomainsByQuality(mockDomains, 90);
      expect(result).toHaveLength(0);
    });

    it('should return all domains when no filters applied', () => {
      const result = filterDomainsByQuality(mockDomains);
      expect(result).toHaveLength(4);
    });
  });
});