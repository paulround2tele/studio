# ConfigurationApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getAuthConfig**](#getauthconfig) | **GET** /api/v2/config/auth | Get authentication configuration|
|[**getDNSConfig**](#getdnsconfig) | **GET** /api/v2/config/dns | Get DNS configuration|
|[**getHTTPConfig**](#gethttpconfig) | **GET** /api/v2/config/http | Get HTTP configuration|
|[**getLoggingConfig**](#getloggingconfig) | **GET** /api/v2/config/logging | Get logging configuration|
|[**getProxyManagerConfig**](#getproxymanagerconfig) | **GET** /api/v2/config/proxy-manager | Get proxy manager configuration|
|[**getRateLimiterConfig**](#getratelimiterconfig) | **GET** /api/v2/config/rate-limit | Get rate limiter configuration|
|[**getServerConfig**](#getserverconfig) | **GET** /api/v2/config/server | Get server configuration|
|[**getWorkerConfig**](#getworkerconfig) | **GET** /api/v2/config/worker | Get worker configuration|
|[**updateAuthConfig**](#updateauthconfig) | **POST** /api/v2/config/auth | Update authentication configuration|
|[**updateDNSConfig**](#updatednsconfig) | **POST** /api/v2/config/dns | Update DNS configuration|
|[**updateHTTPConfig**](#updatehttpconfig) | **POST** /api/v2/config/http | Update HTTP configuration|
|[**updateLoggingConfig**](#updateloggingconfig) | **POST** /api/v2/config/logging | Update logging configuration|
|[**updateProxyManagerConfig**](#updateproxymanagerconfig) | **POST** /api/v2/config/proxy-manager | Update proxy manager configuration|
|[**updateRateLimiterConfig**](#updateratelimiterconfig) | **POST** /api/v2/config/rate-limit | Update rate limiter configuration|
|[**updateServerConfig**](#updateserverconfig) | **PUT** /api/v2/config/server | Update server configuration|
|[**updateWorkerConfig**](#updateworkerconfig) | **POST** /api/v2/config/worker | Update worker configuration|

# **getAuthConfig**
> AuthConfig getAuthConfig()

Retrieves sanitized authentication configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getAuthConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**AuthConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Authentication configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDNSConfig**
> DNSConfig getDNSConfig()

Retrieves the default DNS validator configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getDNSConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**DNSConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHTTPConfig**
> HTTPConfig getHTTPConfig()

Retrieves the default HTTP validator configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getHTTPConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HTTPConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getLoggingConfig**
> LoggingConfig getLoggingConfig()

Retrieves the current logging configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getLoggingConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**LoggingConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Logging configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getProxyManagerConfig**
> ProxyManagerConfig getProxyManagerConfig()

Retrieves proxy manager settings

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getProxyManagerConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ProxyManagerConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy manager configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRateLimiterConfig**
> RateLimiterConfig getRateLimiterConfig()

Retrieves global rate limiter settings

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getRateLimiterConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**RateLimiterConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Rate limiter configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getServerConfig**
> ServerConfig getServerConfig()

Retrieves current server-wide configurations

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getServerConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ServerConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Server configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getWorkerConfig**
> WorkerConfig getWorkerConfig()

Retrieves the worker configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

const { status, data } = await apiInstance.getWorkerConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**WorkerConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Worker configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateAuthConfig**
> AuthConfig updateAuthConfig(authConfig)

Updates authentication configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    AuthConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let authConfig: AuthConfig; //

const { status, data } = await apiInstance.updateAuthConfig(
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

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated authentication configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateDNSConfig**
> DNSConfig updateDNSConfig(dNSConfig)

Updates the default DNS validator configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    DNSConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let dNSConfig: DNSConfig; //

const { status, data } = await apiInstance.updateDNSConfig(
    dNSConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **dNSConfig** | **DNSConfig**|  | |


### Return type

**DNSConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated DNS configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateHTTPConfig**
> HTTPConfig updateHTTPConfig(hTTPConfig)

Updates the default HTTP validator configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    HTTPConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let hTTPConfig: HTTPConfig; //

const { status, data } = await apiInstance.updateHTTPConfig(
    hTTPConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **hTTPConfig** | **HTTPConfig**|  | |


### Return type

**HTTPConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated HTTP configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateLoggingConfig**
> LoggingConfig updateLoggingConfig(loggingConfig)

Updates the logging configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    LoggingConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let loggingConfig: LoggingConfig; //

const { status, data } = await apiInstance.updateLoggingConfig(
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

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated logging configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProxyManagerConfig**
> ProxyManagerConfig updateProxyManagerConfig(proxyManagerConfig)

Updates proxy manager settings

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    ProxyManagerConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let proxyManagerConfig: ProxyManagerConfig; //

const { status, data } = await apiInstance.updateProxyManagerConfig(
    proxyManagerConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyManagerConfig** | **ProxyManagerConfig**|  | |


### Return type

**ProxyManagerConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated proxy manager configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateRateLimiterConfig**
> RateLimiterConfig updateRateLimiterConfig(rateLimiterConfig)

Updates global rate limiter settings

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    RateLimiterConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let rateLimiterConfig: RateLimiterConfig; //

const { status, data } = await apiInstance.updateRateLimiterConfig(
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

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated rate limiter configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateServerConfig**
> ServerConfig updateServerConfig(serverConfig)

Updates server-wide configurations

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    ServerConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let serverConfig: ServerConfig; //

const { status, data } = await apiInstance.updateServerConfig(
    serverConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **serverConfig** | **ServerConfig**|  | |


### Return type

**ServerConfig**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated server configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateWorkerConfig**
> WorkerConfig updateWorkerConfig(workerConfig)

Updates the worker configuration

### Example

```typescript
import {
    ConfigurationApi,
    Configuration,
    WorkerConfig
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new ConfigurationApi(configuration);

let workerConfig: WorkerConfig; //

const { status, data } = await apiInstance.updateWorkerConfig(
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

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated worker configuration |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

