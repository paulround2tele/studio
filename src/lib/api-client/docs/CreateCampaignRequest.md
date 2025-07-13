# CreateCampaignRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**campaignType** | **string** |  | [optional] [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**dnsValidationParams** | [**DnsValidationParams**](DnsValidationParams.md) |  | [optional] [default to undefined]
**domainGenerationParams** | [**DomainGenerationParams**](DomainGenerationParams.md) |  | [optional] [default to undefined]
**httpKeywordParams** | [**HttpKeywordParams**](HttpKeywordParams.md) |  | [optional] [default to undefined]
**launchSequence** | **boolean** |  | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**userId** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { CreateCampaignRequest } from './api';

const instance: CreateCampaignRequest = {
    campaignType,
    description,
    dnsValidationParams,
    domainGenerationParams,
    httpKeywordParams,
    launchSequence,
    name,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
