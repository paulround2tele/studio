# HealthApi

All URIs are relative to */*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**healthGet**](#healthget) | **GET** /health | Health check|
|[**healthLiveGet**](#healthliveget) | **GET** /health/live | Liveness check|
|[**healthReadyGet**](#healthreadyget) | **GET** /health/ready | Readiness check|
|[**pingGet**](#pingget) | **GET** /ping | Server liveness check|

# **healthGet**
> healthGet()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.healthGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **healthLiveGet**
> healthLiveGet()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.healthLiveGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **healthReadyGet**
> healthReadyGet()


### Example

```typescript
import {
    HealthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.healthReadyGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pingGet**
> PingGet200Response pingGet()

Checks if the API server is running and reachable

### Example

```typescript
import {
    HealthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new HealthApi(configuration);

const { status, data } = await apiInstance.pingGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**PingGet200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Server is healthy |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

