# DNSValidationResult


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**attempts** | **number** |  | [optional] [default to undefined]
**businessStatus** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**dnsCampaignId** | **string** | Unique identifier (UUID v4) | [default to undefined]
**dnsRecords** | **object** |  | [optional] [default to undefined]
**domainName** | **string** |  | [default to undefined]
**generatedDomainId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**id** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**lastCheckedAt** | **string** |  | [optional] [default to undefined]
**validatedByPersonaId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**validationStatus** | **string** | Unique identifier (UUID v4) | [default to undefined]

## Example

```typescript
import { DNSValidationResult } from './api';

const instance: DNSValidationResult = {
    attempts,
    businessStatus,
    createdAt,
    dnsCampaignId,
    dnsRecords,
    domainName,
    generatedDomainId,
    id,
    lastCheckedAt,
    validatedByPersonaId,
    validationStatus,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
