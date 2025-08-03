# KeywordExtractionApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**batchExtractKeywords**](#batchextractkeywords) | **POST** /keyword-extraction/batch | Batch keyword extraction|
|[**streamExtractKeywords**](#streamextractkeywords) | **GET** /keyword-extraction/stream | Stream keyword extraction|

# **batchExtractKeywords**
> BatchKeywordExtractionResponse batchExtractKeywords(batchKeywordExtractionRequest)

Extract keywords from multiple URLs using specified keyword sets and personas

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

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **streamExtractKeywords**
> BulkAnalyzeDomains200Response streamExtractKeywords()

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

**BulkAnalyzeDomains200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

