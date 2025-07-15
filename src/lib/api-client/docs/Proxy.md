# Proxy


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **string** |  | [default to undefined]
**city** | **string** |  | [optional] [default to undefined]
**countryCode** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**failureCount** | **string** |  | [optional] [default to undefined]
**host** | **string** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**inputPassword** | **string** |  | [optional] [default to undefined]
**inputUsername** | **string** | Fields for input/logic, not direct DB columns if already covered by Address or PasswordHash | [optional] [default to undefined]
**isEnabled** | **boolean** |  | [optional] [default to undefined]
**isHealthy** | **boolean** |  | [optional] [default to undefined]
**lastCheckedAt** | **string** |  | [optional] [default to undefined]
**lastError** | **string** |  | [optional] [default to undefined]
**lastStatus** | **string** |  | [optional] [default to undefined]
**lastTested** | **string** |  | [optional] [default to undefined]
**latencyMs** | **string** |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**notes** | **string** |  | [optional] [default to undefined]
**port** | **string** |  | [optional] [default to undefined]
**protocol** | **string** |  | [optional] [default to undefined]
**provider** | **string** | Unique identifier | [optional] [default to undefined]
**status** | **string** | Frontend-expected fields | [optional] [default to undefined]
**successCount** | **string** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**username** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { Proxy } from './api';

const instance: Proxy = {
    address,
    city,
    countryCode,
    createdAt,
    description,
    failureCount,
    host,
    id,
    inputPassword,
    inputUsername,
    isEnabled,
    isHealthy,
    lastCheckedAt,
    lastError,
    lastStatus,
    lastTested,
    latencyMs,
    name,
    notes,
    port,
    protocol,
    provider,
    status,
    successCount,
    updatedAt,
    username,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
