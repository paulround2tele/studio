# ModelsCampaign


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**avgProcessingRate** | **number** |  | [optional] [default to undefined]
**businessStatus** | **string** |  | [optional] [default to undefined]
**campaignType** | **string** |  | [default to undefined]
**completedAt** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**currentPhase** | **string** | Frontend-expected properties | [optional] [default to undefined]
**dnsValidatedDomains** | **number** |  | [optional] [default to undefined]
**dnsValidationParams** | [**ModelsDNSValidationCampaignParams**](ModelsDNSValidationCampaignParams.md) |  | [optional] [default to undefined]
**domainGenerationParams** | [**ModelsDomainGenerationCampaignParams**](ModelsDomainGenerationCampaignParams.md) |  | [optional] [default to undefined]
**domains** | **number** |  | [optional] [default to undefined]
**errorMessage** | **string** |  | [optional] [default to undefined]
**estimatedCompletionAt** | **string** | Additional tracking fields | [optional] [default to undefined]
**extractedContent** | [**Array&lt;ModelsExtractedContentItem&gt;**](ModelsExtractedContentItem.md) | Content analysis data expected by frontend | [optional] [default to undefined]
**failedItems** | **number** |  | [optional] [default to undefined]
**httpKeywordValidationParams** | [**ModelsHTTPKeywordCampaignParams**](ModelsHTTPKeywordCampaignParams.md) |  | [optional] [default to undefined]
**id** | **string** |  | [optional] [default to undefined]
**lastHeartbeatAt** | **string** |  | [optional] [default to undefined]
**launchSequence** | **boolean** | Whether to automatically chain to next campaign types when this campaign completes | [optional] [default to undefined]
**leadItems** | [**Array&lt;ModelsLeadItem&gt;**](ModelsLeadItem.md) |  | [optional] [default to undefined]
**leads** | **number** |  | [optional] [default to undefined]
**metadata** | **Array&lt;number&gt;** |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**phaseStatus** | **string** |  | [optional] [default to undefined]
**processedItems** | **number** |  | [optional] [default to undefined]
**progress** | **number** |  | [optional] [default to undefined]
**progressPercentage** | **number** |  | [optional] [default to undefined]
**startedAt** | **string** |  | [optional] [default to undefined]
**status** | **string** |  | [default to undefined]
**successfulItems** | **number** |  | [optional] [default to undefined]
**totalItems** | **number** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**userId** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ModelsCampaign } from './api';

const instance: ModelsCampaign = {
    avgProcessingRate,
    businessStatus,
    campaignType,
    completedAt,
    createdAt,
    currentPhase,
    dnsValidatedDomains,
    dnsValidationParams,
    domainGenerationParams,
    domains,
    errorMessage,
    estimatedCompletionAt,
    extractedContent,
    failedItems,
    httpKeywordValidationParams,
    id,
    lastHeartbeatAt,
    launchSequence,
    leadItems,
    leads,
    metadata,
    name,
    phaseStatus,
    processedItems,
    progress,
    progressPercentage,
    startedAt,
    status,
    successfulItems,
    totalItems,
    updatedAt,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
