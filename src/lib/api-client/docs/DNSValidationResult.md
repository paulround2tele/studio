# DNSValidationResult

DNS validation result information

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**attempts** | **number** | Number of validation attempts | [optional] [default to undefined]
**businessStatus** | **string** | Business status | [optional] [default to undefined]
**createdAt** | **string** | Record creation timestamp | [optional] [default to undefined]
**dnsCampaignId** | **string** | DNS campaign ID | [optional] [default to undefined]
**dnsRecords** | **object** | DNS records found | [optional] [default to undefined]
**domainName** | **string** | Domain name validated | [optional] [default to undefined]
**generatedDomainId** | **string** | Generated domain ID | [optional] [default to undefined]
**id** | **string** | Result unique identifier | [optional] [default to undefined]
**lastCheckedAt** | **string** | Last validation timestamp | [optional] [default to undefined]
**validatedByPersonaId** | **string** | Persona used for validation | [optional] [default to undefined]
**validationStatus** | **string** | Validation status | [optional] [default to undefined]

## Example

```typescript
import { DNSValidationResult } from 'api-client';

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
