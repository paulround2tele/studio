# KeywordSetsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createKeywordSet**](#createkeywordset) | **POST** /keywords/sets | Create keyword set|
|[**deleteKeywordSet**](#deletekeywordset) | **DELETE** /keywords/sets/{setId} | Delete keyword set|
|[**getKeywordSet**](#getkeywordset) | **GET** /keywords/sets/{setId} | Get keyword set|
|[**getKeywordSetWithRules**](#getkeywordsetwithrules) | **GET** /api/v2/keyword-sets/{id}/rules | Get keyword set with high-performance rules loading|
|[**listKeywordSets**](#listkeywordsets) | **GET** /keywords/sets | List keyword sets|
|[**queryKeywordRules**](#querykeywordrules) | **GET** /api/v2/keyword-rules | Query keyword rules with advanced filtering|
|[**updateKeywordSet**](#updatekeywordset) | **PUT** /keywords/sets/{setId} | Update keyword set|

# **createKeywordSet**
> CreateLeadGenerationCampaign200Response createKeywordSet(createKeywordSetRequest)

Create a new keyword set with optional rules

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

const { status, data } = await apiInstance.createKeywordSet(
    createKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createKeywordSetRequest** | **CreateKeywordSetRequest**|  | |


### Return type

**CreateLeadGenerationCampaign200Response**

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

# **deleteKeywordSet**
> KeywordSetDeleteResponse deleteKeywordSet()

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

const { status, data } = await apiInstance.deleteKeywordSet(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] | Keyword Set ID (UUID) | defaults to undefined|


### Return type

**KeywordSetDeleteResponse**

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

# **getKeywordSet**
> KeywordSetResponse getKeywordSet()

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

**KeywordSetResponse**

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

# **getKeywordSetWithRules**
> APIResponse getKeywordSetWithRules()

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

const { status, data } = await apiInstance.getKeywordSetWithRules(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Keyword Set ID | defaults to undefined|


### Return type

**APIResponse**

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

# **listKeywordSets**
> CreateLeadGenerationCampaign200Response listKeywordSets()

Retrieve a list of keyword sets with optional filtering

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let limit: number; //Maximum number of results (optional) (default to undefined)
let offset: number; //Number of results to skip (optional) (default to undefined)
let includeRules: boolean; //Include rules in response (optional) (default to undefined)
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
| **limit** | [**number**] | Maximum number of results | (optional) defaults to undefined|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to undefined|
| **includeRules** | [**boolean**] | Include rules in response | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter by enabled status | (optional) defaults to undefined|


### Return type

**CreateLeadGenerationCampaign200Response**

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

# **queryKeywordRules**
> APIResponse queryKeywordRules()

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
let ruleType: string; //Filter by rule type (optional) (default to undefined)
let category: string; //Filter by category (optional) (default to undefined)
let isCaseSensitive: boolean; //Filter by case sensitivity (optional) (default to undefined)
let pattern: string; //Search pattern in rule patterns (partial match) (optional) (default to undefined)
let limit: number; //Maximum number of results (optional) (default to undefined)
let offset: number; //Number of results to skip (optional) (default to undefined)

const { status, data } = await apiInstance.queryKeywordRules(
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
| **ruleType** | [**string**] | Filter by rule type | (optional) defaults to undefined|
| **category** | [**string**] | Filter by category | (optional) defaults to undefined|
| **isCaseSensitive** | [**boolean**] | Filter by case sensitivity | (optional) defaults to undefined|
| **pattern** | [**string**] | Search pattern in rule patterns (partial match) | (optional) defaults to undefined|
| **limit** | [**number**] | Maximum number of results | (optional) defaults to undefined|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to undefined|


### Return type

**APIResponse**

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

# **updateKeywordSet**
> KeywordSetResponse updateKeywordSet(updateKeywordSetRequest)

Update an existing keyword set and its rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    UpdateKeywordSetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Keyword set ID (default to undefined)
let updateKeywordSetRequest: UpdateKeywordSetRequest; //

const { status, data } = await apiInstance.updateKeywordSet(
    setId,
    updateKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateKeywordSetRequest** | **UpdateKeywordSetRequest**|  | |
| **setId** | [**string**] | Keyword set ID | defaults to undefined|


### Return type

**KeywordSetResponse**

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

