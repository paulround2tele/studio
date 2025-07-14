# ModelsGeneratedDomain


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**createdAt** | **string** |  | [optional] [default to undefined]
**dnsIp** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**dnsStatus** | **string** | Domain-centric validation status fields | [optional] [default to undefined]
**domainName** | **string** |  | [default to undefined]
**generatedAt** | **string** |  | [optional] [default to undefined]
**generationCampaignId** | **string** |  | [default to undefined]
**httpKeywords** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**httpStatus** | **string** |  | [optional] [default to undefined]
**httpStatusCode** | [**SqlNullInt32**](SqlNullInt32.md) |  | [optional] [default to undefined]
**httpTitle** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**id** | **string** |  | [optional] [default to undefined]
**lastValidatedAt** | [**SqlNullTime**](SqlNullTime.md) |  | [optional] [default to undefined]
**leadScore** | [**SqlNullFloat64**](SqlNullFloat64.md) |  | [optional] [default to undefined]
**offsetIndex** | **number** | Absolute offset in the total possible generation space for this config | [optional] [default to undefined]
**sourceKeyword** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**sourcePattern** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**tld** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ModelsGeneratedDomain } from './api';

const instance: ModelsGeneratedDomain = {
    createdAt,
    dnsIp,
    dnsStatus,
    domainName,
    generatedAt,
    generationCampaignId,
    httpKeywords,
    httpStatus,
    httpStatusCode,
    httpTitle,
    id,
    lastValidatedAt,
    leadScore,
    offsetIndex,
    sourceKeyword,
    sourcePattern,
    tld,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
