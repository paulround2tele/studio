# KeywordSetsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createKeywordSet**](#createkeywordset) | **POST** /keyword-sets | Create keyword set|
|[**deleteKeywordSet**](#deletekeywordset) | **DELETE** /keyword-sets/{setId} | Delete keyword set|
|[**getKeywordSet**](#getkeywordset) | **GET** /keyword-sets/{setId} | Get keyword set|
|[**listKeywordSets**](#listkeywordsets) | **GET** /keyword-sets | List keyword sets|
|[**updateKeywordSet**](#updatekeywordset) | **PUT** /keyword-sets/{setId} | Update keyword set|

# **createKeywordSet**
> StreamExtractKeywords200Response createKeywordSet(createKeywordSetRequest)

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

**StreamExtractKeywords200Response**

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

# **listKeywordSets**
> StreamExtractKeywords200Response listKeywordSets()

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

**StreamExtractKeywords200Response**

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

