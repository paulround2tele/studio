/**
 * Tests for Type Guards - Ensuring `as any` replacement functionality
 * These tests verify that our type guards work correctly with real API response data
 */

import { describe, it, expect } from '@jest/globals';
import {
  isGeneratedDomain,
  isLeadItem,
  isCampaignData,
  isEnrichedCampaignData,
  isBulkEnrichedDataResponse,
  isCampaignIdsResponse,
  assertBulkEnrichedDataResponse,
  assertCampaignIdsResponse,
  extractDomainName,
  extractCampaignsMap,
  convertCampaignToLeadGeneration,
  LocalEnrichedCampaignData
} from './typeGuards';
import type { UUID } from '@/lib/api-client/uuid-types';
import type { BulkEnrichedDataResponse } from '@/lib/api-client/models/bulk-enriched-data-response';

describe('Type Guards - `as any` Replacement Tests', () => {
  
  describe('isGeneratedDomain', () => {
    it('should validate valid GeneratedDomain objects', () => {
      const validDomain = {
        id: 'domain-123',
        domainName: 'example.com',
        campaignId: 'campaign-456'
      };
      expect(isGeneratedDomain(validDomain)).toBe(true);
    });

    it('should reject invalid domain objects', () => {
      expect(isGeneratedDomain(null)).toBe(false);
      expect(isGeneratedDomain('string')).toBe(false);
      expect(isGeneratedDomain(123)).toBe(false);
      expect(isGeneratedDomain([])).toBe(false);
    });

    it('should accept partial domain objects', () => {
      expect(isGeneratedDomain({})).toBe(true); // All fields are optional
      expect(isGeneratedDomain({ id: 'test' })).toBe(true);
    });
  });

  describe('isBulkEnrichedDataResponse', () => {
    it('should validate complete bulk response', () => {
      const validResponse = {
        campaigns: {
          'campaign-1': {
            campaign: {
              id: 'campaign-1',
              name: 'Test Campaign'
            },
            domains: [{ id: 'domain-1', domainName: 'test.com' }],
            leads: [{ id: 'lead-1', name: 'John Doe', email: 'john@example.com' }]
          }
        },
        totalCount: 1,
        metadata: { timestamp: '2023-01-01' }
      };
      expect(isBulkEnrichedDataResponse(validResponse)).toBe(true);
    });

    it('should reject invalid bulk responses', () => {
      expect(isBulkEnrichedDataResponse(null)).toBe(false);
      expect(isBulkEnrichedDataResponse('string')).toBe(false);
      expect(isBulkEnrichedDataResponse([])).toBe(false);
    });

    it('should accept minimal valid response', () => {
      expect(isBulkEnrichedDataResponse({})).toBe(true);
      expect(isBulkEnrichedDataResponse({ campaigns: {} })).toBe(true);
    });
  });

  describe('assertBulkEnrichedDataResponse', () => {
    it('should return valid response unchanged', () => {
      const validResponse = {
        campaigns: {
          'campaign-1': {
            domains: [{ domainName: 'test.com' }]
          }
        }
      };
      expect(assertBulkEnrichedDataResponse(validResponse)).toEqual(validResponse);
    });

    it('should throw error for invalid response', () => {
      expect(() => assertBulkEnrichedDataResponse(null)).toThrow('Invalid BulkEnrichedDataResponse');
      expect(() => assertBulkEnrichedDataResponse('invalid')).toThrow('Invalid BulkEnrichedDataResponse');
    });
  });

  describe('isCampaignIdsResponse', () => {
    it('should validate array of campaign ID objects', () => {
      const validResponse = [
        { campaignId: 'campaign-1' },
        { id: 'campaign-2' },
        { campaignId: 'campaign-3', id: 'alt-id' }
      ];
      expect(isCampaignIdsResponse(validResponse)).toBe(true);
    });

    it('should reject invalid responses', () => {
      expect(isCampaignIdsResponse(null)).toBe(false);
      expect(isCampaignIdsResponse('string')).toBe(false);
      expect(isCampaignIdsResponse({})).toBe(false);
      expect(isCampaignIdsResponse([{ invalidField: 'test' }])).toBe(false);
    });

    it('should accept empty array', () => {
      expect(isCampaignIdsResponse([])).toBe(true);
    });
  });

  describe('extractDomainName', () => {
    it('should extract domain name from string', () => {
      expect(extractDomainName('example.com')).toBe('example.com');
    });

    it('should extract domain name from GeneratedDomain object', () => {
      const domain = { domainName: 'test.com', id: 'domain-123' };
      expect(extractDomainName(domain)).toBe('test.com');
    });

    it('should extract from legacy domain formats', () => {
      expect(extractDomainName({ name: 'legacy.com' })).toBe('legacy.com');
      expect(extractDomainName({ domain: 'alt.com' })).toBe('alt.com');
    });

    it('should handle invalid input gracefully', () => {
      expect(extractDomainName(null)).toBe('');
      expect(extractDomainName(undefined)).toBe('');
      expect(extractDomainName(123)).toBe('');
      expect(extractDomainName({})).toBe('');
    });
  });

  describe('extractCampaignsMap', () => {
    it('should convert bulk response to campaigns map', () => {
      const response = {
        campaigns: {
          'campaign-1': {
            campaign: {
              id: 'campaign-1',
              name: 'Test Campaign',
              currentPhase: 'domain_generation'
            },
            domains: [{ domainName: 'test.com' }],
            leads: []
          },
          'campaign-2': {
            campaign: {
              id: 'campaign-2',
              name: 'Another Campaign'
            },
            domains: [],
            leads: [{ id: 'lead-1', name: 'John' }]
          }
        }
      };

      const campaignsMap = extractCampaignsMap(response as any);
      
      expect(campaignsMap.size).toBe(2);
      expect(campaignsMap.has('campaign-1')).toBe(true);
      expect(campaignsMap.has('campaign-2')).toBe(true);
      
      const campaign1 = campaignsMap.get('campaign-1');
      expect(campaign1?.name).toBe('Test Campaign');
      expect(campaign1?.currentPhase).toBe('domain_generation');
      expect(campaign1?.domains).toHaveLength(1);
    });

    it('should handle empty response', () => {
      const response = { campaigns: {} };
      const campaignsMap = extractCampaignsMap(response as any);
      expect(campaignsMap.size).toBe(0);
    });

    it('should filter out invalid campaign entries', () => {
      const response = {
        campaigns: {
          'valid-campaign': {
            campaign: { name: 'Valid' },
            domains: []
          },
          'invalid-campaign': null
        }
      };

      const campaignsMap = extractCampaignsMap(response as any);
      expect(campaignsMap.size).toBe(1);
      expect(campaignsMap.has('valid-campaign')).toBe(true);
      expect(campaignsMap.has('invalid-campaign')).toBe(false);
    });
  });

  describe('convertCampaignToLeadGeneration', () => {
    it('should convert Campaign to LeadGenerationCampaign format', () => {
      const campaignViewModel = {
        id: 'campaign-123',
        name: 'Test Campaign',
        currentPhaseId: 'phase-456',
        keywordSetId: 'keywords-789',
        personaId: 'persona-101',
        otherField: 'preserved'
      };

      const converted = convertCampaignToLeadGeneration(campaignViewModel);
      
      expect(converted.id).toBe('campaign-123');
      expect(converted.name).toBe('Test Campaign');
      expect(converted.currentPhaseId).toBe('phase-456');
      expect(converted.keywordSetId).toBe('keywords-789');
      expect(converted.personaId).toBe('persona-101');
      expect(converted.otherField).toBe('preserved');
    });

    it('should handle null/undefined input', () => {
      expect(convertCampaignToLeadGeneration(null)).toBeNull();
      expect(convertCampaignToLeadGeneration(undefined)).toBeUndefined();
    });

    it('should preserve fields without UUID conversion', () => {
      const campaign = {
        id: 'test',
        name: 'Test',
        description: 'A test campaign'
      };

      const converted = convertCampaignToLeadGeneration(campaign);
      expect(converted.description).toBe('A test campaign');
    });
  });
});

describe('Integration Tests - Real API Response Scenarios', () => {
  
  it('should handle real bulk enriched data response structure', () => {
    // Simulated real API response structure
    const realApiResponse = {
      success: true,
      data: {
        campaigns: {
          '550e8400-e29b-41d4-a716-446655440000': {
            campaign: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Real Campaign',
              currentPhase: 'domain_generation',
              progress: { 
                domain_generation: { percentage: 75 }
              }
            },
            domains: [
              { 
                id: 'domain-1',
                domainName: 'example.com',
                campaignId: '550e8400-e29b-41d4-a716-446655440000'
              }
            ],
            leads: [
              {
                id: 'lead-1',
                name: 'John Doe',
                email: 'john@example.com',
                company: 'Example Corp'
              }
            ]
          }
        },
        totalCount: 1,
        metadata: {
          processingTime: '150ms',
          cacheHit: false
        }
      },
      requestId: 'req-123456'
    };

    // Test that our type guards work with real structure
    const bulkData = realApiResponse.data as any; // Use any for test data simulation
    expect(isBulkEnrichedDataResponse(bulkData)).toBe(true);
    
    // Test conversion to campaigns map
    const campaignsMap = extractCampaignsMap(bulkData as BulkEnrichedDataResponse);
    expect(campaignsMap.size).toBe(1);
    
    const campaign = campaignsMap.get('550e8400-e29b-41d4-a716-446655440000');
    expect(campaign).toBeDefined();
    expect(campaign?.name).toBe('Real Campaign');
    expect(campaign?.domains).toHaveLength(1);
    expect(campaign?.leads).toHaveLength(1);
  });

  it('should handle real campaign IDs response structure', () => {
    const realCampaignIdsResponse = [
      { campaignId: '550e8400-e29b-41d4-a716-446655440000' },
      { campaignId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
      { id: '6ba7b811-9dad-11d1-80b4-00c04fd430c9' } // Alternative format
    ];

    expect(isCampaignIdsResponse(realCampaignIdsResponse)).toBe(true);
    expect(() => assertCampaignIdsResponse(realCampaignIdsResponse)).not.toThrow();
  });

  it('should demonstrate domain extraction from mixed formats', () => {
    const mixedDomains = [
      'simple-string.com',
      { domainName: 'object-domain.com', id: 'domain-123' },
      { name: 'legacy-name.com' },
      { domain: 'alt-field.com' },
      null,
      undefined,
      123 // Invalid
    ];

    const extractedNames = mixedDomains.map(extractDomainName);
    
    expect(extractedNames).toEqual([
      'simple-string.com',
      'object-domain.com',
      'legacy-name.com',
      'alt-field.com',
      '',
      '',
      ''
    ]);
  });
});