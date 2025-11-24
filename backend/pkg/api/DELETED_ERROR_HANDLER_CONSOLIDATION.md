# DELETED: pkg/api/error_handler.go

## Reason for Deletion
This entire file was causing OpenAPI schema pollution with duplicate response types.

## What Was Removed
- `StandardErrorResponse` - Competing with `api.APIResponse`
- `ErrorDetail` - Competing with `api.ErrorDetail` 
- `ErrorMeta` - Competing with `api.Metadata`
- `ErrorHandler` - Unused dead code
- Multiple custom error types - Already handled by unified system

## Impact
- ✅ Eliminates OpenAPI schema conflicts
- ✅ Reduces frontend type generation confusion
- ✅ Enforces single response envelope pattern
- ✅ No functional impact (code was unused)

## Required Fix
Update any remaining legacy annotations that reference `StandardErrorResponse` to use `api.APIResponse`

## Professional Pattern
All responses now use: `api.APIResponse` with proper success/error envelopes
