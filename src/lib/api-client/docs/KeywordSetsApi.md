# KeywordSetsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createKeywordSet**](#createkeywordset) | **POST** /keywords/sets | Create keyword set|
|[**deleteKeywordSet**](#deletekeywordset) | **DELETE** /keywords/sets/{setId} | Delete keyword set|
|[**getKeywordSet**](#getkeywordset) | **GET** /keywords/sets/{setId} | Get keyword set|
|[**listKeywordSets**](#listkeywordsets) | **GET** /keywords/sets | List keyword sets|
|[**updateKeywordSet**](#updatekeywordset) | **PUT** /keywords/sets/{setId} | Update keyword set|

# **createKeywordSet**
> KeywordSet createKeywordSet(createKeywordSetRequest)

Creates a new keyword set with optional rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    CreateKeywordSetRequest
} from 'api-client';

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

**KeywordSet**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Keyword set created successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**409** | Keyword set with name already exists |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteKeywordSet**
> deleteKeywordSet()

Deletes a keyword set by ID including all its rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from 'api-client';

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

void (empty response body)

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Keyword set deleted successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Keyword set not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getKeywordSet**
> KeywordSet getKeywordSet()

Gets a keyword set by ID including its rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from 'api-client';

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

**KeywordSet**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Keyword set retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Keyword set not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listKeywordSets**
> Array<KeywordSet> listKeywordSets()

Lists all keyword sets with optional filtering and pagination

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let limit: number; //Maximum number of keyword sets to return (optional) (default to 20)
let offset: number; //Number of keyword sets to skip for pagination (optional) (default to 0)
let isEnabled: boolean; //Filter keyword sets by enabled status (optional) (default to undefined)
let includeRules: boolean; //Include keyword rules in the response (optional) (default to false)

const { status, data } = await apiInstance.listKeywordSets(
    limit,
    offset,
    isEnabled,
    includeRules
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of keyword sets to return | (optional) defaults to 20|
| **offset** | [**number**] | Number of keyword sets to skip for pagination | (optional) defaults to 0|
| **isEnabled** | [**boolean**] | Filter keyword sets by enabled status | (optional) defaults to undefined|
| **includeRules** | [**boolean**] | Include keyword rules in the response | (optional) defaults to false|


### Return type

**Array<KeywordSet>**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Keyword sets retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateKeywordSet**
> KeywordSet updateKeywordSet(updateKeywordSetRequest)

Updates a keyword set by ID including its rules

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    UpdateKeywordSetRequest
} from 'api-client';

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

**KeywordSet**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Keyword set updated successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Keyword set not found |  -  |
|**409** | Keyword set name already exists |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

