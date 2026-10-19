import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.FUNDING_OPPORTUNITIES_BASE_PATH || '/MH-v1/opportunities';

/*
 * Values used for the wildcard path segments (/*).
 * The gateway only checks the NUMBER of segments, but the happy-path tests
 * also reach the target, so set real values for your environment.
 */
const SAMPLE_ID_1 = process.env.SAMPLE_ID_1 || '1';
const SAMPLE_ID_2 = process.env.SAMPLE_ID_2 || '1';

// Body sent to the POST flow (OpportunityOffersList)
const OFFERS_BODY = process.env.OFFERS_REQUEST_BODY
    ? JSON.parse(process.env.OFFERS_REQUEST_BODY)
    : {};

/*
 * Flows of the proxy (ProxyEndpoint "default").
 *
 *   method   : the ONLY verb accepted by the flow condition
 *   path     : sample path that matches the flow's MatchesPath
 *   segments : number of "/*" wildcards in the MatchesPath
 *   prefix   : fixed first segment of the path
 */
const routes = [
    { name: 'Listing',                method: 'GET',  prefix: '/listing',                  segments: 0 },
    { name: 'DetailedOpportunitiesList', method: 'GET',  prefix: '/DetailedOpportunitiesList', segments: 1 },
    { name: 'OpportunityDetails',      method: 'GET',  prefix: '/OpportunityDetails',       segments: 2 },
    { name: 'OpportunityStatus',       method: 'GET',  prefix: '/OpportunityStatus',        segments: 2 },
    { name: 'OpportunityCommentsList', method: 'GET',  prefix: '/OpportunityCommentsList',  segments: 2 },
    { name: 'OpportunityOffersList',   method: 'POST', prefix: '/OpportunityOffersList',    segments: 2 }
].map(route => ({
    ...route,
    path: route.prefix + [SAMPLE_ID_1, SAMPLE_ID_2].slice(0, route.segments).map(s => `/${s}`).join('')
}));

const getRoutes  = routes.filter(r => r.method === 'GET');
const postRoutes = routes.filter(r => r.method === 'POST');

const ALL_METHODS = ['get', 'post', 'put', 'delete', 'patch'];

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);


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
 * Send a request with the given HTTP method using the authenticated client.
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
 * Proxy path list for a route:  /listing/extra, /OpportunityDetails/1/2/3 ...
 */
function withExtraSegment(route) {

    return `${routeUrl(route)}/extra-segment`;
}


function withMissingSegment(route) {

    // Drop the last wildcard segment (nothing to drop for /listing)
    return `${BASE_PATH}${route.path.substring(0, route.path.lastIndexOf('/'))}`;
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('Funding Opportunities API Proxy (MH-v1/opportunities) - Regression Tests', () => {

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
    // GET flows - happy path
    // Listing, DetailedOpportunitiesList, OpportunityDetails,
    // OpportunityStatus, OpportunityCommentsList
    // ========================================================

    for (const route of getRoutes) {

        test(
            `@regression GET - ${route.name} returns data`,
            async () => {

                const start = Date.now();

                const response = await apiClient.get(routeUrl(route));

                const duration = Date.now() - start;

                await logResponse(response);

                expect(response.status()).toBe(200);

                await expectJsonResponse(response);

                const body = await response.json();

                expect(body).not.toBeNull();

                expect(duration).toBeLessThan(5000);

            }
        );

        test(
            `@regression GET - ${route.name} returns the same data on repeated calls`,
            async () => {

                const first = await apiClient.get(routeUrl(route));

                const second = await apiClient.get(routeUrl(route));

                expect(first.status()).toBe(200);

                expect(second.status()).toBe(200);

                expect(await second.json()).toEqual(await first.json());

            }
        );

        test(
            `@regression GET - ${route.name} with unknown query parameter does not fail`,
            async () => {

                const response = await apiClient.get(
                    `${routeUrl(route)}?unknownParameter=1`
                );

                await logResponse(response);

                expect(response.status()).toBeLessThan(500);

                // The proxy must not reject a query string
                expect([401, 404, 405, 415]).not.toContain(response.status());

            }
        );

    }


    // ========================================================
    // POST flow - OpportunityOffersList (happy path)
    // ========================================================

    for (const route of postRoutes) {

        test(
            `@regression POST - ${route.name} is accepted by the proxy`,
            async () => {

                const start = Date.now();

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: OFFERS_BODY }
                );

                const duration = Date.now() - start;

                await logResponse(response);

                // The proxy must let the request through to the target
                expect([401, 404, 405, 415]).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

                expect(duration).toBeLessThan(5000);

            }
        );

        test(
            `@regression POST - ${route.name} returns JSON`,
            async () => {

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: OFFERS_BODY }
                );

                if (response.status() === 200) {
                    await expectJsonResponse(response);
                }

                expect(response.status()).toBeLessThan(500);

            }
        );

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method
    //
    // Each flow condition is:
    //     (proxy.pathsuffix MatchesPath "<path>") and (request.verb = "GET"|"POST")
    // so a request with another verb does NOT match the flow. It falls
    // through to the "Unknown" flow => RF-NotFound (404).
    // The RF-MethodNotAllowed step inside the flows is therefore never
    // reached. If you change the flow conditions to match on path only,
    // update EXPECTED_WRONG_METHOD_STATUS to 405.
    // ========================================================

    const EXPECTED_WRONG_METHOD_STATUS = Number(
        process.env.EXPECTED_WRONG_METHOD_STATUS || 404
    );

    for (const route of routes) {

        const wrongMethods = ALL_METHODS.filter(
            m => m !== route.method.toLowerCase()
        );

        for (const method of wrongMethods) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${route.name} (only ${route.method} is allowed)`,
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


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    //   request.header.content-type != "application/json"
    // The check is in the PreFlow, so it applies to every method and
    // every path, including GET requests and unknown paths.
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @gateway ${route.method} ${route.name} without Content-Type returns 415`,
            async () => {

                const client = await createClientWithHeaders({
                    Authorization: `Bearer ${token}`
                });

                // A string body gets application/octet-stream, never application/json
                const response = route.method === 'POST'
                    ? await client.post(routeUrl(route), { data: '{}' })
                    : await client.get(routeUrl(route));

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

                await client.dispose();

            }
        );

        test(
            `@regression @gateway ${route.method} ${route.name} with text/plain returns 415`,
            async () => {

                const response = await send(
                    apiClient,
                    route.method,
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
        test(
            `@regression @gateway GET Listing with "${contentType}" returns 415`,
            async () => {

                const response = await apiClient.get(
                    `${BASE_PATH}/listing`,
                    { headers: { 'Content-Type': contentType } }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

            }
        );

        test(
            `@regression @gateway POST OpportunityOffersList with "${contentType}" returns 415`,
            async () => {

                const response = await apiClient.post(
                    `${BASE_PATH}/OpportunityOffersList/${SAMPLE_ID_1}/${SAMPLE_ID_2}`,
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


    // ========================================================
    // GATEWAY - Order of checks
    //   PreFlow: SpikeArrest -> VerifyToken -> Content-Type -> Quota
    //   Flows  : path + verb match -> otherwise "Unknown" (404)
    // ========================================================

    test(
        '@regression @gateway PRECEDENCE - POST on GET-only route returns 404 (verb mismatch falls to Unknown flow)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/listing`,
                { data: {} }
            );

            await logResponse(response);

            expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - GET on POST-only route returns 404 (verb mismatch falls to Unknown flow)',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/OpportunityOffersList/${SAMPLE_ID_1}/${SAMPLE_ID_2}`
            );

            await logResponse(response);

            expect(response.status()).toBe(EXPECTED_WRONG_METHOD_STATUS);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - POST with text/plain on GET-only route returns 415 (content-type check before flow)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/listing`,
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
        '@regression @gateway PRECEDENCE - GET text/plain on unknown path returns 415 (content-type check before 404)',
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
        '@regression @auth PRECEDENCE - No token with POST on GET-only route returns 401 (not 404)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.post(
                `${BASE_PATH}/listing`,
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

            const response = await unauthenticatedClient.get(
                `${BASE_PATH}/listing`
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
    // MatchesPath: "*" matches exactly ONE path segment, the
    // match is exact and case sensitive.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/Listing',                                   // case sensitive
        '/LISTING',
        '/listings',
        '/listing/extra-segment',
        '/listing/1/2',
        '/DetailedOpportunitiesList',                 // wildcard segment missing
        '/DetailedOpportunitiesList/1/2',             // too many segments
        '/detailedopportunitieslist/1',               // case sensitive
        '/OpportunityDetails',
        '/OpportunityDetails/1',                      // needs 2 segments
        '/OpportunityDetails/1/2/3',
        '/opportunitydetails/1/2',
        '/OpportunityStatus',
        '/OpportunityStatus/1',
        '/OpportunityStatus/1/2/3',
        '/OpportunityStatuses/1/2',
        '/OpportunityCommentsList',
        '/OpportunityCommentsList/1',
        '/OpportunityCommentsList/1/2/3',
        '/OpportunityOffersList',
        '/OpportunityOffersList/1',
        '/OpportunityOffersList/1/2/3',
        '/Opportunities',
        '/Opportunity/1',
        '/Lookup/OpportunityStatus',
        '/RejectionReasons',
        '/CountriesList'
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

        }
    );


    test(
        '@regression @gateway PATH - POST on unknown path should return 404',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/invalid-endpoint`,
                { data: {} }
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    for (const route of routes) {

        test(
            `@regression @gateway PATH - ${route.method} ${route.name} with an extra segment should return 404`,
            async () => {

                const response = await send(
                    apiClient,
                    route.method,
                    withExtraSegment(route)
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        // /listing has no wildcard segment, so there is nothing to remove
        if (route.segments > 0) {

            test(
                `@regression @gateway PATH - ${route.method} ${route.name} with a missing segment should return 404`,
                async () => {

                    const response = await send(
                        apiClient,
                        route.method,
                        withMissingSegment(route)
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(404);

                    await expectJsonResponse(response);

                }
            );

        }

        // MatchesPath is case sensitive
        test(
            `@regression @gateway PATH - ${route.method} ${route.name} in lower case should return 404`,
            async () => {

                const response = await send(
                    apiClient,
                    route.method,
                    `${BASE_PATH}${route.path.toLowerCase()}`
                );

                await logResponse(response);

                // "/listing" is already lower case, so it is a valid call
                if (route.path === route.path.toLowerCase()) {
                    expect(response.status()).not.toBe(404);
                } else {
                    expect(response.status()).toBe(404);
                }

            }
        );

    }


    // ========================================================
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @auth AUTH - ${route.method} ${route.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await send(
                    unauthenticatedClient,
                    route.method,
                    routeUrl(route)
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - ${route.method} ${route.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await send(
                    invalidTokenClient,
                    route.method,
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


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.get(
                `${BASE_PATH}/listing`
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
                `${BASE_PATH}/listing`
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

            const response = await malformedTokenClient.get(
                `${BASE_PATH}/listing`
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

            const response = await noHeaderClient.get(
                `${BASE_PATH}/listing?access_token=${token}`
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
        '@regression PERFORMANCE - 404 response (verb mismatch) within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.post(
                `${BASE_PATH}/listing`,
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
                `${BASE_PATH}/listing`,
                { headers: { 'Content-Type': 'text/plain' } }
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

            // PUT on /listing is answered by the proxy (404) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/listing`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});
