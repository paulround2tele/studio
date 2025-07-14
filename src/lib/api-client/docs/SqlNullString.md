# SqlNullString

Fields for input/logic, not direct DB columns if already covered by Address or PasswordHash

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**string** | **string** |  | [optional] [default to undefined]
**valid** | **boolean** | Valid is true if String is not NULL | [optional] [default to undefined]

## Example

```typescript
import { SqlNullString } from './api';

const instance: SqlNullString = {
    string,
    valid,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
