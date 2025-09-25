// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView for Radix UI components (standard fix for JSDOM)
Element.prototype.scrollIntoView = jest.fn();

// Mock hasPointerCapture and setPointerCapture for Radix UI Select component
HTMLElement.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
HTMLElement.prototype.setPointerCapture = jest.fn();
HTMLElement.prototype.releasePointerCapture = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  useParams: () => ({
    id: '',
  }),
}));

// Mock useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// ------------------------------------------------------------
// Phase 2C Polyfills (TEST ONLY)
// ------------------------------------------------------------

// Worker mock (basic message passing)
if (!(global as any).Worker) {
  class MockWorker {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;
    private _terminated = false;
    postMessage(data: any) {
      // Simulate async processing
      if (this._terminated) return;
      setTimeout(() => {
        this.onmessage?.({ data } as MessageEvent);
      }, 0);
    }
    terminate() { this._terminated = true; }
    addEventListener(type: string, cb: any) {
      if (type === 'message') this.onmessage = cb;
      if (type === 'error') this.onerror = cb;
    }
    removeEventListener() {}
    dispatchEvent() { return true; }
  }
  ;(global as any).Worker = MockWorker as unknown as Worker;
}

// EventSource mock
if (!(global as any).EventSource) {
  class MockEventSource {
    url: string; readyState = 1; onmessage: any; onerror: any; onopen: any; listeners: Record<string, any[]> = {};
    constructor(url: string) { this.url = url; setTimeout(()=> this.onopen?.({})); }
    close() { this.readyState = 2; }
    addEventListener(type: string, cb: any) { (this.listeners[type] ||= []).push(cb); }
    removeEventListener(type: string, cb: any) { this.listeners[type] = (this.listeners[type]||[]).filter(f=>f!==cb); }
    // Test helper to emit events
    _emit(type: string, data: any) { (this.listeners[type]||[]).forEach(cb=>cb({ data: JSON.stringify(data) })); if(type==='message') this.onmessage?.({ data: JSON.stringify(data) }); }
  }
  ;(global as any).EventSource = MockEventSource as unknown as EventSource;
}

// PerformanceObserver mock
if (!(global as any).PerformanceObserver) {
  class MockPerformanceObserver {
    constructor(private callback: any) {}
    observe() { /* no-op */ }
    disconnect() { /* no-op */ }
    takeRecords() { return []; }
  }
  ;(global as any).PerformanceObserver = MockPerformanceObserver;
}

// btoa/atob polyfill (Node 18+ often has atob via DOM shim but ensure presence)
if (!(global as any).btoa) {
  ;(global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (!(global as any).atob) {
  ;(global as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
}

// setImmediate polyfill
if (!(global as any).setImmediate) {
  ;(global as any).setImmediate = (fn: (...args:any[])=>void, ...args:any[]) => setTimeout(fn, 0, ...args);
}

// WebAssembly presence guard (some code checks for it)
if (!(global as any).WebAssembly) {
  ;(global as any).WebAssembly = { instantiate: () => Promise.reject(new Error('WASM not available in tests')) };
}

// Mock Math.random for snapshot consistency if needed
// const mockMath = Object.create(global.Math);
// mockMath.random = () => 0.5;
// global.Math = mockMath;

// Silence console.error and console.warn during tests to keep output clean if necessary
// You might want to enable this selectively or ensure tests don't cause errors.
// beforeEach(() => {
//   jest.spyOn(console, 'error').mockImplementation(jest.fn());
//   jest.spyOn(console, 'warn').mockImplementation(jest.fn());
// });
