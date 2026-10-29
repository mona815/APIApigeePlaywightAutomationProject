import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.ITSM_ASSETS_BASE_PATH || '/MH-v1/itsm/assets';

function parseBody(envName) {

    const raw = process.env[envName];

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error(`Environment variable ${envName} is not valid JSON: ${e.message}`);
    }
}

/*
 * Flows of the proxy (ProxyEndpoint "default", MH-itsm-assets-v1).
 *
 *   path    : exact MatchesPath (no wildcards in this proxy)
 *   allowed : verbs that have their own flow (GET / POST / PATCH / DELETE)
 *   wrong   : verbs that fall into the "<route> - Method Not Allowed" flow
 *             (RF-MethodNotAllowed). The condition of that flow has no verb,
 *             so it is a FLOW rule and NOT a PreFlow rule:
 *             an unknown path with a wrong verb is answered 404, not 405.
 *
 *   /assets             : GET, POST, PATCH
 *   /asset-assignments  : GET, POST, DELETE
 */
const routes = [
    {
        name: 'Assets',
        path: '/assets',
        allowed: ['GET', 'POST', 'PATCH'],
        wrong: ['PUT', 'DELETE']
    },
    {
        name: 'Asset Assignments and Inventory',
        path: '/asset-assignments',
        allowed: ['GET', 'POST', 'DELETE'],
        wrong: ['PUT', 'PATCH']
    }
];

/*
 * One entry per proxy flow that reaches the target.
 *
 *   write : changes data in the ITSM backend (create / update / delete).
 *           These tests run only when RUN_WRITE_TESTS=true AND a body
 *           (or query for DELETE) is supplied in the environment.
 *   query : query string (no leading "?") for the happy-path call
 *   body  : JSON body for the happy-path call
 */
const operations = [
    {
        name: 'Get Assets',
        route: routes[0],
        method: 'GET',
        write: false,
        envName: 'ASSETS_GET_QUERY',
        query: process.env.ASSETS_GET_QUERY || process.env.DEFAULT_QUERY || '',
        body: null
    },
    {
        name: 'Create Assets',
        route: routes[0],
        method: 'POST',
        write: true,
        envName: 'ASSETS_POST_BODY',
        query: '',
        body: parseBody('ASSETS_POST_BODY')
    },
    {
        name: 'Update Assets',
        route: routes[0],
        method: 'PATCH',
        write: true,
        envName: 'ASSETS_PATCH_BODY',
        query: '',
        body: parseBody('ASSETS_PATCH_BODY')
    },
    {
        name: 'Get Asset Assignments and Inventory',
        route: routes[1],
        method: 'GET',
        write: false,
        envName: 'ASSET_ASSIGNMENTS_GET_QUERY',
        query: process.env.ASSET_ASSIGNMENTS_GET_QUERY || process.env.DEFAULT_QUERY || '',
        body: null
    },
    {
        name: 'Create Asset Assignments and Inventory',
        route: routes[1],
        method: 'POST',
        write: true,
        envName: 'ASSET_ASSIGNMENTS_POST_BODY',
        query: '',
        body: parseBody('ASSET_ASSIGNMENTS_POST_BODY')
    },
    {
        name: 'Delete Asset Assignments and Inventory',
        route: routes[1],
        method: 'DELETE',
        write: true,
        envName: 'ASSET_ASSIGNMENTS_DELETE_QUERY',
        query: process.env.ASSET_ASSIGNMENTS_DELETE_QUERY || '',
        body: parseBody('ASSET_ASSIGNMENTS_DELETE_BODY')
    }
];

// Only POST and PATCH are checked for Content-Type (RF-InvalidMediaType, PreFlow)
const BODY_VERBS = ['POST', 'PATCH'];

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);

// Opt-in: tests that create / update / delete data in the backend
const RUN_WRITE_TESTS = process.env.RUN_WRITE_TESTS === 'true';

/*
 * RF-MethodNotAllowed is inside the "<route> - Method Not Allowed" FLOW,
 * so it runs AFTER the PreFlow (token, Content-Type, quota) and only
 * for the two known paths.
 */
const EXPECTED_WRONG_METHOD_STATUS = Number(
    process.env.EXPECTED_WRONG_METHOD_STATUS || 405
);

// Status codes produced by the gateway itself (the request never reached the target)
const GATEWAY_STATUSES = [401, 404, 405, 415];


// ============================================================
// Helper Functions
// ============================================================

function routeUrl(route) {

    return `${BASE_PATH}${route.path}`;
}


function operationUrl(op, extraQuery = '') {

    const parts = [op.query, extraQuery].filter(Boolean).join('&');

    return parts ? `${routeUrl(op.route)}?${parts}` : routeUrl(op.route);
}


function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));
}


async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
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


/*
 * Send a request with the given HTTP method.
 * GET / DELETE are sent without a body, the others with an empty JSON body.
 */
function send(client, method, url, options = {}) {

    const lower = method.toLowerCase();

    if (lower === 'get' || lower === 'delete') {
        return client[lower](url, options);
    }

    return client[lower](url, { data: {}, ...options });
}


// Call a happy-path operation with its configured query / body
function callOperation(client, op, extraQuery = '') {

    const url = operationUrl(op, extraQuery);

    if (op.method === 'POST' || op.method === 'PATCH') {
        return client[op.method.toLowerCase()](url, { data: op.body });
    }

    if (op.method === 'DELETE') {
        return op.body
            ? client.delete(url, { data: op.body })
            : client.delete(url);
    }

    return client.get(url);
}


// Skip a happy-path test that is not safe or not configured
function skipUnlessRunnable(op) {

    test.skip(
        op.write && !RUN_WRITE_TESTS,
        `${op.name} changes backend data. Set RUN_WRITE_TESTS=true to run`
    );

    if (op.write) {

        const configured = op.method === 'DELETE'
            ? Boolean(op.query || op.body)
            : Boolean(op.body);

        test.skip(!configured, `Set ${op.envName} to run`);
    }
}


function withExtraSegment(route) {

    return `${routeUrl(route)}/extra-segment`;
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('ITSM Assets API Proxy (MH-v1/itsm/assets) - Regression Tests', () => {

    let apiClient;

    // Valid token, used by clients that must NOT send Content-Type
    let token;


    // --------------------------------------------------------
    // Setup
    // --------------------------------------------------------

    test.beforeAll(async () => {

        apiClient = await createApiClient();

        token = await getBearerToken();

    });


    test.beforeEach(async () => {

        if (REQUEST_DELAY_MS > 0) {
            await sleep(REQUEST_DELAY_MS);
        }

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
    // Flows - happy path
    // Get Assets, Create Assets, Update Assets,
    // Get / Create / Delete Asset Assignments and Inventory
    //
    // Read flows (GET) always run. Write flows (POST / PATCH / DELETE)
    // change backend data, so they run only with RUN_WRITE_TESTS=true
    // and a body / query taken from the environment.
    // ========================================================

    for (const op of operations) {

        test(
            `@regression ${op.method} - ${op.name} is accepted by the proxy`,
            async () => {

                skipUnlessRunnable(op);

                const start = Date.now();

                const response = await callOperation(apiClient, op);

                const duration = Date.now() - start;

                await logResponse(response);

                // The proxy must let the request through to the target
                expect(GATEWAY_STATUSES).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

                expect(duration).toBeLessThan(5000);

            }
        );

        test(
            `@regression ${op.method} - ${op.name} returns JSON`,
            async () => {

                skipUnlessRunnable(op);

                const response = await callOperation(apiClient, op);

                if (response.status() === 200 || response.status() === 201) {
                    await expectJsonResponse(response);
                }

                expect(response.status()).toBeLessThan(500);

            }
        );

        if (!op.write) {

            test(
                `@regression ${op.method} - ${op.name} with unknown query parameter is not rejected by the proxy`,
                async () => {

                    const response = await callOperation(
                        apiClient,
                        op,
                        'unknownParameter=1'
                    );

                    await logResponse(response);

                    expect(GATEWAY_STATUSES).not.toContain(response.status());

                    expect(response.status()).toBeLessThan(500);

                }
            );

            // Content-Type is checked only for POST and PATCH (PreFlow condition)
            test(
                `@regression @gateway ${op.method} - ${op.name} without Content-Type is not rejected with 415`,
                async () => {

                    const client = await createClientWithHeaders({
                        Authorization: `Bearer ${token}`
                    });

                    const response = await client.get(operationUrl(op));

                    await logResponse(response);

                    expect(response.status()).not.toBe(415);

                    expect(GATEWAY_STATUSES).not.toContain(response.status());

                    await client.dispose();

                }
            );

            test(
                `@regression @gateway ${op.method} - ${op.name} with text/plain is not rejected with 415`,
                async () => {

                    const response = await apiClient.get(
                        operationUrl(op),
                        { headers: { 'Content-Type': 'text/plain' } }
                    );

                    await logResponse(response);

                    expect(response.status()).not.toBe(415);

                    expect(GATEWAY_STATUSES).not.toContain(response.status());

                }
            );

        }

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method (RF-MethodNotAllowed)
    //   Flow "<route> - Method Not Allowed":
    //     proxy.pathsuffix MatchesPath "<route>"   (no verb condition)
    // It is a FLOW, so:
    //   - it applies only to the two known paths,
    //   - it runs AFTER the token, Content-Type and quota checks,
    //   - an unknown path with any verb is answered 404 (not 405).
    // ========================================================

    for (const route of routes) {

        for (const method of route.wrong) {

            test(
                `@regression @gateway METHOD - ${method} ${route.name} (allowed: ${route.allowed.join(', ')})`,
                async () => {

                    const response = await send(
                        apiClient,
                        method,
                        routeUrl(route)
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

                    await expectJsonResponse(response);

                }
            );

        }

    }


    // Verbs without a Content-Type check are answered by the method flow
    // even when the Content-Type is wrong.
    for (const route of routes) {

        for (const method of route.wrong.filter(m => !BODY_VERBS.includes(m))) {

            test(
                `@regression @gateway METHOD - ${method} ${route.name} with text/plain returns 405 (Content-Type is checked only for POST / PATCH)`,
                async () => {

                    const response = await send(
                        apiClient,
                        method,
                        routeUrl(route),
                        { headers: { 'Content-Type': 'text/plain' } }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

                }
            );

        }

    }


    // The method flow does not apply to unknown paths: they fall into "Unknown"
    for (const method of ['GET', 'PUT', 'DELETE']) {

        test(
            `@regression @gateway METHOD - ${method} on unknown path returns 404 (method flow applies only to known paths)`,
            async () => {

                const response = await send(
                    apiClient,
                    method,
                    `${BASE_PATH}/invalid-endpoint`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        test(
            `@regression @gateway METHOD - ${method} on base path without suffix returns 404`,
            async () => {

                const response = await send(apiClient, method, BASE_PATH);

                await logResponse(response);

                expect(response.status()).toBe(404);

            }
        );

    }


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    //   (request.verb = "POST" or request.verb = "PATCH")
    //   and request.header.content-type != "application/json"
    // The check is in the PreFlow, so it applies to every POST / PATCH,
    // including unknown paths and the "wrong method" PATCH on
    // /asset-assignments. GET, PUT and DELETE are never checked.
    // Valid token + invalid Content-Type: the request never reaches the target.
    // ========================================================

    const bodyOperations = operations.filter(op => BODY_VERBS.includes(op.method));

    for (const op of bodyOperations) {

        const method = op.method.toLowerCase();

        test(
            `@regression @gateway ${op.method} ${op.name} without Content-Type returns 415`,
            async () => {

                // Client with only the Authorization header: no Content-Type is sent
                const client = await createClientWithHeaders({
                    Authorization: `Bearer ${token}`
                });

                // A string body gets application/octet-stream, never application/json
                const response = await client[method](
                    routeUrl(op.route),
                    { data: '{}' }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

                await client.dispose();

            }
        );

        test(
            `@regression @gateway ${op.method} ${op.name} with text/plain returns 415`,
            async () => {

                const response = await apiClient[method](
                    routeUrl(op.route),
                    {
                        headers: { 'Content-Type': 'text/plain' },
                        data: '{}'
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

            }
        );

    }


    for (const contentType of [
        'application/xml',
        'text/xml',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'application/octet-stream',
        'application/json; charset=utf-8'
    ]) {

        /*
         * The policy condition is an EXACT comparison, so
         * "application/json; charset=utf-8" is rejected too.
         * Remove that case if you change the condition to "starts with".
         */
        for (const op of bodyOperations) {

            test(
                `@regression @gateway ${op.method} ${op.name} with "${contentType}" returns 415`,
                async () => {

                    const response = await apiClient[op.method.toLowerCase()](
                        routeUrl(op.route),
                        {
                            headers: { 'Content-Type': contentType },
                            data: '{}'
                        }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(415);

                }
            );

        }

    }


    // ========================================================
    // GATEWAY - Order of checks
    //   PreFlow: SpikeArrest -> VerifyToken
    //            -> Content-Type (415, POST / PATCH only) -> Quota
    //   Flows  : specific verb flow -> "<route> - Method Not Allowed"
    //            (405) -> "Unknown" (404)
    // ========================================================

    test(
        '@regression @gateway PRECEDENCE - POST with text/plain on unknown path returns 415 (Content-Type check before 404)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/invalid-endpoint`,
                {
                    headers: { 'Content-Type': 'text/plain' },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - PATCH with text/plain on unknown path returns 415 (Content-Type check before 404)',
        async () => {

            const response = await apiClient.patch(
                `${BASE_PATH}/invalid-endpoint`,
                {
                    headers: { 'Content-Type': 'text/plain' },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - PATCH with text/plain on /asset-assignments returns 415 (not 405)',
        async () => {

            // PATCH is not allowed on /asset-assignments, but the PreFlow
            // Content-Type check runs before the "Method Not Allowed" flow.
            const response = await apiClient.patch(
                `${BASE_PATH}/asset-assignments`,
                {
                    headers: { 'Content-Type': 'text/plain' },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - PATCH with application/json on /asset-assignments returns 405',
        async () => {

            const response = await apiClient.patch(
                `${BASE_PATH}/asset-assignments`,
                { data: {} }
            );

            await logResponse(response);

            expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - PUT with text/plain returns 405 (not 415)',
        async () => {

            const response = await apiClient.put(
                `${BASE_PATH}/assets`,
                {
                    headers: { 'Content-Type': 'text/plain' },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - DELETE without Content-Type on /assets returns 405 (not 415)',
        async () => {

            const client = await createClientWithHeaders({
                Authorization: `Bearer ${token}`
            });

            const response = await client.delete(`${BASE_PATH}/assets`);

            await logResponse(response);

            expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

            await client.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with PUT returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.put(
                `${BASE_PATH}/assets`,
                { data: {} }
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
                `${BASE_PATH}/assets`,
                { data: 'invalid data' }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token on unknown path returns 401 (not 404)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.get(
                `${BASE_PATH}/invalid-endpoint`
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // GATEWAY - Unknown Paths (RF-NotFound)
    // Valid token + application/json, so the request passes the
    // PreFlow and reaches the "Unknown" flow.
    // MatchesPath is exact (no wildcards) and case sensitive.
    // GET and POST are both used: the answer must be 404 for any verb.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',

        // /assets: case, spelling, separators
        '/Assets',
        '/ASSETS',
        '/asset',
        '/assetss',
        '/asset-s',
        '/assets/',                                   // trailing slash
        '/assets/1',
        '/assets/extra-segment',
        '/assets/1/2',
        '/assets.json',
        '/assets.svc',

        // /asset-assignments: case, spelling, separators
        '/Asset-Assignments',
        '/ASSET-ASSIGNMENTS',
        '/assetassignments',
        '/asset_assignments',
        '/asset-assignment',
        '/asset-assignmentss',
        '/asset-assignments/',                        // trailing slash
        '/asset-assignments/1',
        '/asset-assignments/extra-segment',
        '/asset-assignments/1/2',
        '/asset-assignments.json',

        // names of the flows / other ITSM resources
        '/inventory',
        '/asset-inventory',
        '/assignments',
        '/assets-assignments',
        '/itsm',
        '/itsm/assets',
        '/listing'
    ];

    for (const path of invalidPaths) {

        test(
            `@regression @gateway PATH - GET ${path} should return 404`,
            async () => {

                const response = await apiClient.get(`${BASE_PATH}${path}`);

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    for (const path of ['/invalid-endpoint', '/assets/extra-segment', '/asset-assignments/extra-segment', '/ASSETS']) {

        test(
            `@regression @gateway PATH - POST ${path} should return 404`,
            async () => {

                const response = await apiClient.post(
                    `${BASE_PATH}${path}`,
                    { data: {} }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    test(
        '@regression @gateway PATH - GET base path without suffix should return 404',
        async () => {

            const response = await apiClient.get(BASE_PATH);

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    test(
        '@regression @gateway PATH - POST base path without suffix should return 404',
        async () => {

            const response = await apiClient.post(BASE_PATH, { data: {} });

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    for (const route of routes) {

        test(
            `@regression @gateway PATH - GET ${route.name} with an extra segment should return 404`,
            async () => {

                const response = await apiClient.get(withExtraSegment(route));

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        // MatchesPath is case sensitive
        test(
            `@regression @gateway PATH - GET ${route.name} in upper case should return 404`,
            async () => {

                const response = await apiClient.get(
                    `${BASE_PATH}${route.path.toUpperCase()}`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    // ========================================================
    // AUTHENTICATION (OA2-VerifyToken + Unauthorized fault rule)
    // The token is checked before everything else except SpikeArrest,
    // so these calls never reach the target. Write verbs are sent with
    // an empty JSON body and are rejected with 401 first.
    // ========================================================

    for (const op of operations) {

        test(
            `@regression @auth AUTH - ${op.method} ${op.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await send(
                    unauthenticatedClient,
                    op.method,
                    routeUrl(op.route)
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - ${op.method} ${op.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await send(
                    invalidTokenClient,
                    op.method,
                    routeUrl(op.route)
                );

                await logResponse(response);

                /*
                 * Expected result is 401 (fault rule "Unauthorized" ->
                 * RF-Unauthorized).
                 *
                 * If you receive 429, Apigee rate limiting
                 * (SA-PreventSpikes) is triggered BEFORE
                 * OA2-VerifyToken in the PreFlow. Use REQUEST_DELAY_MS.
                 */
                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await invalidTokenClient.dispose();

            }
        );

    }


    test(
        '@regression @auth AUTH - Expired token returns 401 (fault rule Unauthorized)',
        async () => {

            test.skip(
                !process.env.EXPIRED_TOKEN,
                'Set EXPIRED_TOKEN to an expired access token to run'
            );

            const expiredClient = await createClientWithHeaders({
                Authorization: `Bearer ${process.env.EXPIRED_TOKEN}`,
                'Content-Type': 'application/json'
            });

            const response = await expiredClient.get(`${BASE_PATH}/assets`);

            await logResponse(response);

            expect(response.status()).toBe(401);

            await expectJsonResponse(response);

            await expiredClient.dispose();

        }
    );


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.get(`${BASE_PATH}/assets`);

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

            const response = await emptyTokenClient.get(`${BASE_PATH}/assets`);

            await logResponse(response);

            expect(response.status()).toBe(401);

            await emptyTokenClient.dispose();

        }
    );


    test(
        '@regression @auth AUTH - Malformed JWT-like token',
        async () => {

            const malformedTokenClient = await createClientWithHeaders({
                Authorization: 'Bearer aaa.bbb.ccc',
                'Content-Type': 'application/json'
            });

            const response = await malformedTokenClient.get(`${BASE_PATH}/assets`);

            await logResponse(response);

            expect(response.status()).toBe(401);

            await malformedTokenClient.dispose();

        }
    );


    test(
        '@regression @auth AUTH - Token in query string is not accepted',
        async () => {

            const noHeaderClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await noHeaderClient.get(
                `${BASE_PATH}/assets?access_token=${token}`
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await noHeaderClient.dispose();

        }
    );


    // ========================================================
    // Response Time (proxy-only response, no target call)
    // ========================================================

    test(
        '@regression PERFORMANCE - 405 response (wrong method) within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.put(
                `${BASE_PATH}/assets`,
                { data: {} }
            );

            const duration = Date.now() - start;

            console.log('Response time (ms):', duration);

            expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

            expect(duration).toBeLessThan(3000);

        }
    );


    test(
        '@regression PERFORMANCE - 415 response within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.post(
                `${BASE_PATH}/assets`,
                {
                    headers: { 'Content-Type': 'text/plain' },
                    data: '{}'
                }
            );

            const duration = Date.now() - start;

            console.log('Response time (ms):', duration);

            expect(response.status()).toBe(415);

            expect(duration).toBeLessThan(3000);

        }
    );


    test(
        '@regression PERFORMANCE - 404 response (unknown path) within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.get(`${BASE_PATH}/invalid-endpoint`);

            const duration = Date.now() - start;

            console.log('Response time (ms):', duration);

            expect(response.status()).toBe(404);

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

            // PUT on /assets is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/assets`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});