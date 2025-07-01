# AdminApi

All URIs are relative to */*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2AdminUsersGet**](#apiv2adminusersget) | **GET** /api/v2/admin/users | List users|
|[**apiV2AdminUsersPost**](#apiv2adminuserspost) | **POST** /api/v2/admin/users | Create user|
|[**apiV2AdminUsersUserIdDelete**](#apiv2adminusersuseriddelete) | **DELETE** /api/v2/admin/users/{userId} | Delete user|
|[**apiV2AdminUsersUserIdGet**](#apiv2adminusersuseridget) | **GET** /api/v2/admin/users/{userId} | Get user|
|[**apiV2AdminUsersUserIdPut**](#apiv2adminusersuseridput) | **PUT** /api/v2/admin/users/{userId} | Update user|

# **apiV2AdminUsersGet**
> ApiV2AdminUsersGet200Response apiV2AdminUsersGet()


### Example

```typescript
import {
    AdminApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let page: number; // (optional) (default to undefined)
let limit: number; // (optional) (default to undefined)

const { status, data } = await apiInstance.apiV2AdminUsersGet(
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **page** | [**number**] |  | (optional) defaults to undefined|
| **limit** | [**number**] |  | (optional) defaults to undefined|


### Return type

**ApiV2AdminUsersGet200Response**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of users |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2AdminUsersPost**
> UserAPI apiV2AdminUsersPost(body)


### Example

```typescript
import {
    AdminApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2AdminUsersPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**UserAPI**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | User created |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2AdminUsersUserIdDelete**
> apiV2AdminUsersUserIdDelete()


### Example

```typescript
import {
    AdminApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let userId: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2AdminUsersUserIdDelete(
    userId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **userId** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2AdminUsersUserIdGet**
> UserAPI apiV2AdminUsersUserIdGet()


### Example

```typescript
import {
    AdminApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let userId: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2AdminUsersUserIdGet(
    userId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **userId** | [**string**] |  | defaults to undefined|


### Return type

**UserAPI**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User details |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2AdminUsersUserIdPut**
> UserAPI apiV2AdminUsersUserIdPut(body)


### Example

```typescript
import {
    AdminApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new AdminApi(configuration);

let userId: string; // (default to undefined)
let body: object; //

const { status, data } = await apiInstance.apiV2AdminUsersUserIdPut(
    userId,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **userId** | [**string**] |  | defaults to undefined|


### Return type

**UserAPI**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

