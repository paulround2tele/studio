# CreatePersonaRequest

Request to create a new persona

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**configDetails** | [**CreatePersonaRequestConfigDetails**](CreatePersonaRequestConfigDetails.md) |  | [default to undefined]
**description** | **string** | Persona description | [optional] [default to undefined]
**isEnabled** | **boolean** | Whether the persona is enabled | [optional] [default to false]
**name** | **string** | Persona name | [default to undefined]
**personaType** | **string** | Type of persona | [default to undefined]

## Example

```typescript
import { CreatePersonaRequest } from './api';

const instance: CreatePersonaRequest = {
    configDetails,
    description,
    isEnabled,
    name,
    personaType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
