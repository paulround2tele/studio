# KeywordSetsApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**keywordSetsCreate**](#keywordsetscreate) | **POST** /keyword-sets | Create keyword set|
|[**keywordSetsDelete**](#keywordsetsdelete) | **DELETE** /keyword-sets/{setId} | Delete keyword set|
|[**keywordSetsGet**](#keywordsetsget) | **GET** /keyword-sets/{setId} | Get keyword set|
|[**keywordSetsList**](#keywordsetslist) | **GET** /keyword-sets | List keyword sets|
|[**keywordSetsRulesList**](#keywordsetsruleslist) | **GET** /keyword-sets/{setId}/rules | List rules for a keyword set|
|[**keywordSetsUpdate**](#keywordsetsupdate) | **PUT** /keyword-sets/{setId} | Update keyword set|

# **keywordSetsCreate**
> KeywordSetResponse keywordSetsCreate(createKeywordSetRequest)


### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    CreateKeywordSetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let createKeywordSetRequest: CreateKeywordSetRequest; //

const { status, data } = await apiInstance.keywordSetsCreate(
    createKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createKeywordSetRequest** | **CreateKeywordSetRequest**|  | |


### Return type

**KeywordSetResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsDelete**
> keywordSetsDelete()


### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; // (default to undefined)

const { status, data } = await apiInstance.keywordSetsDelete(
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

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | No Content |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsGet**
> KeywordSetResponse keywordSetsGet()


### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; // (default to undefined)

const { status, data } = await apiInstance.keywordSetsGet(
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

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsList**
> Array<KeywordSetResponse> keywordSetsList()


### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let limit: number; //Page size (items per page) (optional) (default to 50)
let offset: number; //Zero-based offset (optional) (default to 0)
let includeRules: boolean; //If true, include rules array in keyword-sets list items (optional) (default to undefined)
let isEnabled: boolean; //Filter by enabled state (optional) (default to undefined)

const { status, data } = await apiInstance.keywordSetsList(
    limit,
    offset,
    includeRules,
    isEnabled
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Page size (items per page) | (optional) defaults to 50|
| **offset** | [**number**] | Zero-based offset | (optional) defaults to 0|
| **includeRules** | [**boolean**] | If true, include rules array in keyword-sets list items | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter by enabled state | (optional) defaults to undefined|


### Return type

**Array<KeywordSetResponse>**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsRulesList**
> Array<KeywordRuleDTO> keywordSetsRulesList()


### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; // (default to undefined)

const { status, data } = await apiInstance.keywordSetsRulesList(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] |  | defaults to undefined|


### Return type

**Array<KeywordRuleDTO>**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsUpdate**
> KeywordSetResponse keywordSetsUpdate(updateKeywordSetRequest)


### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    UpdateKeywordSetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; // (default to undefined)
let updateKeywordSetRequest: UpdateKeywordSetRequest; //

const { status, data } = await apiInstance.keywordSetsUpdate(
    setId,
    updateKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateKeywordSetRequest** | **UpdateKeywordSetRequest**|  | |
| **setId** | [**string**] |  | defaults to undefined|


### Return type

**KeywordSetResponse**

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
|**404** | Not Found |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

