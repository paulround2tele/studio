# PersonasApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createPersona**](#createpersona) | **POST** /personas | Create persona|
|[**deletePersona**](#deletepersona) | **DELETE** /personas/{id} | Delete persona|
|[**getDnsPersonaById**](#getdnspersonabyid) | **GET** /personas/dns/{id} | Get DNS persona by ID|
|[**getHttpPersonaById**](#gethttppersonabyid) | **GET** /personas/http/{id} | Get HTTP persona by ID|
|[**getPersonaById**](#getpersonabyid) | **GET** /personas/{id} | Get persona by ID|
|[**listPersonas**](#listpersonas) | **GET** /personas | List personas|
|[**testPersona**](#testpersona) | **POST** /personas/{id}/test | Test persona|
|[**updatePersona**](#updatepersona) | **PUT** /personas/{id} | Update persona|

# **createPersona**
> Persona createPersona(createPersonaRequest)

Creates a new persona with structured configuration

### Example

```typescript
import {
    PersonasApi,
    Configuration,
    CreatePersonaRequest
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let createPersonaRequest: CreatePersonaRequest; //

const { status, data } = await apiInstance.createPersona(
    createPersonaRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createPersonaRequest** | **CreatePersonaRequest**|  | |


### Return type

**Persona**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Persona created successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**409** | Persona with name and type already exists |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deletePersona**
> StandardAPIResponse deletePersona()

Deletes a persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.deletePersona(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**StandardAPIResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona deleted successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDnsPersonaById**
> Persona getDnsPersonaById()

Gets a DNS persona by ID with typed configuration

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.getDnsPersonaById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**Persona**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS persona retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHttpPersonaById**
> Persona getHttpPersonaById()

Gets an HTTP persona by ID with typed configuration

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.getHttpPersonaById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**Persona**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP persona retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPersonaById**
> Persona getPersonaById()

Gets a persona by ID regardless of type

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.getPersonaById(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**Persona**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listPersonas**
> PersonaListResponse listPersonas()

Lists all personas with optional filtering by type and enabled status

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let limit: number; //Maximum number of personas to return (optional) (default to 20)
let offset: number; //Number of personas to skip for pagination (optional) (default to 0)
let personaType: 'dns' | 'http'; //Filter personas by type (optional) (default to undefined)
let isEnabled: boolean; //Filter personas by enabled status (optional) (default to undefined)

const { status, data } = await apiInstance.listPersonas(
    limit,
    offset,
    personaType,
    isEnabled
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of personas to return | (optional) defaults to 20|
| **offset** | [**number**] | Number of personas to skip for pagination | (optional) defaults to 0|
| **personaType** | [**&#39;dns&#39; | &#39;http&#39;**]**Array<&#39;dns&#39; &#124; &#39;http&#39;>** | Filter personas by type | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter personas by enabled status | (optional) defaults to undefined|


### Return type

**PersonaListResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Personas retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **testPersona**
> PersonaTestResult testPersona()

Tests a persona by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)

const { status, data } = await apiInstance.testPersona(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**PersonaTestResult**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona test completed successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updatePersona**
> Persona updatePersona(updatePersonaRequest)

Updates a persona by ID with structured configuration

### Example

```typescript
import {
    PersonasApi,
    Configuration,
    UpdatePersonaRequest
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (default to undefined)
let updatePersonaRequest: UpdatePersonaRequest; //

const { status, data } = await apiInstance.updatePersona(
    id,
    updatePersonaRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updatePersonaRequest** | **UpdatePersonaRequest**|  | |
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**Persona**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Persona updated successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Persona not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

