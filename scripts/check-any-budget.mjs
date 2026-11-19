/* global console, process */
import path from 'node:path';
import { ESLint } from 'eslint';

/**
 * Maksymalna dopuszczalna liczba wystąpień `@typescript-eslint/no-explicit-any` w `src`.
 * Próg wyłącznie malejący — po zmniejszeniu liczby `any` obniż tę wartość.
 */
const MAX_ANY_COUNT = 184;

async function main() {
  const eslint = new ESLint({
    overrideConfig: {
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  });

  const results = await eslint.lintFiles(['src']);
  const byFile = [];
  let anyCount = 0;

  for (const result of results) {
    const fileAnyCount = result.messages.filter(
      (msg) => msg.ruleId === '@typescript-eslint/no-explicit-any'
    ).length;
    if (fileAnyCount > 0) {
      anyCount += fileAnyCount;
      byFile.push({
        file: path.relative(process.cwd(), result.filePath),
        count: fileAnyCount,
      });
    }
  }

  byFile.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

  console.log(`[check-any-budget] Wykryto ${anyCount} użyć 'any' (limit CI: ${MAX_ANY_COUNT}).`);
  if (byFile.length > 0) {
    const top = byFile.slice(0, 10).map((item) => `  - ${item.file}: ${item.count}`);
    console.log('[check-any-budget] Najwięcej wystąpień:\n' + top.join('\n'));
  }

  if (anyCount > MAX_ANY_COUNT) {
    console.error(
      `[check-any-budget] BŁĄD: Liczba użyć 'any' (${anyCount}) przekroczyła próg (${MAX_ANY_COUNT}). ` +
        'Usuń nowe wystąpienia `any` lub zastąp je jawnymi typami / `unknown`.'
    );
    process.exitCode = 1;
    return;
  }

  if (anyCount < MAX_ANY_COUNT) {
    console.log(
      `[check-any-budget] Świetnie! Liczba użyć 'any' spadła (${anyCount} < ${MAX_ANY_COUNT}). ` +
        `Zmniejsz MAX_ANY_COUNT w scripts/check-any-budget.mjs do ${anyCount}, aby utrwalić postęp.`
    );
  }
}

main().catch((err) => {
  console.error('[check-any-budget] Nieoczekiwany błąd:', err);
  process.exitCode = 1;
});
