# ProxiesApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**addProxy**](#addproxy) | **POST** /proxies | Create proxy|
|[**deleteProxy**](#deleteproxy) | **DELETE** /proxies/{proxyId} | Delete proxy|
|[**forceCheckAllProxies**](#forcecheckallproxies) | **POST** /proxies/health-check | Force health check on all proxies|
|[**forceCheckSingleProxy**](#forcechecksingleproxy) | **POST** /proxies/{proxyId}/health-check | Force proxy health check|
|[**getProxyStatuses**](#getproxystatuses) | **GET** /proxies/status | Get proxy statuses|
|[**listProxies**](#listproxies) | **GET** /proxies | List proxies|
|[**testProxy**](#testproxy) | **POST** /proxies/{proxyId}/test | Test proxy|
|[**updateProxy**](#updateproxy) | **PUT** /proxies/{proxyId} | Update proxy|

# **addProxy**
> StreamExtractKeywords200Response addProxy()

Add a new proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.addProxy();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**StreamExtractKeywords200Response**

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

# **deleteProxy**
> StreamExtractKeywords200Response deleteProxy()

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

**StreamExtractKeywords200Response**

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
> BulkHealthCheckResponse forceCheckAllProxies()

Force health checks on all registered proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.forceCheckAllProxies();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BulkHealthCheckResponse**

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
> StreamExtractKeywords200Response listProxies()

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

**StreamExtractKeywords200Response**

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
> Proxy updateProxy()

Update an existing proxy configuration

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.updateProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**Proxy**

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

