# DnsValidationParams

Parameters for DNS validation campaigns

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**batchSize** | **number** | Batch size for processing | [optional] [default to undefined]
**personaIds** | **Array&lt;string&gt;** | DNS personas to use for validation | [default to undefined]
**processingSpeedPerMinute** | **number** | Processing speed per minute | [optional] [default to undefined]
**retryAttempts** | **number** | Number of retry attempts | [optional] [default to undefined]
**rotationIntervalSeconds** | **number** | Persona rotation interval in seconds | [optional] [default to undefined]
**sourceCampaignId** | **string** | Source domain generation campaign ID | [default to undefined]

## Example

```typescript
import { DnsValidationParams } from './api';

const instance: DnsValidationParams = {
    batchSize,
    personaIds,
    processingSpeedPerMinute,
    retryAttempts,
    rotationIntervalSeconds,
    sourceCampaignId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
