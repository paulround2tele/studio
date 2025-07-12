# KeywordExtractionAPIResult

Result of keyword extraction for a single URL

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**dnsPersonaIdUsed** | **string** | UUID of DNS persona actually used | [optional] [default to undefined]
**error** | **string** | Error message if extraction failed | [optional] [default to undefined]
**finalUrl** | **string** | Final URL after redirects | [optional] [default to undefined]
**httpPersonaIdUsed** | **string** | UUID of HTTP persona actually used | [optional] [default to undefined]
**keywordSetIdUsed** | **string** | UUID of keyword set used | [default to undefined]
**matches** | [**Array&lt;KeywordExtractionResult&gt;**](KeywordExtractionResult.md) | Array of keyword extraction results | [optional] [default to undefined]
**proxyIdUsed** | **string** | UUID of proxy actually used | [optional] [default to undefined]
**statusCode** | **number** | HTTP status code from the request | [optional] [default to undefined]
**url** | **string** | Original URL requested | [default to undefined]

## Example

```typescript
import { KeywordExtractionAPIResult } from 'api-client';

const instance: KeywordExtractionAPIResult = {
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
