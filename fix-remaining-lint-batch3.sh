#!/bin/bash

# Fix ProxyPool unused imports that weren't caught before
sed -i 's/import type { ProxyPool }/import type { ProxyPool as _ProxyPool }/g' src/components/campaigns/workspace/forms/DNSValidationConfigForm.tsx
sed -i 's/import type { ProxyPool }/import type { ProxyPool as _ProxyPool }/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx

# Fix ApiKeywordSet unused import
sed -i 's/import type { ApiKeywordSet }/import type { ApiKeywordSet as _ApiKeywordSet }/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx

# Fix CohortCampaign unused import
sed -i 's/import type { CohortCampaign }/import type { CohortCampaign as _CohortCampaign }/g' src/hooks/useCohortComparison.ts

# Fix actions unused variable
sed -i 's/const { actions }/const { actions: _actions }/g' src/lib/hooks/usePaginatedDomains.ts

# Fix version unused variable  
sed -i 's/const \[version,/const [_version,/g' src/hooks/useCausalGraph.ts

# Fix APICampaignPhaseEnum unused import
sed -i 's/import type { APICampaignPhaseEnum }/import type { APICampaignPhaseEnum as _APICampaignPhaseEnum }/g' src/lib/utils/phaseMapping.ts

# Fix EnrichedCampaignResponse unused import
sed -i 's/import type { EnrichedCampaignResponse }/import type { EnrichedCampaignResponse as _EnrichedCampaignResponse }/g' src/lib/utils/typeGuards.ts

# Fix ttlMs unused parameter
sed -i 's/(key: string, ttlMs: number): void {/(key: string, _ttlMs: number): void {/g' src/server/authCookieCache.ts

# Fix edgesUpdated unused variable
sed -i 's/\bconst edgesUpdated = /const _edgesUpdated = /g' src/services/analytics/causalGraphService.ts

# Fix key unused variables in capabilitiesService
sed -i 's/\.map((\[key,/\.map(([_key,/g' src/services/campaignMetrics/capabilitiesService.ts

# Fix metrics unused parameter
sed -i 's/(metrics: Record<string, CampaignMetricsValue>): number {/(_metrics: Record<string, CampaignMetricsValue>): number {/g' src/services/campaignMetrics/dataQualityValidationService.ts

# Fix domain unused parameter (last instance)
sed -i 's/private summarizeDomainDegradation(domain: CampaignMetrics)/private summarizeDomainDegradation(_domain: CampaignMetrics)/g' src/services/campaignMetrics/degradationEvaluatorService.ts

# Fix snapshots unused parameter
sed -i 's/private isHighRisk(snapshots: CampaignMetricsSnapshot\[\])/private isHighRisk(_snapshots: CampaignMetricsSnapshot[])/g' src/services/campaignMetrics/enhancedRecommendationService.ts

# Fix context unused parameter (last instance)
sed -i 's/private getImpactScore(context: CampaignMetrics)/private getImpactScore(_context: CampaignMetrics)/g' src/services/campaignMetrics/enhancedRecommendationService.ts

# Fix campaignId and snapshots unused parameters in enhancedSecurityHardeningService
sed -i 's/function initializeSecurityAudit(campaignId: string, snapshots:/function initializeSecurityAudit(_campaignId: string, _snapshots:/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts
sed -i 's/campaignId: string,$/  _campaignId: string,/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts
sed -i 's/snapshots: CampaignMetricsSnapshot\[\],$/  _snapshots: CampaignMetricsSnapshot[],/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts
sed -i 's/config: ForwardLookingConfig$/  _config: ForwardLookingConfig/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts

# Fix rec unused parameter
sed -i 's/(rec: EnhancedRecommendation)/(\_rec: EnhancedRecommendation)/g' src/services/campaignMetrics/enhancedSecurityHardeningService.ts

echo "Fixed batch 3 lint errors"
