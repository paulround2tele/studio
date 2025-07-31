# SecurityEvent


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**actionAttempted** | **string** |  | [optional] [default to undefined]
**auditLogId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**authorizationResult** | **string** |  | [optional] [default to undefined]
**campaignId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**denialReason** | **string** |  | [optional] [default to undefined]
**eventType** | **string** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**requestContext** | **object** |  | [optional] [default to undefined]
**resourceId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**resourceType** | **string** |  | [optional] [default to undefined]
**riskScore** | **number** |  | [optional] [default to undefined]
**sessionId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**sourceIp** | **string** |  | [optional] [default to undefined]
**userAgent** | **string** |  | [optional] [default to undefined]
**userId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]

## Example

```typescript
import { SecurityEvent } from './api';

const instance: SecurityEvent = {
    actionAttempted,
    auditLogId,
    authorizationResult,
    campaignId,
    createdAt,
    denialReason,
    eventType,
    id,
    requestContext,
    resourceId,
    resourceType,
    riskScore,
    sessionId,
    sourceIp,
    userAgent,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
