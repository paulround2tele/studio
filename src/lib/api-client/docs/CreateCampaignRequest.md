# CreateCampaignRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **string** |  | [optional] [default to undefined]
**dnsValidationParams** | [**DNSValidationRequest**](DNSValidationRequest.md) |  | [optional] [default to undefined]
**domainGenerationParams** | [**DomainGenerationParams**](DomainGenerationParams.md) |  | [optional] [default to undefined]
**fullSequenceMode** | **boolean** | Full sequence mode support - when enabled, stores all phase configurations at creation | [optional] [default to undefined]
**httpKeywordParams** | [**HTTPKeywordValidationRequest**](HTTPKeywordValidationRequest.md) |  | [optional] [default to undefined]
**launchSequence** | **boolean** |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**userId** | **string** | Unique identifier | [optional] [default to undefined]

## Example

```typescript
import { CreateCampaignRequest } from './api';

const instance: CreateCampaignRequest = {
    description,
    dnsValidationParams,
    domainGenerationParams,
    fullSequenceMode,
    httpKeywordParams,
    launchSequence,
    name,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
