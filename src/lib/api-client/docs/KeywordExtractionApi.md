# KeywordExtractionApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**keywordExtractBatch**](#keywordextractbatch) | **POST** /extract/keywords | Batch keyword extraction|
|[**keywordExtractStream**](#keywordextractstream) | **GET** /extract/keywords/stream | Stream keyword extraction|

# **keywordExtractBatch**
> KeywordExtractBatch200Response keywordExtractBatch(batchKeywordExtractionRequest)


### Example

```typescript
import {
    KeywordExtractionApi,
    Configuration,
    BatchKeywordExtractionRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordExtractionApi(configuration);

let batchKeywordExtractionRequest: BatchKeywordExtractionRequest; //

const { status, data } = await apiInstance.keywordExtractBatch(
    batchKeywordExtractionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **batchKeywordExtractionRequest** | **BatchKeywordExtractionRequest**|  | |


### Return type

**KeywordExtractBatch200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordExtractStream**
> string keywordExtractStream()

Server-Sent Events stream. Clients SHOULD handle heartbeats and reconnection hints. Heartbeat events are sent periodically: - see example SseHeartbeat; clients SHOULD keep the connection alive. The server MAY suggest a retry delay with an SSE control line (see SseRetry example). 

### Example

```typescript
import {
    KeywordExtractionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordExtractionApi(configuration);

let url: string; // (default to undefined)
let keywordSetId: string; // (default to undefined)
let httpPersonaId: string; // (optional) (default to undefined)
let dnsPersonaId: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.keywordExtractStream(
    url,
    keywordSetId,
    httpPersonaId,
    dnsPersonaId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **url** | [**string**] |  | defaults to undefined|
| **keywordSetId** | [**string**] |  | defaults to undefined|
| **httpPersonaId** | [**string**] |  | (optional) defaults to undefined|
| **dnsPersonaId** | [**string**] |  | (optional) defaults to undefined|


### Return type

**string**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/event-stream, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | SSE stream |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

