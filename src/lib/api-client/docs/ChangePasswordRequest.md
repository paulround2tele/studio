# ChangePasswordRequest

Password change request

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**currentPassword** | **string** | Current password | [default to undefined]
**newPassword** | **string** | New password (minimum 12 characters) | [default to undefined]

## Example

```typescript
import { ChangePasswordRequest } from './api';

const instance: ChangePasswordRequest = {
    currentPassword,
    newPassword,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
