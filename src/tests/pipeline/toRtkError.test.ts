import { toRtkError } from '@/lib/utils/toRtkError';
// Provide a dummy Response constructor if not present (jsdom environment sometimes lacks it)
// eslint-disable-next-line @typescript-eslint/no-empty-function
if (typeof (global as any).Response === 'undefined') { (global as any).Response = function(){} as any; }
jest.mock('@/lib/api/config', () => ({ apiConfiguration: {} }));

describe('toRtkError', () => {
  it('normalizes axios-like error with response data message', () => {
    const err: any = { isAxiosError: true, response: { status: 400, data: { message: 'Bad request', code: 'E_BAD' } } };
    const norm = toRtkError(err);
    expect(norm.status).toBe(400);
    expect(norm.message).toContain('Bad request');
    expect(norm.code).toBe('E_BAD');
  });
  it('falls back to generic message', () => {
    const err: any = { message: 'Boom' };
    const norm = toRtkError(err);
    expect(norm.message).toContain('Boom');
  });
});
