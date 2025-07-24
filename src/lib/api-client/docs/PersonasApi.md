# PersonasApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createPersona**](#createpersona) | **POST** /personas | Create persona|
|[**deletePersona**](#deletepersona) | **DELETE** /personas/{id} | Delete persona|
|[**getDnsPersonaByID**](#getdnspersonabyid) | **GET** /personas/dns/{id} | Get DNS persona by ID|
|[**getHttpPersonaByID**](#gethttppersonabyid) | **GET** /personas/http/{id} | Get HTTP persona by ID|
|[**getPersonaByID**](#getpersonabyid) | **GET** /personas/{id} | Get persona by ID|
|[**listAllPersonas**](#listallpersonas) | **GET** /personas | List all personas|
|[**testPersona**](#testpersona) | **POST** /personas/{id}/test | Test persona|
|[**updatePersona**](#updatepersona) | **PUT** /personas/{id} | Update persona|

# **createPersona**
> CreateLeadGenerationCampaign200Response createPersona(createPersonaRequest)

Create a new persona (DNS or HTTP) with configuration details

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

const { status, data } = await apiInstance.createPersona(
    createPersonaRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createPersonaRequest** | **CreatePersonaRequest**|  | |


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

# **deletePersona**
> PersonaDeleteResponse deletePersona()

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

const { status, data } = await apiInstance.deletePersona(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID (UUID) | defaults to undefined|


### Return type

**PersonaDeleteResponse**

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

# **getDnsPersonaByID**
> PersonaResponse getDnsPersonaByID()

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

const { status, data } = await apiInstance.getDnsPersonaByID(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | DNS Persona ID | defaults to undefined|


### Return type

**PersonaResponse**

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

# **getHttpPersonaByID**
> PersonaResponse getHttpPersonaByID()

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

const { status, data } = await apiInstance.getHttpPersonaByID(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | HTTP Persona ID | defaults to undefined|


### Return type

**PersonaResponse**

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

# **getPersonaByID**
> PersonaResponse getPersonaByID()

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

const { status, data } = await apiInstance.getPersonaByID(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID | defaults to undefined|


### Return type

**PersonaResponse**

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

# **listAllPersonas**
> CreateLeadGenerationCampaign200Response listAllPersonas()

Retrieve a list of all personas with optional filtering by type and status

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let limit: number; //Maximum number of results (optional) (default to undefined)
let offset: number; //Number of results to skip (optional) (default to undefined)
let isEnabled: boolean; //Filter by enabled status (optional) (default to undefined)
let personaType: string; //Filter by persona type (dns, http) (optional) (default to undefined)

const { status, data } = await apiInstance.listAllPersonas(
    limit,
    offset,
    isEnabled,
    personaType
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of results | (optional) defaults to undefined|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter by enabled status | (optional) defaults to undefined|
| **personaType** | [**string**] | Filter by persona type (dns, http) | (optional) defaults to undefined|


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

# **testPersona**
> PersonaTestResponse testPersona()

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

const { status, data } = await apiInstance.testPersona(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID (UUID) | defaults to undefined|


### Return type

**PersonaTestResponse**

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

# **updatePersona**
> PersonaResponse updatePersona(updatePersonaRequest)

Update an existing persona\'s configuration by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration,
    UpdatePersonaRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (UUID) (default to undefined)
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
| **id** | [**string**] | Persona ID (UUID) | defaults to undefined|


### Return type

**PersonaResponse**

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

