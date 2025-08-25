# ServerSettingsApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getAuthConfig**](#getauthconfig) | **GET** /server/auth-config | Get authentication configuration|
|[**getDNSConfig**](#getdnsconfig) | **GET** /server/dns-config | Get DNS configuration|
|[**getHTTPConfig**](#gethttpconfig) | **GET** /server/http-config | Get HTTP configuration|
|[**getLoggingConfig**](#getloggingconfig) | **GET** /server/logging-config | Get logging configuration|
|[**getProxyManagerConfig**](#getproxymanagerconfig) | **GET** /server/proxy-manager-config | Get proxy manager configuration|
|[**getRateLimiterConfig**](#getratelimiterconfig) | **GET** /server/rate-limiter-config | Get rate limiter configuration|
|[**getServerConfig**](#getserverconfig) | **GET** /server/config | Get server configuration|
|[**getWorkerConfig**](#getworkerconfig) | **GET** /server/worker-config | Get worker configuration|
|[**updateAuthConfig**](#updateauthconfig) | **PUT** /server/auth-config | Update authentication configuration|
|[**updateDNSConfig**](#updatednsconfig) | **PUT** /server/dns-config | Update DNS configuration|
|[**updateHTTPConfig**](#updatehttpconfig) | **PUT** /server/http-config | Update HTTP configuration|
|[**updateLoggingConfig**](#updateloggingconfig) | **PUT** /server/logging-config | Update logging configuration|
|[**updateProxyManagerConfig**](#updateproxymanagerconfig) | **PUT** /server/proxy-manager-config | Update proxy manager configuration|
|[**updateRateLimiterConfig**](#updateratelimiterconfig) | **PUT** /server/rate-limiter-config | Update rate limiter configuration|
|[**updateServerConfig**](#updateserverconfig) | **PUT** /server/config | Update server configuration|
|[**updateWorkerConfig**](#updateworkerconfig) | **PUT** /server/worker-config | Update worker configuration|

# **getAuthConfig**
> ConfigAuthConfig getAuthConfig()

Retrieve the current authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getAuthConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigAuthConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Authentication configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDNSConfig**
> ConfigDNSValidatorConfigJSON getDNSConfig()

Retrieve default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getDNSConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigDNSValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS validator configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHTTPConfig**
> ConfigHTTPValidatorConfigJSON getHTTPConfig()

Retrieve default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getHTTPConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigHTTPValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP validator configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getLoggingConfig**
> ConfigLoggingConfig getLoggingConfig()

Retrieve the current logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getLoggingConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigLoggingConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Logging configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getProxyManagerConfig**
> ConfigProxyManagerConfigJSON getProxyManagerConfig()

Retrieve the current proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getProxyManagerConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigProxyManagerConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy manager configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getRateLimiterConfig**
> ConfigRateLimiterConfig getRateLimiterConfig()

Retrieve the current rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getRateLimiterConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigRateLimiterConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Rate limiter configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getServerConfig**
> ApiServerConfigResponse getServerConfig()

Retrieve current server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getServerConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiServerConfigResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Server configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getWorkerConfig**
> ConfigWorkerConfig getWorkerConfig()

Retrieve the current worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getWorkerConfig();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigWorkerConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Worker configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateAuthConfig**
> ConfigAuthConfig updateAuthConfig(configAuthConfig)

Update the authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigAuthConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configAuthConfig: ConfigAuthConfig; //Authentication configuration

const { status, data } = await apiInstance.updateAuthConfig(
    configAuthConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configAuthConfig** | **ConfigAuthConfig**| Authentication configuration | |


### Return type

**ConfigAuthConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated authentication configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateDNSConfig**
> ConfigDNSValidatorConfigJSON updateDNSConfig(configDNSValidatorConfigJSON)

Update default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigDNSValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configDNSValidatorConfigJSON: ConfigDNSValidatorConfigJSON; //DNS validator configuration

const { status, data } = await apiInstance.updateDNSConfig(
    configDNSValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configDNSValidatorConfigJSON** | **ConfigDNSValidatorConfigJSON**| DNS validator configuration | |


### Return type

**ConfigDNSValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated DNS configuration |  -  |
|**400** | Invalid request body or validation failed |  -  |
|**500** | Failed to save DNS configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateHTTPConfig**
> ConfigHTTPValidatorConfigJSON updateHTTPConfig(configHTTPValidatorConfigJSON)

Update default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigHTTPValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configHTTPValidatorConfigJSON: ConfigHTTPValidatorConfigJSON; //HTTP validator configuration

const { status, data } = await apiInstance.updateHTTPConfig(
    configHTTPValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configHTTPValidatorConfigJSON** | **ConfigHTTPValidatorConfigJSON**| HTTP validator configuration | |


### Return type

**ConfigHTTPValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated HTTP configuration |  -  |
|**400** | Invalid request body or validation failed |  -  |
|**500** | Failed to save HTTP configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateLoggingConfig**
> ConfigLoggingConfig updateLoggingConfig(configLoggingConfig)

Update the logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigLoggingConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configLoggingConfig: ConfigLoggingConfig; //Logging configuration

const { status, data } = await apiInstance.updateLoggingConfig(
    configLoggingConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configLoggingConfig** | **ConfigLoggingConfig**| Logging configuration | |


### Return type

**ConfigLoggingConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated logging configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProxyManagerConfig**
> ConfigProxyManagerConfigJSON updateProxyManagerConfig(configProxyManagerConfigJSON)

Update the proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigProxyManagerConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configProxyManagerConfigJSON: ConfigProxyManagerConfigJSON; //Proxy manager configuration

const { status, data } = await apiInstance.updateProxyManagerConfig(
    configProxyManagerConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configProxyManagerConfigJSON** | **ConfigProxyManagerConfigJSON**| Proxy manager configuration | |


### Return type

**ConfigProxyManagerConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated proxy manager configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateRateLimiterConfig**
> ConfigRateLimiterConfig updateRateLimiterConfig(configRateLimiterConfig)

Update the rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigRateLimiterConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configRateLimiterConfig: ConfigRateLimiterConfig; //Rate limiter configuration

const { status, data } = await apiInstance.updateRateLimiterConfig(
    configRateLimiterConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configRateLimiterConfig** | **ConfigRateLimiterConfig**| Rate limiter configuration | |


### Return type

**ConfigRateLimiterConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated rate limiter configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateServerConfig**
> ApiServerConfigResponse updateServerConfig(apiServerConfigUpdateRequest)

Update server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiServerConfigUpdateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiServerConfigUpdateRequest: ApiServerConfigUpdateRequest; //Server configuration update

const { status, data } = await apiInstance.updateServerConfig(
    apiServerConfigUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiServerConfigUpdateRequest** | **ApiServerConfigUpdateRequest**| Server configuration update | |


### Return type

**ApiServerConfigResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated server configuration |  -  |
|**400** | Invalid request payload |  -  |
|**500** | Failed to save server configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateWorkerConfig**
> ConfigWorkerConfig updateWorkerConfig(configWorkerConfig)

Update the worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigWorkerConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configWorkerConfig: ConfigWorkerConfig; //Worker configuration

const { status, data } = await apiInstance.updateWorkerConfig(
    configWorkerConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configWorkerConfig** | **ConfigWorkerConfig**| Worker configuration | |


### Return type

**ConfigWorkerConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated worker configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

