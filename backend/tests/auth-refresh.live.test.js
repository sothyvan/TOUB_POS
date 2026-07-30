import assert from 'node:assert/strict';
import test from 'node:test';
import 'dotenv/config';

const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';
const OWNER_USERNAME = process.env.TEST_OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD || 'owner123';

function getSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const combined = response.headers.get('set-cookie');
  return combined ? combined.split(/,(?=\s*toub_[^=]+=)/) : [];
}

function updateCookieJar(jar, response) {
  for (const cookie of getSetCookies(response)) {
    const [pair] = cookie.split(';');
    const separatorIndex = pair.indexOf('=');
    const name = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    if (value) {
      jar.set(name, value);
    } else {
      jar.delete(name);
    }
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(path, {
  body,
  cookie,
  csrfToken,
  token,
} = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  return { response, payload };
}

function expectStatus(result, expected) {
  assert.equal(
    result.response.status,
    expected,
    `Expected ${expected}, received ${result.response.status}: ${JSON.stringify(result.payload)}`,
  );
}

test('rotating HttpOnly refresh session restores access and detects reuse', async () => {
  const login = await request('/auth/login', {
    body: { username: OWNER_USERNAME, password: OWNER_PASSWORD },
  });
  expectStatus(login, 200);
  assert.ok(login.payload.data.token);
  assert.ok(login.payload.data.user);
  assert.equal(login.payload.data.refreshToken, undefined);

  const loginCookies = getSetCookies(login.response);
  const refreshCookie = loginCookies.find((cookie) => cookie.startsWith('toub_refresh_token='));
  const csrfCookie = loginCookies.find((cookie) => cookie.startsWith('toub_csrf_token='));
  assert.match(refreshCookie, /HttpOnly/i);
  assert.doesNotMatch(csrfCookie, /HttpOnly/i);

  const jar = new Map();
  updateCookieJar(jar, login.response);
  const firstCookieHeader = cookieHeader(jar);
  const firstRefresh = jar.get('toub_refresh_token');
  const firstCsrf = jar.get('toub_csrf_token');
  assert.ok(firstRefresh);
  assert.ok(firstCsrf);
  assert.equal(login.payload.data.csrfToken, firstCsrf);

  const protectedRequest = await request('/orders?limit=1', {
    token: login.payload.data.token,
  });
  expectStatus(protectedRequest, 200);

  const missingCsrf = await request('/auth/refresh', {
    body: {},
    cookie: firstCookieHeader,
  });
  expectStatus(missingCsrf, 403);
  assert.equal(missingCsrf.payload.code, 'CSRF_INVALID');

  const refresh = await request('/auth/refresh', {
    body: {},
    cookie: firstCookieHeader,
    csrfToken: firstCsrf,
  });
  expectStatus(refresh, 200);
  assert.ok(refresh.payload.data.token);
  updateCookieJar(jar, refresh.response);
  const rotatedCookieHeader = cookieHeader(jar);
  const rotatedCsrf = jar.get('toub_csrf_token');
  assert.notEqual(jar.get('toub_refresh_token'), firstRefresh);
  assert.notEqual(rotatedCsrf, firstCsrf);
  assert.equal(refresh.payload.data.csrfToken, rotatedCsrf);

  const replay = await request('/auth/refresh', {
    body: {},
    cookie: firstCookieHeader,
    csrfToken: firstCsrf,
  });
  expectStatus(replay, 401);
  assert.equal(replay.payload.code, 'REFRESH_REUSED');

  const revokedFamily = await request('/auth/refresh', {
    body: {},
    cookie: rotatedCookieHeader,
    csrfToken: rotatedCsrf,
  });
  expectStatus(revokedFamily, 401);

  const secondLogin = await request('/auth/login', {
    body: { username: OWNER_USERNAME, password: OWNER_PASSWORD },
  });
  expectStatus(secondLogin, 200);
  const logoutJar = new Map();
  updateCookieJar(logoutJar, secondLogin.response);
  const logoutCookie = cookieHeader(logoutJar);
  const logoutCsrf = logoutJar.get('toub_csrf_token');

  const logout = await request('/auth/logout', {
    body: {},
    cookie: logoutCookie,
    csrfToken: logoutCsrf,
  });
  expectStatus(logout, 200);

  const afterLogout = await request('/auth/refresh', {
    body: {},
    cookie: logoutCookie,
    csrfToken: logoutCsrf,
  });
  expectStatus(afterLogout, 401);
});
