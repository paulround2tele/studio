# CreateCampaignRequest

Request to create a new campaign

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**campaignType** | **string** | Type of campaign to create | [default to undefined]
**description** | **string** | Campaign description | [optional] [default to undefined]
**dnsValidationParams** | [**DnsValidationParams**](DnsValidationParams.md) |  | [optional] [default to undefined]
**domainGenerationParams** | [**DomainGenerationParams**](DomainGenerationParams.md) |  | [optional] [default to undefined]
**httpKeywordParams** | [**HttpKeywordParams**](HttpKeywordParams.md) |  | [optional] [default to undefined]
**name** | **string** | Campaign name | [default to undefined]
**userId** | **string** | User ID creating the campaign | [optional] [default to undefined]

## Example

```typescript
import { CreateCampaignRequest } from './api';

const instance: CreateCampaignRequest = {
    campaignType,
    description,
    dnsValidationParams,
    domainGenerationParams,
    httpKeywordParams,
    name,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
