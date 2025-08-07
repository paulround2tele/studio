# CampaignsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**configurePhaseStandalone**](#configurephasestandalone) | **POST** /campaigns/{campaignId}/phases/{phase}/configure | Configure campaign phase (standalone)|
|[**createLeadGenerationCampaign**](#createleadgenerationcampaign) | **POST** /campaigns/lead-generation | Create lead generation campaign|
|[**getBulkEnrichedCampaignData**](#getbulkenrichedcampaigndata) | **POST** /campaigns/bulk/enriched-data | Get bulk enriched campaign data|
|[**getCampaignDomainsStatus**](#getcampaigndomainsstatus) | **GET** /campaigns/{campaignId}/domains/status | Get campaign domain status summary|
|[**getCampaignProgressStandalone**](#getcampaignprogressstandalone) | **GET** /campaigns/{campaignId}/progress | Get campaign progress (standalone)|
|[**getCampaignsStandalone**](#getcampaignsstandalone) | **GET** /campaigns | List campaigns (standalone)|
|[**getPatternOffset**](#getpatternoffset) | **POST** /campaigns/domain-generation/pattern-offset | Get domain generation pattern offset|
|[**getPhaseStatusStandalone**](#getphasestatusstandalone) | **GET** /campaigns/{campaignId}/phases/{phase}/status | Get phase status (standalone)|
|[**startPhaseStandalone**](#startphasestandalone) | **POST** /campaigns/{campaignId}/phases/{phase}/start | Start campaign phase (standalone)|

# **configurePhaseStandalone**
> ApiAPIResponse configurePhaseStandalone(apiPhaseConfigureRequest)

Configure a specific phase for a campaign using standalone services

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ApiPhaseConfigureRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let phase: 'dns_validation' | 'http_keyword_validation' | 'analysis'; //Phase type (default to undefined)
let apiPhaseConfigureRequest: ApiPhaseConfigureRequest; //Phase configuration request

const { status, data } = await apiInstance.configurePhaseStandalone(
    campaignId,
    phase,
    apiPhaseConfigureRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiPhaseConfigureRequest** | **ApiPhaseConfigureRequest**| Phase configuration request | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **phase** | [**&#39;dns_validation&#39; | &#39;http_keyword_validation&#39; | &#39;analysis&#39;**]**Array<&#39;dns_validation&#39; &#124; &#39;http_keyword_validation&#39; &#124; &#39;analysis&#39;>** | Phase type | defaults to undefined|


### Return type

**ApiAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Phase configured successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createLeadGenerationCampaign**
> ApiAPIResponse createLeadGenerationCampaign(servicesCreateLeadGenerationCampaignRequest)

Create a new lead generation campaign with domain generation configuration

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ServicesCreateLeadGenerationCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let servicesCreateLeadGenerationCampaignRequest: ServicesCreateLeadGenerationCampaignRequest; //Lead generation campaign creation request

const { status, data } = await apiInstance.createLeadGenerationCampaign(
    servicesCreateLeadGenerationCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **servicesCreateLeadGenerationCampaignRequest** | **ServicesCreateLeadGenerationCampaignRequest**| Lead generation campaign creation request | |


### Return type

**ApiAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Campaign created successfully |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBulkEnrichedCampaignData**
> ApiAPIResponse getBulkEnrichedCampaignData(apiBulkEnrichedDataRequest)

Retrieve bulk enriched data across multiple campaigns for enterprise-scale processing

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ApiBulkEnrichedDataRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let apiBulkEnrichedDataRequest: ApiBulkEnrichedDataRequest; //Bulk data request

const { status, data } = await apiInstance.getBulkEnrichedCampaignData(
    apiBulkEnrichedDataRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiBulkEnrichedDataRequest** | **ApiBulkEnrichedDataRequest**| Bulk data request | |


### Return type

**ApiAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk data retrieved successfully |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCampaignDomainsStatus**
> ApiAPIResponse getCampaignDomainsStatus()

Retrieve domain status summary and counts for a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)

const { status, data } = await apiInstance.getCampaignDomainsStatus(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


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
|**200** | Domain status summary retrieved successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCampaignProgressStandalone**
> ApiAPIResponse getCampaignProgressStandalone()

Get campaign progress information using standalone services

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)

const { status, data } = await apiInstance.getCampaignProgressStandalone(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


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
|**200** | Campaign progress |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCampaignsStandalone**
> ApiAPIResponse getCampaignsStandalone()

Get list of all campaigns with phase-centric bulk data

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.getCampaignsStandalone();
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
|**200** | Campaigns retrieved successfully |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPatternOffset**
> ApiPatternOffsetResponse getPatternOffset(apiPatternOffsetRequest)

Get the current offset for domain generation patterns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ApiPatternOffsetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let apiPatternOffsetRequest: ApiPatternOffsetRequest; //Pattern offset request

const { status, data } = await apiInstance.getPatternOffset(
    apiPatternOffsetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiPatternOffsetRequest** | **ApiPatternOffsetRequest**| Pattern offset request | |


### Return type

**ApiPatternOffsetResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Pattern offset retrieved successfully |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPhaseStatusStandalone**
> ApiAPIResponse getPhaseStatusStandalone()

Get status information for a specific phase of a campaign using standalone services

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let phase: 'domain_generation' | 'dns_validation' | 'http_keyword_validation' | 'analysis'; //Phase type (default to undefined)

const { status, data } = await apiInstance.getPhaseStatusStandalone(
    campaignId,
    phase
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **phase** | [**&#39;domain_generation&#39; | &#39;dns_validation&#39; | &#39;http_keyword_validation&#39; | &#39;analysis&#39;**]**Array<&#39;domain_generation&#39; &#124; &#39;dns_validation&#39; &#124; &#39;http_keyword_validation&#39; &#124; &#39;analysis&#39;>** | Phase type | defaults to undefined|


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
|**200** | Phase status retrieved successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign or phase not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startPhaseStandalone**
> ApiAPIResponse startPhaseStandalone()

Start a specific phase of a campaign using standalone services

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let phase: 'domain-generation' | 'dns-validation' | 'http-validation'; //Phase name (default to undefined)

const { status, data } = await apiInstance.startPhaseStandalone(
    campaignId,
    phase
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **phase** | [**&#39;domain-generation&#39; | &#39;dns-validation&#39; | &#39;http-validation&#39;**]**Array<&#39;domain-generation&#39; &#124; &#39;dns-validation&#39; &#124; &#39;http-validation&#39;>** | Phase name | defaults to undefined|


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
|**200** | Phase started successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

