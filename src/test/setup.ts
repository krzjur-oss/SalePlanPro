// Test setup for Vitest with fake-indexeddb and DOM mocks
import 'fake-indexeddb/auto';

// Ensure localStorage & sessionStorage exist in Node/vitest
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; }
  };
}

if (typeof sessionStorage === 'undefined') {
  const sessionStore: Record<string, string> = {};
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => sessionStore[k] ?? null,
    setItem: (k: string, v: string) => { sessionStore[k] = String(v); },
    removeItem: (k: string) => { delete sessionStore[k]; },
    clear: () => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]); },
    key: (i: number) => Object.keys(sessionStore)[i] ?? null,
    get length() { return Object.keys(sessionStore).length; }
  };
}

// Mock BroadcastChannel if missing in test environment
if (typeof BroadcastChannel === 'undefined') {
  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: any) => void) | null = null;
    constructor(name: string) {
      this.name = name;
    }
    postMessage(_data: any) {}
    close() {}
  }
  (globalThis as any).BroadcastChannel = MockBroadcastChannel;
}

// Window mocks for jsdom
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (!window.scrollTo) {
    window.scrollTo = () => {};
  }

  if (!(globalThis as any).ResizeObserver) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
