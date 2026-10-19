import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth1.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.FUNDING_CONFIG_BASE_PATH || '/MH-v1/config';

/*
 * The 11 lookup endpoints of the proxy. All of them are GET only.
 * CitiesList usually needs a filter - set CITIES_QUERY (e.g. countryId=1)
 * if it does not return data without one.
 */
const endpoints = [
    { name: 'RejectionReasons',          path: '/RejectionReasons' },
    { name: 'SMERejectionReasons',       path: '/SMERejectionReasons' },
    { name: 'ProductTypes',              path: '/ProductTypes' },
    { name: 'ReviewStates',              path: '/ReviewStates' },
    { name: 'CollateralTypes',           path: '/CollateralTypes' },
    { name: 'Lookup/DealingWay',         path: '/Lookup/DealingWay' },
    { name: 'CountriesList',             path: '/CountriesList' },
    { name: 'CitiesList',                path: '/CitiesList', query: process.env.CITIES_QUERY || '' },
    { name: 'IndustriesList',            path: '/IndustriesList' },
    { name: 'AdministrativeFeesPeriods', path: '/AdministrativeFeesPeriods' },
    { name: 'RepeatedPayment',           path: '/RepeatedPayment' }
];

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);


// ============================================================
// Helper Functions
// ============================================================

function endpointUrl(endpoint, withQuery = false) {

    const query = withQuery && endpoint.query ? `?${endpoint.query}` : '';

    return `${BASE_PATH}${endpoint.path}${query}`;
}


function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));
}


async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
}


/*
 * Lookup responses are lists. The proxy XML does not define the wrapper, so
 * accept either a JSON array or an object that contains an array property.
 */
function extractItems(body) {

    if (Array.isArray(body)) {
        return body;
    }

    if (body && typeof body === 'object') {

        const arrayProperty = Object.values(body).find(value => Array.isArray(value));

        return arrayProperty || null;
    }

    return null;
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

test.describe('Funding Config API Proxy (MH-v1/config) - Regression Tests', () => {

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
    // GET - Lookup endpoints (happy path)
    // ========================================================

    for (const endpoint of endpoints) {

        test(
            `@regression GET - ${endpoint.name} returns data`,
            async () => {

                const start = Date.now();

                const response = await apiClient.get(
                    endpointUrl(endpoint, true)
                );

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
            `@regression GET - ${endpoint.name} returns a non-empty list`,
            async () => {

                const response = await apiClient.get(
                    endpointUrl(endpoint, true)
                );

                expect(response.status()).toBe(200);

                const items = extractItems(await response.json());

                expect(items).not.toBeNull();

                expect(items.length).toBeGreaterThan(0);

            }
        );

        test(
            `@regression GET - ${endpoint.name} returns the same data on repeated calls`,
            async () => {

                const first = await apiClient.get(endpointUrl(endpoint, true));

                const second = await apiClient.get(endpointUrl(endpoint, true));

                expect(first.status()).toBe(200);

                expect(second.status()).toBe(200);

                expect(await second.json()).toEqual(await first.json());

            }
        );

    }


    // ========================================================
    // GET - Unexpected query string is tolerated
    // ========================================================

    test(
        '@regression GET - CountriesList with unknown query parameter does not fail',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/CountriesList?unknownParameter=1`
            );

            await logResponse(response);

            expect(response.status()).toBeLessThan(500);

        }
    );


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    // The content-type check applies to GET requests too:
    //   request.header.content-type != "application/json"
    // so a GET WITHOUT Content-Type is rejected as well.
    // ========================================================

    for (const endpoint of endpoints) {

        test(
            `@regression @gateway GET ${endpoint.name} without Content-Type returns 415`,
            async () => {

                const client = await createClientWithHeaders({
                    Authorization: `Bearer ${token}`
                });

                const response = await client.get(
                    endpointUrl(endpoint)
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

                await client.dispose();

            }
        );

        test(
            `@regression @gateway GET ${endpoint.name} with text/plain returns 415`,
            async () => {

                const response = await apiClient.get(
                    endpointUrl(endpoint),
                    {
                        headers: {
                            'Content-Type': 'text/plain'
                        }
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
            `@regression @gateway GET ProductTypes with "${contentType}" returns 415`,
            async () => {

                const response = await apiClient.get(
                    `${BASE_PATH}/ProductTypes`,
                    {
                        headers: {
                            'Content-Type': contentType
                        }
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

            }
        );

    }


    // ========================================================
    // GATEWAY - Method Not Allowed (RF-MethodNotAllowed)
    // Every endpoint accepts GET only
    // ========================================================

    for (const endpoint of endpoints) {

        for (const method of ['post', 'put', 'delete', 'patch']) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${endpoint.name} is not allowed`,
                async () => {

                    const response = await apiClient[method](
                        endpointUrl(endpoint),
                        method === 'delete'
                            ? {}
                            : { data: {} }
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
        '@regression @gateway PRECEDENCE - POST with text/plain returns 405 (method check before content-type)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/ProductTypes`,
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


    test(
        '@regression @gateway PRECEDENCE - POST on unknown path returns 405 (method check before 404)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/invalid-endpoint`,
                {
                    data: {}
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - GET text/plain on unknown path returns 415 (content-type check before 404)',
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
        '@regression @auth PRECEDENCE - No token with POST returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.post(
                `${BASE_PATH}/ProductTypes`,
                {
                    data: {}
                }
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
                `${BASE_PATH}/ProductTypes`
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // GATEWAY - Unknown Paths (RF-NotFound)
    // Each flow condition is an exact MatchesPath, e.g. "/ProductTypes"
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/Lookup',
        '/Lookup/Unknown',
        '/Lookup/DealingWay/extra',
        '/DealingWay',
        '/Lookups/DealingWay',
        '/ProductType',
        '/Countries',
        '/Config',
        '/RejectionReasons/1/2/3'
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


    for (const endpoint of endpoints) {

        test(
            `@regression @gateway PATH - GET ${endpoint.path}/extra-segment should return 404`,
            async () => {

                const response = await apiClient.get(
                    `${endpointUrl(endpoint)}/extra-segment`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        // MatchesPath is case sensitive
        test(
            `@regression @gateway PATH - GET ${endpoint.path.toLowerCase()} (lower case) should return 404`,
            async () => {

                const response = await apiClient.get(
                    `${BASE_PATH}${endpoint.path.toLowerCase()}`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

            }
        );

    }


    // ========================================================
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const endpoint of endpoints) {

        test(
            `@regression @auth AUTH - GET ${endpoint.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await unauthenticatedClient.get(
                    endpointUrl(endpoint)
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - GET ${endpoint.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await invalidTokenClient.get(
                    endpointUrl(endpoint)
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
                `${BASE_PATH}/ProductTypes`
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
                `${BASE_PATH}/ProductTypes`
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
        '@regression PERFORMANCE - 405 response within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.post(
                `${BASE_PATH}/ProductTypes`,
                {
                    data: {}
                }
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

            // POST is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.post(`${BASE_PATH}/ProductTypes`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});