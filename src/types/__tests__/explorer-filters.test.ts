/**
 * Phase 7: Explorer Type Contracts Tests
 * 
 * Tests for filter utilities, state derivations, and type guards.
 * These tests verify the contracts without any React/RTK dependencies.
 */

import {
  DEFAULT_DOMAIN_FILTERS,
  FILTER_URL_KEYS,
  URL_KEY_TO_FILTER,
  isDomainStatusFilter,
  isLeadStatusFilter,
  isWarningsFilter,
  isValidScore,
  countActiveFilters,
  isDefaultFilters,
  mergeFilters,
  filtersToApiParams,
} from '../explorer/filters';

import type { DomainFilters } from '../explorer/filters';

describe('DomainFilters type guards', () => {
  describe('isDomainStatusFilter', () => {
    it('accepts valid status values', () => {
      expect(isDomainStatusFilter('pending')).toBe(true);
      expect(isDomainStatusFilter('ok')).toBe(true);
      expect(isDomainStatusFilter('error')).toBe(true);
      expect(isDomainStatusFilter('timeout')).toBe(true);
    });

    it('rejects invalid values', () => {
      expect(isDomainStatusFilter('invalid')).toBe(false);
      expect(isDomainStatusFilter('')).toBe(false);
      expect(isDomainStatusFilter(null)).toBe(false);
      expect(isDomainStatusFilter(undefined)).toBe(false);
      expect(isDomainStatusFilter(123)).toBe(false);
    });
  });

  describe('isLeadStatusFilter', () => {
    it('accepts valid lead status values', () => {
      expect(isLeadStatusFilter('pending')).toBe(true);
      expect(isLeadStatusFilter('match')).toBe(true);
      expect(isLeadStatusFilter('no_match')).toBe(true);
      expect(isLeadStatusFilter('error')).toBe(true);
      expect(isLeadStatusFilter('timeout')).toBe(true);
    });

    it('rejects invalid values', () => {
      expect(isLeadStatusFilter('invalid')).toBe(false);
      expect(isLeadStatusFilter('ok')).toBe(false); // ok is not a lead status
    });
  });

  describe('isWarningsFilter', () => {
    it('accepts valid warnings filter values', () => {
      expect(isWarningsFilter('all')).toBe(true);
      expect(isWarningsFilter('has')).toBe(true);
      expect(isWarningsFilter('none')).toBe(true);
    });

    it('rejects invalid values', () => {
      expect(isWarningsFilter('invalid')).toBe(false);
      expect(isWarningsFilter('')).toBe(false);
    });
  });

  describe('isValidScore', () => {
    it('accepts valid score values', () => {
      expect(isValidScore(0)).toBe(true);
      expect(isValidScore(50)).toBe(true);
      expect(isValidScore(100)).toBe(true);
      expect(isValidScore(33.5)).toBe(true);
    });

    it('rejects invalid score values', () => {
      expect(isValidScore(-1)).toBe(false);
      expect(isValidScore(101)).toBe(false);
      expect(isValidScore(NaN)).toBe(false);
      expect(isValidScore(Infinity)).toBe(false);
      expect(isValidScore('50')).toBe(false);
      expect(isValidScore(null)).toBe(false);
    });
  });
});

describe('DomainFilters utilities', () => {
  describe('DEFAULT_DOMAIN_FILTERS', () => {
    it('has expected smart defaults', () => {
      expect(DEFAULT_DOMAIN_FILTERS.dnsStatus).toBe('ok');
      expect(DEFAULT_DOMAIN_FILTERS.httpStatus).toBe('ok');
      expect(DEFAULT_DOMAIN_FILTERS.warnings).toBe('all');
    });

    it('does not have unexpected values set', () => {
      expect(DEFAULT_DOMAIN_FILTERS.leadStatus).toBeUndefined();
      expect(DEFAULT_DOMAIN_FILTERS.minScore).toBeUndefined();
      expect(DEFAULT_DOMAIN_FILTERS.keyword).toBeUndefined();
    });
  });

  describe('FILTER_URL_KEYS', () => {
    it('maps all filter keys to compact URL keys', () => {
      expect(FILTER_URL_KEYS.dnsStatus).toBe('dns');
      expect(FILTER_URL_KEYS.httpStatus).toBe('http');
      expect(FILTER_URL_KEYS.leadStatus).toBe('lead');
      expect(FILTER_URL_KEYS.minScore).toBe('min');
      expect(FILTER_URL_KEYS.maxScore).toBe('max');
      expect(FILTER_URL_KEYS.notParked).toBe('np');
      expect(FILTER_URL_KEYS.hasContact).toBe('hc');
      expect(FILTER_URL_KEYS.keyword).toBe('kw');
      expect(FILTER_URL_KEYS.domainSearch).toBe('q');
    });

    it('has reversible mapping', () => {
      expect(URL_KEY_TO_FILTER['dns']).toBe('dnsStatus');
      expect(URL_KEY_TO_FILTER['http']).toBe('httpStatus');
      expect(URL_KEY_TO_FILTER['min']).toBe('minScore');
    });
  });

  describe('countActiveFilters', () => {
    it('returns 0 for empty filters', () => {
      expect(countActiveFilters({})).toBe(0);
    });

    it('returns 0 for default filters', () => {
      expect(countActiveFilters(DEFAULT_DOMAIN_FILTERS)).toBe(0);
    });

    it('counts non-default filter values', () => {
      expect(countActiveFilters({ minScore: 50 })).toBe(1);
      expect(countActiveFilters({ minScore: 50, keyword: 'test' })).toBe(2);
    });

    it('does not count values that match defaults', () => {
      expect(countActiveFilters({ dnsStatus: 'ok', httpStatus: 'ok' })).toBe(0);
    });

    it('counts values that differ from defaults', () => {
      expect(countActiveFilters({ dnsStatus: 'error' })).toBe(1);
      expect(countActiveFilters({ httpStatus: 'pending' })).toBe(1);
    });
  });

  describe('isDefaultFilters', () => {
    it('returns true for empty object', () => {
      expect(isDefaultFilters({})).toBe(true);
    });

    it('returns true for default values', () => {
      expect(isDefaultFilters({ dnsStatus: 'ok', httpStatus: 'ok' })).toBe(true);
    });

    it('returns false for non-default values', () => {
      expect(isDefaultFilters({ minScore: 50 })).toBe(false);
      expect(isDefaultFilters({ dnsStatus: 'error' })).toBe(false);
    });
  });

  describe('mergeFilters', () => {
    it('merges partial updates into existing filters', () => {
      const current: DomainFilters = { dnsStatus: 'ok', minScore: 30 };
      const result = mergeFilters(current, { minScore: 50 });
      
      expect(result.dnsStatus).toBe('ok');
      expect(result.minScore).toBe(50);
    });

    it('removes filters when set to undefined', () => {
      const current: DomainFilters = { dnsStatus: 'ok', minScore: 30 };
      const result = mergeFilters(current, { minScore: undefined });
      
      expect(result.dnsStatus).toBe('ok');
      expect(result.minScore).toBeUndefined();
    });

    it('does not mutate original object', () => {
      const current: DomainFilters = { dnsStatus: 'ok' };
      const result = mergeFilters(current, { minScore: 50 });
      
      expect(current.minScore).toBeUndefined();
      expect(result).not.toBe(current);
    });
  });

  describe('filtersToApiParams', () => {
    it('converts filters to API params', () => {
      const filters: DomainFilters = {
        dnsStatus: 'ok',
        httpStatus: 'error',
        minScore: 50,
        notParked: true,
        keyword: 'test',
      };
      
      const params = filtersToApiParams(filters);
      
      expect(params.dnsStatus).toBe('ok');
      expect(params.httpStatus).toBe('error');
      expect(params.minScore).toBe(50);
      expect(params.notParked).toBe(true);
      expect(params.keyword).toBe('test');
    });

    it('excludes empty/undefined values', () => {
      const filters: DomainFilters = {
        dnsStatus: 'ok',
        keyword: '',
      };
      
      const params = filtersToApiParams(filters);
      
      expect(params.dnsStatus).toBe('ok');
      expect(params.keyword).toBeUndefined();
    });

    it('excludes warnings=all (default)', () => {
      const filters: DomainFilters = { warnings: 'all' };
      const params = filtersToApiParams(filters);
      
      expect(params.warnings).toBeUndefined();
    });

    it('includes warnings when not all', () => {
      const filters: DomainFilters = { warnings: 'has' };
      const params = filtersToApiParams(filters);
      
      expect(params.warnings).toBe('has');
    });
  });
});
