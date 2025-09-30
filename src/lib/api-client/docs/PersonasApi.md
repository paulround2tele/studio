# PersonasApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**personasCreate**](#personascreate) | **POST** /personas | Create persona|
|[**personasDelete**](#personasdelete) | **DELETE** /personas/{id} | Delete persona|
|[**personasGet**](#personasget) | **GET** /personas/{id} | Get persona by ID|
|[**personasGetDns**](#personasgetdns) | **GET** /personas/dns/{id} | Get DNS persona by ID|
|[**personasGetHttp**](#personasgethttp) | **GET** /personas/http/{id} | Get HTTP persona by ID|
|[**personasList**](#personaslist) | **GET** /personas | List personas|
|[**personasTest**](#personastest) | **POST** /personas/{id}/test | Test persona|
|[**personasUpdate**](#personasupdate) | **PUT** /personas/{id} | Update persona|

# **personasCreate**
> PersonaResponse personasCreate(createPersonaRequest)


### Example

```typescript
import {
    PersonasApi,
    Configuration,
    CreatePersonaRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let createPersonaRequest: CreatePersonaRequest; //

const { status, data } = await apiInstance.personasCreate(
    createPersonaRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createPersonaRequest** | **CreatePersonaRequest**|  | |


### Return type

**PersonaResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created persona |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasDelete**
> personasDelete()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.personasDelete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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
|**204** | Deleted |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**409** | Conflict |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasGet**
> PersonaResponse personasGet()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.personasGet(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**PersonaResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasGetDns**
> PersonaResponse personasGetDns()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.personasGetDns(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**PersonaResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasGetHttp**
> PersonaResponse personasGetHttp()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.personasGetHttp(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**PersonaResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasList**
> Array<PersonaResponse> personasList()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let limit: number; //Page size (items per page) (optional) (default to 50)
let offset: number; //Zero-based offset (optional) (default to 0)
let isEnabled: boolean; //Filter by enabled state (optional) (default to undefined)
let personaType: PersonaType; //Filter by persona type (optional) (default to undefined)

const { status, data } = await apiInstance.personasList(
    limit,
    offset,
    isEnabled,
    personaType
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Page size (items per page) | (optional) defaults to 50|
| **offset** | [**number**] | Zero-based offset | (optional) defaults to 0|
| **isEnabled** | [**boolean**] | Filter by enabled state | (optional) defaults to undefined|
| **personaType** | **PersonaType** | Filter by persona type | (optional) defaults to undefined|


### Return type

**Array<PersonaResponse>**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of personas |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasTest**
> PersonaTestResponse personasTest()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.personasTest(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**PersonaTestResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Test result |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasUpdate**
> PersonaResponse personasUpdate(updatePersonaRequest)


### Example

```typescript
import {
    PersonasApi,
    Configuration,
    UpdatePersonaRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)
let updatePersonaRequest: UpdatePersonaRequest; //

const { status, data } = await apiInstance.personasUpdate(
    id,
    updatePersonaRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updatePersonaRequest** | **UpdatePersonaRequest**|  | |
| **id** | [**string**] |  | defaults to undefined|


### Return type

**PersonaResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated persona |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

