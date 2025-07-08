# HttpKeywordParams

Parameters for HTTP keyword validation campaigns

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**adHocKeywords** | **Array&lt;string&gt;** | Ad-hoc keywords for validation | [optional] [default to undefined]
**batchSize** | **number** | Batch size for processing | [optional] [default to undefined]
**keywordSetIds** | **Array&lt;string&gt;** | Keyword set IDs to use for validation | [optional] [default to undefined]
**personaIds** | **Array&lt;string&gt;** | HTTP personas to use for validation | [default to undefined]
**processingSpeedPerMinute** | **number** | Processing speed per minute | [optional] [default to undefined]
**proxyPoolId** | **string** | Proxy pool ID for requests | [optional] [default to undefined]
**proxySelectionStrategy** | **string** | Strategy for proxy selection | [optional] [default to undefined]
**retryAttempts** | **number** | Number of retry attempts | [optional] [default to undefined]
**rotationIntervalSeconds** | **number** | Persona rotation interval in seconds | [optional] [default to undefined]
**sourceCampaignId** | **string** | Source DNS validation campaign ID | [default to undefined]
**targetHttpPorts** | **Array&lt;number&gt;** | Target HTTP ports for validation | [optional] [default to undefined]

## Example

```typescript
import { HttpKeywordParams } from 'domainflow-api-client';

const instance: HttpKeywordParams = {
    adHocKeywords,
    batchSize,
    keywordSetIds,
    personaIds,
    processingSpeedPerMinute,
    proxyPoolId,
    proxySelectionStrategy,
    retryAttempts,
    rotationIntervalSeconds,
    sourceCampaignId,
    targetHttpPorts,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
