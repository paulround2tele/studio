# ServerSettingsApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**configGetAuth**](#configgetauth) | **GET** /config/auth | Get authentication configuration|
|[**configGetDns**](#configgetdns) | **GET** /config/dns | Get DNS configuration|
|[**configGetHttp**](#configgethttp) | **GET** /config/http | Get HTTP configuration|
|[**configGetLogging**](#configgetlogging) | **GET** /config/logging | Get logging configuration|
|[**configGetProxyManager**](#configgetproxymanager) | **GET** /config/proxy-manager | Get proxy manager configuration|
|[**configGetRateLimiter**](#configgetratelimiter) | **GET** /config/rate-limit | Get rate limiter configuration|
|[**configGetServer**](#configgetserver) | **GET** /config/server | Get server configuration|
|[**configGetWorker**](#configgetworker) | **GET** /config/worker | Get worker configuration|
|[**configUpdateAuth**](#configupdateauth) | **PUT** /config/auth | Update authentication configuration|
|[**configUpdateDns**](#configupdatedns) | **PUT** /config/dns | Update DNS configuration|
|[**configUpdateHttp**](#configupdatehttp) | **PUT** /config/http | Update HTTP configuration|
|[**configUpdateLogging**](#configupdatelogging) | **PUT** /config/logging | Update logging configuration|
|[**configUpdateProxyManager**](#configupdateproxymanager) | **PUT** /config/proxy-manager | Update proxy manager configuration|
|[**configUpdateRateLimiter**](#configupdateratelimiter) | **PUT** /config/rate-limit | Update rate limiter configuration|
|[**configUpdateServer**](#configupdateserver) | **PUT** /config/server | Update server configuration|
|[**configUpdateWorker**](#configupdateworker) | **PUT** /config/worker | Update worker configuration|

# **configGetAuth**
> ConfigGetAuth200Response configGetAuth()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetAuth();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigGetAuth200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | authentication config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configGetDns**
> ConfigGetDns200Response configGetDns()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetDns();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigGetDns200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configGetHttp**
> object configGetHttp()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetHttp();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**object**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configGetLogging**
> ConfigGetLogging200Response configGetLogging()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetLogging();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigGetLogging200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | logging config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configGetProxyManager**
> object configGetProxyManager()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetProxyManager();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**object**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | proxy manager config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configGetRateLimiter**
> ConfigGetRateLimiter200Response configGetRateLimiter()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetRateLimiter();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigGetRateLimiter200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | rate limiter config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configGetServer**
> object configGetServer()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetServer();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**object**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | server config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configGetWorker**
> ConfigGetWorker200Response configGetWorker()


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.configGetWorker();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ConfigGetWorker200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | worker config |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateAuth**
> ConfigGetAuth200Response configUpdateAuth(authConfig)


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

const { status, data } = await apiInstance.configUpdateAuth(
    authConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **authConfig** | **AuthConfig**|  | |


### Return type

**ConfigGetAuth200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateDns**
> ConfigGetDns200Response configUpdateDns(dNSValidatorConfigJSON)


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

const { status, data } = await apiInstance.configUpdateDns(
    dNSValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **dNSValidatorConfigJSON** | **DNSValidatorConfigJSON**|  | |


### Return type

**ConfigGetDns200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateHttp**
> object configUpdateHttp(body)


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let body: object; //

const { status, data } = await apiInstance.configUpdateHttp(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**object**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateLogging**
> ConfigGetLogging200Response configUpdateLogging(loggingConfig)


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

const { status, data } = await apiInstance.configUpdateLogging(
    loggingConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **loggingConfig** | **LoggingConfig**|  | |


### Return type

**ConfigGetLogging200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateProxyManager**
> object configUpdateProxyManager(body)


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let body: object; //

const { status, data } = await apiInstance.configUpdateProxyManager(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**object**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateRateLimiter**
> ConfigGetRateLimiter200Response configUpdateRateLimiter(rateLimiterConfig)


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

const { status, data } = await apiInstance.configUpdateRateLimiter(
    rateLimiterConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rateLimiterConfig** | **RateLimiterConfig**|  | |


### Return type

**ConfigGetRateLimiter200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateServer**
> object configUpdateServer(body)


### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let body: object; //

const { status, data } = await apiInstance.configUpdateServer(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**object**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configUpdateWorker**
> ConfigGetWorker200Response configUpdateWorker(workerConfig)


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

const { status, data } = await apiInstance.configUpdateWorker(
    workerConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workerConfig** | **WorkerConfig**|  | |


### Return type

**ConfigGetWorker200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

