# ServerSettingsResponse

Server settings and configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**environment** | **string** | Environment (development, staging, production) | [optional] [default to undefined]
**features** | **object** | Enabled features and capabilities | [optional] [default to undefined]
**version** | **string** | Server version | [optional] [default to undefined]

## Example

```typescript
import { ServerSettingsResponse } from 'domainflow-api-client';

const instance: ServerSettingsResponse = {
    environment,
    features,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
