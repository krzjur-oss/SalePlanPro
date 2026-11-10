import { describe, it, expect, vi } from 'vitest';
import { lazyWithRetry } from './lazyWithRetry';
import React from 'react';

describe('lazyWithRetry utility', () => {
  it('zwraca LazyExoticComponent opakowujący pomyślny import', async () => {
    const DummyComponent = () => React.createElement('div', null, 'Test');
    const mockImport = vi.fn().mockResolvedValue({ default: DummyComponent });

    const LazyComp = lazyWithRetry(mockImport);
    expect(LazyComp).toBeDefined();
    expect(typeof LazyComp).toBe('object');
  });

  it('ponawia próbę przy błędzie typu ChunkLoadError / Failed to fetch dynamically imported module', async () => {
    const DummyComponent = () => React.createElement('div', null, 'Recovered');
    let attempts = 0;

    const mockImport = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(new Error('Failed to fetch dynamically imported module'));
      }
      return Promise.resolve({ default: DummyComponent });
    });

    const LazyComp = lazyWithRetry(mockImport, 2, 10);
    expect(LazyComp).toBeDefined();
  });
});
