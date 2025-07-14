# CreateHTTPKeywordCampaignRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**adHocKeywords** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**batchSize** | **number** |  | [optional] [default to undefined]
**keywordSetIds** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**personaIds** | **Array&lt;string&gt;** |  | [default to undefined]
**processingSpeedPerMinute** | **number** |  | [optional] [default to undefined]
**proxyPoolId** | **string** | Unique identifier | [optional] [default to undefined]
**proxySelectionStrategy** | **string** |  | [optional] [default to undefined]
**retryAttempts** | **number** |  | [optional] [default to undefined]
**rotationIntervalSeconds** | **number** |  | [optional] [default to undefined]
**sourceCampaignId** | **string** | Unique identifier | [default to undefined]
**targetHttpPorts** | **Array&lt;number&gt;** |  | [optional] [default to undefined]
**userId** | **string** | Unique identifier | [optional] [default to undefined]

## Example

```typescript
import { CreateHTTPKeywordCampaignRequest } from './api';

const instance: CreateHTTPKeywordCampaignRequest = {
    adHocKeywords,
    batchSize,
    keywordSetIds,
    name,
    personaIds,
    processingSpeedPerMinute,
    proxyPoolId,
    proxySelectionStrategy,
    retryAttempts,
    rotationIntervalSeconds,
    sourceCampaignId,
    targetHttpPorts,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
