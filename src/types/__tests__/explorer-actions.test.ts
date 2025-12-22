/**
 * Phase 7: Explorer Actions Tests
 * 
 * Tests for action validation utilities.
 */

import {
  validatePageNumber,
  isValidDomainId,
  NOOP_ACTIONS,
} from '../explorer/actions';

describe('Explorer Actions', () => {
  describe('validatePageNumber', () => {
    it('returns page as-is when valid', () => {
      expect(validatePageNumber(1, 10)).toBe(1);
      expect(validatePageNumber(5, 10)).toBe(5);
      expect(validatePageNumber(10, 10)).toBe(10);
    });

    it('clamps to 1 when page is less than 1', () => {
      expect(validatePageNumber(0, 10)).toBe(1);
      expect(validatePageNumber(-1, 10)).toBe(1);
      expect(validatePageNumber(-100, 10)).toBe(1);
    });

    it('clamps to pageCount when page exceeds it', () => {
      expect(validatePageNumber(11, 10)).toBe(10);
      expect(validatePageNumber(100, 10)).toBe(10);
    });

    it('handles pageCount of 0', () => {
      // When pageCount is 0, page can be anything >= 1
      expect(validatePageNumber(1, 0)).toBe(1);
      expect(validatePageNumber(5, 0)).toBe(5);
    });

    it('floors decimal page numbers', () => {
      expect(validatePageNumber(2.7, 10)).toBe(2);
      expect(validatePageNumber(3.1, 10)).toBe(3);
    });
  });

  describe('isValidDomainId', () => {
    it('accepts non-empty strings', () => {
      expect(isValidDomainId('domain-123')).toBe(true);
      expect(isValidDomainId('abc')).toBe(true);
      expect(isValidDomainId('123')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidDomainId('')).toBe(false);
    });

    it('rejects non-string values', () => {
      expect(isValidDomainId(null)).toBe(false);
      expect(isValidDomainId(undefined)).toBe(false);
      expect(isValidDomainId(123)).toBe(false);
      expect(isValidDomainId({})).toBe(false);
      expect(isValidDomainId([])).toBe(false);
    });
  });

  describe('NOOP_ACTIONS', () => {
    it('has all required action methods', () => {
      expect(typeof NOOP_ACTIONS.goToPage).toBe('function');
      expect(typeof NOOP_ACTIONS.nextPage).toBe('function');
      expect(typeof NOOP_ACTIONS.prevPage).toBe('function');
      expect(typeof NOOP_ACTIONS.setPageSize).toBe('function');
      expect(typeof NOOP_ACTIONS.setSort).toBe('function');
      expect(typeof NOOP_ACTIONS.toggleSort).toBe('function');
      expect(typeof NOOP_ACTIONS.setFilter).toBe('function');
      expect(typeof NOOP_ACTIONS.setFilters).toBe('function');
      expect(typeof NOOP_ACTIONS.resetFilters).toBe('function');
      expect(typeof NOOP_ACTIONS.clearFilter).toBe('function');
      expect(typeof NOOP_ACTIONS.selectDomain).toBe('function');
      expect(typeof NOOP_ACTIONS.deselectDomain).toBe('function');
      expect(typeof NOOP_ACTIONS.toggleDomain).toBe('function');
      expect(typeof NOOP_ACTIONS.selectAll).toBe('function');
      expect(typeof NOOP_ACTIONS.deselectAll).toBe('function');
      expect(typeof NOOP_ACTIONS.selectAllMatching).toBe('function');
      expect(typeof NOOP_ACTIONS.inspectDomain).toBe('function');
      expect(typeof NOOP_ACTIONS.closeDrawer).toBe('function');
      expect(typeof NOOP_ACTIONS.refresh).toBe('function');
      expect(typeof NOOP_ACTIONS.invalidate).toBe('function');
    });

    it('all actions are callable without error', () => {
      // Should not throw
      NOOP_ACTIONS.goToPage(1);
      NOOP_ACTIONS.nextPage();
      NOOP_ACTIONS.prevPage();
      NOOP_ACTIONS.setPageSize(50);
      NOOP_ACTIONS.setSort('richness_score');
      NOOP_ACTIONS.toggleSort('richness_score');
      NOOP_ACTIONS.setFilter('dnsStatus', 'ok');
      NOOP_ACTIONS.setFilters({ minScore: 50 });
      NOOP_ACTIONS.resetFilters();
      NOOP_ACTIONS.clearFilter('minScore');
      NOOP_ACTIONS.selectDomain('test');
      NOOP_ACTIONS.deselectDomain('test');
      NOOP_ACTIONS.toggleDomain('test');
      NOOP_ACTIONS.selectAll();
      NOOP_ACTIONS.deselectAll();
      NOOP_ACTIONS.inspectDomain('test');
      NOOP_ACTIONS.closeDrawer();
      NOOP_ACTIONS.invalidate();
    });

    it('async actions return promises', async () => {
      await expect(NOOP_ACTIONS.selectAllMatching()).resolves.toBeUndefined();
      await expect(NOOP_ACTIONS.refresh()).resolves.toBeUndefined();
    });
  });
});
