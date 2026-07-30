const REFRESH_COOKIE_NAME = 'toub_refresh_token';
const CSRF_COOKIE_NAME = 'toub_csrf_token';

function parseCookies(cookieHeader = '') {
  return String(cookieHeader)
    .split(';')
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex < 0) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (name) {
        try {
          cookies[name] = decodeURIComponent(value);
        } catch {
          cookies[name] = value;
        }
      }
      return cookies;
    }, {});
}

function getCookieSameSite() {
  return String(process.env.AUTH_COOKIE_SAME_SITE || (
    process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  )).toLowerCase();
}

function baseCookieOptions() {
  return {
    secure: process.env.NODE_ENV === 'production',
    sameSite: getCookieSameSite(),
  };
}

export function getRefreshTokenCookie(req) {
  return parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME] || null;
}

export function getCsrfTokenCookie(req) {
  return parseCookies(req.headers.cookie)[CSRF_COOKIE_NAME] || null;
}

export function setAuthCookies(res, { refreshToken, csrfToken, expiresAt }) {
  const baseOptions = baseCookieOptions();
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...baseOptions,
    httpOnly: true,
    path: '/api/auth',
    expires: expiresAt,
  });
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...baseOptions,
    httpOnly: false,
    path: '/',
    expires: expiresAt,
  });
}

export function clearAuthCookies(res) {
  const baseOptions = baseCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...baseOptions,
    httpOnly: true,
    path: '/api/auth',
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    ...baseOptions,
    httpOnly: false,
    path: '/',
  });
}

export const AUTH_COOKIE_NAMES = {
  REFRESH: REFRESH_COOKIE_NAME,
  CSRF: CSRF_COOKIE_NAME,
};
