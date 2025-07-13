# HealthApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getHealthCheck**](#gethealthcheck) | **GET** /health | Basic health check|
|[**getLivenessCheck**](#getlivenesscheck) | **GET** /health/live | Liveness probe|
|[**getReadinessCheck**](#getreadinesscheck) | **GET** /health/ready | Readiness probe|

# **getHealthCheck**
> HealthStatus getHealthCheck()

Returns overall health status of the application and its components

### Example

```typescript
import {
    HealthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.getHealthCheck();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HealthStatus**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health status |  -  |
|**503** | Service degraded |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getLivenessCheck**
> SimpleStatus getLivenessCheck()

Checks if the service is alive and running

### Example

```typescript
import {
    HealthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.getLivenessCheck();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SimpleStatus**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Service is alive |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getReadinessCheck**
> SimpleStatus getReadinessCheck()

Checks if the service is ready to receive traffic

### Example

```typescript
import {
    HealthApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.getReadinessCheck();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SimpleStatus**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Service is ready |  -  |
|**503** | Service not ready |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

