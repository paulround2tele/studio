# PersonasApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**personasDnsIdGet**](#personasdnsidget) | **GET** /personas/dns/{id} | Get DNS persona by ID|
|[**personasGet**](#personasget) | **GET** /personas | List all personas|
|[**personasHttpIdGet**](#personashttpidget) | **GET** /personas/http/{id} | Get HTTP persona by ID|
|[**personasIdDelete**](#personasiddelete) | **DELETE** /personas/{id} | Delete persona|
|[**personasIdGet**](#personasidget) | **GET** /personas/{id} | Get persona by ID|
|[**personasIdPut**](#personasidput) | **PUT** /personas/{id} | Update persona|
|[**personasIdTestPost**](#personasidtestpost) | **POST** /personas/{id}/test | Test persona|
|[**personasPost**](#personaspost) | **POST** /personas | Create persona|

# **personasDnsIdGet**
> ApiPersonaResponse personasDnsIdGet()

Retrieve a specific DNS persona configuration by its unique identifier

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //DNS Persona ID (default to undefined)
let body: object; // (optional)

const { status, data } = await apiInstance.personasDnsIdGet(
    id,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **id** | [**string**] | DNS Persona ID | defaults to undefined|


### Return type

**ApiPersonaResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS persona retrieved successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Persona Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasGet**
> Array<ApiPersonaResponse> personasGet()

Retrieve a list of all personas with optional filtering by type and status

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let limit: number; //Maximum number of results (optional) (default to 20)
let offset: number; //Number of results to skip (optional) (default to 0)
let isEnabled: boolean; //Filter by enabled status (optional) (default to undefined)
let personaType: string; //Filter by persona type (dns, http) (optional) (default to undefined)

const { status, data } = await apiInstance.personasGet(
    limit,
    offset,
    isEnabled,
    personaType
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of results | (optional) defaults to 20|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to 0|
| **isEnabled** | [**boolean**] | Filter by enabled status | (optional) defaults to undefined|
| **personaType** | [**string**] | Filter by persona type (dns, http) | (optional) defaults to undefined|


### Return type

**Array<ApiPersonaResponse>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of personas |  -  |
|**400** | Invalid personaType parameter |  -  |
|**500** | Failed to list personas |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasHttpIdGet**
> ApiPersonaResponse personasHttpIdGet()

Retrieve a specific HTTP persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //HTTP Persona ID (default to undefined)

const { status, data } = await apiInstance.personasHttpIdGet(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | HTTP Persona ID | defaults to undefined|


### Return type

**ApiPersonaResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP persona details |  -  |
|**400** | Invalid persona ID format or not HTTP persona |  -  |
|**404** | HTTP persona not found |  -  |
|**500** | Failed to fetch HTTP persona |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasIdDelete**
> ApiPersonaDeleteResponse personasIdDelete()

Delete a persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (UUID) (default to undefined)

const { status, data } = await apiInstance.personasIdDelete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID (UUID) | defaults to undefined|


### Return type

**ApiPersonaDeleteResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona deleted successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasIdGet**
> ApiPersonaResponse personasIdGet()

Retrieve a specific persona by ID regardless of type

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.personasIdGet(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**ApiPersonaResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona details |  -  |
|**400** | Invalid persona ID format |  -  |
|**404** | Persona not found |  -  |
|**500** | Failed to fetch persona |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasIdPut**
> ApiPersonaResponse personasIdPut(apiUpdatePersonaRequest)

Update an existing persona\'s configuration by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration,
    ApiUpdatePersonaRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (UUID) (default to undefined)
let apiUpdatePersonaRequest: ApiUpdatePersonaRequest; //Persona update request

const { status, data } = await apiInstance.personasIdPut(
    id,
    apiUpdatePersonaRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiUpdatePersonaRequest** | **ApiUpdatePersonaRequest**| Persona update request | |
| **id** | [**string**] | Persona ID (UUID) | defaults to undefined|


### Return type

**ApiPersonaResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona updated successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasIdTestPost**
> ApiPersonaTestResponse personasIdTestPost()

Test a persona configuration to verify it works correctly

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (UUID) (default to undefined)

const { status, data } = await apiInstance.personasIdTestPost(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID (UUID) | defaults to undefined|


### Return type

**ApiPersonaTestResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona test results |  -  |
|**400** | Bad Request |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **personasPost**
> ApiPersonaResponse personasPost(apiCreatePersonaRequest)

Create a new persona (DNS or HTTP) with configuration details

### Example

```typescript
import {
    PersonasApi,
    Configuration,
    ApiCreatePersonaRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let apiCreatePersonaRequest: ApiCreatePersonaRequest; //Persona creation request

const { status, data } = await apiInstance.personasPost(
    apiCreatePersonaRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiCreatePersonaRequest** | **ApiCreatePersonaRequest**| Persona creation request | |


### Return type

**ApiPersonaResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created persona |  -  |
|**400** | Invalid request payload or configuration |  -  |
|**409** | Persona with name and type already exists |  -  |
|**500** | Failed to create persona |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

