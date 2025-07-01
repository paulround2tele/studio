# KeywordSetsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**keywordsSetsGet**](#keywordssetsget) | **GET** /keywords/sets | List keyword sets|
|[**keywordsSetsPost**](#keywordssetspost) | **POST** /keywords/sets | Create keyword set|
|[**keywordsSetsSetIdDelete**](#keywordssetssetiddelete) | **DELETE** /keywords/sets/{setId} | Delete keyword set|
|[**keywordsSetsSetIdGet**](#keywordssetssetidget) | **GET** /keywords/sets/{setId} | Get keyword set|
|[**keywordsSetsSetIdPut**](#keywordssetssetidput) | **PUT** /keywords/sets/{setId} | Update keyword set|

# **keywordsSetsGet**
> Array<InternalApiKeywordSetResponse> keywordsSetsGet()

Lists all keyword sets

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let limit: number; //Limit (optional) (default to undefined)
let offset: number; //Offset (optional) (default to undefined)
let isEnabled: boolean; //Is enabled (optional) (default to undefined)

const { status, data } = await apiInstance.keywordsSetsGet(
    limit,
    offset,
    isEnabled
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Limit | (optional) defaults to undefined|
| **offset** | [**number**] | Offset | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Is enabled | (optional) defaults to undefined|


### Return type

**Array<InternalApiKeywordSetResponse>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordsSetsPost**
> InternalApiKeywordSetResponse keywordsSetsPost(internalApiCreateKeywordSetRequest)

Creates a new keyword set

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    InternalApiCreateKeywordSetRequest
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let internalApiCreateKeywordSetRequest: InternalApiCreateKeywordSetRequest; //Keyword set

const { status, data } = await apiInstance.keywordsSetsPost(
    internalApiCreateKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **internalApiCreateKeywordSetRequest** | **InternalApiCreateKeywordSetRequest**| Keyword set | |


### Return type

**InternalApiKeywordSetResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordsSetsSetIdDelete**
> { [key: string]: boolean; } keywordsSetsSetIdDelete()

Deletes a keyword set by ID

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Set ID (default to undefined)

const { status, data } = await apiInstance.keywordsSetsSetIdDelete(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] | Set ID | defaults to undefined|


### Return type

**{ [key: string]: boolean; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **keywordsSetsSetIdGet**
> InternalApiKeywordSetResponse keywordsSetsSetIdGet()

Gets a keyword set by ID

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Set ID (default to undefined)

const { status, data } = await apiInstance.keywordsSetsSetIdGet(
    setId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setId** | [**string**] | Set ID | defaults to undefined|


### Return type

**InternalApiKeywordSetResponse**

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

# **keywordsSetsSetIdPut**
> InternalApiKeywordSetResponse keywordsSetsSetIdPut(internalApiUpdateKeywordSetRequest)

Updates a keyword set by ID

### Example

```typescript
import {
    KeywordSetsApi,
    Configuration,
    InternalApiUpdateKeywordSetRequest
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new KeywordSetsApi(configuration);

let setId: string; //Set ID (default to undefined)
let internalApiUpdateKeywordSetRequest: InternalApiUpdateKeywordSetRequest; //Keyword set

const { status, data } = await apiInstance.keywordsSetsSetIdPut(
    setId,
    internalApiUpdateKeywordSetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **internalApiUpdateKeywordSetRequest** | **InternalApiUpdateKeywordSetRequest**| Keyword set | |
| **setId** | [**string**] | Set ID | defaults to undefined|


### Return type

**InternalApiKeywordSetResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

