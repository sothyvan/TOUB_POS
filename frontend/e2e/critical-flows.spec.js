import { expect, test } from '@playwright/test';

const OWNER_USERNAME = process.env.E2E_OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || 'owner123';
const CASHIER_USERNAME = process.env.E2E_CASHIER_USERNAME || 'cashier_dara';
const CASHIER_PIN = process.env.E2E_CASHIER_PIN || '1111';

test('render failure shows safe recovery and preserves checkout recovery data', async ({ page }) => {
  const cartKey = 'toub-cart:999:888';
  const pendingKey = 'toub-pending-checkout:999:888';
  const cartValue = JSON.stringify({ version: 1, items: [{ productId: 42, quantity: 2 }] });
  const pendingValue = JSON.stringify({ version: 1, orderId: 123 });

  await page.addInitScript(({ savedCartKey, savedCartValue, savedPendingKey, savedPendingValue }) => {
    globalThis.localStorage.setItem(savedCartKey, savedCartValue);
    globalThis.localStorage.setItem(savedPendingKey, savedPendingValue);
  }, {
    savedCartKey: cartKey,
    savedCartValue: cartValue,
    savedPendingKey: pendingKey,
    savedPendingValue: pendingValue,
  });

  await page.goto('/?force-render-error=true');

  await expect(page.getByRole('heading', { name: 'TouB POS needs to recover' })).toBeVisible();
  await expect(page.getByText(/^Reference: ERR-/)).toBeVisible();
  await expect(page.getByText('Synthetic render failure for boundary verification')).toHaveCount(0);
  await expect.poll(() => page.evaluate(
    ({ savedCartKey }) => globalThis.localStorage.getItem(savedCartKey),
    { savedCartKey: cartKey },
  )).toBe(cartValue);
  await expect.poll(() => page.evaluate(
    ({ savedPendingKey }) => globalThis.localStorage.getItem(savedPendingKey),
    { savedPendingKey: pendingKey },
  )).toBe(pendingValue);

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: /Fast, stall-scoped POS with/i })).toBeVisible();
});

async function loginAsOwner(page) {
  await page.getByLabel('Username').fill(OWNER_USERNAME);
  await page.getByLabel('Password').fill(OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/owner-portal$/);
  await expect(page.getByRole('heading', { name: 'Business Overview' })).toBeVisible();
}

test('owner session restores after refresh and logout protects management routes', async ({ page }) => {
  await page.goto('/owner-portal');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Management Portal Login' })).toBeVisible();

  await loginAsOwner(page);

  await page.reload();
  await expect(page).toHaveURL(/\/owner-portal$/);
  await expect(page.getByRole('heading', { name: 'Business Overview' })).toBeVisible();

  await page.goto('/cashier');
  await expect(page).toHaveURL(/\/owner-portal$/);

  await page.getByRole('button', { name: 'Logout' }).click();
  const logoutDialog = page.getByRole('dialog');
  await expect(logoutDialog).toContainText('Log out?');
  await logoutDialog.getByRole('button', { name: 'Log out', exact: true }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/owner-portal');
  await expect(page).toHaveURL(/\/login$/);
});

test('cashier registers a terminal, signs in by PIN, and completes a cash sale', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/login?mode=cashier');

  await expect(page.getByRole('heading', { name: 'Register Device for Cashier' })).toBeVisible();
  await page.getByLabel('Username').fill(OWNER_USERNAME);
  await page.getByLabel('Password').fill(OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Select Stall for Device' })).toBeVisible();
  await page.getByRole('combobox').selectOption({ label: 'Stall A - Drinks — Main Booth' });
  await page.getByLabel('Device Name').fill(`CI Front Counter ${Date.now()}`);
  await page.getByRole('button', { name: 'Register Device', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Select Your Profile' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(CASHIER_USERNAME, 'i') }).click();
  await expect(page.getByText('Enter your 4-digit PIN')).toBeVisible();

  for (const digit of CASHIER_PIN) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }

  await expect(page).toHaveURL(/\/cashier$/);
  await expect(page.getByRole('button', { name: 'Quick Sale', exact: true })).toBeVisible();

  const addProductButton = page.getByRole('button', { name: /^Add .+ to cart$/ }).first();
  await expect(addProductButton).toBeVisible();
  await addProductButton.click();

  await page.reload();
  let cashButton = page.getByRole('button', { name: 'Cash', exact: true });
  await expect(cashButton).toBeEnabled();

  await page.getByRole('button', { name: 'Profile actions', exact: true }).click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  const logoutDialog = page.getByRole('dialog');
  await expect(
    logoutDialog.getByRole('heading', { name: 'Are you sure you want to log out?' }),
  ).toBeVisible();
  await logoutDialog.getByRole('button', { name: 'Confirm', exact: true }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Select Your Profile' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(CASHIER_USERNAME, 'i') }).click();
  for (const digit of CASHIER_PIN) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }

  await expect(page).toHaveURL(/\/cashier$/);
  cashButton = page.getByRole('button', { name: 'Cash', exact: true });
  await expect(cashButton).toBeEnabled();
  await cashButton.click();

  const cashDialog = page.getByRole('dialog');
  await expect(cashDialog.getByRole('heading', { name: 'Cash received' })).toBeVisible();

  await page.route('**/api/orders/*/confirm-cash', async (route) => {
    const backendResponse = await route.fetch();
    expect(backendResponse.ok()).toBeTruthy();
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Simulated interrupted confirmation response.',
      }),
    });
  });
  await cashDialog.getByRole('button', { name: 'Confirm paid', exact: true }).click();

  await expect(cashDialog).toContainText('Simulated interrupted confirmation response.');
  await page.unroute('**/api/orders/*/confirm-cash');
  await page.reload();

  const receiptDialog = page.getByRole('dialog');
  await expect(receiptDialog.getByRole('heading', { name: 'Payment Confirmed' })).toBeVisible();
  const receiptLabel = await receiptDialog.getByText(/^Receipt: ORD-/).textContent();
  const orderNumber = receiptLabel?.replace('Receipt: ', '');
  expect(orderNumber).toBeTruthy();

  await receiptDialog.getByRole('button', { name: 'Close Receipt', exact: true }).click();
  await page.getByRole('button', { name: 'My Orders', exact: true }).click();
  await expect(page.getByText(`#${orderNumber}`, { exact: true })).toBeVisible();
});
