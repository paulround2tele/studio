# StealthConfig


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**batchRandomization** | **boolean** | BatchRandomization randomizes order within validation batches | [optional] [default to undefined]
**offsetScrambling** | **boolean** | OffsetScrambling scrambles the starting offset to avoid predictable patterns | [optional] [default to undefined]
**shuffleStrategy** | **string** | ShuffleStrategy determines how domains are randomized | [optional] [default to undefined]
**subsetPercentage** | **number** |  | [optional] [default to undefined]
**subsetValidation** | **boolean** | SubsetValidation validates random subsets instead of all domains | [optional] [default to undefined]
**temporalJitterMax** | **number** |  | [optional] [default to undefined]
**temporalJitterMin** | **number** | TemporalJitter adds random delays between validations (milliseconds) | [optional] [default to undefined]
**validationPriority** | **Array&lt;string&gt;** | ValidationPriority allows prioritizing certain domain patterns | [optional] [default to undefined]

## Example

```typescript
import { StealthConfig } from './api';

const instance: StealthConfig = {
    batchRandomization,
    offsetScrambling,
    shuffleStrategy,
    subsetPercentage,
    subsetValidation,
    temporalJitterMax,
    temporalJitterMin,
    validationPriority,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
