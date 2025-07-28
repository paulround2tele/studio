# FeatureFlagsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getFeatureFlags**](#getfeatureflags) | **GET** /feature-flags | Get feature flags|
|[**updateFeatureFlags**](#updatefeatureflags) | **PUT** /feature-flags | Update feature flags|

# **getFeatureFlags**
> FeatureFlags getFeatureFlags()

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

**FeatureFlags**

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

# **updateFeatureFlags**
> FeatureFlags updateFeatureFlags(featureFlags)

Update feature flag settings

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

const { status, data } = await apiInstance.updateFeatureFlags(
    featureFlags
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **featureFlags** | **FeatureFlags**|  | |


### Return type

**FeatureFlags**

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

