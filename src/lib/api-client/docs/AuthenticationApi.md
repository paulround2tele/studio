# AuthenticationApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2AuthLoginPost**](#apiv2authloginpost) | **POST** /api/v2/auth/login | User login|
|[**apiV2AuthLogoutPost**](#apiv2authlogoutpost) | **POST** /api/v2/auth/logout | User logout|
|[**apiV2AuthPermissionsGet**](#apiv2authpermissionsget) | **GET** /api/v2/auth/permissions | Get user permissions|
|[**apiV2AuthRefreshPost**](#apiv2authrefreshpost) | **POST** /api/v2/auth/refresh | Refresh session|
|[**apiV2ChangePasswordPost**](#apiv2changepasswordpost) | **POST** /api/v2/change-password | Change password|
|[**apiV2MeGet**](#apiv2meget) | **GET** /api/v2/me | Get current user|

# **apiV2AuthLoginPost**
> LoginResponseAPI apiV2AuthLoginPost(loginRequest)

Authenticates a user and creates a secure session

### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    LoginRequest
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let loginRequest: LoginRequest; //

const { status, data } = await apiInstance.apiV2AuthLoginPost(
    loginRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **loginRequest** | **LoginRequest**|  | |


### Return type

**LoginResponseAPI**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Login successful |  * Set-Cookie - Session cookie <br>  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**423** | Account locked |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2AuthLogoutPost**
> ApiV2AuthLogoutPost200Response apiV2AuthLogoutPost()

Invalidates the current session and clears session cookie

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.apiV2AuthLogoutPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV2AuthLogoutPost200Response**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Logout successful |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2AuthPermissionsGet**
> ApiV2AuthPermissionsGet200Response apiV2AuthPermissionsGet()

Returns the permissions of the currently authenticated user

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.apiV2AuthPermissionsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV2AuthPermissionsGet200Response**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User permissions |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2AuthRefreshPost**
> ApiV2AuthRefreshPost200Response apiV2AuthRefreshPost()

Refreshes the current session

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.apiV2AuthRefreshPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV2AuthRefreshPost200Response**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Session refreshed |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ChangePasswordPost**
> ApiV2ChangePasswordPost200Response apiV2ChangePasswordPost(apiV2ChangePasswordPostRequest)

Changes the password for the currently authenticated user

### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    ApiV2ChangePasswordPostRequest
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let apiV2ChangePasswordPostRequest: ApiV2ChangePasswordPostRequest; //

const { status, data } = await apiInstance.apiV2ChangePasswordPost(
    apiV2ChangePasswordPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiV2ChangePasswordPostRequest** | **ApiV2ChangePasswordPostRequest**|  | |


### Return type

**ApiV2ChangePasswordPost200Response**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Password changed successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2MeGet**
> ApiV2MeGet200Response apiV2MeGet()

Returns information about the currently authenticated user

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.apiV2MeGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiV2MeGet200Response**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Current user information |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

