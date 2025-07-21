# WebSocket Data Integrity for Phase Transitions

This document outlines the comprehensive WebSocket data integrity system implemented to ensure robust data preservation during campaign phase transitions in the single-campaign architecture.

## Overview

The WebSocket data integrity system prevents data loss during phase transitions through:
- **Sequenced Message Delivery**: Ensures proper event ordering
- **Event Deduplication**: Prevents duplicate processing
- **Atomic State Updates**: Guarantees consistent state during transitions
- **Recovery Mechanisms**: Handles connection failures gracefully
- **Data Validation**: Verifies data consistency between frontend and backend

## Key Components

### 1. Enhanced Message Types

#### PhaseTransitionPayload
```typescript
interface PhaseTransitionPayload {
  campaignId: string;
  previousPhase?: string;
  newPhase: string;
  newStatus: string;
  transitionType: string; // "manual", "automatic", "error_recovery"
  triggerReason?: string;
  prerequisitesMet: boolean;
  dataIntegrityCheck: boolean;
  domainsCount: number;
  processedCount: number;
  successfulCount: number;
  failedItems: number;
  estimatedDuration?: number;
  transitionMetadata?: Record<string, unknown>;
  rollbackData?: Record<string, unknown>;
}
```

#### WebSocketEventSequence
```typescript
interface WebSocketEventSequence {
  campaignId: string;
  eventId: string;
  sequenceNumber: number;
  eventHash: string;
  previousEventId?: string;
  checkpointData: boolean;
}
```

### 2. Backend Data Integrity Features

#### Sequenced Message Broadcasting
- **Event Ordering**: Global sequence numbers ensure proper message ordering
- **Event Hashing**: SHA-256 hashes prevent duplicate processing
- **Checkpoint Events**: Mark critical state transitions with full data snapshots

#### Retry Mechanisms
- **Message Retry Queue**: Failed sends are queued for retry with exponential backoff
- **Client Recovery**: Automatic recovery of missed events for reconnecting clients
- **Connection Monitoring**: Tracks client health and removes disconnected clients

#### Data Validation
- **Prerequisite Checking**: Validates phase transition prerequisites before execution
- **Integrity Verification**: Confirms data consistency before state changes
- **Rollback Support**: Maintains rollback data for error recovery scenarios

### 3. Frontend Data Integrity Features

#### Sequence Validation
- **Out-of-Order Detection**: Skips messages with sequence numbers older than last processed
- **Duplicate Prevention**: Maintains event hash history to prevent duplicate processing
- **Gap Detection**: Identifies missing sequence numbers and requests recovery

#### State Preservation
- **Atomic Updates**: All domain data preserved during phase transitions
- **Consistency Validation**: Compares frontend and backend domain counts
- **Error Recovery**: Graceful handling of integrity check failures

#### Reconnection Recovery
- **Event Recovery**: Requests missed events when reconnecting
- **State Synchronization**: Validates state consistency after reconnection
- **Memory Management**: Prunes old event history to prevent memory leaks

## Critical Data Integrity Scenarios

### Scenario 1: WebSocket Disconnection During DNS Phase Transition
**Problem**: User configures DNS validation while WebSocket is disconnected
**Solution**: 
- Backend stores phase transition in event history
- Frontend requests event recovery on reconnection
- Domain data preserved throughout disconnection

### Scenario 2: Concurrent Events During Phase Transition
**Problem**: Multiple WebSocket events processed during phase transition
**Solution**:
- Sequence numbers ensure proper event ordering
- Event deduplication prevents duplicate processing
- Atomic state updates prevent race conditions

### Scenario 3: Connection Drop During HTTP Phase Transition
**Problem**: WebSocket connection fails while transitioning to HTTP validation
**Solution**:
- DNS validation results preserved in frontend state
- Phase transition recorded in backend event history
- Recovery mechanism restores missed transition events

### Scenario 4: Frontend-Backend Data Inconsistency
**Problem**: Frontend and backend domain counts diverge
**Solution**:
- Data integrity checks validate consistency
- Warnings logged for count mismatches > 10 domains
- Frontend preserves data and shows error for large discrepancies

## Implementation Details

### Backend Enhancements

#### WebSocketManager Data Integrity
```go
// Event sequence tracking
eventSequenceMap sync.Map // campaignID -> last sequence number
eventHistory     sync.Map // campaignID -> []EventRecord

// Message retry and recovery
messageRetryQueue   chan RetryableMessage
connectionRecovery  chan RecoveryRequest
maxRetryAttempts    int
retryBackoffMs      int
```

#### Campaign Orchestrator Integration
```go
// Enhanced phase transition with data integrity
transitionPayload := websocket.PhaseTransitionPayload{
    CampaignID:          campaignID.String(),
    PreviousPhase:       "domain_generation",
    NewPhase:            "dns_validation",
    DataIntegrityCheck:  true,
    PrerequisitesMet:    true,
    DomainsCount:        processedItems,
    // ... additional fields
}

// Create sequenced message for data integrity
phaseTransitionMsg := websocket.CreatePhaseTransitionMessageV2(transitionPayload)
sequencedMsg := websocket.CreateSequencedMessage(campaignID.String(), phaseTransitionMsg, true)
```

### Frontend Enhancements

#### Campaign Details Store Data Preservation
```typescript
// 🛡️ DATA INTEGRITY: Enhanced phase transition handling
if (message.type === 'campaign.phase.transition' && message.data) {
  // Validate data integrity
  if (!payload.dataIntegrityCheck) {
    console.warn('⚠️ [DATA INTEGRITY] Server reported data integrity check failed');
    set({ error: 'Phase transition failed data integrity check.' });
    return;
  }
  
  // 🔥 CRITICAL: Atomic update preserving ALL domain data
  set({
    campaign: { /* updated campaign with preserved domain data */ },
    totalDomainCount: Math.max(state.totalDomainCount, payload.domainsCount),
    error: null
  });
}
```

#### WebSocket Client Recovery
```typescript
// Request event recovery for missed events
requestEventRecovery(campaignId: string): void {
  const lastSequence = this.lastSequenceNumbers.get(campaignId) || 0;
  this.send({
    type: 'request_event_recovery',
    payload: { campaignId, lastSequenceNumber: lastSequence }
  });
}
```

## Testing and Validation

### Unit Tests
- Message sequence validation
- Event deduplication logic
- State preservation during transitions
- Recovery mechanism functionality

### Integration Tests
- End-to-end phase transition flows
- WebSocket disconnection/reconnection scenarios
- Concurrent event processing
- Data consistency validation

### Load Tests
- High-volume message processing
- Connection stability under load
- Memory usage with large event histories
- Recovery performance metrics

## Monitoring and Observability

### Backend Metrics
- Event sequence gaps
- Message retry rates
- Client recovery requests
- Data integrity check failures

### Frontend Metrics
- Out-of-order message counts
- Duplicate event detections
- Recovery request frequency
- State consistency validations

### Logging
- All data integrity events logged with context
- Sequence number progression tracked
- Recovery operations detailed
- Error scenarios documented

## Best Practices

### Development
1. **Always use sequenced messages** for critical state changes
2. **Include data integrity checks** in phase transitions
3. **Preserve domain data** during all state updates
4. **Test disconnection scenarios** thoroughly
5. **Monitor event sequence gaps** in production

### Operations
1. **Monitor WebSocket connection health** regularly
2. **Alert on data integrity check failures** immediately
3. **Track recovery request patterns** for performance insights
4. **Maintain event history size limits** to prevent memory issues
5. **Log all phase transitions** for audit trails

## Future Enhancements

### Planned Improvements
- **Event Persistence**: Store critical events in database for long-term recovery
- **Advanced Recovery**: Implement smart recovery based on event dependencies
- **Performance Optimization**: Optimize event history storage and retrieval
- **Advanced Monitoring**: Real-time dashboards for data integrity metrics

### Considerations
- **Scalability**: Event history management for large numbers of campaigns
- **Performance**: Balance between data integrity and message throughput
- **Storage**: Long-term storage strategy for event history
- **Security**: Encryption of sensitive data in event payloads

This comprehensive WebSocket data integrity system ensures that domain data is never lost during phase transitions, providing a robust foundation for the single-campaign architecture.