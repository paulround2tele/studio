/**
 * Campaign Metrics Thresholds
 * Configuration values for domain classification and KPI calculation
 */

// High-value thresholds
export const RICHNESS_HIGH = 0.7;
export const GAIN_HIGH = 0.2;

// Classification thresholds
export const RICHNESS_EMERGING_MIN = 0.55; // placeholder until deltas
export const RICHNESS_AT_RISK_MIN = 0.5;
export const RICHNESS_LOW_VALUE_MAX = 0.3;
export const GAIN_LOW_VALUE_MAX = 0.1;

// Warning thresholds
export const REPETITION_INDEX_WARN = 0.30;
export const ANCHOR_SHARE_WARN = 0.40;