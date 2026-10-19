import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.FUNDING_OFFERS_BASE_PATH || '/MH-v1/offers';

/*
 * The 6 endpoints of the proxy.
 *   GET  /OpportunityOffersList/{id1}/{id2}
 *   GET  /OfferRejection/{id1}/{id2}
 *   POST /ForReviewOffer/{id1}/{id2}
 *   POST /FinalOffer/{id1}/{id2}
 *   POST /OpportunityInformationRequests/{id1}/{id2}
 *   POST /edit                                   (no path parameters)
 */
const endpoints = [
    { name: 'OpportunityOffersList',        action: 'OpportunityOffersList',        method: 'GET',  hasIds: true  },
    { name: 'OfferRejection',               action: 'OfferRejection',               method: 'GET',  hasIds: true  },
    { name: 'ForReviewOffer',               action: 'ForReviewOffer',               method: 'POST', hasIds: true  },
    { name: 'FinalOffer',                   action: 'FinalOffer',                   method: 'POST', hasIds: true  },
    { name: 'OpportunityInformationRequests', action: 'OpportunityInformationRequests', method: 'POST', hasIds: true  },
    { name: 'edit',                         action: 'edit',                         method: 'POST', hasIds: false }
];

const readEndpoints = endpoints.filter(endpoint => endpoint.method === 'GET');

const writeEndpoints = endpoints.filter(endpoint => endpoint.method === 'POST');

/*
 * IMPORTANT - how the proxy answers a WRONG HTTP method.
 *
 * The verb is part of every flow condition, e.g.
 *     (proxy.pathsuffix MatchesPath "/FinalOffer/*\/*") and (request.verb = "POST")
 * so a request with another verb does not match the flow and falls into the
 * "Unknown" flow -> RF-NotFound -> 404.  The RF-MethodNotAllowed step inside each
 * flow can never run.  The tests therefore expect 404 TODAY.
 * After you fix the proxy (move the verb out of the flow condition), run with
 *     WRONG_METHOD_STATUS=405
 */
const WRONG_METHOD_STATUS = Number(process.env.WRONG_METHOD_STATUS || 404);

/*
 * Tests that read existing records need real ids, and tests that CHANGE data
 * (ForReviewOffer, FinalOffer ...) also need RUN_LIVE_TESTS=true.
 */
const RUN_LIVE = process.env.RUN_LIVE_TESTS === 'true';

const LIVE_ID1 = process.env.OFFERS_ID1 || '';

const LIVE_ID2 = process.env.OFFERS_ID2 || '';

// IDs that must NOT exist in the target system
const UNKNOWN_ID1 = 'PLAYWRIGHT-UNKNOWN-001';

const UNKNOWN_ID2 = 'PLAYWRIGHT-UNKNOWN-002';

// Request bodies are not defined by the proxy XML, so they are configurable (JSON)
const requestBody = process.env.OFFERS_BODY
    ? JSON.parse(process.env.OFFERS_BODY)
    : {};

const editBody = process.env.OFFERS_EDIT_BODY
    ? JSON.parse(process.env.OFFERS_EDIT_BODY)
    : {};

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);


// ============================================================
// Helper Functions
// ============================================================

function endpointPath(endpoint, id1 = UNKNOWN_ID1, id2 = UNKNOWN_ID2) {

    if (!endpoint.hasIds) {
        return `${BASE_PATH}/${endpoint.action}`;
    }

    return `${BASE_PATH}/${endpoint.action}/${encodeURIComponent(id1)}/${encodeURIComponent(id2)}`;
}


function bodyFor(endpoint) {

    return endpoint.action === 'edit' ? editBody : requestBody;
}


// Calls an endpoint with its own (correct) HTTP method
function callEndpoint(client, endpoint, path, options = {}) {

    const method = endpoint.method.toLowerCase();

    if (method === 'post' && options.data === undefined && !options.noBody) {
        options = { ...options, data: bodyFor(endpoint) };
    }

    return client[method](path, options);
}


function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));
}


async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
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

test.describe('Funding Offers API Proxy (MH-v1/offers) - Regression Tests', () => {

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
    // GET - Read endpoints with an existing record
    // (need OFFERS_ID1 / OFFERS_ID2 - read only, nothing is changed)
    // ========================================================

    for (const endpoint of readEndpoints) {

        test(
            `@regression @data GET - ${endpoint.name} with existing record`,
            async () => {

                test.skip(
                    !LIVE_ID1 || !LIVE_ID2,
                    'Set OFFERS_ID1 and OFFERS_ID2 to an existing record'
                );

                const response = await apiClient.get(
                    endpointPath(endpoint, LIVE_ID1, LIVE_ID2)
                );

                await logResponse(response);

                expect(response.status()).toBe(200);

                await expectJsonResponse(response);

            }
        );

    }


    // ========================================================
    // POST - Actions that CHANGE data (LIVE)
    // ========================================================

    for (const endpoint of writeEndpoints.filter(item => item.hasIds)) {

        test(
            `@regression @live POST - ${endpoint.name} with existing record`,
            async () => {

                test.skip(
                    !RUN_LIVE || !LIVE_ID1 || !LIVE_ID2,
                    'Set RUN_LIVE_TESTS=true, OFFERS_ID1 and OFFERS_ID2'
                );

                const response = await apiClient.post(
                    endpointPath(endpoint, LIVE_ID1, LIVE_ID2),
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                expect([200, 201, 202, 204]).toContain(response.status());

            }
        );

    }


    test(
        '@regression @live POST - edit with a valid body',
        async () => {

            test.skip(
                !RUN_LIVE || !process.env.OFFERS_EDIT_BODY,
                'Set RUN_LIVE_TESTS=true and OFFERS_EDIT_BODY (JSON of an offer you can edit)'
            );

            const response = await apiClient.post(
                `${BASE_PATH}/edit`,
                {
                    data: editBody
                }
            );

            await logResponse(response);

            expect([200, 201, 202, 204]).toContain(response.status());

        }
    );


    // ========================================================
    // VALIDATION - Records that do not exist
    // (the request passes the proxy, the target decides)
    // ========================================================

    for (const endpoint of writeEndpoints.filter(item => item.hasIds)) {

        test(
            `@regression @validation POST - ${endpoint.name} with unknown ids`,
            async () => {

                const response = await apiClient.post(
                    endpointPath(endpoint),
                    {
                        data: requestBody
                    }
                );

                await logResponse(response);

                await expectRejected(response);

            }
        );

    }


    test(
        '@regression @validation GET - OfferRejection with unknown ids',
        async () => {

            const response = await apiClient.get(
                endpointPath(endpoints.find(item => item.name === 'OfferRejection'))
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // A list for an unknown opportunity may legitimately be empty (200) or 404
    test(
        '@regression @validation GET - OpportunityOffersList with unknown ids does not fail',
        async () => {

            const response = await apiClient.get(
                endpointPath(endpoints.find(item => item.name === 'OpportunityOffersList'))
            );

            await logResponse(response);

            expect(response.status()).toBeLessThan(500);

        }
    );


    // ========================================================
    // VALIDATION - Unusual path parameter values (read only endpoint)
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
            `@regression @validation GET - OpportunityOffersList with ${idCase.name} does not fail`,
            async () => {

                const response = await apiClient.get(
                    endpointPath(
                        endpoints.find(item => item.name === 'OpportunityOffersList'),
                        idCase.id1,
                        idCase.id2
                    )
                );

                await logResponse(response);

                expect(response.status()).toBeLessThan(500);

            }
        );

    }


    // ========================================================
    // VALIDATION - POST /edit request bodies
    // ========================================================

    test(
        '@regression @validation POST - edit with empty JSON object',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/edit`,
                {
                    data: {}
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    test(
        '@regression @validation POST - edit with malformed JSON',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/edit`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: '{"offerId": '
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    test(
        '@regression @validation POST - edit with JSON array instead of object',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/edit`,
                {
                    data: []
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    test(
        '@regression @validation POST - FinalOffer with malformed JSON',
        async () => {

            const response = await apiClient.post(
                endpointPath(endpoints.find(item => item.name === 'FinalOffer')),
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: '{"amount": '
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    // The check runs for EVERY verb, including GET:
    //   request.header.content-type != "application/json"
    // so a request WITHOUT Content-Type is rejected as well.
    // ========================================================

    for (const endpoint of endpoints) {

        test(
            `@regression @gateway ${endpoint.method} ${endpoint.name} without Content-Type returns 415`,
            async () => {

                const client = await createClientWithHeaders({
                    Authorization: `Bearer ${token}`
                });

                const response = await callEndpoint(
                    client,
                    endpoint,
                    endpointPath(endpoint),
                    { noBody: true }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

                await client.dispose();

            }
        );

        test(
            `@regression @gateway ${endpoint.method} ${endpoint.name} with text/plain returns 415`,
            async () => {

                const response = await callEndpoint(
                    apiClient,
                    endpoint,
                    endpointPath(endpoint),
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

    }


    for (const contentType of [
        'application/xml',
        'application/x-www-form-urlencoded',
        'application/json; charset=utf-8'
    ]) {

        /*
         * The policy condition is an EXACT comparison, so
         * "application/json; charset=utf-8" is rejected too.
         * Remove that case if you change the condition to "starts with".
         */
        test(
            `@regression @gateway POST FinalOffer with "${contentType}" returns 415`,
            async () => {

                const response = await apiClient.post(
                    endpointPath(endpoints.find(item => item.name === 'FinalOffer')),
                    {
                        headers: {
                            'Content-Type': contentType
                        },
                        data: JSON.stringify(requestBody)
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

            }
        );

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method
    // Today the request matches NO flow and gets RF-NotFound (404).
    // See WRONG_METHOD_STATUS at the top of this file.
    // ========================================================

    for (const endpoint of endpoints) {

        const wrongMethods = ['get', 'post', 'put', 'delete', 'patch']
            .filter(method => method !== endpoint.method.toLowerCase());

        for (const method of wrongMethods) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${endpoint.name} returns ${WRONG_METHOD_STATUS}`,
                async () => {

                    const response = await apiClient[method](
                        endpointPath(endpoint),
                        method === 'get' || method === 'delete'
                            ? {}
                            : { data: {} }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(WRONG_METHOD_STATUS);

                    await expectJsonResponse(response);

                }
            );

        }

    }


    // ========================================================
    // GATEWAY - Order of checks
    //   SpikeArrest -> VerifyToken -> Content-Type -> Quota -> Flow / 404
    // ========================================================

    test(
        '@regression @gateway PRECEDENCE - Wrong method with text/plain returns 415 (content-type check before flow)',
        async () => {

            const response = await apiClient.delete(
                endpointPath(endpoints.find(item => item.name === 'FinalOffer')),
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - GET on a POST endpoint with text/plain returns 415',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/edit`,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - Unknown path with text/plain returns 415 (content-type check before 404)',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/invalid-endpoint`,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with text/plain returns 401 (not 415)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'text/plain'
            });

            const response = await unauthenticatedClient.post(
                `${BASE_PATH}/edit`,
                {
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token on an unknown path returns 401 (not 404)',
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
    // Parameter endpoints need exactly two ids: /<Action>/*/*
    // /edit is an exact path.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/OpportunityOffersList',
        '/OpportunityOffersList/only-one-id',
        '/OpportunityOffersList/a/b/c',
        '/OfferRejection',
        '/OfferRejection/only-one-id',
        '/ForReviewOffer/only-one-id',
        '/FinalOffer',
        '/FinalOffer/a/b/c',
        '/OpportunityInformationRequests/only-one-id',
        '/edit/extra',
        '/Edit',
        '/EDIT',
        '/editOffer',
        '/RejectOffer/a/b'
    ];

    for (const path of invalidPaths) {

        test(
            `@regression @gateway PATH - GET ${path} should return 404`,
            async () => {

                const response = await apiClient.get(
                    `${BASE_PATH}${path}`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    for (const path of ['/invalid-endpoint', '/FinalOffer/only-one-id', '/edit/extra']) {

        test(
            `@regression @gateway PATH - POST ${path} should return 404`,
            async () => {

                const response = await apiClient.post(
                    `${BASE_PATH}${path}`,
                    {
                        data: {}
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    for (const endpoint of endpoints) {

        test(
            `@regression @gateway PATH - ${endpoint.method} ${endpoint.name} with an extra segment should return 404`,
            async () => {

                const response = await callEndpoint(
                    apiClient,
                    endpoint,
                    `${endpointPath(endpoint)}/extra-segment`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        // MatchesPath is case sensitive
        test(
            `@regression @gateway PATH - ${endpoint.method} ${endpoint.name} in lower case should return 404`,
            async () => {

                const response = await callEndpoint(
                    apiClient,
                    endpoint,
                    endpointPath(endpoint).replace(endpoint.action, endpoint.action.toLowerCase())
                );

                await logResponse(response);

                // "edit" is already lower case, so it is a valid call
                if (endpoint.action === 'edit') {
                    expect(response.status()).not.toBe(415);
                    return;
                }

                expect(response.status()).toBe(404);

            }
        );

    }


    // ========================================================
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const endpoint of endpoints) {

        test(
            `@regression @auth AUTH - ${endpoint.method} ${endpoint.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await callEndpoint(
                    unauthenticatedClient,
                    endpoint,
                    endpointPath(endpoint)
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - ${endpoint.method} ${endpoint.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await callEndpoint(
                    invalidTokenClient,
                    endpoint,
                    endpointPath(endpoint)
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

            const response = await basicAuthClient.get(
                endpointPath(endpoints.find(item => item.name === 'OfferRejection'))
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

            const response = await emptyTokenClient.get(
                endpointPath(endpoints.find(item => item.name === 'OfferRejection'))
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await emptyTokenClient.dispose();

        }
    );


    // ========================================================
    // Response Time (proxy-only response, no target call)
    // ========================================================

    test(
        '@regression PERFORMANCE - 415 response within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.get(
                endpointPath(endpoints.find(item => item.name === 'OfferRejection')),
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );

            const duration = Date.now() - start;

            console.log('Response time (ms):', duration);

            expect(response.status()).toBe(415);

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

            // text/plain is answered by the proxy (415) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.get(
                        `${BASE_PATH}/OfferRejection/a/b`,
                        {
                            headers: {
                                'Content-Type': 'text/plain'
                            }
                        }
                    )
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});