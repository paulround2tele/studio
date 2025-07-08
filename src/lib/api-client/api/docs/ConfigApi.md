# ConfigApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getFeatureFlags**](#getfeatureflags) | **GET** /config/features | Get feature flags|
|[**updateFeatureFlags**](#updatefeatureflags) | **POST** /config/features | Update feature flags|

# **getFeatureFlags**
> FeatureFlags getFeatureFlags()

Returns current feature flag settings

### Example

```typescript
import {
    ConfigApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.getFeatureFlags();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**FeatureFlags**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Feature flags retrieved successfully |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateFeatureFlags**
> FeatureFlags updateFeatureFlags(featureFlags)

Updates feature flag settings

### Example

```typescript
import {
    ConfigApi,
    Configuration,
    FeatureFlags
} from './api';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

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

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Feature flags updated successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

