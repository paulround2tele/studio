## @domainflow/api-client@1.0.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install @domainflow/api-client@1.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *http://localhost:8080*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AdminApi* | [**apiV2AdminUsersGet**](docs/AdminApi.md#apiv2adminusersget) | **GET** /api/v2/admin/users | List users
*AdminApi* | [**apiV2AdminUsersPost**](docs/AdminApi.md#apiv2adminuserspost) | **POST** /api/v2/admin/users | Create user
*AdminApi* | [**apiV2AdminUsersUserIdDelete**](docs/AdminApi.md#apiv2adminusersuseriddelete) | **DELETE** /api/v2/admin/users/{userId} | Delete user
*AdminApi* | [**apiV2AdminUsersUserIdGet**](docs/AdminApi.md#apiv2adminusersuseridget) | **GET** /api/v2/admin/users/{userId} | Get user
*AdminApi* | [**apiV2AdminUsersUserIdPut**](docs/AdminApi.md#apiv2adminusersuseridput) | **PUT** /api/v2/admin/users/{userId} | Update user
*AuthenticationApi* | [**apiV2AuthLoginPost**](docs/AuthenticationApi.md#apiv2authloginpost) | **POST** /api/v2/auth/login | User login
*AuthenticationApi* | [**apiV2AuthLogoutPost**](docs/AuthenticationApi.md#apiv2authlogoutpost) | **POST** /api/v2/auth/logout | User logout
*AuthenticationApi* | [**apiV2AuthPermissionsGet**](docs/AuthenticationApi.md#apiv2authpermissionsget) | **GET** /api/v2/auth/permissions | Get user permissions
*AuthenticationApi* | [**apiV2AuthRefreshPost**](docs/AuthenticationApi.md#apiv2authrefreshpost) | **POST** /api/v2/auth/refresh | Refresh session
*AuthenticationApi* | [**apiV2ChangePasswordPost**](docs/AuthenticationApi.md#apiv2changepasswordpost) | **POST** /api/v2/change-password | Change password
*AuthenticationApi* | [**apiV2MeGet**](docs/AuthenticationApi.md#apiv2meget) | **GET** /api/v2/me | Get current user
*CampaignsApi* | [**apiV2CampaignsCampaignIdCancelPost**](docs/CampaignsApi.md#apiv2campaignscampaignidcancelpost) | **POST** /api/v2/campaigns/{campaignId}/cancel | Cancel campaign
*CampaignsApi* | [**apiV2CampaignsCampaignIdChainPost**](docs/CampaignsApi.md#apiv2campaignscampaignidchainpost) | **POST** /api/v2/campaigns/{campaignId}/chain | Trigger chained phase
*CampaignsApi* | [**apiV2CampaignsCampaignIdDelete**](docs/CampaignsApi.md#apiv2campaignscampaigniddelete) | **DELETE** /api/v2/campaigns/{campaignId} | Delete campaign
*CampaignsApi* | [**apiV2CampaignsCampaignIdGet**](docs/CampaignsApi.md#apiv2campaignscampaignidget) | **GET** /api/v2/campaigns/{campaignId} | Get campaign details
*CampaignsApi* | [**apiV2CampaignsCampaignIdPausePost**](docs/CampaignsApi.md#apiv2campaignscampaignidpausepost) | **POST** /api/v2/campaigns/{campaignId}/pause | Pause campaign
*CampaignsApi* | [**apiV2CampaignsCampaignIdResultsDnsValidationGet**](docs/CampaignsApi.md#apiv2campaignscampaignidresultsdnsvalidationget) | **GET** /api/v2/campaigns/{campaignId}/results/dns-validation | DNS validation results
*CampaignsApi* | [**apiV2CampaignsCampaignIdResultsGeneratedDomainsGet**](docs/CampaignsApi.md#apiv2campaignscampaignidresultsgenerateddomainsget) | **GET** /api/v2/campaigns/{campaignId}/results/generated-domains | Generated domains
*CampaignsApi* | [**apiV2CampaignsCampaignIdResultsHttpKeywordGet**](docs/CampaignsApi.md#apiv2campaignscampaignidresultshttpkeywordget) | **GET** /api/v2/campaigns/{campaignId}/results/http-keyword | HTTP keyword results
*CampaignsApi* | [**apiV2CampaignsCampaignIdResumePost**](docs/CampaignsApi.md#apiv2campaignscampaignidresumepost) | **POST** /api/v2/campaigns/{campaignId}/resume | Resume campaign
*CampaignsApi* | [**apiV2CampaignsCampaignIdStartPost**](docs/CampaignsApi.md#apiv2campaignscampaignidstartpost) | **POST** /api/v2/campaigns/{campaignId}/start | Start campaign
*CampaignsApi* | [**apiV2CampaignsGet**](docs/CampaignsApi.md#apiv2campaignsget) | **GET** /api/v2/campaigns | List campaigns
*CampaignsApi* | [**apiV2CampaignsPost**](docs/CampaignsApi.md#apiv2campaignspost) | **POST** /api/v2/campaigns | Create campaign
*ConfigApi* | [**apiV2ConfigDnsGet**](docs/ConfigApi.md#apiv2configdnsget) | **GET** /api/v2/config/dns | Get DNS config
*ConfigApi* | [**apiV2ConfigDnsPost**](docs/ConfigApi.md#apiv2configdnspost) | **POST** /api/v2/config/dns | Update DNS config
*ConfigApi* | [**apiV2ConfigFeaturesGet**](docs/ConfigApi.md#apiv2configfeaturesget) | **GET** /api/v2/config/features | Get feature flags
*ConfigApi* | [**apiV2ConfigFeaturesPost**](docs/ConfigApi.md#apiv2configfeaturespost) | **POST** /api/v2/config/features | Update feature flags
*ConfigApi* | [**apiV2ConfigHttpGet**](docs/ConfigApi.md#apiv2confighttpget) | **GET** /api/v2/config/http | Get HTTP config
*ConfigApi* | [**apiV2ConfigHttpPost**](docs/ConfigApi.md#apiv2confighttppost) | **POST** /api/v2/config/http | Update HTTP config
*ConfigApi* | [**apiV2ConfigLoggingGet**](docs/ConfigApi.md#apiv2configloggingget) | **GET** /api/v2/config/logging | Get logging config
*ConfigApi* | [**apiV2ConfigLoggingPost**](docs/ConfigApi.md#apiv2configloggingpost) | **POST** /api/v2/config/logging | Update logging config
*ConfigApi* | [**apiV2ConfigServerGet**](docs/ConfigApi.md#apiv2configserverget) | **GET** /api/v2/config/server | Get server config
*ConfigApi* | [**apiV2ConfigServerPut**](docs/ConfigApi.md#apiv2configserverput) | **PUT** /api/v2/config/server | Update server config
*HealthApi* | [**healthGet**](docs/HealthApi.md#healthget) | **GET** /health | Health check
*HealthApi* | [**healthLiveGet**](docs/HealthApi.md#healthliveget) | **GET** /health/live | Liveness check
*HealthApi* | [**healthReadyGet**](docs/HealthApi.md#healthreadyget) | **GET** /health/ready | Readiness check
*HealthApi* | [**pingGet**](docs/HealthApi.md#pingget) | **GET** /ping | Server liveness check
*KeywordsApi* | [**apiV2ExtractKeywordsPost**](docs/KeywordsApi.md#apiv2extractkeywordspost) | **POST** /api/v2/extract/keywords | Batch extract keywords
*KeywordsApi* | [**apiV2ExtractKeywordsStreamGet**](docs/KeywordsApi.md#apiv2extractkeywordsstreamget) | **GET** /api/v2/extract/keywords/stream | Stream extract keywords
*KeywordsApi* | [**apiV2KeywordsSetsGet**](docs/KeywordsApi.md#apiv2keywordssetsget) | **GET** /api/v2/keywords/sets | List keyword sets
*KeywordsApi* | [**apiV2KeywordsSetsPost**](docs/KeywordsApi.md#apiv2keywordssetspost) | **POST** /api/v2/keywords/sets | Create keyword set
*KeywordsApi* | [**apiV2KeywordsSetsSetIdDelete**](docs/KeywordsApi.md#apiv2keywordssetssetiddelete) | **DELETE** /api/v2/keywords/sets/{setId} | Delete keyword set
*KeywordsApi* | [**apiV2KeywordsSetsSetIdGet**](docs/KeywordsApi.md#apiv2keywordssetssetidget) | **GET** /api/v2/keywords/sets/{setId} | Get keyword set
*KeywordsApi* | [**apiV2KeywordsSetsSetIdPut**](docs/KeywordsApi.md#apiv2keywordssetssetidput) | **PUT** /api/v2/keywords/sets/{setId} | Update keyword set
*PersonasApi* | [**apiV2PersonasGet**](docs/PersonasApi.md#apiv2personasget) | **GET** /api/v2/personas | List personas
*PersonasApi* | [**apiV2PersonasIdDelete**](docs/PersonasApi.md#apiv2personasiddelete) | **DELETE** /api/v2/personas/{id} | Delete persona
*PersonasApi* | [**apiV2PersonasIdGet**](docs/PersonasApi.md#apiv2personasidget) | **GET** /api/v2/personas/{id} | Get persona
*PersonasApi* | [**apiV2PersonasIdPut**](docs/PersonasApi.md#apiv2personasidput) | **PUT** /api/v2/personas/{id} | Update persona
*PersonasApi* | [**apiV2PersonasPost**](docs/PersonasApi.md#apiv2personaspost) | **POST** /api/v2/personas | Create persona
*PersonasApi* | [**testPersona**](docs/PersonasApi.md#testpersona) | **POST** /api/v2/personas/{id} | Test persona
*ProxiesApi* | [**apiV2ProxiesGet**](docs/ProxiesApi.md#apiv2proxiesget) | **GET** /api/v2/proxies | List proxies
*ProxiesApi* | [**apiV2ProxiesHealthCheckPost**](docs/ProxiesApi.md#apiv2proxieshealthcheckpost) | **POST** /api/v2/proxies/health-check | Force all proxies health check
*ProxiesApi* | [**apiV2ProxiesPost**](docs/ProxiesApi.md#apiv2proxiespost) | **POST** /api/v2/proxies | Add proxy
*ProxiesApi* | [**apiV2ProxiesProxyIdDelete**](docs/ProxiesApi.md#apiv2proxiesproxyiddelete) | **DELETE** /api/v2/proxies/{proxyId} | Delete proxy
*ProxiesApi* | [**apiV2ProxiesProxyIdHealthCheckPost**](docs/ProxiesApi.md#apiv2proxiesproxyidhealthcheckpost) | **POST** /api/v2/proxies/{proxyId}/health-check | Force single proxy health check
*ProxiesApi* | [**apiV2ProxiesProxyIdPut**](docs/ProxiesApi.md#apiv2proxiesproxyidput) | **PUT** /api/v2/proxies/{proxyId} | Update proxy
*ProxiesApi* | [**apiV2ProxiesStatusGet**](docs/ProxiesApi.md#apiv2proxiesstatusget) | **GET** /api/v2/proxies/status | Proxy statuses
*ProxiesApi* | [**testProxy**](docs/ProxiesApi.md#testproxy) | **POST** /api/v2/proxies/{proxyId} | Test proxy
*WebSocketApi* | [**apiV2BroadcastTestGet**](docs/WebSocketApi.md#apiv2broadcasttestget) | **GET** /api/v2/broadcast-test | Test WebSocket broadcast
*WebSocketApi* | [**apiV2WsGet**](docs/WebSocketApi.md#apiv2wsget) | **GET** /api/v2/ws | WebSocket connection


### Documentation For Models

 - [ApiV2AdminUsersGet200Response](docs/ApiV2AdminUsersGet200Response.md)
 - [ApiV2AuthLogoutPost200Response](docs/ApiV2AuthLogoutPost200Response.md)
 - [ApiV2AuthPermissionsGet200Response](docs/ApiV2AuthPermissionsGet200Response.md)
 - [ApiV2AuthRefreshPost200Response](docs/ApiV2AuthRefreshPost200Response.md)
 - [ApiV2ChangePasswordPost200Response](docs/ApiV2ChangePasswordPost200Response.md)
 - [ApiV2ChangePasswordPostRequest](docs/ApiV2ChangePasswordPostRequest.md)
 - [ApiV2MeGet200Response](docs/ApiV2MeGet200Response.md)
 - [CampaignAPI](docs/CampaignAPI.md)
 - [CampaignStatusEnum](docs/CampaignStatusEnum.md)
 - [CampaignTypeEnum](docs/CampaignTypeEnum.md)
 - [LoginRequest](docs/LoginRequest.md)
 - [LoginResponseAPI](docs/LoginResponseAPI.md)
 - [PersonaTypeEnum](docs/PersonaTypeEnum.md)
 - [PingGet200Response](docs/PingGet200Response.md)
 - [ProxyProtocolEnum](docs/ProxyProtocolEnum.md)
 - [UserAPI](docs/UserAPI.md)
 - [ValidationStatusEnum](docs/ValidationStatusEnum.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="SessionAuth"></a>
### SessionAuth

- **Type**: API key
- **API key parameter name**: session_id
- **Location**: 

