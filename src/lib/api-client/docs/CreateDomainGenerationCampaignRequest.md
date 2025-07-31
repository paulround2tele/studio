# CreateDomainGenerationCampaignRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**characterSet** | **string** |  | [default to undefined]
**constantString** | **string** |  | [optional] [default to undefined]
**dnsValidationConfig** | [**DNSValidationPhaseConfig**](DNSValidationPhaseConfig.md) |  | [optional] [default to undefined]
**dnsValidationParams** | [**DNSValidationParams**](DNSValidationParams.md) |  | [optional] [default to undefined]
**enableDnsValidation** | **boolean** |  | [optional] [default to undefined]
**enableHttpValidation** | **boolean** |  | [optional] [default to undefined]
**httpKeywordParams** | [**HTTPKeywordParams**](HTTPKeywordParams.md) |  | [optional] [default to undefined]
**httpValidationConfig** | [**HTTPValidationPhaseConfig**](HTTPValidationPhaseConfig.md) |  | [optional] [default to undefined]
**keywords** | **Array&lt;string&gt;** |  | [default to undefined]
**launchSequence** | **boolean** |  | [optional] [default to undefined]
**maxResults** | **number** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**numDomainsToGenerate** | **number** |  | [default to undefined]
**patternType** | **string** |  | [default to undefined]
**tld** | **string** |  | [default to undefined]
**tlds** | **Array&lt;string&gt;** |  | [default to undefined]
**userId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**variableLength** | **number** | Domain generation fields | [default to undefined]

## Example

```typescript
import { CreateDomainGenerationCampaignRequest } from './api';

const instance: CreateDomainGenerationCampaignRequest = {
    characterSet,
    constantString,
    dnsValidationConfig,
    dnsValidationParams,
    enableDnsValidation,
    enableHttpValidation,
    httpKeywordParams,
    httpValidationConfig,
    keywords,
    launchSequence,
    maxResults,
    name,
    numDomainsToGenerate,
    patternType,
    tld,
    tlds,
    userId,
    variableLength,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
