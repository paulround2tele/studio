# ServerConfig

Server configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ginMode** | **string** | Gin framework mode | [optional] [default to undefined]
**port** | **string** | Server port | [optional] [default to undefined]
**streamChunkSize** | **number** | Stream chunk size in bytes | [optional] [default to undefined]

## Example

```typescript
import { ServerConfig } from 'api-client';

const instance: ServerConfig = {
    ginMode,
    port,
    streamChunkSize,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
