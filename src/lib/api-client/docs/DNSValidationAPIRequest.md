# DNSValidationAPIRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**batchSize** | **number** |  | [optional] [default to undefined]
**campaignId** | **string** | Unique identifier (UUID v4) | [default to undefined]
**onlyInvalidDomains** | **boolean** |  | [optional] [default to undefined]
**personaIds** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**processingSpeedPerMinute** | **number** |  | [optional] [default to undefined]
**retryAttempts** | **number** |  | [optional] [default to undefined]
**rotationIntervalSeconds** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { DNSValidationAPIRequest } from './api';

const instance: DNSValidationAPIRequest = {
    batchSize,
    campaignId,
    onlyInvalidDomains,
    personaIds,
    processingSpeedPerMinute,
    retryAttempts,
    rotationIntervalSeconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
