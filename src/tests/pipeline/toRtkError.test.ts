import { toRtkError } from '@/lib/utils/toRtkError';
// Provide a dummy Response constructor if not present (jsdom environment sometimes lacks it)
if (typeof (global as unknown).Response === 'undefined') { (global as unknown).Response = function(){} as unknown; }
jest.mock('@/lib/api/config', () => ({ apiConfiguration: {} }));

describe('toRtkError', () => {
  it('normalizes axios-like error with response data message', () => {
    const err: unknown = { isAxiosError: true, response: { status: 400, data: { message: 'Bad request', code: 'E_BAD' } } };
    const norm = toRtkError(err);
    expect(norm.status).toBe(400);
    expect(norm.message).toContain('Bad request');
    expect(norm.code).toBe('E_BAD');
  });
  it('falls back to generic message', () => {
    const err: unknown = { message: 'Boom' };
    const norm = toRtkError(err);
    expect(norm.message).toContain('Boom');
  });
});
