/**
 * Collaborative Draft Store (Phase 11)
 * Lightweight CRDT-like store for collaborative scenario drafts
 */

import { useCollaborativeDrafts } from '../../lib/feature-flags-simple';
import { telemetryService } from '../campaignMetrics/telemetryService';

// Feature flag check
const isCollabDraftsEnabled = (): boolean => {
  return useCollaborativeDrafts();
};

/**
 * Draft types
 */
export type DraftType = 'scenario' | 'policy' | 'visualization_config' | 'experiment_config';

/**
 * Draft change operation
 */
export interface DraftPatch {
  id: string;
  field: string;
  operation: 'set' | 'delete' | 'array_append' | 'array_remove' | 'merge';
  value: any;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

/**
 * Draft state
 */
export interface DraftState {
  id: string;
  type: DraftType;
  targetId: string; // ID of the object being drafted
  data: Record<string, any>;
  patches: DraftPatch[];
  lastModified: Record<string, number>; // field -> timestamp
  collaborators: string[]; // User IDs
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  resolved: boolean;
  strategy: 'last_writer_wins' | 'semantic_merge' | 'user_choice';
  conflicts: Array<{
    field: string;
    localValue: any;
    remoteValue: any;
    resolution: any;
  }>;
}

/**
 * Remote state for merging
 */
export interface RemoteState {
  data: Record<string, any>;
  lastModified: Record<string, number>;
  version: number;
  patches: DraftPatch[];
}

/**
 * Draft Store Service Implementation
 */
class DraftStoreService {
  private drafts = new Map<string, DraftState>();
  private sessionId = this.generateSessionId();

  /**
   * Open a new draft or get existing one
   */
  openDraft(type: DraftType, targetId: string, userId?: string): string {
    if (!isCollabDraftsEnabled()) {
      throw new Error('Collaborative drafts are disabled');
    }

    // Check for existing draft
    const existingDraft = Array.from(this.drafts.values())
      .find(draft => draft.type === type && draft.targetId === targetId);

    if (existingDraft) {
      // Add user as collaborator if not already present
      if (userId && !existingDraft.collaborators.includes(userId)) {
        existingDraft.collaborators.push(userId);
        existingDraft.updatedAt = new Date().toISOString();
      }
      return existingDraft.id;
    }

    // Create new draft
    const draftId = `draft_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const draft: DraftState = {
      id: draftId,
      type,
      targetId,
      data: {},
      patches: [],
      lastModified: {},
      collaborators: userId ? [userId] : [],
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId
    };

    this.drafts.set(draftId, draft);

    telemetryService.emitTelemetry('draft_opened', {
      draftId,
      type,
      targetId,
      userId
    });

    return draftId;
  }

  /**
   * Apply a change to a draft
   */
  applyDraftChange(draftId: string, patch: Omit<DraftPatch, 'id' | 'timestamp' | 'sessionId'>): void {
    if (!isCollabDraftsEnabled()) {
      throw new Error('Collaborative drafts are disabled');
    }

    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const fullPatch: DraftPatch = {
      ...patch,
      id: `patch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    // Apply patch to draft data
    this.applyPatchToData(draft.data, fullPatch);

    // Update metadata
    draft.patches.push(fullPatch);
    draft.lastModified[fullPatch.field] = fullPatch.timestamp;
    draft.version += 1;
    draft.updatedAt = new Date().toISOString();

    // Add user as collaborator if not present
    if (fullPatch.userId && !draft.collaborators.includes(fullPatch.userId)) {
      draft.collaborators.push(fullPatch.userId);
    }

    telemetryService.emitTelemetry('draft_change_applied', {
      draftId,
      field: fullPatch.field,
      operation: fullPatch.operation,
      userId: fullPatch.userId
    });
  }

  /**
   * Merge remote state into local draft
   */
  mergeRemote(draftId: string, remoteState: RemoteState): ConflictResolution {
    if (!isCollabDraftsEnabled()) {
      return { resolved: false, strategy: 'last_writer_wins', conflicts: [] };
    }

    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    const conflicts: ConflictResolution['conflicts'] = [];
    const resolvedData = { ...draft.data };

    // Detect conflicts by comparing lastModified timestamps
    for (const [field, remoteTimestamp] of Object.entries(remoteState.lastModified)) {
      const localTimestamp = draft.lastModified[field];
      const remoteValue = this.getFieldValue(remoteState.data, field);
      const localValue = this.getFieldValue(draft.data, field);

      // Check for conflict
      if (localTimestamp && localTimestamp !== remoteTimestamp && localValue !== remoteValue) {
        const conflict = {
          field,
          localValue,
          remoteValue,
          resolution: this.resolveConflict(field, localValue, remoteValue, localTimestamp, remoteTimestamp)
        };

        conflicts.push(conflict);
        this.setFieldValue(resolvedData, field, conflict.resolution);
        
        telemetryService.emitTelemetry('draft_conflict_detected', {
          draftId,
          field,
          localTimestamp,
          remoteTimestamp
        });
      } else if (!localTimestamp || remoteTimestamp > localTimestamp) {
        // No conflict, remote is newer
        this.setFieldValue(resolvedData, field, remoteValue);
        draft.lastModified[field] = remoteTimestamp;
      }
    }

    // Update draft with resolved data
    draft.data = resolvedData;
    draft.version = Math.max(draft.version, remoteState.version) + 1;
    draft.updatedAt = new Date().toISOString();

    // Merge patches (simplified - just append remote patches we don't have)
    const existingPatchIds = new Set(draft.patches.map(p => p.id));
    const newPatches = remoteState.patches.filter(p => !existingPatchIds.has(p.id));
    draft.patches.push(...newPatches);

    telemetryService.emitTelemetry('draft_remote_merged', {
      draftId,
      conflictsCount: conflicts.length,
      newPatchesCount: newPatches.length,
      newVersion: draft.version
    });

    return {
      resolved: true,
      strategy: conflicts.length > 0 ? 'semantic_merge' : 'last_writer_wins',
      conflicts
    };
  }

  /**
   * Get draft state
   */
  getDraft(draftId: string): DraftState | undefined {
    if (!isCollabDraftsEnabled()) {
      return undefined;
    }
    return this.drafts.get(draftId);
  }

  /**
   * Get all drafts for a target
   */
  getDraftsForTarget(type: DraftType, targetId: string): DraftState[] {
    if (!isCollabDraftsEnabled()) {
      return [];
    }

    return Array.from(this.drafts.values())
      .filter(draft => draft.type === type && draft.targetId === targetId);
  }

  /**
   * Close and optionally save a draft
   */
  closeDraft(draftId: string, save: boolean = false): boolean {
    if (!isCollabDraftsEnabled()) {
      return false;
    }

    const draft = this.drafts.get(draftId);
    if (!draft) {
      return false;
    }

    if (save) {
      // In a real implementation, this would save to a persistent store
      telemetryService.emitTelemetry('draft_saved', {
        draftId,
        type: draft.type,
        targetId: draft.targetId,
        finalVersion: draft.version,
        collaboratorsCount: draft.collaborators.length,
        patchesCount: draft.patches.length
      });
    }

    const deleted = this.drafts.delete(draftId);

    telemetryService.emitTelemetry('draft_closed', {
      draftId,
      saved: save
    });

    return deleted;
  }

  /**
   * Apply a patch to data object
   */
  private applyPatchToData(data: Record<string, any>, patch: DraftPatch): void {
    switch (patch.operation) {
      case 'set':
        this.setFieldValue(data, patch.field, patch.value);
        break;

      case 'delete':
        this.deleteField(data, patch.field);
        break;

      case 'array_append':
        const currentArray = this.getFieldValue(data, patch.field) || [];
        if (Array.isArray(currentArray)) {
          currentArray.push(patch.value);
          this.setFieldValue(data, patch.field, currentArray);
        }
        break;

      case 'array_remove':
        const arrayToModify = this.getFieldValue(data, patch.field);
        if (Array.isArray(arrayToModify)) {
          const filteredArray = arrayToModify.filter(item => 
            JSON.stringify(item) !== JSON.stringify(patch.value)
          );
          this.setFieldValue(data, patch.field, filteredArray);
        }
        break;

      case 'merge':
        const currentValue = this.getFieldValue(data, patch.field) || {};
        if (typeof currentValue === 'object' && typeof patch.value === 'object') {
          this.setFieldValue(data, patch.field, { ...currentValue, ...patch.value });
        }
        break;

      default:
        console.warn(`Unknown patch operation: ${patch.operation}`);
    }
  }

  /**
   * Get field value using dot notation
   */
  private getFieldValue(data: Record<string, any>, field: string): any {
    const fieldParts = field.split('.');
    let value = data;

    for (const part of fieldParts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set field value using dot notation
   */
  private setFieldValue(data: Record<string, any>, field: string, value: any): void {
    const fieldParts = field.split('.');
    let current = data;

    for (let i = 0; i < fieldParts.length - 1; i++) {
      const part = fieldParts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[fieldParts[fieldParts.length - 1]] = value;
  }

  /**
   * Delete field using dot notation
   */
  private deleteField(data: Record<string, any>, field: string): void {
    const fieldParts = field.split('.');
    let current = data;

    for (let i = 0; i < fieldParts.length - 1; i++) {
      const part = fieldParts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        return; // Field doesn't exist
      }
      current = current[part];
    }

    delete current[fieldParts[fieldParts.length - 1]];
  }

  /**
   * Resolve conflict between local and remote values
   */
  private resolveConflict(
    field: string,
    localValue: any,
    remoteValue: any,
    localTimestamp: number,
    remoteTimestamp: number
  ): any {
    // Implement conflict resolution strategy
    
    // For numbers, try semantic merge (take average)
    if (typeof localValue === 'number' && typeof remoteValue === 'number') {
      return (localValue + remoteValue) / 2;
    }

    // For arrays, try to merge
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      const merged = [...localValue];
      for (const item of remoteValue) {
        if (!merged.some(existing => JSON.stringify(existing) === JSON.stringify(item))) {
          merged.push(item);
        }
      }
      return merged;
    }

    // For objects, try to merge
    if (typeof localValue === 'object' && typeof remoteValue === 'object' && 
        localValue !== null && remoteValue !== null) {
      return { ...localValue, ...remoteValue };
    }

    // Fall back to last writer wins
    return remoteTimestamp > localTimestamp ? remoteValue : localValue;
  }

  /**
   * Generate session ID for this browser session
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const draftStore = new DraftStoreService();