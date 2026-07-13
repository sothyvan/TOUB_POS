# Fix: Login mode URL sync & separation of Cashier vs Management login

## Problem
Two related bugs in the login flow (`frontend/src/features/auth/...`):

1. **URL never reflects the active mode.** Switching between Cashier and Management on `/login` updates only React state, so the address bar stays frozen at whatever was first navigated to (`/login?mode=management` or `/login?mode=cashier`).
2. **Management login shows the cashier section when a device is registered.** `LoginPage.jsx:18` computes `startInCashier = initialMode === 'cashier' || (deviceRegistered && deviceToken)`. Once a cashier terminal is registered, `deviceRegistered` forces cashier mode even when the user explicitly opens `/login?mode=management`, so they see the cashier profile picker instead of the management portal login.

## Chosen approach
Keep the single `/login` route. Make the URL query param the **source of truth** for `loginMode` using `useSearchParams` from `react-router-dom`, and give an explicit `?mode=management` priority over device registration.

## Changes

### 1. `frontend/src/features/auth/pages/LoginPage.jsx`
- Import `useSearchParams` from `react-router-dom` (already imports `useNavigate`).
- Replace the one-time `window.location.search` read and the `loginMode`/`startInCashier` state with derived values from the reactive search params:
  ```js
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode'); // 'cashier' | 'management' | null
  const loginMode =
    modeParam === 'management' ? 'management'
    : modeParam === 'cashier' ? 'cashier'
    : (deviceRegistered && deviceToken ? 'cashier' : 'management');
  ```
- Compute the initial `flowStep` from the resolved `loginMode` (replacing the old `startInCashier` usage):
  ```js
  const [flowStep, setFlowStep] = useState(loginMode === 'cashier' ? 'select-profile' : 'register');
  ```
- Replace the `setLoginMode` state setter with a function that updates the URL so switching is reflected in the address bar:
  ```js
  const setLoginMode = (mode) => {
    if (mode === 'management') setSearchParams({ mode: 'management' }, { replace: true });
    else setSearchParams({ mode: 'cashier' }, { replace: true });
  };
  ```
- Update the existing `setLoginMode(...)` call sites (lines ~53, ~141, ~165) — they now just change the URL and are safe as-is. Keep them, no behavior change needed beyond the now-correct resolution.
- Remove the now-dead `initialMode`/`startInCashier` variables.
- Keep passing `loginMode` and `setLoginMode` to `<LoginScreen>` (line ~232-234).

### 2. `frontend/src/features/auth/components/LoginScreen.jsx`
- No structural change required. The three `setLoginMode(...)` call sites already exist:
  - "Management Portal Login" buttons (lines 109, 176) → `setLoginMode('management')`
  - "Switch to Cashier Terminal" (line 322) → `setLoginMode('cashier')`
- Because `setLoginMode` now writes the URL, these will correctly update the address bar to `/login?mode=management` / `/login?mode=cashier`. Verify no other place relies on `loginMode` being uncontrolled local state (it is only read for render branching — safe).

### 3. `frontend/src/pages/LandingPage.jsx`
- No change needed. `goCashier` → `/login?mode=cashier` and `goManagement` → `/login?mode=management` (lines 87-88) already set the correct param.

## Behavior after fix (edge cases)
- Open `/login?mode=management` → always management login, even if a cashier device is registered. (Fixes bug #2.)
- Open `/login?mode=cashier` → cashier flow (profile picker if device registered, else device-registration gate).
- Open `/login` with no param and device registered → defaults to cashier (preserves existing terminal behavior).
- Open `/login` with no param and no registered device → defaults to management (same as today).
- Clicking "Switch to Cashier Terminal" / "Management Portal Login" inside the login screen now updates the URL accordingly. (Fixes bug #1.)
- `confirmDeregister` sets mode to management → shows management login; `handleRegisterDevice` success sets mode to cashier → shows profile picker. Both now reflected in URL.

## Validation
- `npm run dev` in `frontend/`, then test:
  1. From landing, click **Management Login** → URL is `/login?mode=management` and management form shows (even after a device was registered).
  2. Click **Switch to Cashier Terminal** → URL becomes `/login?mode=cashier`; cashier section shows.
  3. Click **Management Portal Login** from cashier view → URL returns to `/login?mode=management`.
  4. Reload `/login?mode=management` after cashier registration → still management, not cashier picker.
  5. Confirm full cashier PIN login and management credential login still redirect correctly.
- Run lint/typecheck: `npm run lint` and `npm run typecheck` (if configured) in `frontend/`.

## Open questions / risks
- Using `{ replace: true }` prevents building a long back-history of mode switches; switch to push if back-button stepping through modes is desired.
- `flowStep` remains pure local state and is not reflected in the URL (only `mode` is). This is acceptable since `flowStep` is an internal sub-step of the cashier terminal; revisit only if shareable deep-links to the PIN pad are required.
