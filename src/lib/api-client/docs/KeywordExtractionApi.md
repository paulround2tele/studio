# KeywordExtractionApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**batchExtractKeywords**](#batchextractkeywords) | **POST** /keyword-extraction/batch | Batch keyword extraction|
|[**streamExtractKeywords**](#streamextractkeywords) | **GET** /keyword-extraction/stream | Stream keyword extraction|

# **batchExtractKeywords**
> ApiBatchKeywordExtractionResponse batchExtractKeywords(apiBatchKeywordExtractionRequest)

Extract keywords from multiple URLs using specified keyword sets and personas

### Example

```typescript
import {
    KeywordExtractionApi,
    Configuration,
    ApiBatchKeywordExtractionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordExtractionApi(configuration);

let apiBatchKeywordExtractionRequest: ApiBatchKeywordExtractionRequest; //Batch extraction request

const { status, data } = await apiInstance.batchExtractKeywords(
    apiBatchKeywordExtractionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiBatchKeywordExtractionRequest** | **ApiBatchKeywordExtractionRequest**| Batch extraction request | |


### Return type

**ApiBatchKeywordExtractionResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Extraction results |  -  |
|**400** | Invalid request body or validation failed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **streamExtractKeywords**
> string streamExtractKeywords()

Extract keywords from a single URL with real-time streaming results

### Example

```typescript
import {
    KeywordExtractionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordExtractionApi(configuration);

let url: string; //URL to extract keywords from (default to undefined)
let keywordSetId: string; //Keyword set ID to use for extraction (default to undefined)
let httpPersonaId: string; //HTTP persona ID for request customization (optional) (default to undefined)
let dnsPersonaId: string; //DNS persona ID for DNS customization (optional) (default to undefined)

const { status, data } = await apiInstance.streamExtractKeywords(
    url,
    keywordSetId,
    httpPersonaId,
    dnsPersonaId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **url** | [**string**] | URL to extract keywords from | defaults to undefined|
| **keywordSetId** | [**string**] | Keyword set ID to use for extraction | defaults to undefined|
| **httpPersonaId** | [**string**] | HTTP persona ID for request customization | (optional) defaults to undefined|
| **dnsPersonaId** | [**string**] | DNS persona ID for DNS customization | (optional) defaults to undefined|


### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/event-stream


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Server-sent events stream with extraction results |  -  |
|**400** | Invalid query parameters |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

