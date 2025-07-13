# CampaignsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**bulkDeleteCampaigns**](#bulkdeletecampaigns) | **POST** /api/campaigns/bulk-delete | Bulk delete campaigns|
|[**cancelCampaign**](#cancelcampaign) | **POST** /api/campaigns/{id}/cancel | Cancel campaign|
|[**createCampaign**](#createcampaign) | **POST** /api/campaigns | Create campaign|
|[**deleteCampaign**](#deletecampaign) | **DELETE** /api/campaigns/{id} | Delete campaign|
|[**getCampaignDetails**](#getcampaigndetails) | **GET** /api/campaigns/{id} | Get campaign details|
|[**getDNSValidationResults**](#getdnsvalidationresults) | **GET** /api/campaigns/{id}/dns-results | Get DNS validation results|
|[**getDomainGenerationPatternOffset**](#getdomaingenerationpatternoffset) | **POST** /campaigns/domain-generation/pattern-offset | Get domain generation pattern offset|
|[**getGeneratedDomains**](#getgenerateddomains) | **GET** /api/campaigns/{id}/domains | Get generated domains|
|[**getHTTPKeywordResults**](#gethttpkeywordresults) | **GET** /api/campaigns/{id}/http-results | Get HTTP keyword results|
|[**listCampaigns**](#listcampaigns) | **GET** /api/campaigns | List campaigns|
|[**pauseCampaign**](#pausecampaign) | **POST** /api/campaigns/{id}/pause | Pause campaign|
|[**resumeCampaign**](#resumecampaign) | **POST** /api/campaigns/{id}/resume | Resume campaign|
|[**startCampaign**](#startcampaign) | **POST** /api/campaigns/{id}/start | Start campaign|
|[**updateCampaign**](#updatecampaign) | **PUT** /api/campaigns/{id} | Update campaign|
|[**validateDNSForCampaign**](#validatednsforcampaign) | **POST** /campaigns/{campaignId}/validate-dns | Validate DNS for campaign domains|
|[**validateHTTPForCampaign**](#validatehttpforcampaign) | **POST** /campaigns/{campaignId}/validate-http | Validate HTTP for campaign domains|

# **bulkDeleteCampaigns**
> BulkDeleteResult bulkDeleteCampaigns(bulkDeleteRequest)

Deletes multiple campaigns and all associated data

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkDeleteRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkDeleteRequest: BulkDeleteRequest; //

const { status, data } = await apiInstance.bulkDeleteCampaigns(
    bulkDeleteRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkDeleteRequest** | **BulkDeleteRequest**|  | |


### Return type

**BulkDeleteResult**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk delete completed |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cancelCampaign**
> Campaign cancelCampaign()

Cancels a campaign execution

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.cancelCampaign(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign cancelled successfully |  -  |
|**400** | Bad request - campaign cannot be cancelled |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createCampaign**
> Campaign createCampaign(createCampaignRequest)

Creates a new campaign using unified endpoint supporting all campaign types

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    CreateCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let createCampaignRequest: CreateCampaignRequest; //

const { status, data } = await apiInstance.createCampaign(
    createCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createCampaignRequest** | **CreateCampaignRequest**|  | |


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Campaign created successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteCampaign**
> deleteCampaign()

Deletes a campaign and all associated data

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.deleteCampaign(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Campaign deleted successfully |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Conflict - campaign has dependencies |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCampaignDetails**
> Campaign getCampaignDetails()

Retrieves detailed information about a specific campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.getCampaignDetails(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign details |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDNSValidationResults**
> DNSValidationResultsResponse getDNSValidationResults()

Retrieves DNS validation results for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)
let page: number; //Page number (1-based) (optional) (default to 1)
let limit: number; //Number of items per page (optional) (default to 100)

const { status, data } = await apiInstance.getDNSValidationResults(
    id,
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|
| **page** | [**number**] | Page number (1-based) | (optional) defaults to 1|
| **limit** | [**number**] | Number of items per page | (optional) defaults to 100|


### Return type

**DNSValidationResultsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS validation results |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDomainGenerationPatternOffset**
> GetDomainGenerationPatternOffset200Response getDomainGenerationPatternOffset(patternOffsetRequest)

Gets the current offset for a domain generation pattern to prevent duplicate domains across campaigns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    PatternOffsetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let patternOffsetRequest: PatternOffsetRequest; //Pattern configuration

const { status, data } = await apiInstance.getDomainGenerationPatternOffset(
    patternOffsetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **patternOffsetRequest** | **PatternOffsetRequest**| Pattern configuration | |


### Return type

**GetDomainGenerationPatternOffset200Response**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Current offset for the pattern |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getGeneratedDomains**
> GeneratedDomainsResponse getGeneratedDomains()

Retrieves the list of generated domains for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)
let page: number; //Page number (1-based) (optional) (default to 1)
let limit: number; //Number of items per page (optional) (default to 100)

const { status, data } = await apiInstance.getGeneratedDomains(
    id,
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|
| **page** | [**number**] | Page number (1-based) | (optional) defaults to 1|
| **limit** | [**number**] | Number of items per page | (optional) defaults to 100|


### Return type

**GeneratedDomainsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of generated domains |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHTTPKeywordResults**
> HTTPKeywordResultsResponse getHTTPKeywordResults()

Retrieves HTTP keyword validation results for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)
let page: number; //Page number (1-based) (optional) (default to 1)
let limit: number; //Number of items per page (optional) (default to 100)

const { status, data } = await apiInstance.getHTTPKeywordResults(
    id,
    page,
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|
| **page** | [**number**] | Page number (1-based) | (optional) defaults to 1|
| **limit** | [**number**] | Number of items per page | (optional) defaults to 100|


### Return type

**HTTPKeywordResultsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP keyword results |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listCampaigns**
> CampaignListResponse listCampaigns()

Retrieves a paginated list of campaigns with optional filtering

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let page: number; //Page number (1-based) (optional) (default to 1)
let limit: number; //Number of items per page (optional) (default to 20)
let campaignType: object; //Filter by campaign type (optional) (default to undefined)
let status: object; //Filter by campaign status (optional) (default to undefined)

const { status, data } = await apiInstance.listCampaigns(
    page,
    limit,
    campaignType,
    status
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **page** | [**number**] | Page number (1-based) | (optional) defaults to 1|
| **limit** | [**number**] | Number of items per page | (optional) defaults to 20|
| **campaignType** | **object** | Filter by campaign type | (optional) defaults to undefined|
| **status** | **object** | Filter by campaign status | (optional) defaults to undefined|


### Return type

**CampaignListResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of campaigns |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pauseCampaign**
> Campaign pauseCampaign()

Pauses a running campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.pauseCampaign(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign paused successfully |  -  |
|**400** | Bad request - campaign cannot be paused |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **resumeCampaign**
> Campaign resumeCampaign()

Resumes a paused campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.resumeCampaign(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign resumed successfully |  -  |
|**400** | Bad request - campaign cannot be resumed |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startCampaign**
> Campaign startCampaign()

Starts a campaign execution

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)

const { status, data } = await apiInstance.startCampaign(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign started successfully |  -  |
|**400** | Bad request - campaign cannot be started |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateCampaign**
> Campaign updateCampaign(updateCampaignRequest)

Updates campaign details and configuration

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    UpdateCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let id: string; //Campaign ID (default to undefined)
let updateCampaignRequest: UpdateCampaignRequest; //

const { status, data } = await apiInstance.updateCampaign(
    id,
    updateCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateCampaignRequest** | **UpdateCampaignRequest**|  | |
| **id** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign updated successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateDNSForCampaign**
> Campaign validateDNSForCampaign(inPlaceDNSValidationRequest)

Starts DNS validation for a domain generation campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    InPlaceDNSValidationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)
let inPlaceDNSValidationRequest: InPlaceDNSValidationRequest; //

const { status, data } = await apiInstance.validateDNSForCampaign(
    campaignId,
    inPlaceDNSValidationRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **inPlaceDNSValidationRequest** | **InPlaceDNSValidationRequest**|  | |
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS validation started successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateHTTPForCampaign**
> Campaign validateHTTPForCampaign(createHTTPKeywordCampaignRequest)

Starts HTTP validation for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    CreateHTTPKeywordCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (default to undefined)
let createHTTPKeywordCampaignRequest: CreateHTTPKeywordCampaignRequest; //

const { status, data } = await apiInstance.validateHTTPForCampaign(
    campaignId,
    createHTTPKeywordCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createHTTPKeywordCampaignRequest** | **CreateHTTPKeywordCampaignRequest**|  | |
| **campaignId** | [**string**] | Campaign ID | defaults to undefined|


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP validation started successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

