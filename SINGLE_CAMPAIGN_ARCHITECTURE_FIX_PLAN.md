# 🏗️ Single-Campaign Architecture Fix Plan

## 📋 Overview
Fix critical architectural misalignment where backend services create separate campaigns instead of using single-campaign phase transitions with in-place domain status tracking.

## ✅ Current Status
- **Database Schema**: ✅ Correctly designed with status columns on `generated_domains`
- **Migration 000034**: ✅ Applied with enterprise-scale indexing
- **Performance Infrastructure**: ✅ Ready for 2-3M+ domain processing
- **Issue**: ❌ Backend services violate single-campaign design

## 🎯 Fix Strategy

### **Phase A: Backend Service Alignment**

#### **A1. Fix DNS Campaign Service** 
**File**: `backend/internal/services/dns_campaign_service.go`
**Current Problem**: Creates separate campaigns via `CreateCampaign`
**Solution**: Transition existing campaign type + update `generated_domains.dns_status`

**Tasks**:
- [ ] Replace `CreateCampaign` with campaign type transition logic
- [ ] Update validation processing to write to `generated_domains.dns_status` 
- [ ] Remove dependency on `dns_validation_results` table
- [ ] Implement in-place domain status updates during DNS validation

#### **A2. Fix HTTP Keyword Service**
**File**: `backend/internal/services/http_keyword_campaign_service.go` 
**Current Problem**: Creates separate campaigns, requires DNS campaign source
**Solution**: Transition existing campaign type + update `generated_domains.http_status`

**Tasks**:
- [ ] Replace `CreateCampaign` with campaign type transition logic
- [ ] Update validation processing to write to `generated_domains.http_status`
- [ ] Remove dependency on `http_keyword_results` table
- [ ] Implement in-place domain status updates during HTTP validation

#### **A3. Standardize Campaign Orchestrator**
**File**: `backend/internal/services/campaign_orchestrator_service.go`
**Current Problem**: Conflicting patterns for `campaignType` vs `currentPhase`
**Solution**: Choose single consistent transition pattern

**Tasks**:
- [ ] Define clear transition pattern: `campaignType` changes OR `currentPhase` changes
- [ ] Update `transitionToDNSValidation` for consistent behavior
- [ ] Update `transitionToHTTPValidation` for consistent behavior
- [ ] Ensure all phase transitions follow same pattern

### **Phase B: API Handler Updates**

#### **B1. Fix DNS Validation Endpoints**
**File**: `backend/internal/api/campaign_orchestrator_handlers.go`
**Current Problem**: Routes to separate campaign creation
**Solution**: Route to in-place campaign updates

**Tasks**:
- [ ] Update `/campaigns/{id}/validate-dns` to call campaign transition
- [ ] Ensure validation triggers in-place domain status updates
- [ ] Remove separate campaign creation logic

#### **B2. Fix HTTP Validation Endpoints**
**Current Problem**: Routes to separate campaign creation
**Solution**: Route to in-place campaign updates

**Tasks**:
- [ ] Update `/campaigns/{id}/validate-http` to call campaign transition
- [ ] Ensure validation triggers in-place domain status updates
- [ ] Remove separate campaign creation logic

### **Phase C: Frontend Alignment**

#### **C1. Fix PhaseConfiguration Component**
**File**: `src/components/campaigns/PhaseConfiguration.tsx`
**Current Problem**: May call `CreateCampaign` instead of `UpdateCampaign`
**Solution**: Ensure all phase transitions use `UpdateCampaign`

**Tasks**:
- [ ] Verify DNS phase transition calls `UpdateCampaign`
- [ ] Verify HTTP phase transition calls `UpdateCampaign`
- [ ] Remove any `CreateCampaign` logic for phase transitions

#### **C2. Update State Management**
**Files**: `src/hooks/useCampaignOperations.ts`, `src/components/dashboard/LatestActivityTable.tsx`
**Current Problem**: Logic assumes separate campaigns for each phase
**Solution**: Handle single-campaign workflow

**Tasks**:
- [ ] Update campaign operations for single-campaign transitions
- [ ] Fix dashboard logic for single-campaign phase tracking
- [ ] Update domain status display for in-place updates

### **Phase D: Data Migration & Cleanup**

#### **D1. Migrate Existing Data**
**Current Problem**: Existing data in separate result tables
**Solution**: Migrate to status columns on `generated_domains`

**Tasks**:
- [ ] Create migration to copy `dns_validation_results` to `generated_domains.dns_status`
- [ ] Create migration to copy `http_keyword_results` to `generated_domains.http_status`
- [ ] Verify data integrity after migration

#### **D2. Remove Legacy Tables (Optional)**
**Note**: Keep tables for now, mark as deprecated
**Tasks**:
- [ ] Add deprecation comments to result table schemas
- [ ] Plan eventual removal after validation period

## 🚀 Execution Order

### **Sprint 1: Core Backend Fixes**
1. **A3**: Standardize Campaign Orchestrator transition pattern
2. **A1**: Fix DNS Campaign Service 
3. **A2**: Fix HTTP Keyword Service
4. **B1**: Fix DNS validation endpoints
5. **B2**: Fix HTTP validation endpoints

### **Sprint 2: Frontend & Integration**
6. **C1**: Fix PhaseConfiguration component
7. **C2**: Update state management
8. **D1**: Migrate existing data

### **Sprint 3: Testing & Verification**
9. Test complete workflow: domain generation → DNS → HTTP phases
10. Verify enterprise-scale performance (2-3M+ domains)
11. Final cleanup and documentation

## ✅ Success Criteria

- [ ] Single campaign transitions through all phases without creating separate campaigns
- [ ] Domain status updates happen in-place on `generated_domains` table
- [ ] Frontend correctly handles single-campaign workflow
- [ ] Complete workflow tested: generation → DNS → HTTP phases
- [ ] Enterprise-scale performance validated (2-3M+ domain processing)
- [ ] No regressions in existing functionality

## 📊 Expected Impact

**Performance**: 20,000x capacity increase (5K → 100M+ domains)
**Efficiency**: Single-campaign design eliminates redundant data structures
**Scalability**: Enterprise-ready for 2-3M+ domain processing operations
**Maintainability**: Simplified architecture aligned with schema design