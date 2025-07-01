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

All URIs are relative to */api/v2*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AuthApi* | [**authLoginPost**](docs/AuthApi.md#authloginpost) | **POST** /auth/login | User login
*AuthApi* | [**authLogoutPost**](docs/AuthApi.md#authlogoutpost) | **POST** /auth/logout | User logout
*AuthApi* | [**authRefreshPost**](docs/AuthApi.md#authrefreshpost) | **POST** /auth/refresh | Refresh session
*AuthApi* | [**changePasswordPost**](docs/AuthApi.md#changepasswordpost) | **POST** /change-password | Change password
*AuthApi* | [**meGet**](docs/AuthApi.md#meget) | **GET** /me | Get current user
*CampaignsApi* | [**campaignsCampaignIdCancelPost**](docs/CampaignsApi.md#campaignscampaignidcancelpost) | **POST** /campaigns/{campaignId}/cancel | Cancel campaign
*CampaignsApi* | [**campaignsCampaignIdDelete**](docs/CampaignsApi.md#campaignscampaigniddelete) | **DELETE** /campaigns/{campaignId} | Delete campaign
*CampaignsApi* | [**campaignsCampaignIdGet**](docs/CampaignsApi.md#campaignscampaignidget) | **GET** /campaigns/{campaignId} | Get campaign
*CampaignsApi* | [**campaignsCampaignIdPausePost**](docs/CampaignsApi.md#campaignscampaignidpausepost) | **POST** /campaigns/{campaignId}/pause | Pause campaign
*CampaignsApi* | [**campaignsCampaignIdResultsDnsValidationGet**](docs/CampaignsApi.md#campaignscampaignidresultsdnsvalidationget) | **GET** /campaigns/{campaignId}/results/dns-validation | DNS validation results
*CampaignsApi* | [**campaignsCampaignIdResultsGeneratedDomainsGet**](docs/CampaignsApi.md#campaignscampaignidresultsgenerateddomainsget) | **GET** /campaigns/{campaignId}/results/generated-domains | Generated domains
*CampaignsApi* | [**campaignsCampaignIdResultsHttpKeywordGet**](docs/CampaignsApi.md#campaignscampaignidresultshttpkeywordget) | **GET** /campaigns/{campaignId}/results/http-keyword | HTTP keyword results
*CampaignsApi* | [**campaignsCampaignIdResumePost**](docs/CampaignsApi.md#campaignscampaignidresumepost) | **POST** /campaigns/{campaignId}/resume | Resume campaign
*CampaignsApi* | [**campaignsCampaignIdStartPost**](docs/CampaignsApi.md#campaignscampaignidstartpost) | **POST** /campaigns/{campaignId}/start | Start campaign
*CampaignsApi* | [**campaignsGet**](docs/CampaignsApi.md#campaignsget) | **GET** /campaigns | List campaigns
*CampaignsApi* | [**campaignsPost**](docs/CampaignsApi.md#campaignspost) | **POST** /campaigns | Create campaign
*ConfigApi* | [**configFeaturesGet**](docs/ConfigApi.md#configfeaturesget) | **GET** /config/features | Get feature flags
*ConfigApi* | [**configFeaturesPost**](docs/ConfigApi.md#configfeaturespost) | **POST** /config/features | Update feature flags
*KeywordSetsApi* | [**keywordsSetsGet**](docs/KeywordSetsApi.md#keywordssetsget) | **GET** /keywords/sets | List keyword sets
*KeywordSetsApi* | [**keywordsSetsPost**](docs/KeywordSetsApi.md#keywordssetspost) | **POST** /keywords/sets | Create keyword set
*KeywordSetsApi* | [**keywordsSetsSetIdDelete**](docs/KeywordSetsApi.md#keywordssetssetiddelete) | **DELETE** /keywords/sets/{setId} | Delete keyword set
*KeywordSetsApi* | [**keywordsSetsSetIdGet**](docs/KeywordSetsApi.md#keywordssetssetidget) | **GET** /keywords/sets/{setId} | Get keyword set
*KeywordSetsApi* | [**keywordsSetsSetIdPut**](docs/KeywordSetsApi.md#keywordssetssetidput) | **PUT** /keywords/sets/{setId} | Update keyword set
*PersonasApi* | [**personasGet**](docs/PersonasApi.md#personasget) | **GET** /personas | List all personas
*PersonasApi* | [**personasIdDelete**](docs/PersonasApi.md#personasiddelete) | **DELETE** /personas/{id} | Delete persona
*PersonasApi* | [**personasIdGet**](docs/PersonasApi.md#personasidget) | **GET** /personas/{id} | Get persona
*PersonasApi* | [**personasIdPut**](docs/PersonasApi.md#personasidput) | **PUT** /personas/{id} | Update persona
*PersonasApi* | [**personasIdTestPost**](docs/PersonasApi.md#personasidtestpost) | **POST** /personas/{id}/test | Test persona
*PersonasApi* | [**personasPost**](docs/PersonasApi.md#personaspost) | **POST** /personas | Create persona
*ProxiesApi* | [**proxiesGet**](docs/ProxiesApi.md#proxiesget) | **GET** /proxies | List proxies
*ProxiesApi* | [**proxiesHealthCheckPost**](docs/ProxiesApi.md#proxieshealthcheckpost) | **POST** /proxies/health-check | Force all proxies health check
*ProxiesApi* | [**proxiesPost**](docs/ProxiesApi.md#proxiespost) | **POST** /proxies | Add proxy
*ProxiesApi* | [**proxiesProxyIdDelete**](docs/ProxiesApi.md#proxiesproxyiddelete) | **DELETE** /proxies/{proxyId} | Delete proxy
*ProxiesApi* | [**proxiesProxyIdHealthCheckPost**](docs/ProxiesApi.md#proxiesproxyidhealthcheckpost) | **POST** /proxies/{proxyId}/health-check | Force single proxy health check
*ProxiesApi* | [**proxiesProxyIdPut**](docs/ProxiesApi.md#proxiesproxyidput) | **PUT** /proxies/{proxyId} | Update proxy
*ProxiesApi* | [**proxiesProxyIdTestPost**](docs/ProxiesApi.md#proxiesproxyidtestpost) | **POST** /proxies/{proxyId}/test | Test proxy
*ProxiesApi* | [**proxiesStatusGet**](docs/ProxiesApi.md#proxiesstatusget) | **GET** /proxies/status | Get proxy statuses
*ProxyPoolsApi* | [**proxyPoolsGet**](docs/ProxyPoolsApi.md#proxypoolsget) | **GET** /proxy-pools | List proxy pools
*ProxyPoolsApi* | [**proxyPoolsPoolIdDelete**](docs/ProxyPoolsApi.md#proxypoolspooliddelete) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool
*ProxyPoolsApi* | [**proxyPoolsPoolIdProxiesPost**](docs/ProxyPoolsApi.md#proxypoolspoolidproxiespost) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool
*ProxyPoolsApi* | [**proxyPoolsPoolIdProxiesProxyIdDelete**](docs/ProxyPoolsApi.md#proxypoolspoolidproxiesproxyiddelete) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool
*ProxyPoolsApi* | [**proxyPoolsPoolIdPut**](docs/ProxyPoolsApi.md#proxypoolspoolidput) | **PUT** /proxy-pools/{poolId} | Update proxy pool
*ProxyPoolsApi* | [**proxyPoolsPost**](docs/ProxyPoolsApi.md#proxypoolspost) | **POST** /proxy-pools | Create proxy pool


### Documentation For Models

 - [GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags](docs/GithubComFntelecomllcStudioBackendInternalConfigFeatureFlags.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsCampaign](docs/GithubComFntelecomllcStudioBackendInternalModelsCampaign.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsCampaignStatusEnum](docs/GithubComFntelecomllcStudioBackendInternalModelsCampaignStatusEnum.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsCampaignTypeEnum](docs/GithubComFntelecomllcStudioBackendInternalModelsCampaignTypeEnum.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsDNSValidationCampaignParams](docs/GithubComFntelecomllcStudioBackendInternalModelsDNSValidationCampaignParams.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsDomainGenerationCampaignParams](docs/GithubComFntelecomllcStudioBackendInternalModelsDomainGenerationCampaignParams.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsHTTPKeywordCampaignParams](docs/GithubComFntelecomllcStudioBackendInternalModelsHTTPKeywordCampaignParams.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsKeywordRule](docs/GithubComFntelecomllcStudioBackendInternalModelsKeywordRule.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsKeywordRuleTypeEnum](docs/GithubComFntelecomllcStudioBackendInternalModelsKeywordRuleTypeEnum.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsLoginRequest](docs/GithubComFntelecomllcStudioBackendInternalModelsLoginRequest.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsPersona](docs/GithubComFntelecomllcStudioBackendInternalModelsPersona.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsPersonaTypeEnum](docs/GithubComFntelecomllcStudioBackendInternalModelsPersonaTypeEnum.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsProxy](docs/GithubComFntelecomllcStudioBackendInternalModelsProxy.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsProxyPool](docs/GithubComFntelecomllcStudioBackendInternalModelsProxyPool.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsProxyPoolMembership](docs/GithubComFntelecomllcStudioBackendInternalModelsProxyPoolMembership.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsProxyProtocolEnum](docs/GithubComFntelecomllcStudioBackendInternalModelsProxyProtocolEnum.md)
 - [GithubComFntelecomllcStudioBackendInternalModelsUser](docs/GithubComFntelecomllcStudioBackendInternalModelsUser.md)
 - [InternalApiCreateKeywordSetRequest](docs/InternalApiCreateKeywordSetRequest.md)
 - [InternalApiKeywordRuleRequest](docs/InternalApiKeywordRuleRequest.md)
 - [InternalApiKeywordSetResponse](docs/InternalApiKeywordSetResponse.md)
 - [InternalApiProxyPoolRequest](docs/InternalApiProxyPoolRequest.md)
 - [InternalApiUpdateKeywordSetRequest](docs/InternalApiUpdateKeywordSetRequest.md)
 - [SqlNullInt32](docs/SqlNullInt32.md)
 - [SqlNullString](docs/SqlNullString.md)
 - [SqlNullTime](docs/SqlNullTime.md)
 - [UuidNullUUID](docs/UuidNullUUID.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization

Endpoints do not require authorization.

