#!/bin/bash

# Fix redirect unused variable
sed -i 's/import { redirect }/import { redirect as _redirect }/g' src/app/page.tsx

# Fix permanentRedirect not defined - need to import it
sed -i 's/import { redirect as _redirect }/import { redirect as _redirect, permanentRedirect }/g' src/app/page.tsx

# Fix undefined Persona in personas/page.tsx - likely in function parameters
sed -i 's/(personas: Persona/(personas: LocalPersona/g' src/app/personas/page.tsx

# Fix unused ProxyPool imports
sed -i 's/import { Proxy as _Proxy, ProxyPool }/import { Proxy as _Proxy, ProxyPool as _ProxyPool }/g' src/components/campaigns/workspace/forms/DNSValidationConfigForm.tsx
sed -i 's/import { ProxyPool }/import { ProxyPool as _ProxyPool }/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx

# Fix unused ApiKeywordSet import
sed -i 's/import { ApiKeywordSet }/import { ApiKeywordSet as _ApiKeywordSet }/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx

# Fix CohortCampaign unused variable
sed -i 's/CohortCampaign,/CohortCampaign as _CohortCampaign,/g' src/hooks/useCohortComparison.ts

# Fix actions unused variable in usePaginatedDomains
sed -i 's/const { actions, /const { actions: _actions, /g' src/lib/hooks/usePaginatedDomains.ts

# Fix version unused variable in useCausalGraph
sed -i 's/const \[version, setVersion\]/const [_version, setVersion]/g' src/hooks/useCausalGraph.ts

# Fix APICampaignPhaseEnum unused
sed -i 's/import { Campaign, APICampaignPhaseEnum }/import { Campaign, APICampaignPhaseEnum as _APICampaignPhaseEnum }/g' src/lib/utils/phaseMapping.ts

# Fix EnrichedCampaignResponse unused
sed -i 's/import { EnrichedCampaignResponse }/import { EnrichedCampaignResponse as _EnrichedCampaignResponse }/g' src/lib/utils/typeGuards.ts

# Fix CacheStore unused
sed -i 's/type CacheStore =/type _CacheStore =/g' src/server/authCookieCache.ts

# Fix ttlMs unused parameter
sed -i 's/(key: string, ttlMs: number)/(key: string, _ttlMs: number)/g' src/server/authCookieCache.ts

# Fix edgesUpdated unused variable
sed -i 's/const edgesUpdated =/const _edgesUpdated =/g' src/services/analytics/causalGraphService.ts

# Fix key unused variables
sed -i 's/\.map((\[key, /\.map(([_key, /g' src/services/campaignMetrics/capabilitiesService.ts

# Fix _metrics not defined - revert the parameter name
sed -i 's/function evaluateMetrics(metrics/function evaluateMetrics(_metrics/g' src/services/campaignMetrics/dataQualityValidationService.ts

# Fix metrics unused parameter elsewhere in the same file
sed -i 's/(metrics: Record/(\_metrics: Record/g' src/services/campaignMetrics/dataQualityValidationService.ts

# Fix _domain not defined - revert the parameter names
sed -i 's/checkDomainHealth(domain/checkDomainHealth(_domain/g' src/services/campaignMetrics/degradationEvaluatorService.ts

# Fix domain unused parameter elsewhere
sed -i 's/(domain: CampaignMetrics)/(_domain: CampaignMetrics)/g' src/services/campaignMetrics/degradationEvaluatorService.ts

# Fix _campaignId not defined - revert
sed -i 's/checkHistoricalContext(_campaignId/checkHistoricalContext(campaignId/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/checkHistoricalBehavior(_campaignId/checkHistoricalBehavior(campaignId/g' src/services/campaignMetrics/enhancedRecommendationService.ts

# Fix snapshots unused parameter
sed -i 's/(snapshots: CampaignMetricsSnapshot\[\])/(_snapshots: CampaignMetricsSnapshot[])/g' src/services/campaignMetrics/enhancedRecommendationService.ts

# Fix _rec not defined - revert
sed -i 's/shouldEscalate(_rec/shouldEscalate(rec/g' src/services/campaignMetrics/enhancedRecommendationService.ts
sed -i 's/enhanceWithCausalInsight(_rec/enhanceWithCausalInsight(rec/g' src/services/campaignMetrics/enhancedRecommendationService.ts

# Fix context unused parameter
sed -i 's/(context: CampaignMetrics)/(_context: CampaignMetrics)/g' src/services/campaignMetrics/enhancedRecommendationService.ts

# Fix campaignId unused parameters
sed -i 's/(campaignId: string, stage/(_campaignId: string, stage/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts
sed -i 's/^  campaignId:/  _campaignId:/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts

echo "Fixed batch 2 lint errors"
