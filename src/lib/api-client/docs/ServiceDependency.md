# ServiceDependency


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**createdAt** | **string** |  | [optional] [default to undefined]
**dependencyType** | **string** |  | [optional] [default to undefined]
**failureCount** | **number** |  | [optional] [default to undefined]
**id** | **number** |  | [optional] [default to undefined]
**interfaceContract** | **string** |  | [optional] [default to undefined]
**lastSuccess** | **string** |  | [optional] [default to undefined]
**latencyP95** | **number** |  | [optional] [default to undefined]
**reliabilityScore** | **number** |  | [optional] [default to undefined]
**sourceService** | **string** |  | [optional] [default to undefined]
**targetService** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ServiceDependency } from './api';

const instance: ServiceDependency = {
    createdAt,
    dependencyType,
    failureCount,
    id,
    interfaceContract,
    lastSuccess,
    latencyP95,
    reliabilityScore,
    sourceService,
    targetService,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
