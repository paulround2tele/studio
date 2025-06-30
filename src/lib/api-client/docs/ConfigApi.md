# ConfigApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**configFeaturesGet**](#configfeaturesget) | **GET** /config/features | Get feature flags|
|[**configFeaturesPost**](#configfeaturespost) | **POST** /config/features | Update feature flags|

# **configFeaturesGet**
> GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags configFeaturesGet()

Returns current feature flag settings

### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.configFeaturesGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configFeaturesPost**
> GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags configFeaturesPost(githubComFntelecomllcStudioBackendInternalConfigFeatureFlags)

Updates feature flag settings

### Example

```typescript
import {
    ConfigApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

let githubComFntelecomllcStudioBackendInternalConfigFeatureFlags: GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags; //Feature flags

const { status, data } = await apiInstance.configFeaturesPost(
    githubComFntelecomllcStudioBackendInternalConfigFeatureFlags
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalConfigFeatureFlags** | **GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags**| Feature flags | |


### Return type

**GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

