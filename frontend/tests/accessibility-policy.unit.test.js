import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function source(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('interactive controls retain a global visible keyboard focus indicator', async () => {
  const css = await source('src/index.css');

  assert.match(
    css,
    /:where\(button, a, input, select, textarea, \[role="button"\], \[tabindex\]\):focus-visible\s*\{[\s\S]*outline:/,
  );
});

test('public and authenticated layouts expose a keyboard skip target', async () => {
  const [skipLink, landing, pageShell, ownerWorkspace, cashierScreen] = await Promise.all([
    source('src/components/ui/SkipLink.jsx'),
    source('src/pages/LandingPage.jsx'),
    source('src/shared/layout/PageShell.jsx'),
    source('src/features/management/components/OwnerWorkspace.jsx'),
    source('src/features/cashier/components/CashierScreen.jsx'),
  ]);

  assert.match(skipLink, /Skip to main content/);
  assert.match(skipLink, /href=\{`#\$\{targetId\}`\}/);
  assert.match(landing, /<SkipLink \/>/);
  assert.match(landing, /<main id="main-content" tabIndex=\{-1\}>/);
  assert.match(pageShell, /<SkipLink \/>/);
  assert.match(ownerWorkspace, /<main id="main-content" tabIndex=\{-1\}/);
  assert.match(cashierScreen, /<main id="main-content" tabIndex=\{-1\}/);
});

test('login communicates errors and PIN progress to assistive technology', async () => {
  const loginScreen = await source('src/features/auth/components/LoginScreen.jsx');

  assert.match(loginScreen, /autoComplete="username"/);
  assert.match(loginScreen, /autoComplete="current-password"/);
  assert.match(loginScreen, /role="alert"/);
  assert.match(loginScreen, /aria-label=\{`\$\{typedPin\.length\} of 4 PIN digits entered`\}/);
});

test('product editor icon and URL controls have accessible names', async () => {
  const menuCatalog = await source('src/features/catalog/components/MenuCatalog.jsx');

  assert.match(menuCatalog, /aria-label="Close product editor"/);
  assert.match(menuCatalog, /label="Image URL"/);
});
