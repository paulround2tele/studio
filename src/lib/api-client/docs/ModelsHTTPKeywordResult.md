# ModelsHTTPKeywordResult


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**attempts** | **number** |  | [optional] [default to undefined]
**contentHash** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**dnsResultId** | [**UuidNullUUID**](UuidNullUUID.md) |  | [optional] [default to undefined]
**domainName** | **string** |  | [default to undefined]
**extractedContentSnippet** | **string** |  | [optional] [default to undefined]
**foundAdHocKeywords** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**foundKeywordsFromSets** | **Array&lt;number&gt;** |  | [optional] [default to undefined]
**httpKeywordCampaignId** | **string** |  | [default to undefined]
**httpStatusCode** | **number** |  | [optional] [default to undefined]
**id** | **string** |  | [optional] [default to undefined]
**lastCheckedAt** | **string** |  | [optional] [default to undefined]
**pageTitle** | **string** |  | [optional] [default to undefined]
**responseHeaders** | **Array&lt;number&gt;** |  | [optional] [default to undefined]
**usedProxyId** | [**UuidNullUUID**](UuidNullUUID.md) |  | [optional] [default to undefined]
**validatedByPersonaId** | [**UuidNullUUID**](UuidNullUUID.md) |  | [optional] [default to undefined]
**validationStatus** | **string** |  | [default to undefined]

## Example

```typescript
import { ModelsHTTPKeywordResult } from './api';

const instance: ModelsHTTPKeywordResult = {
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
