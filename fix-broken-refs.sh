#!/bin/bash

# Fix broken variable references from sed

# useCausalGraph.ts - line 230 broke
sed -i 's/_confidenceThreshold = number/_confidenceThreshold = 0.7/g' src/hooks/useCausalGraph.ts
sed -i 's/: number/_confidenceThreshold: number/g' src/hooks/useCausalGraph.ts

# dataQualityValidationService.ts - _metrics reference
sed -i 's/function evaluateMetrics(_metrics/function evaluateMetrics(metrics/g' src/services/campaignMetrics/dataQualityValidationService.ts

# degradationEvaluatorService.ts - _domain reference  
sed -i 's/checkDomainHealth(_domain/checkDomainHealth(domain/g' src/services/campaignMetrics/degradationEvaluatorService.ts

# Fix useState import that was removed
grep -q "import React from 'react';" src/components/campaigns/CampaignFormV2.tsx || sed -i "s/import React/import React, { useState }/g" src/components/campaigns/CampaignFormV2.tsx

# Fix state parameter that was over-replaced
sed -i 's/(\_state)/(state)/g' src/components/campaigns/CampaignProgress.tsx

# Fix redirect import
sed -i 's/import { redirect as _redirect }/import { redirect }/g' src/app/page.tsx
sed -i 's/{ redirect }/{ redirect as _redirect }/g' src/app/page.tsx

# Fix imports that shouldn't have been prefixed
sed -i 's/PipelineRelatedRootState as _PipelineRelatedRootState/PipelineRelatedRootState/g' src/components/campaigns/ConversionCTA.tsx
sed -i 's/const _PipelineRelatedRootState/const PipelineRelatedRootState/g' src/components/campaigns/ConversionCTA.tsx

sed -i 's/MetricValue as _MetricValue/MetricValue/g' src/components/campaigns/DomainsList.tsx

sed -i 's/PipelineRelatedRootState as _PipelineRelatedRootState/PipelineRelatedRootState/g' src/components/campaigns/controls/CampaignModeToggle.tsx

sed -i 's/Proxy as _Proxy/Proxy/g' src/components/campaigns/workspace/forms/DNSValidationConfigForm.tsx
sed -i 's/ProxyPool as _ProxyPool/ProxyPool/g' src/components/campaigns/workspace/forms/DNSValidationConfigForm.tsx

sed -i 's/ProxyPool as _ProxyPool/ProxyPool/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx
sed -i 's/ApiKeywordSet as _ApiKeywordSet/ApiKeywordSet/g' src/components/campaigns/workspace/forms/HTTPValidationConfigForm.tsx

sed -i 's/CohortCampaign as _CohortCampaign/CohortCampaign/g' src/hooks/useCohortComparison.ts

sed -i 's/APICampaignPhaseEnum as _APICampaignPhaseEnum/APICampaignPhaseEnum/g' src/lib/utils/phaseMapping.ts

sed -i 's/EnrichedCampaignResponse as _EnrichedCampaignResponse/EnrichedCampaignResponse/g' src/lib/utils/typeGuards.ts

sed -i 's/CacheStore as _CacheStore/CacheStore/g' src/server/authCookieCache.ts

echo "Fixed broken references"
