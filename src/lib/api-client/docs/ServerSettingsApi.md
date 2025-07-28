# ServerSettingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getAuthConfigGin**](#getauthconfiggin) | **GET** /server/auth-config | Get authentication configuration|
|[**getDNSConfigGin**](#getdnsconfiggin) | **GET** /server/dns-config | Get DNS configuration|
|[**getHTTPConfigGin**](#gethttpconfiggin) | **GET** /server/http-config | Get HTTP configuration|
|[**getLoggingConfigGin**](#getloggingconfiggin) | **GET** /server/logging-config | Get logging configuration|
|[**getProxyManagerConfigGin**](#getproxymanagerconfiggin) | **GET** /server/proxy-manager-config | Get proxy manager configuration|
|[**getRateLimiterConfigGin**](#getratelimiterconfiggin) | **GET** /server/rate-limiter-config | Get rate limiter configuration|
|[**getServerConfigGin**](#getserverconfiggin) | **GET** /server/config | Get server configuration|
|[**getWorkerConfigGin**](#getworkerconfiggin) | **GET** /server/worker-config | Get worker configuration|
|[**updateAuthConfigGin**](#updateauthconfiggin) | **PUT** /server/auth-config | Update authentication configuration|
|[**updateDNSConfigGin**](#updatednsconfiggin) | **PUT** /server/dns-config | Update DNS configuration|
|[**updateHTTPConfigGin**](#updatehttpconfiggin) | **PUT** /server/http-config | Update HTTP configuration|
|[**updateLoggingConfigGin**](#updateloggingconfiggin) | **PUT** /server/logging-config | Update logging configuration|
|[**updateProxyManagerConfigGin**](#updateproxymanagerconfiggin) | **PUT** /server/proxy-manager-config | Update proxy manager configuration|
|[**updateRateLimiterConfigGin**](#updateratelimiterconfiggin) | **PUT** /server/rate-limiter-config | Update rate limiter configuration|
|[**updateServerConfigGin**](#updateserverconfiggin) | **PUT** /server/config | Update server configuration|
|[**updateWorkerConfigGin**](#updateworkerconfiggin) | **PUT** /server/worker-config | Update worker configuration|

# **getAuthConfigGin**
> AuthConfig getAuthConfigGin()

Retrieve the current authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getAuthConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**AuthConfig**

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

# **getDNSConfigGin**
> DNSValidatorConfigJSON getDNSConfigGin()

Retrieve default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getDNSConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**DNSValidatorConfigJSON**

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

# **getHTTPConfigGin**
> HTTPValidatorConfigJSON getHTTPConfigGin()

Retrieve default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getHTTPConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HTTPValidatorConfigJSON**

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

# **getLoggingConfigGin**
> LoggingConfig getLoggingConfigGin()

Retrieve the current logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getLoggingConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**LoggingConfig**

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

# **getProxyManagerConfigGin**
> ProxyManagerConfigJSON getProxyManagerConfigGin()

Retrieve the current proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getProxyManagerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ProxyManagerConfigJSON**

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

# **getRateLimiterConfigGin**
> RateLimiterConfig getRateLimiterConfigGin()

Retrieve the current rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getRateLimiterConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**RateLimiterConfig**

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

# **getServerConfigGin**
> ServerConfigResponse getServerConfigGin()

Retrieve current server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getServerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ServerConfigResponse**

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

# **getWorkerConfigGin**
> WorkerConfig getWorkerConfigGin()

Retrieve the current worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getWorkerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**WorkerConfig**

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

# **updateAuthConfigGin**
> AuthConfig updateAuthConfigGin(authConfig)

Update the authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    AuthConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let authConfig: AuthConfig; //

const { status, data } = await apiInstance.updateAuthConfigGin(
    authConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **authConfig** | **AuthConfig**|  | |


### Return type

**AuthConfig**

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

# **updateDNSConfigGin**
> DNSValidatorConfigJSON updateDNSConfigGin(dNSValidatorConfigJSON)

Update default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    DNSValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let dNSValidatorConfigJSON: DNSValidatorConfigJSON; //

const { status, data } = await apiInstance.updateDNSConfigGin(
    dNSValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **dNSValidatorConfigJSON** | **DNSValidatorConfigJSON**|  | |


### Return type

**DNSValidatorConfigJSON**

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

# **updateHTTPConfigGin**
> HTTPValidatorConfigJSON updateHTTPConfigGin(hTTPValidatorConfigJSON)

Update default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    HTTPValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let hTTPValidatorConfigJSON: HTTPValidatorConfigJSON; //

const { status, data } = await apiInstance.updateHTTPConfigGin(
    hTTPValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **hTTPValidatorConfigJSON** | **HTTPValidatorConfigJSON**|  | |


### Return type

**HTTPValidatorConfigJSON**

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

# **updateLoggingConfigGin**
> LoggingConfig updateLoggingConfigGin(loggingConfig)

Update the logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    LoggingConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let loggingConfig: LoggingConfig; //

const { status, data } = await apiInstance.updateLoggingConfigGin(
    loggingConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **loggingConfig** | **LoggingConfig**|  | |


### Return type

**LoggingConfig**

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

# **updateProxyManagerConfigGin**
> ProxyManagerConfigJSON updateProxyManagerConfigGin(proxyManagerConfig)

Update the proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ProxyManagerConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let proxyManagerConfig: ProxyManagerConfig; //

const { status, data } = await apiInstance.updateProxyManagerConfigGin(
    proxyManagerConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyManagerConfig** | **ProxyManagerConfig**|  | |


### Return type

**ProxyManagerConfigJSON**

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

# **updateRateLimiterConfigGin**
> RateLimiterConfig updateRateLimiterConfigGin(rateLimiterConfig)

Update the rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    RateLimiterConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let rateLimiterConfig: RateLimiterConfig; //

const { status, data } = await apiInstance.updateRateLimiterConfigGin(
    rateLimiterConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rateLimiterConfig** | **RateLimiterConfig**|  | |


### Return type

**RateLimiterConfig**

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

# **updateServerConfigGin**
> ServerConfigResponse updateServerConfigGin(serverConfigUpdateRequest)

Update server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ServerConfigUpdateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let serverConfigUpdateRequest: ServerConfigUpdateRequest; //

const { status, data } = await apiInstance.updateServerConfigGin(
    serverConfigUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **serverConfigUpdateRequest** | **ServerConfigUpdateRequest**|  | |


### Return type

**ServerConfigResponse**

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

# **updateWorkerConfigGin**
> WorkerConfig updateWorkerConfigGin(workerConfig)

Update the worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    WorkerConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let workerConfig: WorkerConfig; //

const { status, data } = await apiInstance.updateWorkerConfigGin(
    workerConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workerConfig** | **WorkerConfig**|  | |


### Return type

**WorkerConfig**

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

