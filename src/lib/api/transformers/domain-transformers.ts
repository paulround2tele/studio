/**
 * Domain API Response Transformers
 * Handles conversion of domain-related responses with number for offsetIndex (OpenAPI compatible)
 */

/**
 * Generated Domain API model with properly typed fields
 */
export interface GeneratedDomainAligned {
    id?: string;
    generationCampaignId?: string;
    domainName?: string;
    offsetIndex?: number; // int64 field - use number (OpenAPI compatible)
    generatedAt?: string;
    sourceKeyword?: string;
    sourcePattern?: string;
    tld?: string;
    createdAt?: string;
}

/**
 * DNS Validation Result with aligned types
 */
export interface DNSValidationResultAligned {
    id?: string;
    dnsCampaignId?: string;
    generatedDomainId?: string;
    domainName?: string;
    validationStatus?: string;
    dnsRecords?: Record<string, unknown>;
    validatedByPersonaId?: string;
    attempts?: number;
    lastCheckedAt?: string;
    createdAt?: string;
}

/**
 * HTTP Keyword Result with aligned types
 */
export interface HTTPKeywordResultAligned {
    id?: string;
    httpKeywordCampaignId?: string;
    dnsResultId?: string;
    domainName?: string;
    validationStatus?: string;
    httpStatusCode?: number;
    responseHeaders?: Record<string, unknown>;
    pageTitle?: string;
    extractedContentSnippet?: string;
    foundKeywordsFromSets?: Record<string, unknown>;
    foundAdHocKeywords?: string[];
    contentHash?: string;
    validatedByPersonaId?: string;
    usedProxyId?: string;
    attempts?: number;
    lastCheckedAt?: string;
    createdAt?: string;
}

/**
 * Transform raw generated domain response
 */
export function transformGeneratedDomainResponse(raw: unknown): GeneratedDomainAligned {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    
    const data = raw as Record<string, unknown>;
    
    return {
        id: data.id ? String(data.id) : undefined,
        generationCampaignId: data.generationCampaignId || data.domain_generation_campaign_id ?
            String(data.generationCampaignId || data.domain_generation_campaign_id) : undefined,
        domainName: data.domainName || data.domain_name ? String(data.domainName || data.domain_name) : undefined,
        offsetIndex: (() => {
            const value = data.offsetIndex ?? data.offset_index;
            if (value != null && (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint')) {
                return Number(value);
            }
            return undefined;
        })(),
        generatedAt: data.generatedAt || data.generated_at ?
            String(data.generatedAt || data.generated_at) : undefined,
        sourceKeyword: data.sourceKeyword || data.source_keyword ? String(data.sourceKeyword || data.source_keyword) : undefined,
        sourcePattern: data.sourcePattern || data.source_pattern ? String(data.sourcePattern || data.source_pattern) : undefined,
        tld: data.tld ? String(data.tld) : undefined,
        createdAt: data.createdAt || data.created_at ?
            String(data.createdAt || data.created_at) : undefined,
    };
}

/**
 * Transform array of generated domains
 */
export function transformGeneratedDomainArrayResponse(raw: unknown[] | undefined | null): GeneratedDomainAligned[] {
    if (!raw || !Array.isArray(raw)) {
        return [];
    }
    
    return raw.map(transformGeneratedDomainResponse);
}

/**
 * Transform DNS validation result response
 */
export function transformDNSValidationResultResponse(raw: unknown): DNSValidationResultAligned {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    
    const data = raw as Record<string, unknown>;
    
    return {
        id: data.id ? String(data.id) : undefined,
        dnsCampaignId: data.dnsCampaignId || data.dns_campaign_id ?
            String(data.dnsCampaignId || data.dns_campaign_id) : undefined,
        generatedDomainId: data.generatedDomainId || data.generated_domain_id ?
            String(data.generatedDomainId || data.generated_domain_id) : undefined,
        domainName: data.domainName || data.domain_name ? String(data.domainName || data.domain_name) : undefined,
        validationStatus: data.validationStatus || data.validation_status ? String(data.validationStatus || data.validation_status) : undefined,
        dnsRecords: (data.dnsRecords || data.dns_records) as Record<string, unknown> | undefined,
        validatedByPersonaId: data.validatedByPersonaId || data.validated_by_persona_id ?
            String(data.validatedByPersonaId || data.validated_by_persona_id) : undefined,
        attempts: typeof data.attempts === 'number' ? data.attempts : undefined,
        lastCheckedAt: data.lastCheckedAt || data.last_checked_at ?
            String(data.lastCheckedAt || data.last_checked_at) : undefined,
        createdAt: data.createdAt || data.created_at ?
            String(data.createdAt || data.created_at) : undefined,
    };
}

/**
 * Transform array of DNS validation results
 */
export function transformDNSValidationResultArrayResponse(raw: unknown[] | undefined | null): DNSValidationResultAligned[] {
    if (!raw || !Array.isArray(raw)) {
        return [];
    }
    
    return raw.map(transformDNSValidationResultResponse);
}

/**
 * Transform HTTP keyword result response
 */
export function transformHTTPKeywordResultResponse(raw: unknown): HTTPKeywordResultAligned {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    
    const data = raw as Record<string, unknown>;
    
    return {
        id: data.id ? String(data.id) : undefined,
        httpKeywordCampaignId: data.httpKeywordCampaignId || data.http_keyword_campaign_id ?
            String(data.httpKeywordCampaignId || data.http_keyword_campaign_id) : undefined,
        dnsResultId: data.dnsResultId || data.dns_result_id ?
            String(data.dnsResultId || data.dns_result_id) : undefined,
        domainName: data.domainName || data.domain_name ? String(data.domainName || data.domain_name) : undefined,
        validationStatus: data.validationStatus || data.validation_status ? String(data.validationStatus || data.validation_status) : undefined,
        httpStatusCode: typeof data.httpStatusCode === 'number' ? data.httpStatusCode :
            typeof data.http_status_code === 'number' ? data.http_status_code : undefined,
        responseHeaders: (data.responseHeaders || data.response_headers) as Record<string, unknown> | undefined,
        pageTitle: data.pageTitle || data.page_title ? String(data.pageTitle || data.page_title) : undefined,
        extractedContentSnippet: data.extractedContentSnippet || data.extracted_content_snippet ?
            String(data.extractedContentSnippet || data.extracted_content_snippet) : undefined,
        foundKeywordsFromSets: (data.foundKeywordsFromSets || data.found_keywords_from_sets) as Record<string, unknown> | undefined,
        foundAdHocKeywords: Array.isArray(data.foundAdHocKeywords) ? data.foundAdHocKeywords.map(String) :
            Array.isArray(data.found_ad_hoc_keywords) ? data.found_ad_hoc_keywords.map(String) : undefined,
        contentHash: data.contentHash || data.content_hash ? String(data.contentHash || data.content_hash) : undefined,
        validatedByPersonaId: data.validatedByPersonaId || data.validated_by_persona_id ?
            String(data.validatedByPersonaId || data.validated_by_persona_id) : undefined,
        usedProxyId: data.usedProxyId || data.used_proxy_id ?
            String(data.usedProxyId || data.used_proxy_id) : undefined,
        attempts: typeof data.attempts === 'number' ? data.attempts : undefined,
        lastCheckedAt: data.lastCheckedAt || data.last_checked_at ?
            String(data.lastCheckedAt || data.last_checked_at) : undefined,
        createdAt: data.createdAt || data.created_at ?
            String(data.createdAt || data.created_at) : undefined,
    };
}

/**
 * Transform array of HTTP keyword results
 */
export function transformHTTPKeywordResultArrayResponse(raw: unknown[] | undefined | null): HTTPKeywordResultAligned[] {
    if (!raw || !Array.isArray(raw)) {
        return [];
    }
    
    return raw.map(transformHTTPKeywordResultResponse);
}

/**
 * Campaign validation item (unified type for both DNS and HTTP results)
 */
export interface CampaignValidationItemAligned {
    id?: string;
    campaignId?: string;
    domainName?: string;
    validationStatus?: string;
    validatedAt?: string;
    details?: Record<string, unknown>;
    attempts?: number;
}

/**
 * Transform validation result to unified format
 */
export function transformToValidationItem(
    result: DNSValidationResultAligned | HTTPKeywordResultAligned,
    campaignId: string
): CampaignValidationItemAligned {
    return {
        id: result.id,
        campaignId: campaignId,
        domainName: result.domainName,
        validationStatus: result.validationStatus,
        validatedAt: result.lastCheckedAt || result.createdAt,
        details: {
            ...(result as DNSValidationResultAligned).dnsRecords && { dnsRecords: (result as DNSValidationResultAligned).dnsRecords },
            ...(result as HTTPKeywordResultAligned).httpStatusCode && { httpStatusCode: (result as HTTPKeywordResultAligned).httpStatusCode },
            ...(result as HTTPKeywordResultAligned).foundKeywordsFromSets && { keywords: (result as HTTPKeywordResultAligned).foundKeywordsFromSets },
        },
        attempts: result.attempts
    };
}