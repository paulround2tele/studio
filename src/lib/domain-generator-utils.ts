
/**
 * @fileOverview Utility functions for deterministic domain generation.
 * This includes generating the Nth character combination and constructing a domain from an index.
 * Uses backend OpenAPI types exclusively - no frontend duplication
 */
// Temporary placeholder for domain config types until modeled in OpenAPI
type DomainGenerationParams = any; // TODO: map to generated model when available

// Constants for SLD validation
const MAX_SLD_LENGTH = 63;
const MIN_SLD_LENGTH = 1;

/**
 * Generates a stable hash for a DomainGenerationPhaseConfig object.
 * Normalizes arrays (tlds, allowedCharSet) to ensure consistent hash for same logical config.
 * @param config The domain generation phase configuration.
 * @returns A string hash.
 */
export function getDomainGenerationPhaseConfigHash(config: DomainGenerationParams): string {
  const normalizedConfig = {
    pt: config.patternType,
    cs: config.constantString,
    charset: Array.from(new Set((config.characterSet || '').split(''))).sort().join(''),
    tlds: config.tlds?.sort() || [],
    vl: config.variableLength || 0,
    ndtg: config.numDomainsToGenerate || 0
  };
  // A more robust hash would use a crypto library, but for mock, simple stringify is okay.
  return JSON.stringify(normalizedConfig);
}

// Removed generateCharsForNth as it's backend logic now

export function calculateMaxSldCombinations(
    config: Pick<DomainGenerationParams, 'patternType' | 'variableLength'>,
    uniqueCharSetSize: number
): number {
    const { patternType, variableLength = 0 } = config;

    if (uniqueCharSetSize === 0) {
        if (patternType === "prefix" && variableLength > 0) return 0;
        if (patternType === "suffix" && variableLength > 0) return 0;
        if (patternType === "both" && variableLength > 0) return 0;
        // If variable length is 0, it means only the constant part for SLD (1 combination)
        return 1;
    }

    let sldCombinations = 0;
    if (patternType === "prefix") {
        sldCombinations = variableLength > 0 ? Math.pow(uniqueCharSetSize, variableLength) : 0;
         if (variableLength === 0) sldCombinations = 1; // Only constant part
    } else if (patternType === "suffix") {
        sldCombinations = variableLength > 0 ? Math.pow(uniqueCharSetSize, variableLength) : 0;
        if (variableLength === 0) sldCombinations = 1; // Only constant part
    } else if (patternType === "both") {
        // For 'both' pattern, split variable length between prefix and suffix
        const halfLength = Math.floor(variableLength / 2);
        const pCombos = halfLength > 0 ? Math.pow(uniqueCharSetSize, halfLength) : 1;
        const sCombos = halfLength > 0 ? Math.pow(uniqueCharSetSize, halfLength) : 1;
        sldCombinations = pCombos * sCombos;
    }
    return sldCombinations;
}

// Removed domainFromIndex as it's backend logic now
// Frontend might still need to validate SLD rules visually or before submission if desired,
// but the actual generation and validation happen on the backend.
// For now, keeping SLD constants for potential future frontend validation helpers.

export function isValidSld(sld: string): boolean {
    if (sld.length < MIN_SLD_LENGTH || sld.length > MAX_SLD_LENGTH) return false;
    if (sld.startsWith('-') || sld.endsWith('-')) return false;
    if (sld.includes('--')) return false; // No consecutive hyphens in the middle
    // Valid characters: alphanumeric and hyphens (not at start/end)
    if (!/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9]+)*$/i.test(sld) && sld.length > 0) {
        if (sld.includes(' ')) return false; // No spaces
        if (sld.replace(/-/g, "").length === 0 && sld.length > 0) return false; // Only hyphens
    }
    return true;
}

/**
 * Generate the Nth character combination for a given length and character set
 */
export function generateCharsForNth(n: number, length: number, charSet: string[]): string | null {
    if (charSet.length === 0 && length > 0) return null;
    if (length === 0) return '';
    
    const base = charSet.length;
    const maxCombinations = Math.pow(base, length);
    if (n >= maxCombinations) return null;
    
    let result = '';
    let num = n;
    
    for (let i = 0; i < length; i++) {
        result = charSet[num % base] + result;
        num = Math.floor(num / base);
    }
    
    return result;
}

/**
 * Generate a domain from an index using backend schema
 */
export function domainFromIndex(index: number, config: DomainGenerationParams): string | null {
    const { patternType, constantString, characterSet, variableLength } = config;
    const charSet = (characterSet || '').split('');
    
    let sld = '';
    
    if (patternType === 'prefix') {
        if (variableLength > 0) {
            const prefix = generateCharsForNth(index, variableLength, charSet);
            if (prefix === null) return null;
            sld = prefix + (constantString || '');
        } else {
            sld = constantString || '';
        }
    } else if (patternType === 'suffix') {
        if (variableLength > 0) {
            const suffix = generateCharsForNth(index, variableLength, charSet);
            if (suffix === null) return null;
            sld = (constantString || '') + suffix;
        } else {
            sld = constantString || '';
        }
    } else if (patternType === 'both') {
        // Split variable length between prefix and suffix
        const halfLength = Math.floor(variableLength / 2);
        
        let prefix = '';
        let suffix = '';
        
        if (halfLength > 0) {
            const suffixCombinations = halfLength > 0 ? Math.pow(charSet.length, halfLength) : 1;
            const prefixIndex = Math.floor(index / suffixCombinations);
            const prefixResult = generateCharsForNth(prefixIndex, halfLength, charSet);
            if (prefixResult === null) return null;
            prefix = prefixResult;
        }
        
        if (halfLength > 0) {
            const suffixCombinations = Math.pow(charSet.length, halfLength);
            const suffixIndex = index % suffixCombinations;
            const suffixResult = generateCharsForNth(suffixIndex, halfLength, charSet);
            if (suffixResult === null) return null;
            suffix = suffixResult;
        }
        
        sld = prefix + (constantString || '') + suffix;
    } else {
        sld = constantString || '';
    }
    
    // Validate the SLD
    if (!isValidSld(sld)) return null;
    
    // Use the first TLD if available, otherwise return just the SLD
    const tld = config.tlds?.[0] || '.com';
    return sld + tld;
}
