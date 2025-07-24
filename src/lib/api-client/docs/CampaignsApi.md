# CampaignsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**configurePhaseStandalone**](#configurephasestandalone) | **POST** /campaigns/{campaignId}/phases/{phase}/configure | Configure campaign phase (standalone)|
|[**createLeadGenerationCampaign**](#createleadgenerationcampaign) | **POST** /campaigns/lead-generation | Create lead generation campaign|
|[**getBulkEnrichedCampaignData**](#getbulkenrichedcampaigndata) | **POST** /campaigns/bulk/enriched-data | Get bulk enriched campaign data|
|[**getCampaignProgressStandalone**](#getcampaignprogressstandalone) | **GET** /campaigns/{campaignId}/progress | Get campaign progress (standalone)|
|[**getCampaignsStandalone**](#getcampaignsstandalone) | **GET** /campaigns | List campaigns (standalone)|
|[**getPatternOffset**](#getpatternoffset) | **POST** /campaigns/domain-generation/pattern-offset | Get domain generation pattern offset|
|[**getPhaseStatusStandalone**](#getphasestatusstandalone) | **GET** /campaigns/{campaignId}/phases/{phase}/status | Get phase status (standalone)|
|[**startPhaseStandalone**](#startphasestandalone) | **POST** /campaigns/{campaignId}/phases/{phase}/start | Start campaign phase (standalone)|

# **configurePhaseStandalone**
> APIResponse configurePhaseStandalone(phaseConfigureRequest)

Configure a specific phase for a campaign using standalone services

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    PhaseConfigureRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let phase: string; //Phase type (default to undefined)
let phaseConfigureRequest: PhaseConfigureRequest; //

const { status, data } = await apiInstance.configurePhaseStandalone(
    campaignId,
    phase,
    phaseConfigureRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **phaseConfigureRequest** | **PhaseConfigureRequest**|  | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **phase** | [**string**] | Phase type | defaults to undefined|


### Return type

**APIResponse**

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

# **createLeadGenerationCampaign**
> CreateLeadGenerationCampaign200Response createLeadGenerationCampaign(createLeadGenerationCampaignRequest)

Create a new lead generation campaign with domain generation configuration

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    CreateLeadGenerationCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let createLeadGenerationCampaignRequest: CreateLeadGenerationCampaignRequest; //

const { status, data } = await apiInstance.createLeadGenerationCampaign(
    createLeadGenerationCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createLeadGenerationCampaignRequest** | **CreateLeadGenerationCampaignRequest**|  | |


### Return type

**CreateLeadGenerationCampaign200Response**

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

# **getBulkEnrichedCampaignData**
> APIResponse getBulkEnrichedCampaignData(bulkEnrichedDataRequest)

Retrieve bulk enriched data across multiple campaigns for enterprise-scale processing

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkEnrichedDataRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkEnrichedDataRequest: BulkEnrichedDataRequest; //

const { status, data } = await apiInstance.getBulkEnrichedCampaignData(
    bulkEnrichedDataRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkEnrichedDataRequest** | **BulkEnrichedDataRequest**|  | |


### Return type

**APIResponse**

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

# **getCampaignProgressStandalone**
> APIResponse getCampaignProgressStandalone()

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

**APIResponse**

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

# **getCampaignsStandalone**
> APIResponse getCampaignsStandalone()

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

**APIResponse**

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

# **getPatternOffset**
> PatternOffsetResponse getPatternOffset(patternOffsetRequest)

Get the current offset for domain generation patterns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    PatternOffsetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let patternOffsetRequest: PatternOffsetRequest; //

const { status, data } = await apiInstance.getPatternOffset(
    patternOffsetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **patternOffsetRequest** | **PatternOffsetRequest**|  | |


### Return type

**PatternOffsetResponse**

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

# **getPhaseStatusStandalone**
> APIResponse getPhaseStatusStandalone()

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
let phase: string; //Phase type (default to undefined)

const { status, data } = await apiInstance.getPhaseStatusStandalone(
    campaignId,
    phase
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **phase** | [**string**] | Phase type | defaults to undefined|


### Return type

**APIResponse**

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

# **startPhaseStandalone**
> APIResponse startPhaseStandalone()

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
let phase: string; //Phase name (default to undefined)

const { status, data } = await apiInstance.startPhaseStandalone(
    campaignId,
    phase
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **phase** | [**string**] | Phase name | defaults to undefined|


### Return type

**APIResponse**

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

