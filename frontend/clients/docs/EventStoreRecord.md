# EventStoreRecord


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**aggregateId** | **string** | Unique identifier | [optional] [default to undefined]
**aggregateType** | **string** |  | [optional] [default to undefined]
**causationId** | **string** | Unique identifier | [optional] [default to undefined]
**correlationId** | **string** | Unique identifier | [optional] [default to undefined]
**eventData** | **object** |  | [optional] [default to undefined]
**eventId** | **string** | Unique identifier | [optional] [default to undefined]
**eventType** | **string** |  | [optional] [default to undefined]
**eventVersion** | **number** |  | [optional] [default to undefined]
**globalPosition** | **number** |  | [optional] [default to undefined]
**id** | **number** |  | [optional] [default to undefined]
**metadata** | **object** |  | [optional] [default to undefined]
**occurredAt** | **string** |  | [optional] [default to undefined]
**recordedAt** | **string** |  | [optional] [default to undefined]
**streamPosition** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { EventStoreRecord } from './api';

const instance: EventStoreRecord = {
    aggregateId,
    aggregateType,
    causationId,
    correlationId,
    eventData,
    eventId,
    eventType,
    eventVersion,
    globalPosition,
    id,
    metadata,
    occurredAt,
    recordedAt,
    streamPosition,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
