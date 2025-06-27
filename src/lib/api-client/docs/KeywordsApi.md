# KeywordsApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2ExtractKeywordsPost**](#apiv2extractkeywordspost) | **POST** /api/v2/extract/keywords | Batch extract keywords|
|[**apiV2ExtractKeywordsStreamGet**](#apiv2extractkeywordsstreamget) | **GET** /api/v2/extract/keywords/stream | Stream extract keywords|
|[**apiV2KeywordsSetsGet**](#apiv2keywordssetsget) | **GET** /api/v2/keywords/sets | List keyword sets|
|[**apiV2KeywordsSetsPost**](#apiv2keywordssetspost) | **POST** /api/v2/keywords/sets | Create keyword set|
|[**apiV2KeywordsSetsSetIdDelete**](#apiv2keywordssetssetiddelete) | **DELETE** /api/v2/keywords/sets/{setId} | Delete keyword set|
|[**apiV2KeywordsSetsSetIdGet**](#apiv2keywordssetssetidget) | **GET** /api/v2/keywords/sets/{setId} | Get keyword set|
|[**apiV2KeywordsSetsSetIdPut**](#apiv2keywordssetssetidput) | **PUT** /api/v2/keywords/sets/{setId} | Update keyword set|

# **apiV2ExtractKeywordsPost**
> apiV2ExtractKeywordsPost(body)


### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2ExtractKeywordsPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Extraction results |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ExtractKeywordsStreamGet**
> apiV2ExtractKeywordsStreamGet()


### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

const { status, data } = await apiInstance.apiV2ExtractKeywordsStreamGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Stream started |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2KeywordsSetsGet**
> Array<KeywordSetResponse> apiV2KeywordsSetsGet()


### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

const { status, data } = await apiInstance.apiV2KeywordsSetsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<KeywordSetResponse>**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of sets |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2KeywordsSetsPost**
> KeywordSetResponse apiV2KeywordsSetsPost(body)


### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2KeywordsSetsPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**KeywordSetResponse**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2KeywordsSetsSetIdDelete**
> apiV2KeywordsSetsSetIdDelete()


### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

let setId: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2KeywordsSetsSetIdDelete(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2KeywordsSetsSetIdGet**
> KeywordSetResponse apiV2KeywordsSetsSetIdGet()


### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

let setId: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2KeywordsSetsSetIdGet(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] |  | defaults to undefined|


### Return type

**KeywordSetResponse**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Details |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2KeywordsSetsSetIdPut**
> KeywordSetResponse apiV2KeywordsSetsSetIdPut(body)


### Example

```typescript
import {
    KeywordsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordsApi(configuration);

let setId: string; // (default to undefined)
let body: object; //

const { status, data } = await apiInstance.apiV2KeywordsSetsSetIdPut(
    setId,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **setId** | [**string**] |  | defaults to undefined|


### Return type

**KeywordSetResponse**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

