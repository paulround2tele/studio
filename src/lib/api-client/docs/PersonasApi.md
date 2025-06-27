# PersonasApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2PersonasGet**](#apiv2personasget) | **GET** /api/v2/personas | List personas|
|[**apiV2PersonasIdDelete**](#apiv2personasiddelete) | **DELETE** /api/v2/personas/{id} | Delete persona|
|[**apiV2PersonasIdGet**](#apiv2personasidget) | **GET** /api/v2/personas/{id} | Get persona|
|[**apiV2PersonasIdPut**](#apiv2personasidput) | **PUT** /api/v2/personas/{id} | Update persona|
|[**apiV2PersonasPost**](#apiv2personaspost) | **POST** /api/v2/personas | Create persona|
|[**testPersona**](#testpersona) | **POST** /api/v2/personas/{id} | Test persona|

# **apiV2PersonasGet**
> Array<PersonaResponse> apiV2PersonasGet()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

const { status, data } = await apiInstance.apiV2PersonasGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<PersonaResponse>**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of personas |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2PersonasIdDelete**
> apiV2PersonasIdDelete()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2PersonasIdDelete(
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

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2PersonasIdGet**
> PersonaResponse apiV2PersonasIdGet()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2PersonasIdGet(
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

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona details |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2PersonasIdPut**
> PersonaResponse apiV2PersonasIdPut(body)


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)
let body: object; //

const { status, data } = await apiInstance.apiV2PersonasIdPut(
    id,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **id** | [**string**] |  | defaults to undefined|


### Return type

**PersonaResponse**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2PersonasPost**
> PersonaResponse apiV2PersonasPost(body)


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2PersonasPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**PersonaResponse**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Persona created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **testPersona**
> testPersona()


### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.testPersona(
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

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Test results |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

