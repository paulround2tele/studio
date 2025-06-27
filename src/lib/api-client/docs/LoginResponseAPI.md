# LoginResponseAPI


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**success** | **boolean** |  | [default to undefined]
**user** | [**UserAPI**](UserAPI.md) |  | [optional] [default to undefined]
**error** | **string** |  | [optional] [default to undefined]
**requiresCaptcha** | **boolean** |  | [optional] [default to undefined]
**sessionId** | **string** |  | [optional] [default to undefined]
**expiresAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { LoginResponseAPI } from '@domainflow/api-client';

const instance: LoginResponseAPI = {
    success,
    user,
    error,
    requiresCaptcha,
    sessionId,
    expiresAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
