# CreateDomainGenerationCampaignRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**characterSet** | **string** |  | [default to undefined]
**constantString** | **string** |  | [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**dnsValidationParams** | [**DNSValidationRequest**](DNSValidationRequest.md) |  | [optional] [default to undefined]
**httpKeywordParams** | [**HTTPKeywordValidationRequest**](HTTPKeywordValidationRequest.md) |  | [optional] [default to undefined]
**launchSequence** | **boolean** |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**numDomainsToGenerate** | **number** |  | [optional] [default to undefined]
**patternType** | **string** |  | [default to undefined]
**tld** | **string** |  | [default to undefined]
**userId** | **string** | Unique identifier | [optional] [default to undefined]
**variableLength** | **number** |  | [default to undefined]

## Example

```typescript
import { CreateDomainGenerationCampaignRequest } from './api';

const instance: CreateDomainGenerationCampaignRequest = {
    characterSet,
    constantString,
    description,
    dnsValidationParams,
    httpKeywordParams,
    launchSequence,
    name,
    numDomainsToGenerate,
    patternType,
    tld,
    userId,
    variableLength,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
