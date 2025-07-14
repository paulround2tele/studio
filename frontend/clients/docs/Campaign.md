# Campaign


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**avgProcessingRate** | **number** |  | [optional] [default to undefined]
**businessStatus** | **string** |  | [optional] [default to undefined]
**campaignType** | **object** |  | [default to undefined]
**completedAt** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**currentPhase** | **object** | Frontend-expected properties | [optional] [default to undefined]
**dnsValidatedDomains** | **number** |  | [optional] [default to undefined]
**dnsValidationParams** | [**DNSValidationCampaignParams**](DNSValidationCampaignParams.md) |  | [optional] [default to undefined]
**domainGenerationParams** | [**DomainGenerationCampaignParams**](DomainGenerationCampaignParams.md) |  | [optional] [default to undefined]
**domains** | **number** |  | [optional] [default to undefined]
**errorMessage** | **string** |  | [optional] [default to undefined]
**estimatedCompletionAt** | **string** | Additional tracking fields | [optional] [default to undefined]
**extractedContent** | [**Array&lt;ExtractedContentItem&gt;**](ExtractedContentItem.md) | Content analysis data expected by frontend | [optional] [default to undefined]
**failedItems** | **number** |  | [optional] [default to undefined]
**httpKeywordValidationParams** | [**HTTPKeywordCampaignParams**](HTTPKeywordCampaignParams.md) |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**lastHeartbeatAt** | **string** |  | [optional] [default to undefined]
**launchSequence** | **boolean** |  | [optional] [default to undefined]
**leadItems** | [**Array&lt;LeadItem&gt;**](LeadItem.md) |  | [optional] [default to undefined]
**leads** | **number** |  | [optional] [default to undefined]
**metadata** | **object** |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**phaseStatus** | **object** |  | [optional] [default to undefined]
**processedItems** | **number** |  | [optional] [default to undefined]
**progress** | **number** |  | [optional] [default to undefined]
**progressPercentage** | **number** |  | [optional] [default to undefined]
**startedAt** | **string** |  | [optional] [default to undefined]
**status** | **object** |  | [default to undefined]
**successfulItems** | **number** |  | [optional] [default to undefined]
**totalItems** | **number** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**userId** | **string** | Unique identifier | [optional] [default to undefined]

## Example

```typescript
import { Campaign } from './api';

const instance: Campaign = {
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
