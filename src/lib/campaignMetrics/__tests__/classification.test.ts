/**
 * @jest-environment jsdom
 */

import { classifyDomain, hasWarnings } from '../classification';
import type { DomainFeatures } from '../classification';

describe('Domain Classification', () => {
  describe('classifyDomain', () => {
    it('classifies high potential domains correctly', () => {
      const domain: DomainFeatures = {
        richness: 0.8,
        gain: 0.3,
      };
      expect(classifyDomain(domain)).toBe('high_potential');
    });

    it('classifies lead candidates correctly', () => {
      const domain: DomainFeatures = {
        richness: 0.5,
        gain: 0.1,
        leadStatus: 'match',
      };
      expect(classifyDomain(domain)).toBe('lead_candidate');
    });

    it('classifies low value domains correctly', () => {
      const domain: DomainFeatures = {
        richness: 0.2,
        gain: 0.05,
      };
      expect(classifyDomain(domain)).toBe('low_value');
    });

    it('classifies emerging domains correctly', () => {
      const domain: DomainFeatures = {
        richness: 0.6,
        gain: 0.15, // Above low value threshold
      };
      expect(classifyDomain(domain)).toBe('emerging');
    });

    it('classifies at risk domains correctly', () => {
      const domain: DomainFeatures = {
        richness: 0.5,
        gain: 0.15, // Above low value threshold
      };
      expect(classifyDomain(domain)).toBe('at_risk');
    });

    it('classifies other domains as fallback', () => {
      const domain: DomainFeatures = {
        richness: 0.4,
        gain: 0.15, // Above low value threshold but below other thresholds
      };
      expect(classifyDomain(domain)).toBe('other');
    });
  });

  describe('hasWarnings', () => {
    it('detects repetition index warnings', () => {
      const domain: DomainFeatures = {
        repetitionIndex: 0.35,
        anchorShare: 0.1,
      };
      expect(hasWarnings(domain)).toBe(true);
    });

    it('detects anchor share warnings', () => {
      const domain: DomainFeatures = {
        repetitionIndex: 0.1,
        anchorShare: 0.45,
      };
      expect(hasWarnings(domain)).toBe(true);
    });

    it('returns false for domains without warnings', () => {
      const domain: DomainFeatures = {
        repetitionIndex: 0.2,
        anchorShare: 0.3,
      };
      expect(hasWarnings(domain)).toBe(false);
    });
  });
});