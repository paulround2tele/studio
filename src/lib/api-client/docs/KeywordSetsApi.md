# KeywordSetsApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createKeywordSet**](#createkeywordset) | **POST** /keywords/sets | Create keyword set|
|[**deleteKeywordSet**](#deletekeywordset) | **DELETE** /keywords/sets/{setId} | Delete keyword set|
|[**getKeywordSet**](#getkeywordset) | **GET** /keywords/sets/{setId} | Get keyword set|
|[**getKeywordSetRules**](#getkeywordsetrules) | **GET** /keyword-sets/{id}/rules | Get keyword set with high-performance rules loading|
|[**listKeywordRules**](#listkeywordrules) | **GET** /keyword-rules | Query keyword rules with advanced filtering|
|[**listKeywordSets**](#listkeywordsets) | **GET** /keywords/sets | List keyword sets|
|[**updateKeywordSet**](#updatekeywordset) | **PUT** /keywords/sets/{setId} | Update keyword set|

# **createKeywordSet**
> BulkValidateDNS200Response createKeywordSet(apiCreateKeywordSetRequest)

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

const { status, data } = await apiInstance.createKeywordSet(
    apiCreateKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiCreateKeywordSetRequest** | **ApiCreateKeywordSetRequest**| Keyword set creation request | |


### Return type

**BulkValidateDNS200Response**

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

# **deleteKeywordSet**
> BulkValidateDNS200Response deleteKeywordSet()

Delete a keyword set by ID

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Keyword set ID (default to undefined)

const { status, data } = await apiInstance.deleteKeywordSet(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] | Keyword set ID | defaults to undefined|


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Keyword set deleted |  -  |
|**400** | Invalid keyword set ID format |  -  |
|**404** | Keyword set not found |  -  |
|**500** | Failed to delete keyword set |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getKeywordSet**
> BulkValidateDNS200Response getKeywordSet()

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

const { status, data } = await apiInstance.getKeywordSet(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] | Keyword set ID | defaults to undefined|


### Return type

**BulkValidateDNS200Response**

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

# **getKeywordSetRules**
> ApiAPIResponse getKeywordSetRules()

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

const { status, data } = await apiInstance.getKeywordSetRules(
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
|**200** | Keyword set rules |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listKeywordRules**
> ApiAPIResponse listKeywordRules()

Advanced querying for keyword rule management across sets with multiple filter options

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let limit: number; //Page size (optional) (default to 50)
let offset: number; //Offset (optional) (default to 0)
let setId: string; //Filter by set ID (optional) (default to undefined)
let pattern: string; //Filter by pattern contains (optional) (default to undefined)

const { status, data } = await apiInstance.listKeywordRules(
    limit,
    offset,
    setId,
    pattern
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Page size | (optional) defaults to 50|
| **offset** | [**number**] | Offset | (optional) defaults to 0|
| **setId** | [**string**] | Filter by set ID | (optional) defaults to undefined|
| **pattern** | [**string**] | Filter by pattern contains | (optional) defaults to undefined|


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
|**200** | Rules list |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listKeywordSets**
> BulkValidateDNS200Response listKeywordSets()

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

const { status, data } = await apiInstance.listKeywordSets(
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

**BulkValidateDNS200Response**

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

# **updateKeywordSet**
> BulkValidateDNS200Response updateKeywordSet(apiUpdateKeywordSetRequest)

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

const { status, data } = await apiInstance.updateKeywordSet(
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

**BulkValidateDNS200Response**

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

