# ProxiesApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createProxy**](#createproxy) | **POST** /proxies | Add proxy|
|[**deleteProxy**](#deleteproxy) | **DELETE** /proxies/{proxyId} | Delete proxy|
|[**forceCheckAllProxies**](#forcecheckallproxies) | **POST** /proxies/health-check | Force all proxies health check|
|[**forceCheckSingleProxy**](#forcechecksingleproxy) | **POST** /proxies/{proxyId}/health-check | Force single proxy health check|
|[**getProxyStatuses**](#getproxystatuses) | **GET** /proxies/status | Get proxy statuses|
|[**listProxies**](#listproxies) | **GET** /proxies | List proxies|
|[**testProxy**](#testproxy) | **POST** /proxies/{proxyId}/test | Test proxy|
|[**updateProxy**](#updateproxy) | **PUT** /proxies/{proxyId} | Update proxy|

# **createProxy**
> Proxy createProxy(createProxyRequest)

Adds a new proxy

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

const { status, data } = await apiInstance.createProxy(
    createProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createProxyRequest** | **CreateProxyRequest**|  | |


### Return type

**Proxy**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Proxy created successfully |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteProxy**
> deleteProxy()

Deletes a proxy by ID

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

void (empty response body)

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Proxy deleted successfully |  -  |
|**400** | Bad request |  -  |
|**404** | Proxy not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **forceCheckAllProxies**
> ForceCheckAllProxies202Response forceCheckAllProxies()

Forces a health check on all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ForceCheckProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let forceCheckProxiesRequest: ForceCheckProxiesRequest; // (optional)

const { status, data } = await apiInstance.forceCheckAllProxies(
    forceCheckProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **forceCheckProxiesRequest** | **ForceCheckProxiesRequest**|  | |


### Return type

**ForceCheckAllProxies202Response**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**202** | Health check process initiated |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **forceCheckSingleProxy**
> ProxyStatus forceCheckSingleProxy()

Forces a health check on a single proxy

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.forceCheckSingleProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**ProxyStatus**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health check completed |  -  |
|**400** | Bad request |  -  |
|**404** | Proxy not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getProxyStatuses**
> Array<ProxyStatus> getProxyStatuses()

Gets the status of all proxies

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

**Array<ProxyStatus>**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy statuses retrieved successfully |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listProxies**
> Array<Proxy> listProxies()

Lists all proxies with optional filtering

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let limit: number; //Number of items to return (optional) (default to 100)
let offset: number; //Number of items to skip (optional) (default to 0)
let protocol: 'http' | 'https' | 'socks5' | 'socks4'; //Filter by proxy protocol (optional) (default to undefined)
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
| **limit** | [**number**] | Number of items to return | (optional) defaults to 100|
| **offset** | [**number**] | Number of items to skip | (optional) defaults to 0|
| **protocol** | [**&#39;http&#39; | &#39;https&#39; | &#39;socks5&#39; | &#39;socks4&#39;**]**Array<&#39;http&#39; &#124; &#39;https&#39; &#124; &#39;socks5&#39; &#124; &#39;socks4&#39;>** | Filter by proxy protocol | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter by enabled status | (optional) defaults to undefined|
| **isHealthy** | [**boolean**] | Filter by health status | (optional) defaults to undefined|


### Return type

**Array<Proxy>**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxies retrieved successfully |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **testProxy**
> ProxyTestResult testProxy()

Tests a proxy by ID

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

**ProxyTestResult**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy test completed |  -  |
|**400** | Bad request |  -  |
|**404** | Proxy not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProxy**
> Proxy updateProxy(updateProxyRequest)

Updates a proxy by ID

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

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy updated successfully |  -  |
|**400** | Bad request |  -  |
|**404** | Proxy not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

