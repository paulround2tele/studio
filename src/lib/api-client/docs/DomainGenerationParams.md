# DomainGenerationParams

Parameters for domain generation campaigns

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**characterSet** | **string** | Character set for generation | [default to undefined]
**constantString** | **string** | Constant string portion | [default to undefined]
**numDomainsToGenerate** | **number** | Number of domains to generate | [optional] [default to undefined]
**patternType** | **string** | Pattern type for domain generation | [default to undefined]
**tld** | **string** | Top-level domain | [default to undefined]
**variableLength** | **number** | Length of variable portion | [default to undefined]

## Example

```typescript
import { DomainGenerationParams } from './api';

const instance: DomainGenerationParams = {
    characterSet,
    constantString,
    numDomainsToGenerate,
    patternType,
    tld,
    variableLength,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
