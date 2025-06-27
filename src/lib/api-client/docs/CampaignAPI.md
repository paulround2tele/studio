# CampaignAPI


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**campaignType** | [**CampaignTypeEnum**](CampaignTypeEnum.md) |  | [default to undefined]
**status** | [**CampaignStatusEnum**](CampaignStatusEnum.md) |  | [default to undefined]
**userId** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [default to undefined]
**startedAt** | **string** |  | [optional] [default to undefined]
**completedAt** | **string** |  | [optional] [default to undefined]
**progressPercentage** | **number** |  | [optional] [default to undefined]
**totalItems** | **number** |  | [optional] [default to undefined]
**processedItems** | **number** |  | [optional] [default to undefined]
**successfulItems** | **number** |  | [optional] [default to undefined]
**failedItems** | **number** |  | [optional] [default to undefined]
**errorMessage** | **string** |  | [optional] [default to undefined]
**metadata** | **object** |  | [optional] [default to undefined]
**estimatedCompletionAt** | **string** |  | [optional] [default to undefined]
**avgProcessingRate** | **number** |  | [optional] [default to undefined]
**lastHeartbeatAt** | **string** |  | [optional] [default to undefined]
**businessStatus** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { CampaignAPI } from '@domainflow/api-client';

const instance: CampaignAPI = {
    id,
    name,
    campaignType,
    status,
    userId,
    createdAt,
    updatedAt,
    startedAt,
    completedAt,
    progressPercentage,
    totalItems,
    processedItems,
    successfulItems,
    failedItems,
    errorMessage,
    metadata,
    estimatedCompletionAt,
    avgProcessingRate,
    lastHeartbeatAt,
    businessStatus,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
