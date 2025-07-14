# ServicesDnsValidationParams

DNS Validation specific fields

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**batchSize** | **number** |  | [optional] [default to undefined]
**personaIds** | **Array&lt;string&gt;** |  | [default to undefined]
**processingSpeedPerMinute** | **number** |  | [optional] [default to undefined]
**retryAttempts** | **number** |  | [optional] [default to undefined]
**rotationIntervalSeconds** | **number** |  | [optional] [default to undefined]
**sourceCampaignId** | **string** | For standalone validation from past campaigns | [optional] [default to undefined]
**sourceGenerationCampaignId** | **string** | For phased validation from domain generation | [optional] [default to undefined]

## Example

```typescript
import { ServicesDnsValidationParams } from './api';

const instance: ServicesDnsValidationParams = {
    batchSize,
    personaIds,
    processingSpeedPerMinute,
    retryAttempts,
    rotationIntervalSeconds,
    sourceCampaignId,
    sourceGenerationCampaignId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
