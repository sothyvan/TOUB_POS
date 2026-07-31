import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertFrontendBundleBudgets,
  OWNER_PORTAL_ENTRY_BUDGET_BYTES,
  OWNER_TAB_CHUNK_BUDGET_BYTES,
} from '../config/bundle-budget.js';

function chunk(facadeModuleId, sizeBytes) {
  return {
    type: 'chunk',
    facadeModuleId,
    code: 'x'.repeat(sizeBytes),
  };
}

test('owner portal entry and tab chunks pass within their production budgets', () => {
  assert.doesNotThrow(() => assertFrontendBundleBudgets({
    entry: chunk('C:\\repo\\frontend\\src\\pages\\OwnerPortalPage.jsx', OWNER_PORTAL_ENTRY_BUDGET_BYTES),
    dashboard: chunk('/repo/frontend/src/features/management/components/OwnerDashboard.jsx', OWNER_TAB_CHUNK_BUDGET_BYTES),
  }));
});

test('oversized owner portal entry chunk fails the production build', () => {
  assert.throws(
    () => assertFrontendBundleBudgets({
      entry: chunk('/repo/frontend/src/pages/OwnerPortalPage.jsx', OWNER_PORTAL_ENTRY_BUDGET_BYTES + 1),
    }),
    /Owner Portal entry chunk is .* exceeding its 150 KiB production budget/,
  );
});

test('oversized lazy owner tab chunk fails the production build', () => {
  assert.throws(
    () => assertFrontendBundleBudgets({
      reports: chunk('/repo/frontend/src/features/reports/components/OrderHistory.jsx', OWNER_TAB_CHUNK_BUDGET_BYTES + 1),
    }),
    /Owner Portal tab chunk is .* exceeding its 450 KiB production budget/,
  );
});
