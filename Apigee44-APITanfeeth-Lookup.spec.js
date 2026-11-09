import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.TANFEETH_LOOKUP_BASE_PATH || '/MH-v1/tanfeeth-lookup';

/*
 * Proxy "MH-Tanfeeth-Lookup-v1" (ProxyEndpoint "default")
 *
 * PreFlow (order matters):
 *   1. SA-PreventSpikes
 *   2. OA2-VerifyToken            -> 401 (fault rule "Unauthorized")
 *   3. request.verb != "GET"      -> RF-MethodNotAllowed (405)
 *   4. content-type != "application/json" -> RF-InvalidMediaType (415)
 *   5. QU-PerConsumerLimit
 *
 * Only GET is accepted, on the paths below. Steps 3 and 4 are in the
 * PreFlow, so they apply to EVERY path (known or unknown).
 *
 * IMPORTANT: the Content-Type check applies to GET too. A GET without
 * "Content-Type: application/json" is rejected with 415, so the apiClient
 * from api-client.js must send that header.
 *
 * Any GET to another path is answered by the "Unknown" flow (404).
 *
 *   GET /Cities                              : Cities
 *   GET /Countries                           : Countries
 *   GET /Courts                              : Courts
 *   GET /EnforcementTypes                    : Enforcement Types
 *   GET /ExecutionClaimResults               : Execution Claim Results
 *   GET /ExecutionRequestStatus              : Execution Request Status
 *   GET /IdentityTypes                       : Identity Types
 *   GET /LicenseSources                      : License Sources
 *   GET /Agencies                            : Agencies
 */

const routes = [
    {
        name: 'Cities',
        path: '/Cities'
    },
    {
        name: 'Countries',
        path: '/Countries'
    },
    {
        name: 'Courts',
        path: '/Courts'
    },
    {
        name: 'Enforcement Types',
        path: '/EnforcementTypes'
    },
    {
        name: 'Execution Claim Results',
        path: '/ExecutionClaimResults'
    },
    {
        name: 'Execution Request Status',
        path: '/ExecutionRequestStatus'
    },
    {
        name: 'Identity Types',
        path: '/IdentityTypes'
    },
    {
        name: 'License Sources',
        path: '/LicenseSources'
    },
    {
        name: 'Agencies',
        path: '/Agencies'
    }
];

// Verbs that must be rejected by the PreFlow (only GET is allowed)
const WRONG_METHODS = ['post', 'put', 'patch', 'delete'];

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);

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


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('Tanfeeth Lookup API Proxy (MH-v1/tanfeeth-lookup) - Regression Tests', () => {

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
    // GET - Positive (happy path, reaches the backend)
    // ========================================================

    for (const route of routes) {

        test(
            `@regression GET - ${route.name} is accepted by the proxy`,
            async () => {

                const start = Date.now();

                const response = await apiClient.get(routeUrl(route));

                const duration = Date.now() - start;

                await logResponse(response);

                // The proxy must let the request through to the target
                expect(GATEWAY_STATUSES).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

                expect(duration).toBeLessThan(10000);

            }
        );

        test(
            `@regression GET - ${route.name} returns JSON`,
            async () => {

                const response = await apiClient.get(routeUrl(route));

                if (response.status() === 200) {
                    await expectJsonResponse(response);
                }

                expect(response.status()).toBeLessThan(500);

            }
        );

        test(
            `@regression GET - ${route.name} with unknown query parameter is not rejected by the proxy`,
            async () => {

                const response = await apiClient.get(
                    `${routeUrl(route)}?unknownParameter=1`
                );

                await logResponse(response);

                expect(GATEWAY_STATUSES).not.toContain(response.status());

            }
        );

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method (RF-MethodNotAllowed)
    //   PreFlow condition: request.verb != "GET"
    // Applies to every path (known or unknown) and runs BEFORE the
    // Content-Type check and the flow match.
    // ========================================================

    for (const route of routes) {

        for (const method of WRONG_METHODS) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${route.name} (only GET is allowed)`,
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


    for (const method of WRONG_METHODS) {

        test(
            `@regression @gateway METHOD - ${method.toUpperCase()} on unknown path returns 405 (PreFlow check, not 404)`,
            async () => {

                const response = await send(
                    apiClient,
                    method,
                    `${BASE_PATH}/invalid-endpoint`
                );

                await logResponse(response);

                expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

                await expectJsonResponse(response);

            }
        );

        test(
            `@regression @gateway METHOD - ${method.toUpperCase()} on base path without suffix returns 405`,
            async () => {

                const response = await send(apiClient, method, BASE_PATH);

                await logResponse(response);

                expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

            }
        );

        test(
            `@regression @gateway METHOD - ${method.toUpperCase()} with text/plain returns 405 (method check before Content-Type check)`,
            async () => {

                const response = await send(
                    apiClient,
                    method,
                    routeUrl(routes[0]),
                    { headers: { 'Content-Type': 'text/plain' } }
                );

                await logResponse(response);

                expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

            }
        );

    }


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    //   request.header.content-type != "application/json"
    // No verb condition: the check applies to GET too, and to
    // GET requests to unknown paths.
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @gateway GET ${route.name} without Content-Type returns 415`,
            async () => {

                const client = await createClientWithHeaders({
                    Authorization: `Bearer ${token}`
                });

                const response = await client.get(routeUrl(route));

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

                await client.dispose();

            }
        );

        test(
            `@regression @gateway GET ${route.name} with text/plain returns 415`,
            async () => {

                const response = await apiClient.get(
                    routeUrl(route),
                    { headers: { 'Content-Type': 'text/plain' } }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

            }
        );

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

            test(
                `@regression @gateway GET ${route.name} with "${contentType}" returns 415`,
                async () => {

                    const response = await apiClient.get(
                        routeUrl(route),
                        { headers: { 'Content-Type': contentType } }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(415);

                }
            );

        }

    }


    // ========================================================
    // GATEWAY - Order of checks
    //   PreFlow: SpikeArrest -> VerifyToken -> Method (405)
    //            -> Content-Type (415) -> Quota
    //   Flows  : path match (GET) -> otherwise "Unknown" (404)
    // ========================================================

    test(
        '@regression @gateway PRECEDENCE - GET with text/plain on unknown path returns 415 (Content-Type check before 404)',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/invalid-endpoint`,
                { headers: { 'Content-Type': 'text/plain' } }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - GET without Content-Type on unknown path returns 415 (not 404)',
        async () => {

            const client = await createClientWithHeaders({
                Authorization: `Bearer ${token}`
            });

            const response = await client.get(`${BASE_PATH}/invalid-endpoint`);

            await logResponse(response);

            expect(response.status()).toBe(415);

            await client.dispose();

        }
    );


    test(
        '@regression @gateway PRECEDENCE - POST with text/plain returns 405 (not 415)',
        async () => {

            const response = await apiClient.post(
                routeUrl(routes[0]),
                {
                    headers: { 'Content-Type': 'text/plain' },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - POST without Content-Type returns 405 (not 415)',
        async () => {

            const client = await createClientWithHeaders({
                Authorization: `Bearer ${token}`
            });

            const response = await client.post(
                routeUrl(routes[0]),
                { data: '{}' }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

            await client.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with POST returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.post(
                routeUrl(routes[0]),
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

            const response = await unauthenticatedClient.get(routeUrl(routes[0]));

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
    // GET + valid token + application/json passes the whole PreFlow
    // and reaches the "Unknown" flow.
    // MatchesPath is exact (no wildcards) and case sensitive.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/cities',
        '/CITIES',
        '/Cities/1',
        '/Cities/extra-segment',
        '/Citiess',
        '/countries',
        '/COUNTRIES',
        '/Countries/1',
        '/Countries/extra-segment',
        '/Countriess',
        '/courts',
        '/COURTS',
        '/Courts/1',
        '/Courts/extra-segment',
        '/Courtss',
        '/enforcementtypes',
        '/ENFORCEMENTTYPES',
        '/EnforcementTypes/1',
        '/EnforcementTypes/extra-segment',
        '/EnforcementTypess',
        '/executionclaimresults',
        '/EXECUTIONCLAIMRESULTS',
        '/ExecutionClaimResults/1',
        '/ExecutionClaimResults/extra-segment',
        '/ExecutionClaimResultss',
        '/executionrequeststatus',
        '/EXECUTIONREQUESTSTATUS',
        '/ExecutionRequestStatus/1',
        '/ExecutionRequestStatus/extra-segment',
        '/ExecutionRequestStatuss',
        '/identitytypes',
        '/IDENTITYTYPES',
        '/IdentityTypes/1',
        '/IdentityTypes/extra-segment',
        '/IdentityTypess',
        '/licensesources',
        '/LICENSESOURCES',
        '/LicenseSources/1',
        '/LicenseSources/extra-segment',
        '/LicenseSourcess',
        '/agencies',
        '/AGENCIES',
        '/Agencies/1',
        '/Agencies/extra-segment',
        '/Agenciess',
        '/City',
        '/Country',
        '/Court',
        '/EnforcementType',
        '/Agency',
        '/IdentityType',
        '/LicenseSource',
        '/Lookup',
        '/Lookups',
        '/tanfeeth'
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


    test(
        '@regression @gateway PATH - GET base path without suffix should return 404',
        async () => {

            const response = await apiClient.get(BASE_PATH);

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @auth AUTH - GET ${route.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await unauthenticatedClient.get(routeUrl(route));

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - GET ${route.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await invalidTokenClient.get(routeUrl(route));

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


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.get(routeUrl(routes[0]));

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

            const response = await emptyTokenClient.get(routeUrl(routes[0]));

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

            const response = await malformedTokenClient.get(routeUrl(routes[0]));

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
                `${routeUrl(routes[0])}?access_token=${token}`
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

            const response = await apiClient.post(
                routeUrl(routes[0]),
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

            const response = await apiClient.get(
                routeUrl(routes[0]),
                { headers: { 'Content-Type': 'text/plain' } }
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

            // POST is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.post(routeUrl(routes[0]), { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});