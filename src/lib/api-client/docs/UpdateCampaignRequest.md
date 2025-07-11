# UpdateCampaignRequest

Request to update an existing campaign

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**adHocKeywords** | **Array&lt;string&gt;** | Ad-hoc keywords | [optional] [default to undefined]
**batchSize** | **number** | Batch size for processing | [optional] [default to undefined]
**campaignType** | **string** | Campaign type for phase transitions | [optional] [default to undefined]
**keywordSetIds** | **Array&lt;string&gt;** | Keyword set IDs | [optional] [default to undefined]
**name** | **string** | Campaign name | [optional] [default to undefined]
**personaIds** | **Array&lt;string&gt;** | Persona IDs | [optional] [default to undefined]
**processingSpeedPerMinute** | **number** | Processing speed per minute | [optional] [default to undefined]
**proxyPoolId** | **string** | Proxy pool ID | [optional] [default to undefined]
**retryAttempts** | **number** | Number of retry attempts | [optional] [default to undefined]
**status** | **string** | Campaign status | [optional] [default to undefined]
**targetHttpPorts** | **Array&lt;number&gt;** | Target HTTP ports | [optional] [default to undefined]

## Example

```typescript
import { UpdateCampaignRequest } from './api';

const instance: UpdateCampaignRequest = {
    adHocKeywords,
    batchSize,
    campaignType,
    keywordSetIds,
    name,
    personaIds,
    processingSpeedPerMinute,
    proxyPoolId,
    retryAttempts,
    status,
    targetHttpPorts,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
