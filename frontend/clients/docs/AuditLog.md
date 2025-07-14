# AuditLog


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **string** |  | [default to undefined]
**clientIp** | **string** |  | [optional] [default to undefined]
**details** | **object** |  | [optional] [default to undefined]
**entityId** | **string** | Unique identifier | [optional] [default to undefined]
**entityType** | **string** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**timestamp** | **string** |  | [optional] [default to undefined]
**userAgent** | **string** |  | [optional] [default to undefined]
**userId** | **string** | Unique identifier | [optional] [default to undefined]

## Example

```typescript
import { AuditLog } from './api';

const instance: AuditLog = {
    action,
    clientIp,
    details,
    entityId,
    entityType,
    id,
    timestamp,
    userAgent,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
