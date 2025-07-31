# HTTPKeywordResult


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**attempts** | **number** |  | [optional] [default to undefined]
**contentHash** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**dnsResultId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**domainName** | **string** |  | [default to undefined]
**extractedContentSnippet** | **string** |  | [optional] [default to undefined]
**foundAdHocKeywords** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**foundKeywordsFromSets** | **object** |  | [optional] [default to undefined]
**httpKeywordCampaignId** | **string** | Unique identifier (UUID v4) | [default to undefined]
**httpStatusCode** | **number** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**lastCheckedAt** | **string** |  | [optional] [default to undefined]
**pageTitle** | **string** |  | [optional] [default to undefined]
**responseHeaders** | **object** |  | [optional] [default to undefined]
**usedProxyId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**validatedByPersonaId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**validationStatus** | **string** | Unique identifier (UUID v4) | [default to undefined]

## Example

```typescript
import { HTTPKeywordResult } from './api';

const instance: HTTPKeywordResult = {
    attempts,
    contentHash,
    createdAt,
    dnsResultId,
    domainName,
    extractedContentSnippet,
    foundAdHocKeywords,
    foundKeywordsFromSets,
    httpKeywordCampaignId,
    httpStatusCode,
    id,
    lastCheckedAt,
    pageTitle,
    responseHeaders,
    usedProxyId,
    validatedByPersonaId,
    validationStatus,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
