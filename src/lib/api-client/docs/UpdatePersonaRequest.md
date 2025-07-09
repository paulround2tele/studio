# UpdatePersonaRequest

Request to update an existing persona

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**configDetails** | [**CreatePersonaRequestConfigDetails**](CreatePersonaRequestConfigDetails.md) |  | [optional] [default to undefined]
**description** | **string** | Persona description | [optional] [default to undefined]
**isEnabled** | **boolean** | Whether the persona is enabled | [optional] [default to undefined]
**name** | **string** | Persona name | [optional] [default to undefined]

## Example

```typescript
import { UpdatePersonaRequest } from './api';

const instance: UpdatePersonaRequest = {
    configDetails,
    description,
    isEnabled,
    name,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
