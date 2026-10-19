import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.FUNDING_BASE_PATH || '/MH-v1/actions';

/*
 * The three actions of the proxy. Every action is POST only and has TWO
 * path parameters:   /<Action>/<id1>/<id2>
 */
const actions = [
    { name: 'ReopenOpportunity' },
    { name: 'ProvideOfferCompleteFinancing' },
    { name: 'RenewCreditLimit' }
];

/*
 * These actions change real data (reopen an opportunity, renew a credit
 * limit ...). Tests that could SUCCEED only run when
 *   RUN_LIVE_TESTS=true
 * and FUNDING_ID1 / FUNDING_ID2 point to a record you can safely change.
 */
const RUN_LIVE = process.env.RUN_LIVE_TESTS === 'true';

const LIVE_ID1 = process.env.FUNDING_ID1 || '';

const LIVE_ID2 = process.env.FUNDING_ID2 || '';

// IDs that must NOT exist in the target system
const UNKNOWN_ID1 = 'PLAYWRIGHT-UNKNOWN-001';

const UNKNOWN_ID2 = 'PLAYWRIGHT-UNKNOWN-002';

// Request body sent to the target. The proxy XML does not define it,
// so it is configurable (JSON string) and defaults to an empty object.
const requestBody = process.env.FUNDING_BODY
    ? JSON.parse(process.env.FUNDING_BODY)
    : {};


// ============================================================
// Helper Functions
// ============================================================

function actionPath(action, id1 = UNKNOWN_ID1, id2 = UNKNOWN_ID2) {

    return `${BASE_PATH}/${action}/${encodeURIComponent(id1)}/${encodeURIComponent(id2)}`;
}


async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
}


async function expectClientError(response) {

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
}


/*
 * A request is REJECTED when the status is 4xx, or when it is 2xx but the
 * body reports an error. A 5xx is always a failure.
 */
async function expectRejected(response) {

    expect(response.status()).toBeLessThan(500);

    if (response.status() >= 400) {
        return;
    }

    const text = (await response.text())
        .toLowerCase()
        .replace(/"errors?"\s*:\s*(\[\s*\]|null|"")/g, '');

    expect(text).toMatch(/error|fail|invalid|reject|not found|mandatory|required/);
}


async function logResponse(response) {

    console.log('-----------------------------------');
    console.log('Status:', response.status());
    console.log('Body:', await response.text());
    console.log('-----------------------------------');
}


async function createClientWithHeaders(headers) {

    return request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: headers
    });
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('Funding Actions API Proxy (MH-v1/actions) - Regression Tests', () => {

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
    // POST - Execute Action (LIVE - changes real data)
    // ========================================================

    for (const action of actions) {

        test(
            `@regression @live POST - ${action.name} with existing record`,
            async () => {

                test.skip(
                    !RUN_LIVE || !LIVE_ID1 || !LIVE_ID2,
                    'Set RUN_LIVE_TESTS=true, FUNDING_ID1 and FUNDING_ID2'
                );

                const response = await apiClient.post(
                    actionPath(action.name, LIVE_ID1, LIVE_ID2),
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                expect([200, 201, 202, 204]).toContain(response.status());

            }
        );

    }


    // ========================================================
    // VALIDATION - Records that do not exist
    // (the request passes the proxy, the target rejects it)
    // ========================================================

    for (const action of actions) {

        test(
            `@regression @validation POST - ${action.name} with unknown ids`,
            async () => {

                const response = await apiClient.post(
                    actionPath(action.name),
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                await expectRejected(response);

            }
        );

    }


    // ========================================================
    // VALIDATION - Unusual path parameter values
    // ========================================================

    const idCases = [
        { name: 'id1 with special characters',  id1: '<script>alert(1)</script>', id2: UNKNOWN_ID2 },
        { name: 'id2 with special characters',  id1: UNKNOWN_ID1, id2: "'; DROP TABLE x;--" },
        { name: 'id1 with spaces',              id1: 'id with spaces', id2: UNKNOWN_ID2 },
        { name: 'id1 very long (1000 chars)',   id1: 'A'.repeat(1000), id2: UNKNOWN_ID2 },
        { name: 'id2 very long (1000 chars)',   id1: UNKNOWN_ID1, id2: 'B'.repeat(1000) },
        { name: 'id1 path traversal',           id1: '../../etc/passwd', id2: UNKNOWN_ID2 },
        { name: 'id1 and id2 are numbers only', id1: '0', id2: '0' }
    ];

    for (const idCase of idCases) {

        test(
            `@regression @validation POST - ReopenOpportunity with ${idCase.name}`,
            async () => {

                const response = await apiClient.post(
                    actionPath('ReopenOpportunity', idCase.id1, idCase.id2),
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                await expectRejected(response);

            }
        );

    }


    // ========================================================
    // VALIDATION - Malformed request bodies
    // ========================================================

    test(
        '@regression @validation POST - Malformed JSON body',
        async () => {

            const response = await apiClient.post(
                actionPath('ReopenOpportunity'),
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: '{"reason": '
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    test(
        '@regression @validation POST - JSON array instead of object',
        async () => {

            const response = await apiClient.post(
                actionPath('RenewCreditLimit'),
                {
                    data: []
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    // ========================================================

    for (const action of actions) {

        for (const contentType of ['text/plain', 'application/xml']) {

            test(
                `@regression @gateway POST ${action.name} with ${contentType} returns 415`,
                async () => {

                    const response = await apiClient.post(
                        actionPath(action.name),
                        {
                            headers: {
                                'Content-Type': contentType
                            },
                            data: 'invalid data'
                        }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(415);

                    await expectJsonResponse(response);

                }
            );

        }

    }


    test(
        '@regression @gateway POST ReopenOpportunity with form-urlencoded returns 415',
        async () => {

            const response = await apiClient.post(
                actionPath('ReopenOpportunity'),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: 'id=1'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    /*
     * The policy condition is: content-type != "application/json"
     * which is an EXACT comparison, so "application/json; charset=utf-8"
     * is rejected too. This test documents that behaviour.
     * Remove it if you change the condition to a "starts with" match.
     */
    test(
        '@regression @gateway POST ReopenOpportunity with "application/json; charset=utf-8" returns 415',
        async () => {

            const response = await apiClient.post(
                actionPath('ReopenOpportunity'),
                {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    data: JSON.stringify(requestBody)
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    // ========================================================
    // GATEWAY - Method Not Allowed (RF-MethodNotAllowed)
    // Every action accepts POST only
    // ========================================================

    for (const action of actions) {

        for (const method of ['get', 'put', 'delete', 'patch']) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${action.name} is not allowed`,
                async () => {

                    const response = await apiClient[method](
                        actionPath(action.name),
                        method === 'get' || method === 'delete'
                            ? {}
                            : { data: requestBody }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(405);

                    await expectJsonResponse(response);

                }
            );

        }

    }


    // ========================================================
    // GATEWAY - Order of checks in the PreFlow
    //   SpikeArrest -> VerifyToken -> Method -> Content-Type -> Quota
    // ========================================================

    test(
        '@regression @gateway PRECEDENCE - GET with text/plain returns 405 (method check before content-type)',
        async () => {

            const response = await apiClient.get(
                actionPath('RenewCreditLimit'),
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - PUT with text/plain returns 405 (method check before content-type)',
        async () => {

            const response = await apiClient.put(
                actionPath('RenewCreditLimit'),
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // GATEWAY - Unknown Paths (RF-NotFound)
    // The flow condition is  /<Action>/*/*  -  exactly two segments
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/ReopenOpportunity',
        '/ReopenOpportunity/only-one-id',
        '/ReopenOpportunity/a/b/c',
        '/ProvideOfferCompleteFinancing/only-one-id',
        '/ProvideOfferCompleteFinancing/a/b/c',
        '/RenewCreditLimit',
        '/RenewCreditLimit/a/b/c/d',
        '/reopenopportunity/a/b',
        '/CloseOpportunity/a/b'
    ];

    for (const path of invalidPaths) {

        test(
            `@regression @gateway PATH - POST ${path} should return 404`,
            async () => {

                const response = await apiClient.post(
                    `${BASE_PATH}${path}`,
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    test(
        '@regression @gateway PATH - GET on unknown path returns 405 (method check runs first)',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/invalid-endpoint`
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PATH - POST text/plain on unknown path returns 415 (content-type check runs first)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/invalid-endpoint`,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    // ========================================================
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const action of actions) {

        test(
            `@regression @auth AUTH - POST ${action.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await unauthenticatedClient.post(
                    actionPath(action.name),
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - POST ${action.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await invalidTokenClient.post(
                    actionPath(action.name),
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                /*
                 * Expected result is 401.
                 *
                 * If you receive 429, Apigee rate limiting
                 * (SA-PreventSpikes) is triggered BEFORE
                 * OA2-VerifyToken in the PreFlow.
                 */
                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await invalidTokenClient.dispose();

            }
        );

    }


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.post(
                actionPath('ReopenOpportunity'),
                {
                    data: requestBody
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await basicAuthClient.dispose();

        }
    );


    test(
        '@regression @auth AUTH - Empty bearer token',
        async () => {

            const emptyTokenClient = await createClientWithHeaders({
                Authorization: 'Bearer ',
                'Content-Type': 'application/json'
            });

            const response = await emptyTokenClient.post(
                actionPath('ReopenOpportunity'),
                {
                    data: requestBody
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await emptyTokenClient.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with GET returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({});

            const response = await unauthenticatedClient.get(
                actionPath('ReopenOpportunity')
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with text/plain returns 401 (not 415)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'text/plain'
            });

            const response = await unauthenticatedClient.post(
                actionPath('ReopenOpportunity'),
                {
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // Response Time (proxy-only response, no target call)
    // ========================================================

    test(
        '@regression PERFORMANCE - 405 response within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.get(
                actionPath('ReopenOpportunity')
            );

            const duration = Date.now() - start;

            console.log('Response time (ms):', duration);

            expect(response.status()).toBe(405);

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

            // GET is answered by the proxy (405) so no action reaches the target
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.get(actionPath('ReopenOpportunity'))
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});
