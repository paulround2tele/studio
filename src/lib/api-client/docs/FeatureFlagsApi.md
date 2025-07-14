# FeatureFlagsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getFeatureFlags**](#getfeatureflags) | **GET** /feature-flags | Get feature flags|
|[**updateFeatureFlags**](#updatefeatureflags) | **PUT** /feature-flags | Update feature flags|

# **getFeatureFlags**
> ApiFeatureFlags getFeatureFlags()

Retrieve current feature flag settings

### Example

```typescript
import {
    FeatureFlagsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new FeatureFlagsApi(configuration);

const { status, data } = await apiInstance.getFeatureFlags();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiFeatureFlags**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Feature flags settings |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateFeatureFlags**
> ApiFeatureFlags updateFeatureFlags(apiFeatureFlags)

Update feature flag settings

### Example

```typescript
import {
    FeatureFlagsApi,
    Configuration,
    ApiFeatureFlags
} from './api';

const configuration = new Configuration();
const apiInstance = new FeatureFlagsApi(configuration);

let apiFeatureFlags: ApiFeatureFlags; //Feature flags settings

const { status, data } = await apiInstance.updateFeatureFlags(
    apiFeatureFlags
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiFeatureFlags** | **ApiFeatureFlags**| Feature flags settings | |


### Return type

**ApiFeatureFlags**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated feature flags |  -  |
|**400** | Invalid request body |  -  |
|**500** | Failed to save feature flags |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

