/**
 * Unit tests for Type Safety Primitives
 */

import {
  Ok,
  Err,
  assertNever,
  ensurePath,
  isNonEmptyArray,
  selectRandom,
  selectRandomNonEmpty,
  applyPatchOp,
  createMessageEvent,
  normalizeArmStats,
  StreamPatchOp,
  NonEmptyArray
} from '../typeSafetyPrimitives';

describe('Type Safety Primitives', () => {
  describe('Result monad', () => {
    it('should create successful results', () => {
      const result = Ok('success');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('success');
      }
    });

    it('should create error results', () => {
      const result = Err('error message');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('error message');
      }
    });
  });

  describe('assertNever', () => {
    it('should throw an error with the unexpected value', () => {
      expect(() => assertNever('unexpected' as never)).toThrow('Unexpected value: "unexpected"');
    });
  });

  describe('ensurePath', () => {
    it('should create nested object paths', () => {
      const obj = {};
      const result = ensurePath(obj, ['a', 'b', 'c']);
      expect(obj).toEqual({ a: { b: { c: {} } } });
      expect(result).toBe((obj as unknown).a.b.c);
    });

    it('should work with existing paths', () => {
      const obj = { a: { b: { existing: 'value' } } };
      ensurePath(obj, ['a', 'b', 'c']);
      expect(obj).toEqual({ a: { b: { existing: 'value', c: {} } } });
    });

    it('should throw on non-object input', () => {
      expect(() => ensurePath(null, ['a'])).toThrow('Cannot ensure path on non-object');
      expect(() => ensurePath('string', ['a'])).toThrow('Cannot ensure path on non-object');
    });
  });

  describe('NonEmptyArray utilities', () => {
    it('should identify non-empty arrays', () => {
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
      expect(isNonEmptyArray(['a'])).toBe(true);
      expect(isNonEmptyArray([])).toBe(false);
    });

    it('should select random elements safely', () => {
      expect(selectRandom([])).toBe(null);
      
      const singleItem = selectRandom(['only']);
      expect(singleItem).toBe('only');
      
      const multipleItems = [1, 2, 3, 4, 5];
      const selected = selectRandom(multipleItems);
      expect(multipleItems).toContain(selected);
    });

    it('should select from non-empty arrays', () => {
      const nonEmpty: NonEmptyArray<string> = ['a', 'b', 'c'];
      const selected = selectRandomNonEmpty(nonEmpty);
      expect(nonEmpty).toContain(selected);
    });
  });

  describe('Stream patch operations', () => {
    it('should apply set operations', () => {
      const obj = { a: { b: 1 } };
      const op: StreamPatchOp = { type: 'set', path: 'a.b', value: 42 };
      const result = applyPatchOp(obj, op);
      
      expect(result.ok).toBe(true);
      expect(obj.a.b).toBe(42);
    });

    it('should apply delete operations', () => {
      const obj = { a: { b: 1, c: 2 } };
      const op: StreamPatchOp = { type: 'delete', path: 'a.b' };
      const result = applyPatchOp(obj, op);
      
      expect(result.ok).toBe(true);
      expect(obj.a.b).toBeUndefined();
      expect(obj.a.c).toBe(2);
    });

    it('should apply increment operations', () => {
      const obj = { a: { counter: 5 } };
      const op: StreamPatchOp = { type: 'inc', path: 'a.counter', value: 3 };
      const result = applyPatchOp(obj, op);
      
      expect(result.ok).toBe(true);
      expect(obj.a.counter).toBe(8);
    });

    it('should apply append operations', () => {
      const obj = { a: { list: [1, 2] } };
      const op: StreamPatchOp = { type: 'append', path: 'a.list', value: 3 };
      const result = applyPatchOp(obj, op);
      
      expect(result.ok).toBe(true);
      expect(obj.a.list).toEqual([1, 2, 3]);
    });

    it('should create arrays for append on non-arrays', () => {
      const obj = {};
      const op: StreamPatchOp = { type: 'append', path: 'newList', value: 'first' };
      const result = applyPatchOp(obj, op);
      
      expect(result.ok).toBe(true);
      expect((obj as unknown).newList).toEqual(['first']);
    });

    it('should handle invalid paths', () => {
      const obj = {};
      const op: StreamPatchOp = { type: 'set', path: '', value: 'test' };
      const result = applyPatchOp(obj, op);
      
      expect(result.ok).toBe(false);
    });

    it('should handle unknown operations', () => {
      const obj = {};
      const op = { type: 'unknown', path: 'test', value: 'test' } as unknown;
      const result = applyPatchOp(obj, op);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Unknown operation type');
      }
    });
  });

  describe('MessageEvent factory', () => {
    it('should create MessageEvent with string data', () => {
      const event = createMessageEvent('test message');
      expect(event).toBeInstanceOf(MessageEvent);
      expect(event.data).toBe('test message');
    });

    it('should serialize object data', () => {
      const data = { test: 'value', number: 42 };
      const event = createMessageEvent(data);
      expect(event).toBeInstanceOf(MessageEvent);
      expect(event.data).toBe(JSON.stringify(data));
    });
  });

  describe('Arm stats normalization', () => {
    it('should normalize undefined stats with defaults', () => {
      const result = normalizeArmStats({});
      expect(result).toEqual({
        pulls: 0,
        totalReward: 0,
        averageReward: 0,
        confidence: 0
      });
    });

    it('should preserve existing stats', () => {
      const stats = {
        pulls: 10,
        totalReward: 25.5,
        averageReward: 2.55,
        confidence: 0.95
      };
      const result = normalizeArmStats(stats);
      expect(result).toEqual(stats);
    });

    it('should fill in partial stats', () => {
      const result = normalizeArmStats({
        pulls: 5,
        totalReward: 12.5
      });
      expect(result).toEqual({
        pulls: 5,
        totalReward: 12.5,
        averageReward: 0,
        confidence: 0
      });
    });
  });
});