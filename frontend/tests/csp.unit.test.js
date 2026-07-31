import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFrontendContentSecurityPolicy,
  frontendCspPlugin,
} from '../config/csp.js';

test('production CSP permits only required script and connection sources', () => {
  const policy = buildFrontendContentSecurityPolicy({
    apiBaseUrl: 'https://api.example.test/api',
  });
  assert.match(policy, /script-src 'self'/);
  assert.doesNotMatch(policy, /script-src[^;]*unsafe-inline/);
  assert.doesNotMatch(policy, /script-src[^;]*\*/);
  assert.match(policy, /connect-src 'self' https:\/\/api\.example\.test wss:\/\/api\.example\.test https:\/\/upload\.imagekit\.io/);
  assert.match(policy, /object-src 'none'/);
});

test('development CSP adds only local HTTP and WebSocket wildcard connections', () => {
  const policy = buildFrontendContentSecurityPolicy({
    apiBaseUrl: 'http://localhost:3000/api',
    isDevelopment: true,
  });
  assert.match(policy, /http:\/\/localhost:\*/);
  assert.match(policy, /ws:\/\/127\.0\.0\.1:\*/);
});

test('relative API paths remain covered by self and invalid URLs fail the build', () => {
  const policy = buildFrontendContentSecurityPolicy({ apiBaseUrl: '/api' });
  assert.match(policy, /connect-src 'self' https:\/\/upload\.imagekit\.io/);
  assert.throws(
    () => buildFrontendContentSecurityPolicy({ apiBaseUrl: 'not a URL' }),
    /VITE_API_BASE_URL/,
  );
});

test('Vite plugin injects an enforcing CSP meta element before application content', () => {
  const plugin = frontendCspPlugin({ apiBaseUrl: '/api' });
  const [tag] = plugin.transformIndexHtml.handler();
  assert.equal(tag.tag, 'meta');
  assert.equal(tag.attrs['http-equiv'], 'Content-Security-Policy');
  assert.equal(tag.injectTo, 'head-prepend');
});

