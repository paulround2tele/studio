# ProxyPoolsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**addProxyToPool**](#addproxytopool) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool|
|[**createProxyPool**](#createproxypool) | **POST** /proxy-pools | Create proxy pool|
|[**deleteProxyPool**](#deleteproxypool) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool|
|[**listProxyPools**](#listproxypools) | **GET** /proxy-pools | List proxy pools|
|[**removeProxyFromPool**](#removeproxyfrompool) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool|
|[**updateProxyPool**](#updateproxypool) | **PUT** /proxy-pools/{poolId} | Update proxy pool|

# **addProxyToPool**
> StreamExtractKeywords200Response addProxyToPool(addProxyToPoolRequest)

Assign a proxy to a proxy pool with optional weight

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    AddProxyToPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)
let addProxyToPoolRequest: AddProxyToPoolRequest; //

const { status, data } = await apiInstance.addProxyToPool(
    poolId,
    addProxyToPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **addProxyToPoolRequest** | **AddProxyToPoolRequest**|  | |
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**StreamExtractKeywords200Response**

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

# **createProxyPool**
> StreamExtractKeywords200Response createProxyPool(proxyPoolRequest)

Create a new proxy pool with configuration settings

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ProxyPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let proxyPoolRequest: ProxyPoolRequest; //

const { status, data } = await apiInstance.createProxyPool(
    proxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyPoolRequest** | **ProxyPoolRequest**|  | |


### Return type

**StreamExtractKeywords200Response**

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

# **deleteProxyPool**
> StandardSuccessResponse deleteProxyPool()

Delete a proxy pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)

const { status, data } = await apiInstance.deleteProxyPool(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**StandardSuccessResponse**

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

# **listProxyPools**
> StreamExtractKeywords200Response listProxyPools()

Retrieve all proxy pools with their associated proxies

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

const { status, data } = await apiInstance.listProxyPools();
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

# **removeProxyFromPool**
> ProxyPoolMembershipResponse removeProxyFromPool()

Remove a proxy from a specific proxy pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (UUID) (default to undefined)
let proxyId: string; //Proxy ID (UUID) (default to undefined)

const { status, data } = await apiInstance.removeProxyFromPool(
    poolId,
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Pool ID (UUID) | defaults to undefined|
| **proxyId** | [**string**] | Proxy ID (UUID) | defaults to undefined|


### Return type

**ProxyPoolMembershipResponse**

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

# **updateProxyPool**
> ProxyPool updateProxyPool(proxyPoolRequest)

Update an existing proxy pool configuration

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ProxyPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)
let proxyPoolRequest: ProxyPoolRequest; //

const { status, data } = await apiInstance.updateProxyPool(
    poolId,
    proxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyPoolRequest** | **ProxyPoolRequest**|  | |
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**ProxyPool**

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

