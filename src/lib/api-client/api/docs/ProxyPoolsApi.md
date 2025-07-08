# ProxyPoolsApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**addProxyToPool**](#addproxytopool) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool|
|[**createProxyPool**](#createproxypool) | **POST** /proxy-pools | Create proxy pool|
|[**deleteProxyPool**](#deleteproxypool) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool|
|[**listProxyPools**](#listproxypools) | **GET** /proxy-pools | List proxy pools|
|[**removeProxyFromPool**](#removeproxyfrompool) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool|
|[**updateProxyPool**](#updateproxypool) | **PUT** /proxy-pools/{poolId} | Update proxy pool|

# **addProxyToPool**
> ProxyPoolMembership addProxyToPool(addProxyToPoolRequest)

Assigns a proxy to a pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    AddProxyToPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)
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
| **poolId** | [**string**] | Pool ID | defaults to undefined|


### Return type

**ProxyPoolMembership**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Proxy added to pool successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Proxy pool not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createProxyPool**
> ProxyPool createProxyPool(proxyPoolRequest)

Creates a new proxy pool

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

**ProxyPool**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Proxy pool created successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteProxyPool**
> DeleteProxyPool200Response deleteProxyPool()

Deletes a proxy pool by ID

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)

const { status, data } = await apiInstance.deleteProxyPool(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Pool ID | defaults to undefined|


### Return type

**DeleteProxyPool200Response**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy pool deleted successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Proxy pool not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listProxyPools**
> Array<ProxyPool> listProxyPools()

Returns all proxy pools

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

**Array<ProxyPool>**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy pools retrieved successfully |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **removeProxyFromPool**
> RemoveProxyFromPool200Response removeProxyFromPool()

Removes a proxy from a pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)
let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.removeProxyFromPool(
    poolId,
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Pool ID | defaults to undefined|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**RemoveProxyFromPool200Response**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy removed from pool successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Proxy pool not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProxyPool**
> ProxyPool updateProxyPool(proxyPoolRequest)

Updates a proxy pool by ID

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ProxyPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)
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
| **poolId** | [**string**] | Pool ID | defaults to undefined|


### Return type

**ProxyPool**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy pool updated successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Proxy pool not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

