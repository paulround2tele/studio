# HTTPKeywordResult

HTTP keyword validation result information

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**attempts** | **number** | Number of validation attempts | [optional] [default to undefined]
**contentHash** | **string** | Content hash for deduplication | [optional] [default to undefined]
**createdAt** | **string** | Record creation timestamp | [optional] [default to undefined]
**dnsResultId** | **string** | Associated DNS result ID | [optional] [default to undefined]
**domainName** | **string** | Domain name validated | [optional] [default to undefined]
**extractedContentSnippet** | **string** | Content snippet extracted | [optional] [default to undefined]
**foundAdHocKeywords** | **Array&lt;string&gt;** | Ad-hoc keywords found | [optional] [default to undefined]
**foundKeywordsFromSets** | **object** | Keywords found from keyword sets | [optional] [default to undefined]
**httpKeywordCampaignId** | **string** | HTTP keyword campaign ID | [optional] [default to undefined]
**httpStatusCode** | **number** | HTTP status code received | [optional] [default to undefined]
**id** | **string** | Result unique identifier | [optional] [default to undefined]
**lastCheckedAt** | **string** | Last validation timestamp | [optional] [default to undefined]
**pageTitle** | **string** | Page title extracted | [optional] [default to undefined]
**responseHeaders** | **object** | HTTP response headers | [optional] [default to undefined]
**usedProxyId** | **string** | Proxy used for validation | [optional] [default to undefined]
**validatedByPersonaId** | **string** | Persona used for validation | [optional] [default to undefined]
**validationStatus** | **string** | Validation status | [optional] [default to undefined]

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
