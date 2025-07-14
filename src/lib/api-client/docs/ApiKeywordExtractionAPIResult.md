# ApiKeywordExtractionAPIResult


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**dnsPersonaIdUsed** | **string** | String UUID of persona used | [optional] [default to undefined]
**error** | **string** |  | [optional] [default to undefined]
**finalUrl** | **string** |  | [optional] [default to undefined]
**httpPersonaIdUsed** | **string** | String UUID of persona used | [optional] [default to undefined]
**keywordSetIdUsed** | **string** |  | [optional] [default to undefined]
**matches** | [**Array&lt;KeywordextractorKeywordExtractionResult&gt;**](KeywordextractorKeywordExtractionResult.md) |  | [optional] [default to undefined]
**proxyIdUsed** | **string** | String UUID of proxy used | [optional] [default to undefined]
**statusCode** | **number** |  | [optional] [default to undefined]
**url** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiKeywordExtractionAPIResult } from './api';

const instance: ApiKeywordExtractionAPIResult = {
    dnsPersonaIdUsed,
    error,
    finalUrl,
    httpPersonaIdUsed,
    keywordSetIdUsed,
    matches,
    proxyIdUsed,
    statusCode,
    url,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
