# PR Title

## Summary
Brief description of the change and why it matters.

## Contract Checklist
- [ ] Endpoint manifest updated (`docs/api_endpoint_manifest.json`)
- [ ] No 2xx `SuccessEnvelope` usage for migrated endpoints
- [ ] Spec changes bundled & client regenerated (if spec touched)
- [ ] No new `extractResponseData` / adapter usage
- [ ] No `transformResponse` without justification comment
- [ ] ErrorEnvelope shape preserved for non-2xx
- [ ] CI contract checks pass locally (`npm run api:contract-check`)
- [ ] Added/updated tests (contract/unit)
- [ ] Updated plan doc / ADR if decisions changed

## Screenshots / Logs (Optional)

## Testing Notes
Steps or scripts used to validate (include curl or smoke script references).

## Rollback Plan
How to revert safely if an issue is discovered.

## Related Docs / Issues
Link to plan sections, ADRs, or issues.
