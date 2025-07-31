# EventProjection


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**aggregateId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**id** | **number** |  | [optional] [default to undefined]
**lastEventPosition** | **number** |  | [optional] [default to undefined]
**projectionData** | **object** |  | [optional] [default to undefined]
**projectionName** | **string** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**version** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { EventProjection } from './api';

const instance: EventProjection = {
    aggregateId,
    createdAt,
    id,
    lastEventPosition,
    projectionData,
    projectionName,
    updatedAt,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
