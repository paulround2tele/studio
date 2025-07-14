# PersonaTestResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**message** | **string** |  | [optional] [default to undefined]
**personaId** | **string** | Unique identifier | [optional] [default to undefined]
**personaName** | **string** |  | [optional] [default to undefined]
**personaType** | **string** |  | [optional] [default to undefined]
**results** | [**PersonaTestResultData**](PersonaTestResultData.md) |  | [optional] [default to undefined]
**success** | **boolean** |  | [optional] [default to undefined]
**testPassed** | **boolean** |  | [optional] [default to undefined]
**testResults** | [**PersonaTestResultData**](PersonaTestResultData.md) |  | [optional] [default to undefined]
**timestamp** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { PersonaTestResponse } from './api';

const instance: PersonaTestResponse = {
    message,
    personaId,
    personaName,
    personaType,
    results,
    success,
    testPassed,
    testResults,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
