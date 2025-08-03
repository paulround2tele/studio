# ProxiesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**addProxy**](#addproxy) | **POST** /proxies | Create proxy|
|[**bulkDeleteProxies**](#bulkdeleteproxies) | **DELETE** /proxies/bulk/delete | Bulk delete proxies|
|[**bulkTestProxies**](#bulktestproxies) | **POST** /proxies/bulk/test | Bulk test proxies|
|[**bulkUpdateProxies**](#bulkupdateproxies) | **PUT** /proxies/bulk/update | Bulk update proxies|
|[**deleteProxy**](#deleteproxy) | **DELETE** /proxies/{proxyId} | Delete proxy|
|[**forceCheckAllProxies**](#forcecheckallproxies) | **POST** /proxies/health-check | Force health check on all proxies|
|[**forceCheckSingleProxy**](#forcechecksingleproxy) | **POST** /proxies/{proxyId}/health-check | Force proxy health check|
|[**getProxyStatuses**](#getproxystatuses) | **GET** /proxies/status | Get proxy statuses|
|[**listProxies**](#listproxies) | **GET** /proxies | List proxies|
|[**testProxy**](#testproxy) | **POST** /proxies/{proxyId}/test | Test proxy|
|[**updateProxy**](#updateproxy) | **PUT** /proxies/{proxyId} | Update proxy|

# **addProxy**
> BulkAnalyzeDomains200Response addProxy(createProxyRequest)

Add a new proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    CreateProxyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let createProxyRequest: CreateProxyRequest; //

const { status, data } = await apiInstance.addProxy(
    createProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createProxyRequest** | **CreateProxyRequest**|  | |


### Return type

**BulkAnalyzeDomains200Response**

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

# **bulkDeleteProxies**
> BulkProxyOperationResponse bulkDeleteProxies(bulkDeleteProxiesRequest)

Delete multiple proxy configurations simultaneously

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    BulkDeleteProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let bulkDeleteProxiesRequest: BulkDeleteProxiesRequest; //

const { status, data } = await apiInstance.bulkDeleteProxies(
    bulkDeleteProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkDeleteProxiesRequest** | **BulkDeleteProxiesRequest**|  | |


### Return type

**BulkProxyOperationResponse**

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

# **bulkTestProxies**
> BulkProxyTestResponse bulkTestProxies(bulkTestProxiesRequest)

Test multiple proxy configurations simultaneously

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    BulkTestProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let bulkTestProxiesRequest: BulkTestProxiesRequest; //

const { status, data } = await apiInstance.bulkTestProxies(
    bulkTestProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkTestProxiesRequest** | **BulkTestProxiesRequest**|  | |


### Return type

**BulkProxyTestResponse**

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

# **bulkUpdateProxies**
> BulkProxyOperationResponse bulkUpdateProxies(bulkUpdateProxiesRequest)

Update multiple proxy configurations simultaneously

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    BulkUpdateProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let bulkUpdateProxiesRequest: BulkUpdateProxiesRequest; //

const { status, data } = await apiInstance.bulkUpdateProxies(
    bulkUpdateProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkUpdateProxiesRequest** | **BulkUpdateProxiesRequest**|  | |


### Return type

**BulkProxyOperationResponse**

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

# **deleteProxy**
> BulkAnalyzeDomains200Response deleteProxy()

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

const { status, data } = await apiInstance.deleteProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**BulkAnalyzeDomains200Response**

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

# **forceCheckAllProxies**
> BulkHealthCheckResponse forceCheckAllProxies(proxyHealthCheckRequest)

Force health checks on all registered proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ProxyHealthCheckRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyHealthCheckRequest: ProxyHealthCheckRequest; //

const { status, data } = await apiInstance.forceCheckAllProxies(
    proxyHealthCheckRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyHealthCheckRequest** | **ProxyHealthCheckRequest**|  | |


### Return type

**BulkHealthCheckResponse**

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

# **forceCheckSingleProxy**
> ProxyHealthCheckResponse forceCheckSingleProxy()

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

const { status, data } = await apiInstance.forceCheckSingleProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID (UUID) | defaults to undefined|


### Return type

**ProxyHealthCheckResponse**

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

# **getProxyStatuses**
> ProxyStatusResponse getProxyStatuses()

Retrieve health status information for all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.getProxyStatuses();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ProxyStatusResponse**

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

# **listProxies**
> BulkAnalyzeDomains200Response listProxies()

Retrieve a list of proxies with optional filtering by protocol, status, and health

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let limit: number; //Maximum number of results (optional) (default to undefined)
let offset: number; //Number of results to skip (optional) (default to undefined)
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
| **limit** | [**number**] | Maximum number of results | (optional) defaults to undefined|
| **offset** | [**number**] | Number of results to skip | (optional) defaults to undefined|
| **protocol** | [**string**] | Filter by protocol (http, https, socks4, socks5) | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter by enabled status | (optional) defaults to undefined|
| **isHealthy** | [**boolean**] | Filter by health status | (optional) defaults to undefined|


### Return type

**BulkAnalyzeDomains200Response**

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

# **testProxy**
> ProxyTestResponse testProxy()

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

const { status, data } = await apiInstance.testProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID (UUID) | defaults to undefined|


### Return type

**ProxyTestResponse**

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

# **updateProxy**
> Proxy updateProxy(updateProxyRequest)

Update an existing proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    UpdateProxyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)
let updateProxyRequest: UpdateProxyRequest; //

const { status, data } = await apiInstance.updateProxy(
    proxyId,
    updateProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateProxyRequest** | **UpdateProxyRequest**|  | |
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**Proxy**

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

