# ProxiesApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**bulkDeleteProxies**](#bulkdeleteproxies) | **DELETE** /proxies/bulk/delete | Bulk delete proxies|
|[**bulkTestProxies**](#bulktestproxies) | **POST** /proxies/bulk/test | Bulk test proxies|
|[**bulkUpdateProxies**](#bulkupdateproxies) | **PUT** /proxies/bulk/update | Bulk update proxies|
|[**createProxy**](#createproxy) | **POST** /proxies | Create proxy|
|[**deleteProxy**](#deleteproxy) | **DELETE** /proxies/{proxyId} | Delete proxy|
|[**healthCheckAllProxies**](#healthcheckallproxies) | **POST** /proxies/health-check | Health check all proxies|
|[**healthCheckProxy**](#healthcheckproxy) | **POST** /proxies/{proxyId}/health-check | Health check single proxy|
|[**listProxies**](#listproxies) | **GET** /proxies | List proxies|
|[**listProxyStatuses**](#listproxystatuses) | **GET** /proxies/status | Get proxy statuses|
|[**testProxy**](#testproxy) | **POST** /proxies/{proxyId}/test | Test proxy|
|[**updateProxy**](#updateproxy) | **PUT** /proxies/{proxyId} | Update proxy|

# **bulkDeleteProxies**
> BulkValidateDNS200Response bulkDeleteProxies(modelsBulkDeleteProxiesRequest)

Delete multiple proxies in one request

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ModelsBulkDeleteProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let modelsBulkDeleteProxiesRequest: ModelsBulkDeleteProxiesRequest; //Bulk delete request

const { status, data } = await apiInstance.bulkDeleteProxies(
    modelsBulkDeleteProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **modelsBulkDeleteProxiesRequest** | **ModelsBulkDeleteProxiesRequest**| Bulk delete request | |


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk operation results |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **bulkTestProxies**
> BulkValidateDNS200Response bulkTestProxies(modelsBulkTestProxiesRequest)

Test multiple proxies in one request

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ModelsBulkTestProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let modelsBulkTestProxiesRequest: ModelsBulkTestProxiesRequest; //Bulk test request

const { status, data } = await apiInstance.bulkTestProxies(
    modelsBulkTestProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **modelsBulkTestProxiesRequest** | **ModelsBulkTestProxiesRequest**| Bulk test request | |


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk test results |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **bulkUpdateProxies**
> BulkValidateDNS200Response bulkUpdateProxies(modelsBulkUpdateProxiesRequest)

Update multiple proxies in one request

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ModelsBulkUpdateProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let modelsBulkUpdateProxiesRequest: ModelsBulkUpdateProxiesRequest; //Bulk update request

const { status, data } = await apiInstance.bulkUpdateProxies(
    modelsBulkUpdateProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **modelsBulkUpdateProxiesRequest** | **ModelsBulkUpdateProxiesRequest**| Bulk update request | |


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk operation results |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createProxy**
> BulkValidateDNS200Response createProxy(modelsCreateProxyRequest)

Add a new proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ModelsCreateProxyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let modelsCreateProxyRequest: ModelsCreateProxyRequest; //Proxy creation request

const { status, data } = await apiInstance.createProxy(
    modelsCreateProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **modelsCreateProxyRequest** | **ModelsCreateProxyRequest**| Proxy creation request | |


### Return type

**BulkValidateDNS200Response**

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

# **deleteProxy**
> BulkValidateDNS200Response deleteProxy()

Delete a proxy by ID

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.deleteProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy deleted successfully |  -  |
|**400** | Invalid proxy ID format |  -  |
|**404** | Proxy not found |  -  |
|**500** | Failed to delete proxy |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **healthCheckAllProxies**
> BulkValidateDNS200Response healthCheckAllProxies()

Force health checks for all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.healthCheckAllProxies();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BulkValidateDNS200Response**

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

# **healthCheckProxy**
> BulkValidateDNS200Response healthCheckProxy()

Force a health check for a specific proxy

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.healthCheckProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**BulkValidateDNS200Response**

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

# **listProxies**
> BulkValidateDNS200Response listProxies()

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

const { status, data } = await apiInstance.listProxies(
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

**BulkValidateDNS200Response**

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

# **listProxyStatuses**
> BulkValidateDNS200Response listProxyStatuses()

Retrieve the current status of all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.listProxyStatuses();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BulkValidateDNS200Response**

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

# **testProxy**
> BulkValidateDNS200Response testProxy()

Test a proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.testProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Test results |  -  |
|**400** | Bad Request |  -  |
|**404** | Proxy not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProxy**
> BulkValidateDNS200Response updateProxy(modelsUpdateProxyRequest)

Update an existing proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ModelsUpdateProxyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)
let modelsUpdateProxyRequest: ModelsUpdateProxyRequest; //Proxy update request

const { status, data } = await apiInstance.updateProxy(
    proxyId,
    modelsUpdateProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **modelsUpdateProxyRequest** | **ModelsUpdateProxyRequest**| Proxy update request | |
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**BulkValidateDNS200Response**

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

