# FeatureFlagsApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**featureFlagsGet**](#featureflagsget) | **GET** /config/features | Get feature flags|
|[**featureFlagsUpdate**](#featureflagsupdate) | **PUT** /config/features | Update feature flags|

# **featureFlagsGet**
> FeatureFlagsGet200Response featureFlagsGet()


### Example

```typescript
import {
    FeatureFlagsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FeatureFlagsApi(configuration);

const { status, data } = await apiInstance.featureFlagsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**FeatureFlagsGet200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Feature flags |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **featureFlagsUpdate**
> FeatureFlagsGet200Response featureFlagsUpdate(featureFlags)


### Example

```typescript
import {
    FeatureFlagsApi,
    Configuration,
    FeatureFlags
} from './api';

const configuration = new Configuration();
const apiInstance = new FeatureFlagsApi(configuration);

let featureFlags: FeatureFlags; //

const { status, data } = await apiInstance.featureFlagsUpdate(
    featureFlags
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **featureFlags** | **FeatureFlags**|  | |


### Return type

**FeatureFlagsGet200Response**

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

