# MFAEnrollment


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**enrolledAt** | **string** |  | [optional] [default to undefined]
**lastUsedAt** | **string** |  | [optional] [default to undefined]
**preferredMethod** | **string** |  | [optional] [default to undefined]
**totpEnabled** | **boolean** |  | [optional] [default to undefined]
**userId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]

## Example

```typescript
import { MFAEnrollment } from './api';

const instance: MFAEnrollment = {
    enrolledAt,
    lastUsedAt,
    preferredMethod,
    totpEnabled,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
