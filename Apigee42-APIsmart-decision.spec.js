import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.SMART_DECISION_BASE_PATH || '/MH-v1/smart-decision';

/*
 * Proxy "MH-smart-decision-v1" (ProxyEndpoint "default")
 *
 * PreFlow (order matters):
 *   1. SA-PreventSpikes
 *   2. OA2-VerifyToken            -> 401 (fault rule "Unauthorized")
 *   3. request.verb != "POST"     -> RF-MethodNotAllowed (405)
 *   4. content-type != "application/json" -> RF-InvalidMediaType (415)
 *   5. QU-PerConsumerLimit
 *
 * Only POST is accepted, on the paths below. Steps 3 and 4 are in the
 * PreFlow, so they apply to EVERY path (known or unknown) and to every
 * verb (the Content-Type check also applies to GET / PUT / DELETE ...).
 * Any POST to another path is answered by the "Unknown" flow (404).
 *
 *   POST /Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=FinancialScoring : Financial Scoring Model
 *   POST /Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBureau : Credit Bureau Model
 *   POST /Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBehaviour : Credit Behaviour Model
 */

function parseBody(envName, fallback) {

    const raw = process.env[envName];

    if (!raw) {
        return fallback;
    }

    try {
        return JSON.parse(raw);
    } catch (e) {
        throw new Error(`Environment variable ${envName} is not valid JSON: ${e.message}`);
    }
}

/*
 * Sample payloads. They are placeholders: replace them with a valid payload
 * of the backend through the environment variable of each route.
 */
const routes = [
    {
        name: 'Financial Scoring Model',
        path: '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=FinancialScoring',
        envName: 'SMART_DECISION_FINANCIAL_SCORING_BODY',
        body: parseBody('SMART_DECISION_FINANCIAL_SCORING_BODY', {"nationalId": "1000000000"})
    },
    {
        name: 'Credit Bureau Model',
        path: '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBureau',
        envName: 'SMART_DECISION_CREDIT_BUREAU_BODY',
        body: parseBody('SMART_DECISION_CREDIT_BUREAU_BODY', {"nationalId": "1000000000"})
    },
    {
        name: 'Credit Behaviour Model',
        path: '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBehaviour',
        envName: 'SMART_DECISION_CREDIT_BEHAVIOUR_BODY',
        body: parseBody('SMART_DECISION_CREDIT_BEHAVIOUR_BODY', {"nationalId": "1000000000"})
    }
];

// Happy-path calls reach the real backend (cost, notifications, tickets ...).
// They run only when RUN_BACKEND_TESTS=true.
const RUN_BACKEND_TESTS = process.env.RUN_BACKEND_TESTS === 'true';

// Verbs that must be rejected by the PreFlow (only POST is allowed)
const WRONG_METHODS = ['get', 'put', 'patch', 'delete'];

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


function skipUnlessBackendTests() {

    test.skip(
        !RUN_BACKEND_TESTS,
        'Calls the real backend. Set RUN_BACKEND_TESTS=true to run'
    );
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('Smart Decision API Proxy (MH-v1/smart-decision) - Regression Tests', () => {

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
    // POST - Positive (happy path, reaches the backend)
    // ========================================================

    for (const route of routes) {

        test(
            `@regression POST - ${route.name} is accepted by the proxy`,
            async () => {

                skipUnlessBackendTests();

                const start = Date.now();

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                const duration = Date.now() - start;

                await logResponse(response);

                // The proxy must let the request through to the target
                expect(GATEWAY_STATUSES).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

                expect(duration).toBeLessThan(10000);

            }
        );

        test(
            `@regression POST - ${route.name} returns JSON`,
            async () => {

                skipUnlessBackendTests();

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                if (response.status() === 200) {
                    await expectJsonResponse(response);
                }

                expect(response.status()).toBeLessThan(500);

            }
        );

        test(
            `@regression POST - ${route.name} with unknown query parameter is not rejected by the proxy`,
            async () => {

                skipUnlessBackendTests();

                const response = await apiClient.post(
                    `${routeUrl(route)}?unknownParameter=1`,
                    { data: route.body }
                );

                await logResponse(response);

                expect(GATEWAY_STATUSES).not.toContain(response.status());

            }
        );

        test(
            `@regression POST - ${route.name} with application/json and no body is not rejected by the gateway`,
            async () => {

                skipUnlessBackendTests();

                const response = await apiClient.post(
                    routeUrl(route),
                    { headers: { 'Content-Type': 'application/json' } }
                );

                await logResponse(response);

                // Gateway checks only the Content-Type header, not the body
                expect(GATEWAY_STATUSES).not.toContain(response.status());

            }
        );

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method (RF-MethodNotAllowed)
    //   PreFlow condition: request.verb != "POST"
    // Applies to every path (known or unknown) and runs BEFORE the
    // Content-Type check and the flow match.
    // ========================================================

    for (const route of routes) {

        for (const method of WRONG_METHODS) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${route.name} (only POST is allowed)`,
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
    // No verb condition: the check applies to every verb that passed
    // the method check, i.e. POST, and to POST on unknown paths.
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @gateway POST ${route.name} without Content-Type returns 415`,
            async () => {

                const client = await createClientWithHeaders({
                    Authorization: `Bearer ${token}`
                });

                // A string body gets application/octet-stream, never application/json
                const response = await client.post(
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
            `@regression @gateway POST ${route.name} with text/plain returns 415`,
            async () => {

                const response = await apiClient.post(
                    routeUrl(route),
                    {
                        headers: { 'Content-Type': 'text/plain' },
                        data: JSON.stringify(route.body)
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
                `@regression @gateway POST ${route.name} with "${contentType}" returns 415`,
                async () => {

                    const response = await apiClient.post(
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


    // ========================================================
    // GATEWAY - Order of checks
    //   PreFlow: SpikeArrest -> VerifyToken -> Method (405)
    //            -> Content-Type (415) -> Quota
    //   Flows  : path match (POST) -> otherwise "Unknown" (404)
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
        '@regression @gateway PRECEDENCE - GET without Content-Type returns 405 (not 415)',
        async () => {

            const client = await createClientWithHeaders({
                Authorization: `Bearer ${token}`
            });

            const response = await client.get(routeUrl(routes[0]));

            await logResponse(response);

            expect(response.status()).toBe(405);

            await client.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with GET returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.get(routeUrl(routes[0]));

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
                routeUrl(routes[0]),
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

            const response = await unauthenticatedClient.post(
                `${BASE_PATH}/invalid-endpoint`,
                { data: {} }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // GATEWAY - Unknown Paths (RF-NotFound)
    // POST + valid token + application/json passes the whole PreFlow
    // and reaches the "Unknown" flow.
    // MatchesPath is exact (no wildcards) and case sensitive.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/execute/executedecisionsmart/decisionflowexternalreference=financialscoring',
        '/EXECUTE/EXECUTEDECISIONSMART/DECISIONFLOWEXTERNALREFERENCE=FINANCIALSCORING',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=FinancialScoring/1',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=FinancialScoring/extra-segment',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=FinancialScorings',
        '/execute/executedecisionsmart/decisionflowexternalreference=creditbureau',
        '/EXECUTE/EXECUTEDECISIONSMART/DECISIONFLOWEXTERNALREFERENCE=CREDITBUREAU',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBureau/1',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBureau/extra-segment',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBureaus',
        '/execute/executedecisionsmart/decisionflowexternalreference=creditbehaviour',
        '/EXECUTE/EXECUTEDECISIONSMART/DECISIONFLOWEXTERNALREFERENCE=CREDITBEHAVIOUR',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBehaviour/1',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBehaviour/extra-segment',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=CreditBehaviours',
        '/Execute',
        '/Execute/ExecuteDecisionSmart',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=Unknown',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=financialscoring',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=FINANCIALSCORING',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=creditbureau',
        '/Execute/ExecuteDecisionSmart/DecisionFlowExternalReference=creditbehavior',
        '/execute/ExecuteDecisionSmart/DecisionFlowExternalReference=FinancialScoring',
        '/FinancialScoring',
        '/CreditBureau',
        '/CreditBehaviour',
        '/smart-decision'
    ];

    for (const path of invalidPaths) {

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
        '@regression @gateway PATH - POST base path without suffix should return 404',
        async () => {

            const response = await apiClient.post(BASE_PATH, { data: {} });

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
            `@regression @auth AUTH - POST ${route.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await unauthenticatedClient.post(
                    routeUrl(route),
                    { data: {} }
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - POST ${route.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await invalidTokenClient.post(
                    routeUrl(route),
                    { data: {} }
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


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.post(
                routeUrl(routes[0]),
                { data: {} }
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
                routeUrl(routes[0]),
                { data: {} }
            );

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

            const response = await malformedTokenClient.post(
                routeUrl(routes[0]),
                { data: {} }
            );

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

            const response = await noHeaderClient.post(
                `${routeUrl(routes[0])}?access_token=${token}`,
                { data: {} }
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

            const response = await apiClient.get(routeUrl(routes[0]));

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
                routeUrl(routes[0]),
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

            const response = await apiClient.post(
                `${BASE_PATH}/invalid-endpoint`,
                { data: {} }
            );

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

            // GET is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.get(routeUrl(routes[0]))
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});