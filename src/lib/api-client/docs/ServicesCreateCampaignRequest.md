# ServicesCreateCampaignRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**campaignType** | **string** |  | [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**dnsValidationParams** | [**ServicesDnsValidationParams**](ServicesDnsValidationParams.md) |  | [optional] [default to undefined]
**domainGenerationParams** | [**ServicesDomainGenerationParams**](ServicesDomainGenerationParams.md) |  | [optional] [default to undefined]
**httpKeywordParams** | [**ServicesHttpKeywordParams**](ServicesHttpKeywordParams.md) |  | [optional] [default to undefined]
**launchSequence** | **boolean** | Whether to automatically chain to next campaign types when this campaign completes | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**userId** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ServicesCreateCampaignRequest } from './api';

const instance: ServicesCreateCampaignRequest = {
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
