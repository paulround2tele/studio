# ProxiesApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**proxiesBulkDeleteDelete**](#proxiesbulkdeletedelete) | **DELETE** /proxies/bulk/delete | Bulk delete proxies|
|[**proxiesBulkTestPost**](#proxiesbulktestpost) | **POST** /proxies/bulk/test | Bulk test proxies|
|[**proxiesBulkUpdatePut**](#proxiesbulkupdateput) | **PUT** /proxies/bulk/update | Bulk update proxies|
|[**proxiesGet**](#proxiesget) | **GET** /proxies | List proxies|
|[**proxiesHealthCheckPost**](#proxieshealthcheckpost) | **POST** /proxies/health-check | Force health check on all proxies|
|[**proxiesPost**](#proxiespost) | **POST** /proxies | Create proxy|
|[**proxiesProxyIdDelete**](#proxiesproxyiddelete) | **DELETE** /proxies/{proxyId} | Delete proxy|
|[**proxiesProxyIdHealthCheckPost**](#proxiesproxyidhealthcheckpost) | **POST** /proxies/{proxyId}/health-check | Force proxy health check|
|[**proxiesProxyIdPut**](#proxiesproxyidput) | **PUT** /proxies/{proxyId} | Update proxy|
|[**proxiesProxyIdTestPost**](#proxiesproxyidtestpost) | **POST** /proxies/{proxyId}/test | Test proxy|
|[**proxiesStatusGet**](#proxiesstatusget) | **GET** /proxies/status | Get proxy statuses|

# **proxiesBulkDeleteDelete**
> GithubComFntelecomllcStudioBackendInternalModelsBulkProxyOperationResponse proxiesBulkDeleteDelete(githubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest)

Delete multiple proxy configurations simultaneously

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest: GithubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest; //Bulk proxy delete request

const { status, data } = await apiInstance.proxiesBulkDeleteDelete(
    githubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest** | **GithubComFntelecomllcStudioBackendInternalModelsBulkDeleteProxiesRequest**| Bulk proxy delete request | |


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsBulkProxyOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk operation results |  -  |
|**400** | Invalid request payload or validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesBulkTestPost**
> ApiBulkProxyTestResponse proxiesBulkTestPost(githubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest)

Test multiple proxy configurations simultaneously

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest: GithubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest; //Bulk proxy test request

const { status, data } = await apiInstance.proxiesBulkTestPost(
    githubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest** | **GithubComFntelecomllcStudioBackendInternalModelsBulkTestProxiesRequest**| Bulk proxy test request | |


### Return type

**ApiBulkProxyTestResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk test results |  -  |
|**400** | Invalid request payload or validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesBulkUpdatePut**
> GithubComFntelecomllcStudioBackendInternalModelsBulkProxyOperationResponse proxiesBulkUpdatePut(githubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest)

Update multiple proxy configurations simultaneously

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest: GithubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest; //Bulk proxy update request

const { status, data } = await apiInstance.proxiesBulkUpdatePut(
    githubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest** | **GithubComFntelecomllcStudioBackendInternalModelsBulkUpdateProxiesRequest**| Bulk proxy update request | |


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsBulkProxyOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk operation results |  -  |
|**400** | Invalid request payload or validation failed |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesGet**
> Array<GithubComFntelecomllcStudioBackendInternalModelsProxy> proxiesGet()

Retrieve a list of proxies with optional filtering by protocol, status, and health

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let limit: number; //Maximum number of results (optional) (default to 100)
let offset: number; //Number of results to skip (optional) (default to 0)
let protocol: string; //Filter by protocol (http, https, socks4, socks5) (optional) (default to undefined)
let isEnabled: boolean; //Filter by enabled status (optional) (default to undefined)
let isHealthy: boolean; //Filter by health status (optional) (default to undefined)

const { status, data } = await apiInstance.proxiesGet(
    limit,
    offset,
    protocol,
    isEnabled,
    isHealthy
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of results | (optional) defaults to 100|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to 0|
| **protocol** | [**string**] | Filter by protocol (http, https, socks4, socks5) | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter by enabled status | (optional) defaults to undefined|
| **isHealthy** | [**boolean**] | Filter by health status | (optional) defaults to undefined|


### Return type

**Array<GithubComFntelecomllcStudioBackendInternalModelsProxy>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of proxies |  -  |
|**500** | Failed to list proxies |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesHealthCheckPost**
> ApiBulkHealthCheckResponse proxiesHealthCheckPost()

Force health checks on all registered proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.proxiesHealthCheckPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiBulkHealthCheckResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health checks completed |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesPost**
> GithubComFntelecomllcStudioBackendInternalModelsProxy proxiesPost(githubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest)

Add a new proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest: GithubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest; //Proxy creation request

const { status, data } = await apiInstance.proxiesPost(
    githubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest** | **GithubComFntelecomllcStudioBackendInternalModelsCreateProxyRequest**| Proxy creation request | |


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsProxy**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created proxy |  -  |
|**400** | Invalid request payload or validation failed |  -  |
|**409** | Proxy with address already exists |  -  |
|**500** | Failed to create proxy |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesProxyIdDelete**
> proxiesProxyIdDelete()

Delete a proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.proxiesProxyIdDelete(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Proxy deleted successfully |  -  |
|**400** | Invalid proxy ID format |  -  |
|**404** | Proxy not found |  -  |
|**500** | Failed to delete proxy |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesProxyIdHealthCheckPost**
> ApiProxyHealthCheckResponse proxiesProxyIdHealthCheckPost()

Force a health check on a specific proxy

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (UUID) (default to undefined)

const { status, data } = await apiInstance.proxiesProxyIdHealthCheckPost(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID (UUID) | defaults to undefined|


### Return type

**ApiProxyHealthCheckResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health check completed |  -  |
|**400** | Bad Request |  -  |
|**404** | Proxy not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesProxyIdPut**
> GithubComFntelecomllcStudioBackendInternalModelsProxy proxiesProxyIdPut(githubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest)

Update an existing proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)
let githubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest: GithubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest; //Proxy update request

const { status, data } = await apiInstance.proxiesProxyIdPut(
    proxyId,
    githubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest** | **GithubComFntelecomllcStudioBackendInternalModelsUpdateProxyRequest**| Proxy update request | |
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsProxy**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated proxy |  -  |
|**400** | Invalid request payload or validation failed |  -  |
|**404** | Proxy not found |  -  |
|**500** | Failed to update proxy |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesProxyIdTestPost**
> ApiProxyTestResponse proxiesProxyIdTestPost()

Test a proxy configuration to verify it works correctly

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (UUID) (default to undefined)

const { status, data } = await apiInstance.proxiesProxyIdTestPost(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID (UUID) | defaults to undefined|


### Return type

**ApiProxyTestResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy test results |  -  |
|**400** | Bad Request |  -  |
|**404** | Proxy not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesStatusGet**
> ApiProxyStatusResponse proxiesStatusGet()

Retrieve health status information for all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.proxiesStatusGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiProxyStatusResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy status information |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

