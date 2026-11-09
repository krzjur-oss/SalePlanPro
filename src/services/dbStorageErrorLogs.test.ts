import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  logAppError, 
  truncateErrorStack, 
  getAppErrorLogs, 
  clearAppErrorLogs, 
  MAX_ERROR_LOGS_LIMIT, 
  MAX_ERROR_STACK_LENGTH, 
  STORAGE_KEYS,
  getStorageItemSync
} from './dbStorage';

describe('dbStorage Error Logging (dziennik błędów)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAppErrorLogs();
  });

  it('skraca stos błędu do 1024 znaków (1 kB)', () => {
    const shortStack = 'Error: Błąd\n  at Component.render';
    expect(truncateErrorStack(shortStack)).toBe(shortStack);

    // Stos o długości 2500 znaków
    const longStack = 'A'.repeat(2500);
    const truncated = truncateErrorStack(longStack);
    expect(truncated.length).toBe(MAX_ERROR_STACK_LENGTH + '... [skrócono do 1 kB]'.length);
    expect(truncated.startsWith('A'.repeat(MAX_ERROR_STACK_LENGTH))).toBe(true);
    expect(truncated.endsWith('... [skrócono do 1 kB]')).toBe(true);
  });

  it('zapisuje błąd, skraca stos do 1 kB i emituje zdarzenie app-error-added', () => {
    const eventSpy = vi.fn();
    window.addEventListener('app-error-added', eventSpy);

    const longStack = 'Error: Runtime crash\n' + 'stack line\n'.repeat(200);
    const logged = logAppError('Błąd renderowania planu', longStack, 'runtime');

    expect(logged).not.toBeNull();
    expect(logged?.message).toBe('Błąd renderowania planu');
    expect(logged?.type).toBe('runtime');
    expect(logged?.stack?.length).toBeLessThanOrEqual(MAX_ERROR_STACK_LENGTH + 30);
    expect(logged?.stack).toContain('[skrócono do 1 kB]');

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const eventDetail = eventSpy.mock.calls[0][0].detail;
    expect(eventDetail.id).toBe(logged?.id);

    // Dostępność synchroniczna
    const syncLogs = getStorageItemSync<any[]>(STORAGE_KEYS.ERROR_LOGS);
    expect(syncLogs).toHaveLength(1);
    expect(syncLogs?.[0].message).toBe('Błąd renderowania planu');

    window.removeEventListener('app-error-added', eventSpy);
  });

  it('ogranicza dziennik błędów do maksymalnie 50 wpisów (MAX_ERROR_LOGS_LIMIT)', async () => {
    // Generujemy 70 błędów
    for (let i = 1; i <= 70; i++) {
      logAppError(`Błąd numer ${i}`, `Stack ${i}`, 'runtime');
    }

    const logs = await getAppErrorLogs();
    expect(logs.length).toBe(MAX_ERROR_LOGS_LIMIT);
    expect(logs.length).toBe(50);

    // Najnowszy błąd (numer 70) powinien być na początku
    expect(logs[0].message).toBe('Błąd numer 70');
    // Najstarszy zachowany powinien być numer 21 (70 - 50 + 1)
    expect(logs[logs.length - 1].message).toBe('Błąd numer 21');
  });

  it('clearAppErrorLogs czyści wpisy w localStorage i IndexedDB', async () => {
    logAppError('Test error 1');
    logAppError('Test error 2');

    let logs = await getAppErrorLogs();
    expect(logs.length).toBe(2);

    await clearAppErrorLogs();

    logs = await getAppErrorLogs();
    expect(logs.length).toBe(0);
    expect(getStorageItemSync(STORAGE_KEYS.ERROR_LOGS)).toBeNull();
  });
});
