# AuthApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**authLoginPost**](#authloginpost) | **POST** /auth/login | User login|
|[**authLogoutPost**](#authlogoutpost) | **POST** /auth/logout | User logout|
|[**authRefreshPost**](#authrefreshpost) | **POST** /auth/refresh | Refresh session|
|[**changePasswordPost**](#changepasswordpost) | **POST** /change-password | Change password|
|[**meGet**](#meget) | **GET** /me | Get current user|

# **authLoginPost**
> { [key: string]: any; } authLoginPost(githubComFntelecomllcStudioBackendInternalModelsLoginRequest)

Authenticates a user and creates a session

### Example

```typescript
import {
    AuthApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsLoginRequest
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsLoginRequest: GithubComFntelecomllcStudioBackendInternalModelsLoginRequest; //Login credentials

const { status, data } = await apiInstance.authLoginPost(
    githubComFntelecomllcStudioBackendInternalModelsLoginRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsLoginRequest** | **GithubComFntelecomllcStudioBackendInternalModelsLoginRequest**| Login credentials | |


### Return type

**{ [key: string]: any; }**

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
|**401** | Unauthorized |  -  |
|**423** | Locked |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authLogoutPost**
> { [key: string]: string; } authLogoutPost()

Invalidates the current session and clears session cookie

### Example

```typescript
import {
    AuthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.authLogoutPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**{ [key: string]: string; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **authRefreshPost**
> { [key: string]: any; } authRefreshPost()

Refreshes the current session

### Example

```typescript
import {
    AuthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.authRefreshPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**{ [key: string]: any; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **changePasswordPost**
> { [key: string]: string; } changePasswordPost(requestBody)

Changes the password for the currently authenticated user

### Example

```typescript
import {
    AuthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

let requestBody: { [key: string]: string; }; //Password change

const { status, data } = await apiInstance.changePasswordPost(
    requestBody
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **requestBody** | **{ [key: string]: string; }**| Password change | |


### Return type

**{ [key: string]: string; }**

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
|**401** | Unauthorized |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **meGet**
> GithubComFntelecomllcStudioBackendInternalModelsUser meGet()

Returns information about the currently authenticated user

### Example

```typescript
import {
    AuthApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthApi(configuration);

const { status, data } = await apiInstance.meGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsUser**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

