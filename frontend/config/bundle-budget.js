const KIB = 1024;

export const OWNER_PORTAL_ENTRY_BUDGET_BYTES = 150 * KIB;
export const OWNER_TAB_CHUNK_BUDGET_BYTES = 450 * KIB;

const OWNER_PORTAL_ENTRY = '/src/pages/OwnerPortalPage.jsx';
const OWNER_TAB_MODULES = [
  '/src/features/management/components/OwnerDashboard.jsx',
  '/src/features/catalog/components/MenuCatalog.jsx',
  '/src/features/stalls/components/StallOwner.jsx',
  '/src/features/reports/components/OrderHistory.jsx',
  '/src/features/staff/components/UserOwner.jsx',
  '/src/features/management/components/FinancialSettings.jsx',
];

function normalizedModuleId(value) {
  return String(value || '').replaceAll('\\', '/');
}

function chunkSizeBytes(chunk) {
  return new TextEncoder().encode(chunk.code || '').byteLength;
}

function assertChunkBudget(chunk, budgetBytes, label) {
  const sizeBytes = chunkSizeBytes(chunk);
  if (sizeBytes > budgetBytes) {
    const sizeKib = (sizeBytes / KIB).toFixed(2);
    const budgetKib = (budgetBytes / KIB).toFixed(0);
    throw new Error(`${label} is ${sizeKib} KiB, exceeding its ${budgetKib} KiB production budget.`);
  }
}

export function assertFrontendBundleBudgets(bundle) {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue;

    const moduleId = normalizedModuleId(chunk.facadeModuleId);
    if (moduleId.endsWith(OWNER_PORTAL_ENTRY)) {
      assertChunkBudget(chunk, OWNER_PORTAL_ENTRY_BUDGET_BYTES, 'Owner Portal entry chunk');
    }

    if (OWNER_TAB_MODULES.some((ownerTabModule) => moduleId.endsWith(ownerTabModule))) {
      assertChunkBudget(chunk, OWNER_TAB_CHUNK_BUDGET_BYTES, 'Owner Portal tab chunk');
    }
  }
}

export function frontendBundleBudgetPlugin() {
  return {
    name: 'toub-frontend-bundle-budget',
    generateBundle(_options, bundle) {
      assertFrontendBundleBudgets(bundle);
    },
  };
}
