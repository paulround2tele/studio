# KeywordSetsApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2KeywordRulesGet**](#apiv2keywordrulesget) | **GET** /api/v2/keyword-rules | Query keyword rules with advanced filtering|
|[**apiV2KeywordSetsIdRulesGet**](#apiv2keywordsetsidrulesget) | **GET** /api/v2/keyword-sets/{id}/rules | Get keyword set with high-performance rules loading|
|[**keywordsSetsGet**](#keywordssetsget) | **GET** /keywords/sets | List keyword sets|
|[**keywordsSetsPost**](#keywordssetspost) | **POST** /keywords/sets | Create keyword set|
|[**keywordsSetsSetIdDelete**](#keywordssetssetiddelete) | **DELETE** /keywords/sets/{setId} | Delete keyword set|
|[**keywordsSetsSetIdGet**](#keywordssetssetidget) | **GET** /keywords/sets/{setId} | Get keyword set|
|[**keywordsSetsSetIdPut**](#keywordssetssetidput) | **PUT** /keywords/sets/{setId} | Update keyword set|

# **apiV2KeywordRulesGet**
> ApiAPIResponse apiV2KeywordRulesGet()

Advanced querying for keyword rule management across sets with multiple filter options

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let keywordSetId: string; //Filter by keyword set ID (optional) (default to undefined)
let ruleType: 'string' | 'regex'; //Filter by rule type (optional) (default to undefined)
let category: string; //Filter by category (optional) (default to undefined)
let isCaseSensitive: boolean; //Filter by case sensitivity (optional) (default to undefined)
let pattern: string; //Search pattern in rule patterns (partial match) (optional) (default to undefined)
let limit: number; //Maximum number of results (optional) (default to 50)
let offset: number; //Number of results to skip (optional) (default to 0)

const { status, data } = await apiInstance.apiV2KeywordRulesGet(
    keywordSetId,
    ruleType,
    category,
    isCaseSensitive,
    pattern,
    limit,
    offset
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **keywordSetId** | [**string**] | Filter by keyword set ID | (optional) defaults to undefined|
| **ruleType** | [**&#39;string&#39; | &#39;regex&#39;**]**Array<&#39;string&#39; &#124; &#39;regex&#39;>** | Filter by rule type | (optional) defaults to undefined|
| **category** | [**string**] | Filter by category | (optional) defaults to undefined|
| **isCaseSensitive** | [**boolean**] | Filter by case sensitivity | (optional) defaults to undefined|
| **pattern** | [**string**] | Search pattern in rule patterns (partial match) | (optional) defaults to undefined|
| **limit** | [**number**] | Maximum number of results | (optional) defaults to 50|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to 0|


### Return type

**ApiAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2KeywordSetsIdRulesGet**
> ApiAPIResponse apiV2KeywordSetsIdRulesGet()

Optimized endpoint for Phase 3 HTTP keyword validation scanning using JSONB rules column

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let id: string; //Keyword Set ID (default to undefined)

const { status, data } = await apiInstance.apiV2KeywordSetsIdRulesGet(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Keyword Set ID | defaults to undefined|


### Return type

**ApiAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordsSetsGet**
> Array<ApiKeywordSetResponse> keywordsSetsGet()

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

const { status, data } = await apiInstance.keywordsSetsGet(
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

# **keywordsSetsPost**
> ApiKeywordSetResponse keywordsSetsPost(apiCreateKeywordSetRequest)

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

const { status, data } = await apiInstance.keywordsSetsPost(
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

# **keywordsSetsSetIdDelete**
> ApiKeywordSetDeleteResponse keywordsSetsSetIdDelete()

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

const { status, data } = await apiInstance.keywordsSetsSetIdDelete(
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

# **keywordsSetsSetIdGet**
> ApiKeywordSetResponse keywordsSetsSetIdGet()

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

const { status, data } = await apiInstance.keywordsSetsSetIdGet(
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

# **keywordsSetsSetIdPut**
> ApiKeywordSetResponse keywordsSetsSetIdPut(apiUpdateKeywordSetRequest)

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

const { status, data } = await apiInstance.keywordsSetsSetIdPut(
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

