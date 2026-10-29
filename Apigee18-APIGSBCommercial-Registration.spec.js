import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.GSB_REGISTRATION_BASE_PATH || '/MH-v1/gsb-registration';

/*
 * Query string sent with each GET request in the happy-path tests,
 * for example "crNumber=1010000000". Override per flow with the env
 * variable named in "queryEnv", or for all flows with DEFAULT_QUERY.
 * The proxy does not validate query parameters; the target does.
 */
function queryFor(envName) {

    return process.env[envName] || process.env.DEFAULT_QUERY || '';
}

/*
 * Flows of the proxy (ProxyEndpoint "default", MH-GSB-Commercial-Registration-v1).
 * ALL flows accept GET only (PreFlow: request.verb != "GET" => RF-MethodNotAllowed).
 *
 *   name     : flow name in the proxy
 *   path     : exact MatchesPath (no wildcards in this proxy)
 *   queryEnv : env variable that overrides the query string
 */
const routes = [
    { name: 'Contract Info',        path: '/contractinfo',        queryEnv: 'CONTRACT_INFO_QUERY' },
    { name: 'CR Branches Info',     path: '/crbranchesinfo',      queryEnv: 'CR_BRANCHES_INFO_QUERY' },
    { name: 'CR Basic Info',        path: '/crbasicinfo',         queryEnv: 'CR_BASIC_INFO_QUERY' },
    { name: 'CR Details',           path: '/crdetails',           queryEnv: 'CR_DETAILS_QUERY' },
    { name: 'Person Related CRs',   path: '/personrelatedcrs',    queryEnv: 'PERSON_RELATED_CRS_QUERY' },
    { name: 'Shareholders Details', path: '/shareholdersdetails', queryEnv: 'SHAREHOLDERS_DETAILS_QUERY' }
].map(route => ({
    ...route,
    query: queryFor(route.queryEnv)
}));

// Verbs that must be rejected by the PreFlow (GET is the only allowed verb)
const WRONG_METHODS = ['post', 'put', 'delete', 'patch'];

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);

/*
 * RF-MethodNotAllowed is in the PreFlow, so it is applied to every path
 * (known or unknown) and BEFORE the Content-Type check and the flow match.
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


// Route URL with the query string configured for the happy-path tests
function routeUrlWithQuery(route, extraQuery = '') {

    const parts = [route.query, extraQuery].filter(Boolean).join('&');

    return parts ? `${routeUrl(route)}?${parts}` : routeUrl(route);
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


function withExtraSegment(route) {

    return `${routeUrl(route)}/extra-segment`;
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('GSB Commercial Registration API Proxy (MH-v1/gsb-registration) - Regression Tests', () => {

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
    // Contract Info, CR Branches Info, CR Basic Info,
    // CR Details, Person Related CRs, Shareholders Details
    //
    // The apiClient sends Content-Type: application/json, which the
    // PreFlow requires even for GET requests.
    // ========================================================

    for (const route of routes) {

        test(
            `@regression GET - ${route.name} is accepted by the proxy`,
            async () => {

                const start = Date.now();

                const response = await apiClient.get(routeUrlWithQuery(route));

                const duration = Date.now() - start;

                await logResponse(response);

                // The proxy must let the request through to the target
                expect([401, 404, 405, 415]).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

                expect(duration).toBeLessThan(5000);

            }
        );

        test(
            `@regression GET - ${route.name} returns JSON`,
            async () => {

                const response = await apiClient.get(routeUrlWithQuery(route));

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
                    routeUrlWithQuery(route, 'unknownParameter=1')
                );

                await logResponse(response);

                expect([401, 404, 405, 415]).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

            }
        );

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method (RF-MethodNotAllowed)
    //   PreFlow condition: request.verb != "GET"
    // The check is in the PreFlow, so it applies to every path,
    // and it runs BEFORE the Content-Type check and the flow match.
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
                    `${BASE_PATH}/crdetails`,
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
    // The check is in the PreFlow, so it applies to every GET
    // request too, including GETs to unknown paths.
    // A GET with no Content-Type header at all is rejected.
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @gateway GET ${route.name} without Content-Type returns 415`,
            async () => {

                // Client with only the Authorization header: no Content-Type is sent
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
        'application/octet-stream',
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
        '@regression @gateway PRECEDENCE - POST with text/plain returns 405 (not 415)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/crdetails`,
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

            // A string body gets application/octet-stream, never application/json
            const response = await client.post(
                `${BASE_PATH}/crdetails`,
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
                `${BASE_PATH}/crdetails`,
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
                `${BASE_PATH}/crdetails`
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
    // Valid token + GET + application/json, so the request
    // passes the whole PreFlow and reaches the "Unknown" flow.
    // MatchesPath is exact (no wildcards) and case sensitive.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',

        // contractinfo
        '/ContractInfo',                          // case sensitive
        '/CONTRACTINFO',
        '/contract-info',
        '/contract_info',
        '/contractinfos',
        '/contractinfo/1',
        '/contractinfo/extra-segment',
        '/contract',

        // crbranchesinfo
        '/CRBranchesInfo',
        '/CRBRANCHESINFO',
        '/cr-branches-info',
        '/crbranchinfo',
        '/crbranchesinfos',
        '/crbranchesinfo/1',
        '/crbranchesinfo/extra-segment',
        '/crbranches',

        // crbasicinfo
        '/CRBasicInfo',
        '/CRBASICINFO',
        '/cr-basic-info',
        '/crbasic',
        '/crbasicinfos',
        '/crbasicinfo/1',
        '/crbasicinfo/extra-segment',

        // crdetails
        '/CRDetails',
        '/CRDETAILS',
        '/cr-details',
        '/crdetail',
        '/crdetails/1',
        '/crdetails/extra-segment',

        // personrelatedcrs
        '/PersonRelatedCRs',
        '/PERSONRELATEDCRS',
        '/person-related-crs',
        '/personrelatedcr',
        '/personrelated',
        '/personrelatedcrs/1',
        '/personrelatedcrs/extra-segment',

        // shareholdersdetails
        '/ShareholdersDetails',
        '/SHAREHOLDERSDETAILS',
        '/shareholders-details',
        '/shareholders',
        '/shareholderdetails',
        '/shareholdersdetail',
        '/shareholdersdetails/1',
        '/shareholdersdetails/extra-segment',

        // generic
        '/registration',
        '/gsb-registration',
        '/cr',
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


    test(
        '@regression @gateway PATH - GET base path without suffix should return 404',
        async () => {

            const response = await apiClient.get(BASE_PATH);

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
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @auth AUTH - GET ${route.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await unauthenticatedClient.get(
                    routeUrlWithQuery(route)
                );

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

                const response = await invalidTokenClient.get(
                    routeUrlWithQuery(route)
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
                `${BASE_PATH}/crdetails`
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
                `${BASE_PATH}/crdetails`
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
                `${BASE_PATH}/crdetails`
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
                `${BASE_PATH}/crdetails?access_token=${token}`
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
                `${BASE_PATH}/crdetails`,
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
                `${BASE_PATH}/crdetails`,
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

            // POST on /crdetails is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.post(`${BASE_PATH}/crdetails`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});