# KeywordExtractionRequestItem

Single item in a batch keyword extraction request

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**dnsPersonaId** | **string** | Optional UUID of DNS persona to use | [optional] [default to undefined]
**httpPersonaId** | **string** | Optional UUID of HTTP persona to use | [optional] [default to undefined]
**keywordSetId** | **string** | UUID of the keyword set to use for extraction | [default to undefined]
**url** | **string** | URL to extract keywords from | [default to undefined]

## Example

```typescript
import { KeywordExtractionRequestItem } from 'api-client';

const instance: KeywordExtractionRequestItem = {
    dnsPersonaId,
    httpPersonaId,
    keywordSetId,
    url,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
