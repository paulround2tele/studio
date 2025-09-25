# AuthenticationApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**changePassword**](#changepassword) | **POST** /auth/change-password | Change user password|
|[**getCurrentUser**](#getcurrentuser) | **GET** /auth/me | Get current user|
|[**loginUser**](#loginuser) | **POST** /auth/login | User login|
|[**logoutUser**](#logoutuser) | **POST** /auth/logout | User logout|
|[**refreshSession**](#refreshsession) | **POST** /auth/refresh | Refresh user session|

# **changePassword**
> BulkValidateDNS200Response changePassword(modelsChangePasswordRequest)

Change password for the currently authenticated user

### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    ModelsChangePasswordRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let modelsChangePasswordRequest: ModelsChangePasswordRequest; //Password change request

const { status, data } = await apiInstance.changePassword(
    modelsChangePasswordRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **modelsChangePasswordRequest** | **ModelsChangePasswordRequest**| Password change request | |


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Password changed successfully |  -  |
|**400** | Invalid request format |  -  |
|**401** | Authentication required |  -  |
|**501** | Not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCurrentUser**
> ApiAPIResponse getCurrentUser()

Get information about the currently authenticated user

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.getCurrentUser();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Current user information |  -  |
|**401** | Authentication required |  -  |
|**404** | User not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **loginUser**
> BulkValidateDNS200Response loginUser(modelsLoginRequest)

Authenticate user credentials and create session

### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    ModelsLoginRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let modelsLoginRequest: ModelsLoginRequest; //Login credentials

const { status, data } = await apiInstance.loginUser(
    modelsLoginRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **modelsLoginRequest** | **ModelsLoginRequest**| Login credentials | |


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Login successful with user and session info |  -  |
|**400** | Invalid request format |  -  |
|**401** | Invalid credentials |  -  |
|**403** | Account inactive |  -  |
|**423** | Account locked |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **logoutUser**
> BulkValidateDNS200Response logoutUser()

Invalidate current user session and clear cookies

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.logoutUser();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Logout successful |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **refreshSession**
> BulkValidateDNS200Response refreshSession()

Extend the current session expiry time

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.refreshSession();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BulkValidateDNS200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Session refreshed with new expiry |  -  |
|**401** | Invalid or expired session |  -  |
|**500** | Failed to refresh session |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

