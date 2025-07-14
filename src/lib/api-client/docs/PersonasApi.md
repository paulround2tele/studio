# PersonasApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createPersonaGin**](#createpersonagin) | **POST** /personas | Create persona|
|[**deletePersonaGin**](#deletepersonagin) | **DELETE** /personas/{id} | Delete persona|
|[**getDnsPersonaByIDGin**](#getdnspersonabyidgin) | **GET** /personas/dns/{id} | Get DNS persona by ID|
|[**getHttpPersonaByIDGin**](#gethttppersonabyidgin) | **GET** /personas/http/{id} | Get HTTP persona by ID|
|[**getPersonaByIDGin**](#getpersonabyidgin) | **GET** /personas/{id} | Get persona by ID|
|[**listAllPersonasGin**](#listallpersonasgin) | **GET** /personas | List all personas|
|[**testPersonaGin**](#testpersonagin) | **POST** /personas/{id}/test | Test persona|
|[**updatePersonaGin**](#updatepersonagin) | **PUT** /personas/{id} | Update persona|

# **createPersonaGin**
> ListCampaigns200Response createPersonaGin()

Create a new persona (DNS or HTTP) with configuration details

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

const { status, data } = await apiInstance.createPersonaGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ListCampaigns200Response**

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

# **deletePersonaGin**
> PersonaDeleteResponse deletePersonaGin()

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

const { status, data } = await apiInstance.deletePersonaGin(
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

# **getDnsPersonaByIDGin**
> PersonaResponse getDnsPersonaByIDGin()

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

const { status, data } = await apiInstance.getDnsPersonaByIDGin(
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

# **getHttpPersonaByIDGin**
> PersonaResponse getHttpPersonaByIDGin()

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

const { status, data } = await apiInstance.getHttpPersonaByIDGin(
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

# **getPersonaByIDGin**
> PersonaResponse getPersonaByIDGin()

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

const { status, data } = await apiInstance.getPersonaByIDGin(
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

# **listAllPersonasGin**
> ListCampaigns200Response listAllPersonasGin()

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

const { status, data } = await apiInstance.listAllPersonasGin(
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

**ListCampaigns200Response**

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

# **testPersonaGin**
> PersonaTestResponse testPersonaGin()

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

const { status, data } = await apiInstance.testPersonaGin(
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

# **updatePersonaGin**
> PersonaResponse updatePersonaGin()

Update an existing persona\'s configuration by ID

### Example

```typescript
import {
    PersonasApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PersonasApi(configuration);

let id: string; //Persona ID (UUID) (default to undefined)

const { status, data } = await apiInstance.updatePersonaGin(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Persona ID (UUID) | defaults to undefined|


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

