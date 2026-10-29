import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.ITSM_CHANGES_BASE_PATH || '/MH-v1/itsm/changes';

function parseBody(envName) {

    return process.env[envName] ? JSON.parse(process.env[envName]) : {};
}

/*
 * Flows of the proxy (ProxyEndpoint "default", MH-itsm-changes-v1).
 *
 *   allowed : verbs that have their own flow (everything else on the path
 *             is answered by the "... - Method Not Allowed" flow => 405)
 *   blocked : verbs used to test the "Method Not Allowed" flow
 *   path    : exact MatchesPath of the flow (no wildcards in this proxy)
 *   body    : request body sent in the happy path tests (override with env variable)
 *   query   : query string sent in the GET / DELETE happy path tests
 *
 *   NOTE: POST / PATCH / DELETE happy path tests create, change or delete
 *   data in the target system. Point them to a test environment and use
 *   the env variables below to send valid data.
 */
const routes = [
    {
        name: 'Changes',
        path: '/changes',
        allowed: ['GET', 'POST', 'PATCH', 'DELETE'],
        blocked: ['put'],
        body: {
            POST: parseBody('CHANGES_POST_BODY'),
            PATCH: parseBody('CHANGES_PATCH_BODY')
        },
        query: {
            GET: process.env.CHANGES_GET_QUERY || 'limit=1',
            DELETE: process.env.CHANGES_DELETE_QUERY || 'id=playwright-nonexistent-id'
        }
    },
    {
        name: 'Change Comments',
        path: '/change-comments',
        allowed: ['GET', 'POST', 'DELETE'],
        blocked: ['put', 'patch'],
        body: {
            POST: parseBody('CHANGE_COMMENTS_POST_BODY')
        },
        query: {
            GET: process.env.CHANGE_COMMENTS_GET_QUERY || 'limit=1',
            DELETE: process.env.CHANGE_COMMENTS_DELETE_QUERY || 'id=playwright-nonexistent-id'
        }
    }
];

// Every (route, verb) pair that has its own flow
const allowedCases = routes.flatMap(route =>
    route.allowed.map(method => ({ route, method }))
);

// Verbs that carry a body in the happy path tests
const BODY_METHODS = ['POST', 'PATCH'];

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);

/*
 * "Method Not Allowed" is a FLOW (not a PreFlow step) in this proxy, so it
 * only applies to known paths (/changes, /change-comments). On unknown paths
 * the "Unknown" flow answers 404 whatever the verb is.
 */
const EXPECTED_WRONG_METHOD_STATUS = Number(
    process.env.EXPECTED_WRONG_METHOD_STATUS || 405
);


// ============================================================
// Helper Functions
// ============================================================

function routeUrl(route) {

    return `${BASE_PATH}${route.path}`;
}


function happyUrl(route, method) {

    const query = route.query[method];

    return query ? `${routeUrl(route)}?${query}` : routeUrl(route);
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


/*
 * Send the happy path request of a (route, verb) pair.
 */
function sendHappy(client, route, method, url = happyUrl(route, method)) {

    const options = BODY_METHODS.includes(method)
        ? { data: route.body[method] }
        : {};

    return client[method.toLowerCase()](url, options);
}


function withExtraSegment(route) {

    return `${routeUrl(route)}/extra-segment`;
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('ITSM Changes API Proxy (MH-v1/itsm/changes) - Regression Tests', () => {

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
    // Allowed flows - happy path
    //   /changes         : GET, POST, PATCH, DELETE
    //   /change-comments : GET, POST, DELETE
    // ========================================================

    for (const { route, method } of allowedCases) {

        test(
            `@regression ${method} - ${route.name} is accepted by the proxy`,
            async () => {

                const start = Date.now();

                const response = await sendHappy(apiClient, route, method);

                const duration = Date.now() - start;

                await logResponse(response);

                // The proxy must let the request through to the target
                expect([401, 404, 405, 415]).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

                expect(duration).toBeLessThan(5000);

            }
        );

        test(
            `@regression ${method} - ${route.name} returns JSON`,
            async () => {

                const response = await sendHappy(apiClient, route, method);

                if (response.status() === 200) {
                    await expectJsonResponse(response);
                }

                expect(response.status()).toBeLessThan(500);

            }
        );

        test(
            `@regression ${method} - ${route.name} with unknown query parameter is not rejected by the proxy`,
            async () => {

                const base = happyUrl(route, method);

                const url = `${base}${base.includes('?') ? '&' : '?'}unknownParameter=1`;

                const response = await sendHappy(apiClient, route, method, url);

                await logResponse(response);

                expect([401, 404, 405, 415]).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

            }
        );

    }


    for (const route of routes) {

        for (const method of route.allowed.filter(m => BODY_METHODS.includes(m))) {

            test(
                `@regression ${method} - ${route.name} with application/json and no body is not rejected by the gateway`,
                async () => {

                    const response = await apiClient[method.toLowerCase()](
                        routeUrl(route),
                        { headers: { 'Content-Type': 'application/json' } }
                    );

                    await logResponse(response);

                    // Gateway checks only the Content-Type header, not the body
                    expect([401, 404, 405, 415]).not.toContain(response.status());

                }
            );

        }

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method ("... - Method Not Allowed" flow)
    //   /changes         : PUT is rejected
    //   /change-comments : PUT and PATCH are rejected
    // The flow matches the path only, so it answers every verb that
    // has no flow of its own.
    // ========================================================

    for (const route of routes) {

        for (const method of route.blocked) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${route.name} returns 405`,
                async () => {

                    // application/json so the PreFlow Content-Type check (POST/PATCH) passes
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

        test(
            `@regression @gateway METHOD - PUT ${route.name} with text/plain returns 405 (Content-Type is only checked for POST / PATCH)`,
            async () => {

                const response = await apiClient.put(
                    routeUrl(route),
                    {
                        headers: { 'Content-Type': 'text/plain' },
                        data: '{}'
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

            }
        );

    }


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    //   (request.verb = "POST" or request.verb = "PATCH")
    //   and request.header.content-type != "application/json"
    // The check is in the PreFlow, so it applies to every POST / PATCH
    // request, including requests to unknown paths and to verbs that
    // the path would reject afterwards (PATCH /change-comments).
    // ========================================================

    for (const route of routes) {

        for (const method of ['post', 'patch']) {

            test(
                `@regression @gateway ${method.toUpperCase()} ${route.name} without Content-Type returns 415`,
                async () => {

                    const client = await createClientWithHeaders({
                        Authorization: `Bearer ${token}`
                    });

                    // A string body gets application/octet-stream, never application/json
                    const response = await client[method](
                        routeUrl(route),
                        { data: '{}' }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(415);

                    await expectJsonResponse(response);

                    await client.dispose();

                }
            );

            test(
                `@regression @gateway ${method.toUpperCase()} ${route.name} with text/plain returns 415`,
                async () => {

                    const response = await apiClient[method](
                        routeUrl(route),
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

    }


    for (const contentType of [
        'application/xml',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'application/json; charset=utf-8'
    ]) {

        /*
         * The policy condition is an EXACT comparison, so
         * "application/json; charset=utf-8" is rejected too.
         * Remove that case if you change the condition to "starts with".
         */
        for (const route of routes) {

            for (const method of ['post', 'patch']) {

                test(
                    `@regression @gateway ${method.toUpperCase()} ${route.name} with "${contentType}" returns 415`,
                    async () => {

                        const response = await apiClient[method](
                            routeUrl(route),
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

    }


    // ========================================================
    // GATEWAY - Order of checks
    //   PreFlow: SpikeArrest -> VerifyToken
    //            -> Content-Type (415, POST / PATCH only) -> Quota
    //   Flows  : path + verb match -> "Method Not Allowed" (405)
    //            -> otherwise "Unknown" (404)
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
        '@regression @gateway PRECEDENCE - PATCH with text/plain on /change-comments returns 415 (PreFlow runs before Method Not Allowed)',
        async () => {

            const response = await apiClient.patch(
                `${BASE_PATH}/change-comments`,
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
        '@regression @gateway PRECEDENCE - PATCH with application/json on /change-comments returns 405',
        async () => {

            const response = await apiClient.patch(
                `${BASE_PATH}/change-comments`,
                { data: {} }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - GET with text/plain is not rejected with 415',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/changes?${routes[0].query.GET}`,
                { headers: { 'Content-Type': 'text/plain' } }
            );

            await logResponse(response);

            expect(response.status()).not.toBe(415);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - GET with text/plain on unknown path returns 404 (not 415)',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/invalid-endpoint`,
                { headers: { 'Content-Type': 'text/plain' } }
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with PUT returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.put(
                `${BASE_PATH}/changes`,
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
                `${BASE_PATH}/changes`,
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
    // whole PreFlow and reaches the "Unknown" flow.
    // The "Unknown" flow has no condition, so every verb returns 404.
    // MatchesPath is exact (no wildcards) and case sensitive.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/Changes',                              // case sensitive
        '/CHANGES',
        '/change',
        '/changes/1',
        '/changes/1/2',
        '/changes/extra-segment',
        '/Change-Comments',                      // case sensitive
        '/CHANGE-COMMENTS',
        '/change_comments',                      // underscore instead of hyphen
        '/changecomments',
        '/change-comment',
        '/change-comments/1',
        '/change-comments/extra-segment',
        '/comments',
        '/history',
        '/cab',
        '/itsm',
        '/application/1'
    ];

    for (const path of invalidPaths) {

        for (const method of ['get', 'post']) {

            test(
                `@regression @gateway PATH - ${method.toUpperCase()} ${path} should return 404`,
                async () => {

                    const response = await send(
                        apiClient,
                        method,
                        `${BASE_PATH}${path}`
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(404);

                    await expectJsonResponse(response);

                }
            );

        }

    }


    for (const method of ['put', 'delete']) {

        test(
            `@regression @gateway PATH - ${method.toUpperCase()} on unknown path returns 404 (no method check on the Unknown flow)`,
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

    }


    for (const method of ['get', 'post']) {

        test(
            `@regression @gateway PATH - ${method.toUpperCase()} base path without suffix should return 404`,
            async () => {

                const response = await send(apiClient, method, BASE_PATH);

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


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
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const route of routes) {

        for (const method of ['get', 'post']) {

            test(
                `@regression @auth AUTH - ${method.toUpperCase()} ${route.name} without Authorization header`,
                async () => {

                    const unauthenticatedClient = await createClientWithHeaders({
                        'Content-Type': 'application/json'
                    });

                    const response = await send(
                        unauthenticatedClient,
                        method,
                        routeUrl(route)
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(401);

                    await expectJsonResponse(response);

                    await unauthenticatedClient.dispose();

                }
            );

            test(
                `@regression @auth AUTH - ${method.toUpperCase()} ${route.name} with invalid bearer token`,
                async () => {

                    const invalidTokenClient = await createClientWithHeaders({
                        Authorization: 'Bearer invalid-token-123456',
                        'Content-Type': 'application/json'
                    });

                    const response = await send(
                        invalidTokenClient,
                        method,
                        routeUrl(route)
                    );

                    await logResponse(response);

                    /*
                     * Expected result is 401.
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

    }


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.get(`${BASE_PATH}/changes`);

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

            const response = await emptyTokenClient.get(`${BASE_PATH}/changes`);

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

            const response = await malformedTokenClient.get(`${BASE_PATH}/changes`);

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
                `${BASE_PATH}/changes?access_token=${token}`
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
                `${BASE_PATH}/changes`,
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
                `${BASE_PATH}/changes`,
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

            // PUT on /changes is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/changes`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});