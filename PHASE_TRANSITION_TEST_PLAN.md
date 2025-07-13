# Phase Transition Atomic Transaction Test Plan

## Test Setup

### Prerequisites
1. Backend server running with DNS campaign service
2. Frontend connected to WebSocket
3. A completed domain generation campaign ready for DNS validation

## Test Scenarios

### Test 1: Atomic Transaction Verification
**Objective**: Verify that campaign state changes happen atomically

**Steps**:
1. Trigger DNS validation on a completed domain generation campaign
2. Monitor database logs for transaction boundaries
3. Verify no intermediate states are visible

**Expected Results**:
- ✅ Single transaction log entry: "DNS_Phase_Transition"
- ✅ Campaign status and currentPhase updated together
- ✅ No race condition windows where partial state is visible

### Test 2: WebSocket Event Broadcasting
**Objective**: Verify real-time event broadcasting works

**Steps**:
1. Connect to campaign WebSocket
2. Trigger DNS validation phase transition
3. Monitor for `phase_transition` WebSocket message

**Expected Results**:
- ✅ `phase_transition` message received immediately after transaction commit
- ✅ Message contains correct campaign ID and phase data
- ✅ Message arrives before any subsequent API calls

### Test 3: Cache Invalidation
**Objective**: Verify cache is invalidated in real-time

**Steps**:
1. Load campaign data (should be cached)
2. Trigger DNS validation phase transition
3. Immediately call `getRichCampaignData()` again

**Expected Results**:
- ✅ Cache is immediately invalidated after phase transition
- ✅ Fresh data is fetched showing new campaign phase
- ✅ No 30-second stale data window

### Test 4: Frontend UI Updates
**Objective**: Verify UI updates immediately on phase transition

**Steps**:
1. Open campaign detail page
2. Trigger DNS validation phase transition
3. Observe UI changes

**Expected Results**:
- ✅ Campaign phase indicator updates immediately
- ✅ Domain loading switches to phase-aware mode
- ✅ Generated domains appear without page refresh

## Implementation Status

### ✅ Backend Changes
- [x] Atomic transaction implementation in `dnsCampaignServiceImpl.atomicPhaseTransition()`
- [x] WebSocket event broadcasting in `broadcastPhaseTransitionEvent()`
- [x] Single transaction path for phase transitions

### ✅ Frontend Changes
- [x] Phase transition message type and interfaces
- [x] Real-time cache invalidation in `campaignDataService.ts`
- [x] WebSocket message routing in campaign detail page
- [x] Event-driven cache management

## Key Files Modified

### Backend
- `backend/internal/services/dns_campaign_service.go` - Atomic transactions
- `src/lib/websocket/message-handlers.ts` - Message types

### Frontend  
- `src/lib/services/campaignDataService.ts` - Cache invalidation
- `src/app/campaigns/[id]/page.tsx` - WebSocket handling

## Test Commands

```bash
# Backend: Check transaction logs
grep "DNS_Phase_Transition" backend-logs.txt

# Frontend: Monitor WebSocket messages
console.log("Listening for phase_transition events")

# Cache invalidation test
clearRichDataCache('campaign-id'); // Manual test
```

## Success Criteria

1. **No race conditions** - Campaign state changes atomically
2. **Real-time updates** - WebSocket events trigger immediate cache invalidation  
3. **Consistent UI** - Domain loading works immediately after phase transitions
4. **Performance** - Cache invalidation happens instantly, not after 30 seconds

## Risk Mitigation

- **Transaction rollback** - Automatic rollback on any step failure
- **WebSocket resilience** - Browser events as fallback for components not directly connected
- **Cache fallback** - Graceful degradation if WebSocket events fail
- **Logging** - Comprehensive logging for debugging

The implementation provides a robust, event-driven solution that eliminates the timing-based issues identified in the investigation.