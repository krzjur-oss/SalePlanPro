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
if (typeof BroadcastChannel === 'undefined' || !(globalThis as any).BroadcastChannel) {
  const channelRegistry = new Map<string, Set<any>>();
  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: any) => void) | null = null;
    private listeners: ((event: any) => void)[] = [];
    constructor(name: string) {
      this.name = name;
      if (!channelRegistry.has(name)) {
        channelRegistry.set(name, new Set());
      }
      channelRegistry.get(name)!.add(this);
    }
    postMessage(data: any) {
      const set = channelRegistry.get(this.name);
      if (set) {
        set.forEach(ch => {
          if (ch !== this) {
            const ev = { data };
            if (typeof ch.onmessage === 'function') {
              try { ch.onmessage(ev); } catch (e) { console.error(e); }
            }
            ch.listeners.forEach((l: any) => {
              try { l(ev); } catch (e) { console.error(e); }
            });
          }
        });
      }
    }
    addEventListener(type: string, listener: any) {
      if (type === 'message') {
        this.listeners.push(listener);
      }
    }
    removeEventListener(type: string, listener: any) {
      if (type === 'message') {
        this.listeners = this.listeners.filter(l => l !== listener);
      }
    }
    close() {
      channelRegistry.get(this.name)?.delete(this);
    }
  }
  (globalThis as any).BroadcastChannel = MockBroadcastChannel;
  if (typeof window !== 'undefined') {
    (window as any).BroadcastChannel = MockBroadcastChannel;
  }
}

if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined' && !(window as any).BroadcastChannel) {
  (window as any).BroadcastChannel = (globalThis as any).BroadcastChannel;
}

// Window mocks for jsdom
if (typeof window !== 'undefined') {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('A suspended resource finished loading inside a test')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}
