# KeywordSetsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**keywordSetsGet**](#keywordsetsget) | **GET** /keyword-sets | List keyword sets|
|[**keywordSetsPost**](#keywordsetspost) | **POST** /keyword-sets | Create keyword set|
|[**keywordSetsSetIdDelete**](#keywordsetssetiddelete) | **DELETE** /keyword-sets/{setId} | Delete keyword set|
|[**keywordSetsSetIdGet**](#keywordsetssetidget) | **GET** /keyword-sets/{setId} | Get keyword set|
|[**keywordSetsSetIdPut**](#keywordsetssetidput) | **PUT** /keyword-sets/{setId} | Update keyword set|

# **keywordSetsGet**
> Array<ApiKeywordSetResponse> keywordSetsGet()

Retrieve a list of keyword sets with optional filtering

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let limit: number; //Maximum number of results (optional) (default to 20)
let offset: number; //Number of results to skip (optional) (default to 0)
let includeRules: boolean; //Include rules in response (optional) (default to false)
let isEnabled: boolean; //Filter by enabled status (optional) (default to undefined)

const { status, data } = await apiInstance.keywordSetsGet(
    limit,
    offset,
    includeRules,
    isEnabled
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of results | (optional) defaults to 20|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to 0|
| **includeRules** | [**boolean**] | Include rules in response | (optional) defaults to false|
| **isEnabled** | [**boolean**] | Filter by enabled status | (optional) defaults to undefined|


### Return type

**Array<ApiKeywordSetResponse>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of keyword sets |  -  |
|**500** | Failed to list keyword sets |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsPost**
> ApiKeywordSetResponse keywordSetsPost(apiCreateKeywordSetRequest)

Create a new keyword set with optional rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    ApiCreateKeywordSetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let apiCreateKeywordSetRequest: ApiCreateKeywordSetRequest; //Keyword set creation request

const { status, data } = await apiInstance.keywordSetsPost(
    apiCreateKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiCreateKeywordSetRequest** | **ApiCreateKeywordSetRequest**| Keyword set creation request | |


### Return type

**ApiKeywordSetResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created keyword set |  -  |
|**400** | Invalid request payload or validation failed |  -  |
|**409** | Keyword set with name already exists |  -  |
|**500** | Failed to create keyword set |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsSetIdDelete**
> ApiKeywordSetDeleteResponse keywordSetsSetIdDelete()

Delete a keyword set by ID

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Keyword Set ID (UUID) (default to undefined)

const { status, data } = await apiInstance.keywordSetsSetIdDelete(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] | Keyword Set ID (UUID) | defaults to undefined|


### Return type

**ApiKeywordSetDeleteResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Keyword set deleted successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Keyword set not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsSetIdGet**
> ApiKeywordSetResponse keywordSetsSetIdGet()

Retrieve a specific keyword set by ID including its rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Keyword set ID (default to undefined)

const { status, data } = await apiInstance.keywordSetsSetIdGet(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] | Keyword set ID | defaults to undefined|


### Return type

**ApiKeywordSetResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Keyword set with rules |  -  |
|**400** | Invalid keyword set ID format |  -  |
|**404** | Keyword set not found |  -  |
|**500** | Failed to fetch keyword set |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordSetsSetIdPut**
> ApiKeywordSetResponse keywordSetsSetIdPut(apiUpdateKeywordSetRequest)

Update an existing keyword set and its rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    ApiUpdateKeywordSetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Keyword set ID (default to undefined)
let apiUpdateKeywordSetRequest: ApiUpdateKeywordSetRequest; //Keyword set update request

const { status, data } = await apiInstance.keywordSetsSetIdPut(
    setId,
    apiUpdateKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiUpdateKeywordSetRequest** | **ApiUpdateKeywordSetRequest**| Keyword set update request | |
| **setId** | [**string**] | Keyword set ID | defaults to undefined|


### Return type

**ApiKeywordSetResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated keyword set |  -  |
|**400** | Invalid request payload or validation failed |  -  |
|**404** | Keyword set not found |  -  |
|**409** | Keyword set name already exists |  -  |
|**500** | Failed to update keyword set |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

