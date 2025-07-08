# KeywordsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**batchExtractKeywords**](#batchextractkeywords) | **POST** /api/v2/extract/keywords | Batch keyword extraction|
|[**streamExtractKeywords**](#streamextractkeywords) | **GET** /api/v2/extract/keywords/stream | Streaming keyword extraction|

# **batchExtractKeywords**
> BatchKeywordExtractionResponse batchExtractKeywords(batchKeywordExtractionRequest)

Extracts keywords from multiple URLs in a single batch request

### Example

```typescript
import {
    KeywordsApi,
    Configuration,
    BatchKeywordExtractionRequest
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

let batchKeywordExtractionRequest: BatchKeywordExtractionRequest; //

const { status, data } = await apiInstance.batchExtractKeywords(
    batchKeywordExtractionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **batchKeywordExtractionRequest** | **BatchKeywordExtractionRequest**|  | |


### Return type

**BatchKeywordExtractionResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Batch extraction results |  -  |
|**400** | Bad request - Invalid input |  -  |
|**401** | Unauthorized |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **streamExtractKeywords**
> string streamExtractKeywords()

Extracts keywords from a single URL with real-time streaming results

### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

let url: string; //URL to extract keywords from (default to undefined)
let keywordSetId: string; //UUID of the keyword set to use for extraction (default to undefined)
let httpPersonaId: string; //Optional UUID of HTTP persona to use (optional) (default to undefined)
let dnsPersonaId: string; //Optional UUID of DNS persona to use (optional) (default to undefined)

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
| **keywordSetId** | [**string**] | UUID of the keyword set to use for extraction | defaults to undefined|
| **httpPersonaId** | [**string**] | Optional UUID of HTTP persona to use | (optional) defaults to undefined|
| **dnsPersonaId** | [**string**] | Optional UUID of DNS persona to use | (optional) defaults to undefined|


### Return type

**string**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/event-stream, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Server-sent events stream with keyword extraction results |  -  |
|**400** | Bad request - Invalid parameters |  -  |
|**401** | Unauthorized |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

