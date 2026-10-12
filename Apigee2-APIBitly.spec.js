import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';

// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.BITLY_BASE_PATH || '/MH-v1/bitly';

const DOMAIN = process.env.BITLY_DOMAIN || 'bit.ly';

const unknownBitlink = `${DOMAIN}/doesNotExist999zzz`;

const shortenData = {
    long_url: `https://example.com/playwright-${Date.now()}`,
    domain: DOMAIN
};

// Values discovered at runtime and shared between tests
const state = {
    groupGuid: process.env.GROUP_GUID || '',
    bitlinkId: process.env.BITLINK_ID || ''
};


// ============================================================
// Helper Functions
// ============================================================

async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
}


async function expectClientError(response) {

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
}


async function logResponse(response) {

    console.log('-----------------------------------');
    console.log('Status:', response.status());
    console.log('Body:', await response.text());
    console.log('-----------------------------------');
}


// Bitlink ids contain a slash (bit.ly/abc) but the proxy flow /bitlinks/*
// matches ONE path segment, so the id is URL-encoded.
function bitlinkPath(id) {

    return `${BASE_PATH}/bitlinks/${encodeURIComponent(id)}`;
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('Bitly API Proxy (MH-v1/bitly) - Regression Tests', () => {

    // Tests share groupGuid / bitlinkId, so they must run in order
    test.describe.configure({ mode: 'serial' });

    let apiClient;


    // --------------------------------------------------------
    // Setup
    // --------------------------------------------------------

    test.beforeAll(async () => {

        apiClient = await createApiClient();

    });


    // --------------------------------------------------------
    // Cleanup
    // --------------------------------------------------------

    test.afterAll(async () => {

        if (apiClient) {
            await apiClient.dispose();
        }

    });


    // ========================================================
    // GET - Current User
    // ========================================================

    test(
        '@regression GET - Get current user',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/user`
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.login).toBeDefined();

        }
    );


    // ========================================================
    // Current User - Method Not Allowed
    // ========================================================

    test(
        '@regression METHOD - POST /user is not allowed',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/user`,
                {
                    data: {}
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // GET - List Groups
    // ========================================================

    test(
        '@regression GET - List groups',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/groups`
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(Array.isArray(body.groups)).toBeTruthy();

            expect(body.groups.length).toBeGreaterThan(0);

            if (!state.groupGuid) {
                state.groupGuid = body.groups[0].guid;
            }

        }
    );


    // ========================================================
    // List Groups - Method Not Allowed
    // ========================================================

    test(
        '@regression METHOD - POST /groups is not allowed',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/groups`,
                {
                    data: {}
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // GET - Group by GUID
    // ========================================================

    test(
        '@regression GET - Get group by guid',
        async () => {

            test.skip(!state.groupGuid, 'No group guid available');

            const response = await apiClient.get(
                `${BASE_PATH}/groups/${state.groupGuid}`
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.guid).toBe(state.groupGuid);

        }
    );


    // ========================================================
    // GET - Group Not Found
    // ========================================================

    test(
        '@regression GET - Group does not exist',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/groups/UNKNOWN_GUID_000`
            );

            await logResponse(response);

            expect([403, 404]).toContain(response.status());

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // Group - Method Not Allowed
    // ========================================================

    test(
        '@regression METHOD - DELETE /groups/{guid} is not allowed',
        async () => {

            test.skip(!state.groupGuid, 'No group guid available');

            const response = await apiClient.delete(
                `${BASE_PATH}/groups/${state.groupGuid}`
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // GET - List Group Bitlinks
    // ========================================================

    test(
        '@regression GET - List group bitlinks',
        async () => {

            test.skip(!state.groupGuid, 'No group guid available');

            const response = await apiClient.get(
                `${BASE_PATH}/groups/${state.groupGuid}/bitlinks?size=5`
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(Array.isArray(body.links)).toBeTruthy();

        }
    );


    // ========================================================
    // List Group Bitlinks - Method Not Allowed
    // ========================================================

    test(
        '@regression METHOD - POST /groups/{guid}/bitlinks is not allowed',
        async () => {

            test.skip(!state.groupGuid, 'No group guid available');

            const response = await apiClient.post(
                `${BASE_PATH}/groups/${state.groupGuid}/bitlinks`,
                {
                    data: {}
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // POST - Shorten Link
    // ========================================================

    test(
        '@regression POST - Shorten link',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/shorten`,
                {
                    data: {
                        ...shortenData,
                        ...(state.groupGuid && { group_guid: state.groupGuid })
                    }
                }
            );

            await logResponse(response);

            expect([200, 201]).toContain(response.status());

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.id).toBeDefined();

            expect(body.link).toMatch(/^https?:\/\//);

            expect(body.long_url).toContain('example.com');

            if (!state.bitlinkId) {
                state.bitlinkId = body.id;
            }

        }
    );


    // ========================================================
    // POST - Shorten Missing long_url
    // ========================================================

    test(
        '@regression POST - Shorten without long_url',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/shorten`,
                {
                    data: {
                        domain: DOMAIN
                    }
                }
            );

            await logResponse(response);

            await expectClientError(response);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Shorten Invalid long_url
    // ========================================================

    test(
        '@regression POST - Shorten with invalid long_url',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/shorten`,
                {
                    data: {
                        long_url: 'not-a-url'
                    }
                }
            );

            await logResponse(response);

            await expectClientError(response);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Shorten Invalid Content-Type
    // ========================================================

    test(
        '@regression POST - Shorten Invalid Content-Type',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/shorten`,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: JSON.stringify(shortenData)
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // Shorten - Method Not Allowed
    // ========================================================

    test(
        '@regression METHOD - GET /shorten is not allowed',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/shorten`
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // POST - Expand Link
    // ========================================================

    test(
        '@regression POST - Expand link',
        async () => {

            test.skip(!state.bitlinkId, 'No bitlink available (shorten must pass first)');

            const response = await apiClient.post(
                `${BASE_PATH}/expand`,
                {
                    data: {
                        bitlink_id: state.bitlinkId
                    }
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.long_url).toContain('example.com');

        }
    );


    // ========================================================
    // POST - Expand Unknown Bitlink
    // ========================================================

    test(
        '@regression POST - Expand bitlink that does not exist',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/expand`,
                {
                    data: {
                        bitlink_id: unknownBitlink
                    }
                }
            );

            await logResponse(response);

            expect([400, 404]).toContain(response.status());

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Expand Invalid Content-Type
    // ========================================================

    test(
        '@regression POST - Expand Invalid Content-Type',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/expand`,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // Expand - Method Not Allowed
    // ========================================================

    test(
        '@regression METHOD - GET /expand is not allowed',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/expand`
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // GET - Bitlink
    // ========================================================

    test(
        '@regression GET - Get bitlink',
        async () => {

            test.skip(!state.bitlinkId, 'No bitlink available');

            const response = await apiClient.get(
                bitlinkPath(state.bitlinkId)
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.id).toBe(state.bitlinkId);

        }
    );


    // ========================================================
    // GET - Bitlink Not Found
    // ========================================================

    test(
        '@regression GET - Bitlink does not exist',
        async () => {

            const response = await apiClient.get(
                bitlinkPath(unknownBitlink)
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // PATCH - Update Bitlink
    // ========================================================

    test(
        '@regression PATCH - Update bitlink title',
        async () => {

            test.skip(!state.bitlinkId, 'No bitlink available');

            const newTitle = `Playwright-${Date.now()}`;

            const response = await apiClient.patch(
                bitlinkPath(state.bitlinkId),
                {
                    data: {
                        title: newTitle
                    }
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.title).toBe(newTitle);

        }
    );


    // ========================================================
    // PATCH - Invalid Content-Type
    // ========================================================

    test(
        '@regression PATCH - Invalid Content-Type',
        async () => {

            test.skip(!state.bitlinkId, 'No bitlink available');

            const response = await apiClient.patch(
                bitlinkPath(state.bitlinkId),
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: 'title=invalid'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // Bitlink - Method Not Allowed
    // ========================================================

    test(
        '@regression METHOD - DELETE /bitlinks/{id} is not allowed',
        async () => {

            test.skip(!state.bitlinkId, 'No bitlink available');

            const response = await apiClient.delete(
                bitlinkPath(state.bitlinkId)
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // Analytics - Clicks Summary / Clicks / Referrers / Countries
    // ========================================================

    const analyticsEndpoints = [
        { name: 'Clicks Summary', path: '/clicks/summary', key: 'total_clicks' },
        { name: 'Clicks Details', path: '/clicks',         key: 'link_clicks'  },
        { name: 'Referrers',      path: '/referrers',       key: 'metrics'      },
        { name: 'Countries',      path: '/countries',       key: 'metrics'      }
    ];

    for (const endpoint of analyticsEndpoints) {

        test(
            `@regression GET - ${endpoint.name}`,
            async () => {

                test.skip(!state.bitlinkId, 'No bitlink available');

                const response = await apiClient.get(
                    `${bitlinkPath(state.bitlinkId)}${endpoint.path}?unit=day&units=7`
                );

                await logResponse(response);

                expect(response.status()).toBe(200);

                await expectJsonResponse(response);

                const body = await response.json();

                expect(body[endpoint.key]).toBeDefined();

            }
        );

        test(
            `@regression GET - ${endpoint.name} for unknown bitlink`,
            async () => {

                const response = await apiClient.get(
                    `${bitlinkPath(unknownBitlink)}${endpoint.path}`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        test(
            `@regression METHOD - POST ${endpoint.name} is not allowed`,
            async () => {

                test.skip(!state.bitlinkId, 'No bitlink available');

                const response = await apiClient.post(
                    `${bitlinkPath(state.bitlinkId)}${endpoint.path}`,
                    {
                        data: {}
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(405);

            }
        );

    }


    // ========================================================
    // Authentication - Missing Token
    // ========================================================

    test(
        '@regression AUTH - Missing Authorization header',
        async () => {

            const unauthenticatedClient = await request.newContext({
                baseURL: process.env.BASE_URL
            });

            const response = await unauthenticatedClient.get(
                `${BASE_PATH}/user`
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await expectJsonResponse(response);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // Authentication - Invalid Token
    // ========================================================

    test(
        '@regression AUTH - Invalid bearer token',
        async () => {

            const invalidTokenClient = await request.newContext({
                baseURL: process.env.BASE_URL,
                extraHTTPHeaders: {
                    Authorization: 'Bearer invalid-token-123456'
                }
            });

            const response = await invalidTokenClient.get(
                `${BASE_PATH}/user`
            );

            await logResponse(response);

            /*
             * Expected result is 401.
             *
             * If you receive 429, Apigee rate limiting
             * (SA-PreventSpikes / QU-PerConsumerLimit)
             * is being triggered. The Bitly proxy runs
             * SA-PreventSpikes BEFORE OA2-VerifyToken.
             */
            expect(response.status()).toBe(401);

            await expectJsonResponse(response);

            await invalidTokenClient.dispose();

        }
    );


    // ========================================================
    // Authentication - Non-Bearer Scheme
    // ========================================================

    test(
        '@regression AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await request.newContext({
                baseURL: process.env.BASE_URL,
                extraHTTPHeaders: {
                    Authorization: 'Basic YWJjOjEyMw=='
                }
            });

            const response = await basicAuthClient.get(
                `${BASE_PATH}/user`
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await basicAuthClient.dispose();

        }
    );


    // ========================================================
    // Invalid Endpoint
    // ========================================================

    test(
        '@regression PATH - Invalid endpoint should return 404',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/invalid-endpoint`
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

        }
    );


    // ========================================================
    // Response Time
    // ========================================================

    test(
        '@regression PERFORMANCE - GET /user responds within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.get(
                `${BASE_PATH}/user`
            );

            const duration = Date.now() - start;

            console.log('Response time (ms):', duration);

            expect(response.status()).toBe(200);

            expect(duration).toBeLessThan(3000);

        }
    );


    // ========================================================
    // Traffic Management - Spike Arrest / Quota (opt-in)
    // ========================================================

    test(
        '@ratelimit TRAFFIC - Burst of requests returns 429',
        async () => {

            test.skip(
                process.env.RUN_RATE_LIMIT_TESTS !== 'true',
                'Set RUN_RATE_LIMIT_TESTS=true to run'
            );

            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.get(`${BASE_PATH}/user`)
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});