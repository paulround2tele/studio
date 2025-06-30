# PersonasApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**personasGet**](#personasget) | **GET** /personas | List all personas|
|[**personasIdDelete**](#personasiddelete) | **DELETE** /personas/{id} | Delete persona|
|[**personasIdGet**](#personasidget) | **GET** /personas/{id} | Get persona|
|[**personasIdPut**](#personasidput) | **PUT** /personas/{id} | Update persona|
|[**personasIdTestPost**](#personasidtestpost) | **POST** /personas/{id}/test | Test persona|
|[**personasPost**](#personaspost) | **POST** /personas | Create persona|

# **personasGet**
> Array<GithubComFntelecomllcStudioBackendInternalModelsPersona> personasGet()

Lists all personas

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

const { status, data } = await apiInstance.personasGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<GithubComFntelecomllcStudioBackendInternalModelsPersona>**

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

# **personasIdDelete**
> { [key: string]: boolean; } personasIdDelete()

Deletes a persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.personasIdDelete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


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

# **personasIdGet**
> GithubComFntelecomllcStudioBackendInternalModelsPersona personasIdGet()

Gets a persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

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

**GithubComFntelecomllcStudioBackendInternalModelsPersona**

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

# **personasIdPut**
> GithubComFntelecomllcStudioBackendInternalModelsPersona personasIdPut(githubComFntelecomllcStudioBackendInternalModelsPersona)

Updates a persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsPersona
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)
let githubComFntelecomllcStudioBackendInternalModelsPersona: GithubComFntelecomllcStudioBackendInternalModelsPersona; //Persona

const { status, data } = await apiInstance.personasIdPut(
    id,
    githubComFntelecomllcStudioBackendInternalModelsPersona
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsPersona** | **GithubComFntelecomllcStudioBackendInternalModelsPersona**| Persona | |
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsPersona**

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

# **personasIdTestPost**
> { [key: string]: any; } personasIdTestPost()

Tests a persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.personasIdTestPost(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**{ [key: string]: any; }**

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

# **personasPost**
> GithubComFntelecomllcStudioBackendInternalModelsPersona personasPost(githubComFntelecomllcStudioBackendInternalModelsPersona)

Creates a new persona

### Example

```typescript
import {
    PersonasApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsPersona
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsPersona: GithubComFntelecomllcStudioBackendInternalModelsPersona; //Persona

const { status, data } = await apiInstance.personasPost(
    githubComFntelecomllcStudioBackendInternalModelsPersona
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsPersona** | **GithubComFntelecomllcStudioBackendInternalModelsPersona**| Persona | |


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsPersona**

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

