# Phase G: OpenAPI Spec Alignment & Final Envelope Cleanup

**Phase G kickoff**: Align OpenAPI specs with backend direct 2xx responses and perform final cleanup.

## Scope

Phase G addresses the critical spec/implementation mismatch identified in Phase F:
- Backend handlers from Phases A-D return direct payloads
- OpenAPI specs still define these endpoints as returning SuccessEnvelope
- Generated TypeScript clients are incorrect due to spec discrepancy
- Frontend uses extractResponseData as workaround

## Baseline Assessment

**Contract Test Results**: 88 endpoints with SuccessEnvelope in 2xx responses
```bash
cd backend && go test -v ./tests -run TestPhaseF_NoSuccessEnvelopeIn2xxResponses
```

## Implementation Strategy

### Batched Spec Editing Approach

Processing endpoints in logical batches to maintain system stability and enable incremental validation:

#### ✅ Batch 1: Personas (5 endpoints) - COMPLETE
- **Result**: 88 → 87 violations (-1)
- Updated personas.yaml: list, create, get, update operations
- Updated persona-test.yaml and persona-by-id.yaml
- Converted DELETE operations to 204 No Content

#### ✅ Batch 2: Proxies & Proxy-pools (17 endpoints) - COMPLETE  
- **Result**: 87 → 70 violations (-17)
- Updated main proxies.yaml and proxy-pools.yaml files
- Updated individual proxy files: proxy-by-id.yaml, proxy-test.yaml, status.yaml, etc.
- Updated individual proxy-pools files: list-create.yaml, add-proxy.yaml, etc.
- Updated bulk operations: bulk-delete.yaml, bulk-test.yaml, bulk-update.yaml
- Converted DELETE operations to 204 No Content

#### ✅ Batch 3: Database & Extraction (7 endpoints) - COMPLETE
- **Result**: 70 → 63 violations (-7)  
- Updated database.yaml: db_bulk_query, db_bulk_stats
- Updated extraction.yaml: keyword_extract_batch
- Updated keyword-rules.yaml and keyword-sets files
- Updated individual files: query.yaml, stats.yaml, batch.yaml

## Progress Summary

**Total Progress**: 25 endpoints fixed (28% complete)
- **Started**: 88 violations
- **Current**: 63 violations  
- **Remaining**: 63 violations

## Remaining Batches

The remaining 63 violations are organized into these batches:

#### Batch 4: Scoring (~6 endpoints)
- Scoring profile management
- Campaign rescoring operations

#### Batch 5: SSE & Monitoring (~15 endpoints)
- Server-sent events
- Performance and resource monitoring

#### Batch 6: Auth & Config (~10 endpoints)
- Authentication endpoints
- Server configuration management

#### Batch 7: Campaigns (~32 endpoints)
- Largest batch - main application domain
- Campaign lifecycle management
- Bulk operations

## Tasks Per Batch

For each remaining batch:

1. **Identify Endpoints**: List specific endpoints from contract test output
2. **Update OpenAPI Specs**: Remove SuccessEnvelope refs, update to direct schemas
3. **Convert Acknowledgment Endpoints**: Change appropriate endpoints to 204 responses
4. **Regenerate Clients**: Run `npm run gen:all` 
5. **Validate Contract**: Run Phase F test to confirm violation count decrease
6. **Test Frontend**: Ensure no breaking changes

## Acknowledgment Endpoint Conversion

Convert these operation types to 204 No Content where backend already does so:
- DELETE operations (delete, bulk delete)
- POST operations that only confirm action (rescore, associate, cancel)
- State change operations without return data

## Final Cleanup Tasks

After all batches complete:

1. **Frontend Client Updates**:
   - Remove extractResponseData usage for corrected endpoints  
   - Update RTK Query endpoints to handle direct payloads
   - Remove type assertions and workarounds

2. **Schema Pruning**:
   - Remove orphaned SuccessEnvelope schema references
   - Clean up unused response type definitions

3. **Documentation Updates**:
   - Update api-contract-migrations.md Phase G section
   - Document breaking changes in client generation

4. **Contract Test Validation**:
   - Phase F contract test should pass with zero violations
   - All error responses should still use ErrorEnvelope

## Success Criteria

- [ ] Phase F contract test passes (0 violations)
- [ ] All 2xx responses use direct payload schemas
- [ ] Error responses preserve ErrorEnvelope format
- [ ] Generated clients match backend implementation
- [ ] Frontend works without extractResponseData workarounds
- [ ] Documentation updated with Phase G completion

## Risk Mitigation

- **Incremental approach**: Process in small batches to catch issues early
- **Contract testing**: Validate each batch before proceeding
- **Frontend testing**: Verify UI functionality after each batch
- **Rollback capability**: Each batch is self-contained for easy reversion

## Implementation Pattern

Each endpoint follows this transformation pattern:

**Before (SuccessEnvelope)**:
```yaml
responses:
  '200':
    description: OK
    content:
      application/json:
        schema:
          allOf:
            - $ref: '#/components/schemas/SuccessEnvelope'
            - type: object
              properties:
                data: { $ref: '#/components/schemas/SomeResponse' }
```

**After (Direct Schema)**:
```yaml
responses:
  '200':
    description: OK
    content:
      application/json:
        schema: { $ref: '#/components/schemas/SomeResponse' }
```

**Delete Operations (204)**:
```yaml
responses:
  '204':
    description: Deleted
```