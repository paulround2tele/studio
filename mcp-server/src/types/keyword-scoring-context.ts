// src/types/keyword-scoring-context.ts
// Keyword Scoring & Lead Intelligence Types

import { z } from 'zod';

/**
 * Keyword Scoring Context Schema
 * Telecom-specific lead quality logic and scoring algorithms
 */
export const KeywordScoringContextSchema = z.object({
  extractionRules: z.object({
    contentParsing: z.object({
      htmlTags: z.array(z.string()),
      textExtraction: z.enum(['innerText', 'textContent', 'combined']),
      excludeElements: z.array(z.string()),
      includeAttributes: z.array(z.string()),
      cleanupRules: z.array(z.object({
        pattern: z.string(),
        replacement: z.string(),
        flags: z.string().optional()
      }))
    }),
    keywordMatching: z.object({
      caseSensitive: z.boolean(),
      wholeWordOnly: z.boolean(),
      fuzzyMatching: z.object({
        enabled: z.boolean(),
        threshold: z.number().min(0).max(1),
        algorithm: z.enum(['levenshtein', 'jaro_winkler', 'metaphone'])
      }),
      proximityScoring: z.object({
        enabled: z.boolean(),
        maxDistance: z.number().min(1),
        proximityBoost: z.number().min(0).max(10)
      })
    }),
    contextualAnalysis: z.object({
      sentimentWeight: z.number().min(0).max(1),
      positionWeight: z.number().min(0).max(1),
      frequencyWeight: z.number().min(0).max(1),
      contextWindow: z.number().min(1)
    })
  }),
  scoringAlgorithms: z.object({
    telecomRelevanceWeights: z.object({
      servicesKeywords: z.number().min(0).max(10),
      technologyKeywords: z.number().min(0).max(10),
      businessKeywords: z.number().min(0).max(10),
      contactKeywords: z.number().min(0).max(10),
      locationKeywords: z.number().min(0).max(10)
    }),
    contentQualityFactors: z.object({
      contentLength: z.object({
        weight: z.number().min(0).max(1),
        optimalRange: z.object({
          min: z.number(),
          max: z.number()
        })
      }),
      keywordDensity: z.object({
        weight: z.number().min(0).max(1),
        optimalRange: z.object({
          min: z.number().min(0).max(1),
          max: z.number().min(0).max(1)
        })
      }),
      structuralSignals: z.object({
        weight: z.number().min(0).max(1),
        factors: z.array(z.string())
      })
    }),
    compoundScoring: z.object({
      aggregationMethod: z.enum(['weighted_average', 'weighted_sum', 'max_score', 'harmonic_mean']),
      normalizationMethod: z.enum(['min_max', 'z_score', 'sigmoid', 'none']),
      thresholdAdjustment: z.object({
        enabled: z.boolean(),
        adaptiveThresholds: z.boolean(),
        baselineRecalculation: z.number().min(1)
      })
    })
  }),
  qualityThresholds: z.object({
    leadQualificationCriteria: z.object({
      minimumScore: z.number().min(0).max(100),
      requiredKeywordCategories: z.number().min(1),
      excludeNegativeSignals: z.boolean(),
      contactInformationWeight: z.number().min(0).max(10)
    }),
    contentValidation: z.object({
      minimumContentLength: z.number().min(1),
      maximumContentLength: z.number().min(1),
      requiredStructuralElements: z.array(z.string()),
      languageValidation: z.object({
        enabled: z.boolean(),
        supportedLanguages: z.array(z.string()),
        confidenceThreshold: z.number().min(0).max(1)
      })
    }),
    businessValidation: z.object({
      businessIndicators: z.array(z.string()),
      contactMethodsRequired: z.number().min(0),
      socialMediaPresence: z.object({
        required: z.boolean(),
        platforms: z.array(z.string()),
        scoreBoost: z.number().min(0).max(10)
      })
    })
  }),
  industryKeywords: z.object({
    telecomSpecificTerms: z.array(z.object({
      term: z.string(),
      category: z.enum(['service', 'technology', 'business', 'contact', 'location']),
      weight: z.number().min(0).max(10),
      synonyms: z.array(z.string()).optional(),
      contexts: z.array(z.string()).optional()
    })),
    negativeScoringTerms: z.array(z.object({
      term: z.string(),
      weight: z.number().min(-10).max(0),
      reason: z.string()
    })),
    emergingTerms: z.array(z.object({
      term: z.string(),
      trendScore: z.number().min(0).max(10),
      validityPeriod: z.string(),
      sources: z.array(z.string())
    }))
  }),
  contentAnalysis: z.object({
    pageStructureScoring: z.object({
      titleWeight: z.number().min(0).max(10),
      headingWeight: z.number().min(0).max(10),
      metaDescriptionWeight: z.number().min(0).max(10),
      navigationWeight: z.number().min(0).max(10),
      contactSectionWeight: z.number().min(0).max(10)
    }),
    technicalAnalysis: z.object({
      sslCertificateBonus: z.number().min(0).max(5),
      mobileOptimization: z.number().min(0).max(5),
      loadTimeImpact: z.object({
        enabled: z.boolean(),
        thresholds: z.object({
          excellent: z.number(),
          good: z.number(),
          poor: z.number()
        }),
        scoreImpact: z.object({
          excellent: z.number(),
          good: z.number(),
          poor: z.number()
        })
      })
    }),
    businessSignals: z.object({
      addressDetection: z.object({
        enabled: z.boolean(),
        patterns: z.array(z.string()),
        scoreBoost: z.number().min(0).max(10)
      }),
      phoneNumberDetection: z.object({
        enabled: z.boolean(),
        patterns: z.array(z.string()),
        scoreBoost: z.number().min(0).max(10)
      }),
      emailDetection: z.object({
        enabled: z.boolean(),
        patterns: z.array(z.string()),
        scoreBoost: z.number().min(0).max(10)
      })
    })
  })
});

export type KeywordScoringContext = z.infer<typeof KeywordScoringContextSchema>;

/**
 * Lead Intelligence Schema
 * Advanced lead qualification and content analysis
 */
export const LeadIntelligenceSchema = z.object({
  leadId: z.string().uuid(),
  domainName: z.string(),
  extractedContent: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    mainContent: z.string(),
    contactInformation: z.object({
      phones: z.array(z.string()),
      emails: z.array(z.string()),
      addresses: z.array(z.string()),
      socialMedia: z.record(z.string())
    }).optional(),
    businessMetadata: z.object({
      companyName: z.string().optional(),
      industry: z.string().optional(),
      services: z.array(z.string()),
      locations: z.array(z.string())
    }).optional()
  }),
  keywordAnalysis: z.object({
    foundKeywords: z.array(z.object({
      keyword: z.string(),
      category: z.string(),
      score: z.number(),
      context: z.string(),
      position: z.number(),
      frequency: z.number()
    })),
    categoryScores: z.record(z.number()),
    overallRelevanceScore: z.number().min(0).max(100),
    confidenceLevel: z.enum(['low', 'medium', 'high', 'very_high'])
  }),
  qualificationResult: z.object({
    isQualifiedLead: z.boolean(),
    qualificationScore: z.number().min(0).max(100),
    qualificationReasons: z.array(z.string()),
    disqualificationReasons: z.array(z.string()).optional(),
    improvementSuggestions: z.array(z.string()).optional()
  }),
  technicalMetrics: z.object({
    pageLoadTime: z.number().optional(),
    contentLength: z.number(),
    httpStatusCode: z.number(),
    sslEnabled: z.boolean(),
    mobileOptimized: z.boolean().optional(),
    structuredDataPresent: z.boolean().optional()
  }),
  competitiveAnalysis: z.object({
    similarDomains: z.array(z.string()).optional(),
    marketPosition: z.enum(['leader', 'challenger', 'follower', 'niche']).optional(),
    uniqueValueProposition: z.string().optional(),
    competitiveAdvantages: z.array(z.string()).optional()
  }).optional()
});

export type LeadIntelligence = z.infer<typeof LeadIntelligenceSchema>;

/**
 * Telecom Industry Context Schema
 * Industry-specific knowledge and classification
 */
export const TelecomIndustryContextSchema = z.object({
  serviceCategories: z.object({
    voice: z.object({
      keywords: z.array(z.string()),
      subcategories: z.array(z.string()),
      weight: z.number().min(0).max(10)
    }),
    data: z.object({
      keywords: z.array(z.string()),
      subcategories: z.array(z.string()),
      weight: z.number().min(0).max(10)
    }),
    internet: z.object({
      keywords: z.array(z.string()),
      subcategories: z.array(z.string()),
      weight: z.number().min(0).max(10)
    }),
    infrastructure: z.object({
      keywords: z.array(z.string()),
      subcategories: z.array(z.string()),
      weight: z.number().min(0).max(10)
    }),
    enterprise: z.object({
      keywords: z.array(z.string()),
      subcategories: z.array(z.string()),
      weight: z.number().min(0).max(10)
    })
  }),
  technologyStack: z.object({
    networkTechnologies: z.array(z.string()),
    protocolsAndStandards: z.array(z.string()),
    equipmentVendors: z.array(z.string()),
    emergingTechnologies: z.array(z.string())
  }),
  marketSegments: z.object({
    residential: z.object({
      characteristics: z.array(z.string()),
      keyIndicators: z.array(z.string()),
      scoringWeight: z.number().min(0).max(10)
    }),
    business: z.object({
      characteristics: z.array(z.string()),
      keyIndicators: z.array(z.string()),
      scoringWeight: z.number().min(0).max(10)
    }),
    enterprise: z.object({
      characteristics: z.array(z.string()),
      keyIndicators: z.array(z.string()),
      scoringWeight: z.number().min(0).max(10)
    }),
    wholesale: z.object({
      characteristics: z.array(z.string()),
      keyIndicators: z.array(z.string()),
      scoringWeight: z.number().min(0).max(10)
    })
  }),
  regionalFactors: z.object({
    regulatoryEnvironment: z.record(z.object({
      regulations: z.array(z.string()),
      complianceKeywords: z.array(z.string()),
      impact: z.enum(['positive', 'neutral', 'negative'])
    })),
    marketMaturity: z.record(z.enum(['emerging', 'developing', 'mature', 'saturated'])),
    competitiveLandscape: z.record(z.object({
      majorPlayers: z.array(z.string()),
      marketConcentration: z.enum(['fragmented', 'moderate', 'concentrated']),
      competitionLevel: z.enum(['low', 'medium', 'high', 'intense'])
    }))
  })
});

export type TelecomIndustryContext = z.infer<typeof TelecomIndustryContextSchema>;