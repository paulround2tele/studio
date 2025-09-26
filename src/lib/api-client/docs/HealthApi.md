# HealthApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**healthCheck**](#healthcheck) | **GET** /health | Health check|
|[**healthLive**](#healthlive) | **GET** /health/live | Liveness check|
|[**healthReady**](#healthready) | **GET** /health/ready | Readiness check|
|[**ping**](#ping) | **GET** /ping | Ping server|

# **healthCheck**
> HealthResponse healthCheck()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.healthCheck();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HealthResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  * X-Request-Id - Unique request identifier <br>  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **healthLive**
> HealthResponse healthLive()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.healthLive();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HealthResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Alive |  * X-Request-Id - Unique request identifier <br>  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **healthReady**
> HealthResponse healthReady()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.healthReady();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HealthResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Ready |  * X-Request-Id - Unique request identifier <br>  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **ping**
> PingResponse ping()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.ping();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**PingResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Pong |  * X-Request-Id - Unique request identifier <br>  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

