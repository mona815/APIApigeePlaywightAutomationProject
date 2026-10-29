// spec.js
// Playwright API automation for Apigee proxy: MH-itsm-changes-v1
// BasePath: /MH-v1/itsm/changes
/*How to run it:

bash
npm i -D @playwright/test

# Option 1: use an existing token
BASE_HOST=https://your-apigee-host ACCESS_TOKEN=xxxx npx playwright test spec.js

# Option 2: fetch a token with client credentials
BASE_HOST=https://your-apigee-host TOKEN_URL=https://.../oauth/token \
CLIENT_ID=xxx CLIENT_SECRET=xxx npx playwright test spec.js

# Include the rate-limit test (it may affect other consumers)
RUN_RATE_LIMIT_TESTS=true BURST_COUNT=100 ...
*/
// Run:
//   npm i -D @playwright/test
//   BASE_HOST=https://your-apigee-host ACCESS_TOKEN=xxxx npx playwright test spec.js
//
// Or let the script fetch a token (client credentials):
//   BASE_HOST=... TOKEN_URL=https://.../oauth/token CLIENT_ID=... CLIENT_SECRET=... npx playwright test spec.js

const { test, expect, request } = require('@playwright/test');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_HOST = (process.env.BASE_HOST || 'https://your-apigee-host.example.com').replace(/\/$/, '');
const BASE_PATH = '/MH-v1/itsm/changes';
const BASE_URL = `${BASE_HOST}${BASE_PATH}`;

const CHANGES = `${BASE_URL}/changes`;
const CHANGE_COMMENTS = `${BASE_URL}/change-comments`;
const UNKNOWN = `${BASE_URL}/unknown-resource`;

const TOKEN_URL = process.env.TOKEN_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Set RUN_RATE_LIMIT_TESTS=true to exercise SpikeArrest / Quota (can affect other consumers!)
const RUN_RATE_LIMIT_TESTS = process.env.RUN_RATE_LIMIT_TESTS === 'true';

// Sample payloads - adjust to your backend contract
const sampleChange = {
  short_description: 'Playwright automated change',
  description: 'Created by Playwright API test',
  type: 'normal',
  priority: '3',
};
const sampleComment = {
  change_id: process.env.CHANGE_ID || 'CHG0000001',
  comment: 'Playwright automated comment',
  type: 'comment', // comment | history | cab
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let accessToken = process.env.ACCESS_TOKEN || '';

async function fetchToken() {
  if (accessToken) return accessToken;
  if (!TOKEN_URL || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Provide ACCESS_TOKEN or TOKEN_URL + CLIENT_ID + CLIENT_SECRET');
  }
  const ctx = await request.newContext();
  const res = await ctx.post(TOKEN_URL, {
    form: { grant_type: 'client_credentials' },
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
  });
  expect(res.ok(), 'token request should succeed').toBeTruthy();
  const body = await res.json();
  await ctx.dispose();
  return body.access_token;
}

const authHeaders = (extra = {}) => ({
  Authorization: `Bearer ${accessToken}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...extra,
});

let api; // authenticated APIRequestContext
let anon; // unauthenticated APIRequestContext

test.beforeAll(async () => {
  accessToken = await fetchToken();
  api = await request.newContext({ ignoreHTTPSErrors: true });
  anon = await request.newContext({ ignoreHTTPSErrors: true });
});

test.afterAll(async () => {
  await api.dispose();
  await anon.dispose();
});

// ---------------------------------------------------------------------------
// 1. PreFlow - OAuth2 VerifyToken + FaultRule "Unauthorized"
// ---------------------------------------------------------------------------
test.describe('PreFlow - OAuth2 token verification', () => {
  test('GET /changes without token -> 401', async () => {
    const res = await anon.get(CHANGES);
    expect(res.status()).toBe(401);
  });

  test('GET /changes with invalid token -> 401', async () => {
    const res = await anon.get(CHANGES, {
      headers: { Authorization: 'Bearer invalid_token_value' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /change-comments without token -> 401', async () => {
    const res = await anon.get(CHANGE_COMMENTS);
    expect(res.status()).toBe(401);
  });

  test('GET /changes with malformed Authorization header -> 401', async () => {
    const res = await anon.get(CHANGES, { headers: { Authorization: 'Bearer' } });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 2. PreFlow - Content-Type validation (RF-InvalidMediaType) for POST / PATCH
// ---------------------------------------------------------------------------
test.describe('PreFlow - Content-Type validation', () => {
  for (const method of ['post', 'patch']) {
    test(`${method.toUpperCase()} /changes with text/plain -> 415`, async () => {
      const res = await api[method](CHANGES, {
        headers: authHeaders({ 'Content-Type': 'text/plain' }),
        data: 'not json',
      });
      expect(res.status()).toBe(415);
    });

    test(`${method.toUpperCase()} /changes with application/xml -> 415`, async () => {
      const res = await api[method](CHANGES, {
        headers: authHeaders({ 'Content-Type': 'application/xml' }),
        data: '<change/>',
      });
      expect(res.status()).toBe(415);
    });
  }

  test('POST /change-comments with text/plain -> 415', async () => {
    const res = await api.post(CHANGE_COMMENTS, {
      headers: authHeaders({ 'Content-Type': 'text/plain' }),
      data: 'not json',
    });
    expect(res.status()).toBe(415);
  });
});

// ---------------------------------------------------------------------------
// 3. Flow: /changes  (GET, POST, PATCH, DELETE allowed)
// ---------------------------------------------------------------------------
test.describe('Flow - /changes', () => {
  let createdId;

  test('GET /changes -> reaches backend (not 401/404/405/415)', async () => {
    const res = await api.get(CHANGES, { headers: authHeaders() });
    expect([401, 404, 405, 415]).not.toContain(res.status());
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /changes with query params -> reaches backend', async () => {
    const res = await api.get(`${CHANGES}?limit=5&offset=0`, { headers: authHeaders() });
    expect([401, 404, 405, 415]).not.toContain(res.status());
  });

  test('POST /changes with JSON -> reaches backend', async () => {
    const res = await api.post(CHANGES, {
      headers: authHeaders(),
      data: sampleChange,
    });
    expect([401, 404, 405, 415]).not.toContain(res.status());
    if (res.ok()) {
      const body = await res.json().catch(() => ({}));
      createdId = body.id || body.sys_id || body.number || (body.result && (body.result.sys_id || body.result.number));
    }
  });

  test('PATCH /changes with JSON -> reaches backend', async () => {
    const payload = { ...(createdId ? { id: createdId } : {}), short_description: 'Updated by Playwright' };
    const res = await api.patch(CHANGES, { headers: authHeaders(), data: payload });
    expect([401, 404, 405, 415]).not.toContain(res.status());
  });

  test('DELETE /changes -> reaches backend', async () => {
    const url = createdId ? `${CHANGES}?id=${encodeURIComponent(createdId)}` : CHANGES;
    const res = await api.delete(url, { headers: authHeaders() });
    expect([401, 404, 405, 415]).not.toContain(res.status());
  });

  for (const method of ['put', 'head', 'options']) {
    // OPTIONS/HEAD may be handled by CORS or the gateway in some setups - adjust if needed
    test(`${method.toUpperCase()} /changes -> 405 Method Not Allowed`, async () => {
      const res = await api[method](CHANGES, { headers: authHeaders() });
      expect(res.status()).toBe(405);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Flow: /change-comments  (GET, POST, DELETE allowed; PATCH/PUT -> 405)
// ---------------------------------------------------------------------------
test.describe('Flow - /change-comments', () => {
  test('GET /change-comments -> reaches backend', async () => {
    const res = await api.get(`${CHANGE_COMMENTS}?change_id=${sampleComment.change_id}`, {
      headers: authHeaders(),
    });
    expect([401, 404, 405, 415]).not.toContain(res.status());
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /change-comments with JSON -> reaches backend', async () => {
    const res = await api.post(CHANGE_COMMENTS, {
      headers: authHeaders(),
      data: sampleComment,
    });
    expect([401, 404, 405, 415]).not.toContain(res.status());
  });

  test('DELETE /change-comments -> reaches backend', async () => {
    const res = await api.delete(`${CHANGE_COMMENTS}?id=nonexistent`, { headers: authHeaders() });
    expect([401, 404, 405, 415]).not.toContain(res.status());
  });

  // PATCH is not allowed on /change-comments. Send application/json so the
  // content-type check passes and the method check (RF-MethodNotAllowed) is what triggers.
  for (const method of ['patch', 'put']) {
    test(`${method.toUpperCase()} /change-comments -> 405 Method Not Allowed`, async () => {
      const res = await api[method](CHANGE_COMMENTS, {
        headers: authHeaders(),
        data: { comment: 'x' },
      });
      expect(res.status()).toBe(405);
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Flow: Unknown (RF-NotFound)
// ---------------------------------------------------------------------------
test.describe('Flow - Unknown path', () => {
  for (const method of ['get', 'delete']) {
    test(`${method.toUpperCase()} unknown path -> 404`, async () => {
      const res = await api[method](UNKNOWN, { headers: authHeaders() });
      expect(res.status()).toBe(404);
    });
  }

  test('POST unknown path -> 404', async () => {
    const res = await api.post(UNKNOWN, { headers: authHeaders(), data: {} });
    expect(res.status()).toBe(404);
  });

  test('GET base path only -> 404', async () => {
    const res = await api.get(BASE_URL, { headers: authHeaders() });
    expect(res.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 6. Response sanity (error payload + headers)
// ---------------------------------------------------------------------------
test.describe('Error response format', () => {
  test('404 response should be JSON/text and not leak internals', async () => {
    const res = await api.get(UNKNOWN, { headers: authHeaders() });
    expect(res.status()).toBe(404);
    const text = await res.text();
    expect(text.toLowerCase()).not.toContain('stacktrace');
    expect(text.toLowerCase()).not.toContain('at java.');
  });

  test('401 response should not leak internals', async () => {
    const res = await anon.get(CHANGES);
    const text = await res.text();
    expect(text.toLowerCase()).not.toContain('stacktrace');
  });
});

// ---------------------------------------------------------------------------
// 7. Optional - SpikeArrest / Quota (disabled by default)
// ---------------------------------------------------------------------------
test.describe('Traffic management (SA-PreventSpikes / QU-PerConsumerLimit)', () => {
  test.skip(!RUN_RATE_LIMIT_TESTS, 'Set RUN_RATE_LIMIT_TESTS=true to enable');

  test('burst of requests eventually returns 429', async () => {
    const burst = Number(process.env.BURST_COUNT || 100);
    const results = await Promise.all(
      Array.from({ length: burst }, () => api.get(CHANGES, { headers: authHeaders() })),
    );
    const statuses = results.map((r) => r.status());
    expect(statuses).toContain(429);
  });
});