# CampaignsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**campaignsCampaignIdCancelPost**](#campaignscampaignidcancelpost) | **POST** /campaigns/{campaignId}/cancel | Cancel campaign|
|[**campaignsCampaignIdDelete**](#campaignscampaigniddelete) | **DELETE** /campaigns/{campaignId} | Delete campaign|
|[**campaignsCampaignIdGet**](#campaignscampaignidget) | **GET** /campaigns/{campaignId} | Get campaign|
|[**campaignsCampaignIdPausePost**](#campaignscampaignidpausepost) | **POST** /campaigns/{campaignId}/pause | Pause campaign|
|[**campaignsCampaignIdResultsDnsValidationGet**](#campaignscampaignidresultsdnsvalidationget) | **GET** /campaigns/{campaignId}/results/dns-validation | DNS validation results|
|[**campaignsCampaignIdResultsGeneratedDomainsGet**](#campaignscampaignidresultsgenerateddomainsget) | **GET** /campaigns/{campaignId}/results/generated-domains | Generated domains|
|[**campaignsCampaignIdResultsHttpKeywordGet**](#campaignscampaignidresultshttpkeywordget) | **GET** /campaigns/{campaignId}/results/http-keyword | HTTP keyword results|
|[**campaignsCampaignIdResumePost**](#campaignscampaignidresumepost) | **POST** /campaigns/{campaignId}/resume | Resume campaign|
|[**campaignsCampaignIdStartPost**](#campaignscampaignidstartpost) | **POST** /campaigns/{campaignId}/start | Start campaign|
|[**campaignsGet**](#campaignsget) | **GET** /campaigns | List campaigns|
|[**campaignsPost**](#campaignspost) | **POST** /campaigns | Create campaign|

# **campaignsCampaignIdCancelPost**
> { [key: string]: string; } campaignsCampaignIdCancelPost()

Cancels a campaign by ID

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdCancelPost(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**{ [key: string]: string; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdDelete**
> { [key: string]: boolean; } campaignsCampaignIdDelete()

Deletes a campaign by ID

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdDelete(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**{ [key: string]: boolean; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdGet**
> GithubComFntelecomllcStudioBackendInternalModelsCampaign campaignsCampaignIdGet()

Gets a campaign by ID

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdGet(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsCampaign**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdPausePost**
> { [key: string]: string; } campaignsCampaignIdPausePost()

Pauses a campaign by ID

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdPausePost(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**{ [key: string]: string; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdResultsDnsValidationGet**
> { [key: string]: any; } campaignsCampaignIdResultsDnsValidationGet()

Gets DNS validation results for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)
let limit: number; //Limit (optional) (default to 20)
let cursor: string; //Cursor (optional) (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdResultsDnsValidationGet(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|
| **limit** | [**number**] | Limit | (optional) defaults to 20|
| **cursor** | [**string**] | Cursor | (optional) defaults to undefined|


### Return type

**{ [key: string]: any; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdResultsGeneratedDomainsGet**
> { [key: string]: any; } campaignsCampaignIdResultsGeneratedDomainsGet()

Gets generated domains for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)
let limit: number; //Limit (optional) (default to 20)
let cursor: number; //Cursor (optional) (default to 0)

const { status, data } = await apiInstance.campaignsCampaignIdResultsGeneratedDomainsGet(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|
| **limit** | [**number**] | Limit | (optional) defaults to 20|
| **cursor** | [**number**] | Cursor | (optional) defaults to 0|


### Return type

**{ [key: string]: any; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdResultsHttpKeywordGet**
> { [key: string]: any; } campaignsCampaignIdResultsHttpKeywordGet()

Gets HTTP keyword results for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)
let limit: number; //Limit (optional) (default to 20)
let cursor: string; //Cursor (optional) (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdResultsHttpKeywordGet(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|
| **limit** | [**number**] | Limit | (optional) defaults to 20|
| **cursor** | [**string**] | Cursor | (optional) defaults to undefined|


### Return type

**{ [key: string]: any; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdResumePost**
> { [key: string]: string; } campaignsCampaignIdResumePost()

Resumes a campaign by ID

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdResumePost(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**{ [key: string]: string; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCampaignIdStartPost**
> { [key: string]: string; } campaignsCampaignIdStartPost()

Starts a campaign by ID

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.campaignsCampaignIdStartPost(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**{ [key: string]: string; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsGet**
> Array<GithubComFntelecomllcStudioBackendInternalModelsCampaign> campaignsGet()

Lists all campaigns

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.campaignsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<GithubComFntelecomllcStudioBackendInternalModelsCampaign>**

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

# **campaignsPost**
> GithubComFntelecomllcStudioBackendInternalModelsCampaign campaignsPost(githubComFntelecomllcStudioBackendInternalModelsCampaign)

Creates a new campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsCampaign
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsCampaign: GithubComFntelecomllcStudioBackendInternalModelsCampaign; //Campaign

const { status, data } = await apiInstance.campaignsPost(
    githubComFntelecomllcStudioBackendInternalModelsCampaign
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsCampaign** | **GithubComFntelecomllcStudioBackendInternalModelsCampaign**| Campaign | |


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsCampaign**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

