import { test, expect, request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


/*
 * ============================================================
 * Kafalah External API (/application/v1/external) - Regression Tests
 *
 * Source: UAT_All_API_collection_postman_collection.json (29 requests)
 *
 * Environment variables
 *   API_TOKEN             (required) value of the x-api-key header
 *   BASE_URL              default https://apiuat.kafalah.gov.sa
 *   EMAIL / SOURCE / IPADDRESS   override the collection variables
 *   RUN_WRITE_TESTS=true  run the tests that create / change UAT data
 *   RUN_RATE_LIMIT_TESTS=true    run the burst test (expects 429)
 *   REQUEST_DELAY_MS      pause between tests (spike arrest)
 *   MAX_RESPONSE_MS       response time limit for normal calls (default 10000)
 *   LOG_RESPONSES=true    print every response
 *   PAYLOADS_FILE         path to the payload fixture (default: next to this spec)
 * ============================================================
 */


// ============================================================
// Test Data
// ============================================================

const here = path.dirname(fileURLToPath(import.meta.url));

const PAYLOADS_FILE = process.env.PAYLOADS_FILE
    || path.join(here, 'Apigee10-AllAPIFunding GateCollectionPostman.payloads.json');

const fixture = JSON.parse(fs.readFileSync(PAYLOADS_FILE, 'utf8'));

const BASE_URL = process.env.BASE_URL || 'https://apiuat.kafalah.gov.sa';

const API_TOKEN = process.env.API_TOKEN;

const PREFIX = fixture.pathPrefix;             // /application/v1/external

const VARIABLES = {
    EMAIL: process.env.EMAIL || fixture.variables.EMAIL,
    SOURCE: process.env.SOURCE || fixture.variables.SOURCE,
    IPADDRESS: process.env.IPADDRESS || fixture.variables.IPADDRESS,
    SAMPLE_DOCUMENT_BASE64: fixture.sampleDocumentBase64
};

const RUN_WRITE_TESTS = process.env.RUN_WRITE_TESTS === 'true';

const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);

const MAX_RESPONSE_MS = Number(process.env.MAX_RESPONSE_MS || 10000);

// Responses produced by the gateway itself must be fast
const GATEWAY_RESPONSE_MS = 3000;

// Documents / big payloads need more time
const UPLOAD_TIMEOUT_MS = 90000;

// Expected status codes (adjust to the real behaviour of the API)
const SUCCESS_STATUSES = [200, 201];
const AUTH_FAILURE_STATUSES = [401, 403];
const WRONG_METHOD_STATUSES = [404, 405];
const NOT_FOUND_STATUSES = [400, 404];

// The 29 requests of the collection
const allRequests = fixture.requests;

// One entry per distinct URL (five requests share /mandatory-documents/upload-documents)
const uniqueEndpoints = Object.values(
    allRequests.reduce((acc, req) => {

        if (!acc[req.path]) {
            acc[req.path] = { ...req };
        } else if (!req.readOnly) {
            // The endpoint changes data if ANY request that uses it changes data
            acc[req.path].readOnly = false;
        }

        return acc;

    }, {})
);

const listingPaths = [
    '/application-listing',
    '/query-listing',
    '/conditions-listing'
];

const idPathEndpoints = uniqueEndpoints.filter(e => e.pathId);

const CORE_FIELDS = ['email', 'useremail', 'uniqueidentifier', 'data'];

const INJECTION_VALUES = [
    "' OR '1'='1",
    '"; DROP TABLE applications; --',
    '<script>alert(1)</script>'
];


// ============================================================
// Helper Functions
// ============================================================

function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));
}


function urlFor(endpointPath) {

    return `${PREFIX}${endpointPath}`;
}


/*
 * Fresh copy of the collection body with {{VARIABLES}} filled in.
 */
function buildBody(req) {

    let text = JSON.stringify(req.body);

    for (const [key, value] of Object.entries(VARIABLES)) {
        text = text.split(`{{${key}}}`).join(value);
    }

    return JSON.parse(text);
}


function identityField(body) {

    return ['email', 'useremail'].find(key => key in body);
}


function isClientError(status) {

    return status >= 400 && status < 500;
}


function expectClientError(response) {

    expect(
        isClientError(response.status()),
        `expected a 4xx response but got ${response.status()}`
    ).toBe(true);
}


function expectStatusIn(response, allowed) {

    expect(
        allowed,
        `unexpected status ${response.status()}`
    ).toContain(response.status());
}


async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
}


async function logResponse(response) {

    if (process.env.LOG_RESPONSES !== 'true') {
        return;
    }

    const text = await response.text();

    console.log('-----------------------------------');
    console.log('Status:', response.status());
    console.log('Body:', text.length > 500 ? `${text.slice(0, 500)}...` : text);
    console.log('-----------------------------------');
}


/*
 * Write tests change data in UAT (new requests, uploads, amendments, ...),
 * so they only run when RUN_WRITE_TESTS=true.
 */
function requireWriteTests(readOnly) {

    test.skip(
        !readOnly && !RUN_WRITE_TESTS,
        'Changes UAT data - set RUN_WRITE_TESTS=true to run'
    );
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('Kafalah External API (/application/v1/external) - Regression Tests', () => {

    let api;


    /*
     * Send a request with the valid x-api-key and JSON content type.
     * A header set to null / undefined is removed from the request.
     *   body: object -> sent as JSON, string -> sent as is
     */
    async function call(method, endpointPath, { headers = {}, body, query = '' } = {}) {

        const merged = {
            'x-api-key': API_TOKEN,
            'Content-Type': 'application/json',
            ...headers
        };

        for (const key of Object.keys(merged)) {
            if (merged[key] === null || merged[key] === undefined) {
                delete merged[key];
            }
        }

        const options = {
            method,
            headers: merged,
            timeout: UPLOAD_TIMEOUT_MS,
            failOnStatusCode: false
        };

        if (body !== undefined) {
            options.data = typeof body === 'string'
                ? body
                : JSON.stringify(body);
        }

        const response = await api.fetch(
            `${urlFor(endpointPath)}${query}`,
            options
        );

        await logResponse(response);

        return response;
    }


    // --------------------------------------------------------
    // Setup / Cleanup
    // --------------------------------------------------------

    test.beforeAll(async () => {

        if (!API_TOKEN) {
            throw new Error('API_TOKEN is not set. Export the x-api-key value first.');
        }

        api = await request.newContext({
            baseURL: BASE_URL,
            ignoreHTTPSErrors: process.env.IGNORE_HTTPS_ERRORS === 'true'
        });

    });


    test.beforeEach(async () => {

        if (REQUEST_DELAY_MS > 0) {
            await sleep(REQUEST_DELAY_MS);
        }

    });


    test.afterAll(async () => {

        if (api) {
            await api.dispose();
        }

    });


    // ========================================================
    // POST - Happy path, one test per request of the collection
    // ========================================================

    for (const req of allRequests) {

        test(
            `@regression POST - ${req.name} returns success`,
            async () => {

                requireWriteTests(req.readOnly);

                test.setTimeout(UPLOAD_TIMEOUT_MS + 30000);

                const start = Date.now();

                const response = await call('POST', req.path, {
                    body: buildBody(req)
                });

                const duration = Date.now() - start;

                expectStatusIn(response, SUCCESS_STATUSES);

                await expectJsonResponse(response);

                const body = await response.json();

                expect(body).not.toBeNull();

                if (req.readOnly) {
                    expect(duration).toBeLessThan(MAX_RESPONSE_MS);
                }

            }
        );

        if (req.readOnly) {

            test(
                `@regression POST - ${req.name} returns the same data on repeated calls`,
                async () => {

                    const first = await call('POST', req.path, { body: buildBody(req) });

                    const second = await call('POST', req.path, { body: buildBody(req) });

                    expectStatusIn(first, SUCCESS_STATUSES);

                    expectStatusIn(second, SUCCESS_STATUSES);

                    expect(await second.json()).toEqual(await first.json());

                }
            );

        }

    }


    // ========================================================
    // AUTHENTICATION (x-api-key)
    // Runs for every distinct URL. Rejected by the gateway,
    // so no data is created.
    // ========================================================

    for (const endpoint of uniqueEndpoints) {

        test(
            `@regression @auth AUTH - ${endpoint.path} without x-api-key`,
            async () => {

                const start = Date.now();

                const response = await call('POST', endpoint.path, {
                    headers: { 'x-api-key': null },
                    body: buildBody(endpoint)
                });

                const duration = Date.now() - start;

                expectStatusIn(response, AUTH_FAILURE_STATUSES);

                expect(duration).toBeLessThan(GATEWAY_RESPONSE_MS);

            }
        );

        test(
            `@regression @auth AUTH - ${endpoint.path} with invalid x-api-key`,
            async () => {

                const response = await call('POST', endpoint.path, {
                    headers: { 'x-api-key': 'invalid-api-key-123456' },
                    body: buildBody(endpoint)
                });

                /*
                 * Expected 401/403. A 429 means the spike arrest policy fired
                 * before the key check - use REQUEST_DELAY_MS.
                 */
                expectStatusIn(response, AUTH_FAILURE_STATUSES);

            }
        );

        test(
            `@regression @auth AUTH - ${endpoint.path} with empty x-api-key`,
            async () => {

                const response = await call('POST', endpoint.path, {
                    headers: { 'x-api-key': '' },
                    body: buildBody(endpoint)
                });

                expectStatusIn(response, AUTH_FAILURE_STATUSES);

            }
        );

        test(
            `@regression @auth AUTH - ${endpoint.path} with the key sent as Bearer token`,
            async () => {

                const response = await call('POST', endpoint.path, {
                    headers: {
                        'x-api-key': null,
                        Authorization: `Bearer ${API_TOKEN}`
                    },
                    body: buildBody(endpoint)
                });

                expectStatusIn(response, AUTH_FAILURE_STATUSES);

            }
        );

        test(
            `@regression @auth AUTH - ${endpoint.path} with the key in the query string only`,
            async () => {

                const response = await call('POST', endpoint.path, {
                    headers: { 'x-api-key': null },
                    body: buildBody(endpoint),
                    query: `?x-api-key=${encodeURIComponent(API_TOKEN)}`
                });

                expectStatusIn(response, AUTH_FAILURE_STATUSES);

            }
        );

        test(
            `@regression @auth PRECEDENCE - ${endpoint.path} GET without key returns 401/403 (not 404/405)`,
            async () => {

                const response = await call('GET', endpoint.path, {
                    headers: { 'x-api-key': null, 'Content-Type': null }
                });

                expectStatusIn(response, AUTH_FAILURE_STATUSES);

            }
        );

    }


    // ========================================================
    // METHOD - every endpoint is POST only
    // ========================================================

    for (const endpoint of uniqueEndpoints) {

        for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {

            test(
                `@regression @gateway METHOD - ${method} ${endpoint.path} is not allowed`,
                async () => {

                    const response = await call(method, endpoint.path, {
                        body: method === 'GET' || method === 'DELETE'
                            ? undefined
                            : '{}'
                    });

                    expectStatusIn(response, WRONG_METHOD_STATUSES);

                }
            );

        }

    }


    // ========================================================
    // VALIDATION - invalid request bodies are rejected with 4xx
    // ========================================================

    for (const endpoint of uniqueEndpoints) {

        const invalidBodies = [
            { name: 'empty JSON object', body: '{}' },
            { name: 'no body', body: undefined },
            { name: 'malformed JSON', body: '{"email": "a@b.com", ' },
            { name: 'JSON array', body: '[]' },
            { name: 'JSON null', body: 'null' },
            { name: 'plain text', body: 'not json at all' }
        ];

        for (const invalid of invalidBodies) {

            test(
                `@regression @validation VALIDATION - ${endpoint.path} with ${invalid.name} returns 4xx`,
                async () => {

                    const response = await call('POST', endpoint.path, {
                        body: invalid.body
                    });

                    expectClientError(response);

                }
            );

        }

        // Content-Type is checked against the real body, so write endpoints
        // only run when RUN_WRITE_TESTS=true.
        for (const contentType of ['text/plain', 'application/xml', null]) {

            test(
                `@regression @validation CONTENT-TYPE - ${endpoint.path} with "${contentType}" is rejected`,
                async () => {

                    requireWriteTests(endpoint.readOnly);

                    const response = await call('POST', endpoint.path, {
                        headers: { 'Content-Type': contentType },
                        body: JSON.stringify(buildBody(endpoint))
                    });

                    /*
                     * A string body without Content-Type is sent by Playwright
                     * as application/octet-stream.
                     */
                    expectClientError(response);

                }
            );

        }

    }


    // --------------------------------------------------------
    // Missing / invalid mandatory fields (changes data when the
    // API does not validate, so write endpoints are opt-in)
    // --------------------------------------------------------

    for (const endpoint of uniqueEndpoints) {

        for (const field of CORE_FIELDS) {

            if (!(field in endpoint.body)) {
                continue;
            }

            test(
                `@regression @validation FIELD - ${endpoint.path} without "${field}" returns 4xx`,
                async () => {

                    requireWriteTests(endpoint.readOnly);

                    const body = buildBody(endpoint);

                    delete body[field];

                    const response = await call('POST', endpoint.path, { body });

                    expectClientError(response);

                }
            );

        }

        if ('uniqueidentifier' in endpoint.body) {

            for (const value of ['', 'invalid-identifier', '0']) {

                test(
                    `@regression @validation FIELD - ${endpoint.path} with uniqueidentifier "${value}" returns 4xx`,
                    async () => {

                        requireWriteTests(endpoint.readOnly);

                        const body = buildBody(endpoint);

                        body.uniqueidentifier = value;

                        const response = await call('POST', endpoint.path, { body });

                        expectClientError(response);

                    }
                );

            }

        }

        if (typeof endpoint.body.data === 'object' && endpoint.body.data !== null) {

            test(
                `@regression @validation FIELD - ${endpoint.path} with "data" as a string returns 4xx`,
                async () => {

                    requireWriteTests(endpoint.readOnly);

                    const body = buildBody(endpoint);

                    body.data = 'not-an-object';

                    const response = await call('POST', endpoint.path, { body });

                    expectClientError(response);

                }
            );

        }

    }


    // ========================================================
    // PATH - Unknown paths
    // ========================================================

    const unknownPaths = [
        '/unknown-endpoint',
        '/application-listing/extra-segment',
        '/new-request/unknown-type',
        '/new-request',
        '/mandatory-documents',
        '/Application-Listing'                  // case sensitive
    ];

    for (const unknownPath of unknownPaths) {

        test(
            `@regression @gateway PATH - POST ${unknownPath} should return 404`,
            async () => {

                const response = await call('POST', unknownPath, { body: '{}' });

                expectStatusIn(response, [404]);

            }
        );

    }


    test(
        '@regression @gateway PATH - POST on an unsupported API version should return 404',
        async () => {

            const response = await api.fetch(
                '/application/v2/external/application-listing',
                {
                    method: 'POST',
                    headers: {
                        'x-api-key': API_TOKEN,
                        'Content-Type': 'application/json'
                    },
                    data: '{}',
                    failOnStatusCode: false
                }
            );

            expectStatusIn(response, [404]);

        }
    );


    test(
        '@regression @auth PRECEDENCE - Unknown path without key returns 401/403 (not 404)',
        async () => {

            const response = await call('POST', '/unknown-endpoint', {
                headers: { 'x-api-key': null },
                body: '{}'
            });

            expectStatusIn(response, AUTH_FAILURE_STATUSES);

        }
    );


    // ========================================================
    // PATH ID - endpoints with an id in the URL
    //   /query-reply/{id}, /update-conditions/{id},
    //   /fetch-query-data/{id}, /update-query-data/{id}
    // ========================================================

    for (const endpoint of idPathEndpoints) {

        test(
            `@regression @validation ID - ${endpoint.basePath} without id returns 404`,
            async () => {

                const response = await call('POST', endpoint.basePath, {
                    body: '{}'
                });

                expectStatusIn(response, NOT_FOUND_STATUSES);

            }
        );

        test(
            `@regression @validation ID - ${endpoint.basePath} with a non-existing id returns 4xx`,
            async () => {

                requireWriteTests(endpoint.readOnly);

                const response = await call('POST', `${endpoint.basePath}/999999999`, {
                    body: buildBody(endpoint)
                });

                expectClientError(response);

            }
        );

        test(
            `@regression @validation ID - ${endpoint.basePath} with a non-numeric id returns 4xx`,
            async () => {

                requireWriteTests(endpoint.readOnly);

                const response = await call('POST', `${endpoint.basePath}/abc`, {
                    body: buildBody(endpoint)
                });

                expectClientError(response);

            }
        );

        test(
            `@regression @validation ID - ${endpoint.basePath} with a negative id returns 4xx`,
            async () => {

                requireWriteTests(endpoint.readOnly);

                const response = await call('POST', `${endpoint.basePath}/-1`, {
                    body: buildBody(endpoint)
                });

                expectClientError(response);

            }
        );

        test(
            `@regression @validation ID - ${endpoint.basePath} with an extra path segment returns 404`,
            async () => {

                const response = await call(
                    'POST',
                    `${endpoint.path}/extra-segment`,
                    { body: '{}' }
                );

                expectStatusIn(response, NOT_FOUND_STATUSES);

            }
        );

        if (endpoint.readOnly) {

            test(
                `@regression @security ID - ${endpoint.basePath} with an injection string as id returns 4xx`,
                async () => {

                    const response = await call(
                        'POST',
                        `${endpoint.basePath}/${encodeURIComponent('1 OR 1=1')}`,
                        { body: buildBody(endpoint) }
                    );

                    expectClientError(response);

                }
            );

        }

    }


    // ========================================================
    // LISTING - pagination (read-only endpoints)
    // ========================================================

    for (const listingPath of listingPaths) {

        const endpoint = uniqueEndpoints.find(e => e.path === listingPath);

        test(
            `@regression LISTING - ${listingPath} with limit 1 returns success`,
            async () => {

                const body = buildBody(endpoint);

                body.limit = '1';

                body.pageno = '1';

                const response = await call('POST', listingPath, { body });

                expectStatusIn(response, SUCCESS_STATUSES);

                await expectJsonResponse(response);

            }
        );

        for (const [field, value] of [
            ['limit', '0'],
            ['limit', '-1'],
            ['limit', 'abc'],
            ['limit', '100000'],
            ['pageno', '0'],
            ['pageno', '-1'],
            ['pageno', 'abc'],
            ['pageno', '99999999']
        ]) {

            test(
                `@regression @validation LISTING - ${listingPath} with ${field}="${value}" does not cause a server error`,
                async () => {

                    const body = buildBody(endpoint);

                    body[field] = value;

                    const response = await call('POST', listingPath, { body });

                    expect(response.status()).toBeLessThan(500);

                }
            );

        }

    }


    test(
        '@regression @validation LISTING - /conditions-listing with an unknown type does not cause a server error',
        async () => {

            const endpoint = uniqueEndpoints.find(e => e.path === '/conditions-listing');

            const body = buildBody(endpoint);

            body.type = 'unknown-type';

            const response = await call('POST', '/conditions-listing', { body });

            expect(response.status()).toBeLessThan(500);

        }
    );


    test(
        '@regression @validation LISTING - /application-listing with an unsupported search operator does not cause a server error',
        async () => {

            const endpoint = uniqueEndpoints.find(e => e.path === '/application-listing');

            const body = buildBody(endpoint);

            body.search = { requestid: { $ne: null } };

            const response = await call('POST', '/application-listing', { body });

            expect(response.status()).toBeLessThan(500);

        }
    );


    // ========================================================
    // SECURITY - injection strings (read-only endpoints)
    // ========================================================

    for (const endpoint of uniqueEndpoints.filter(e => e.readOnly)) {

        const field = identityField(endpoint.body);

        for (const value of INJECTION_VALUES) {

            test(
                `@regression @security INJECTION - ${endpoint.path} ${field}="${value}" does not cause a server error`,
                async () => {

                    const body = buildBody(endpoint);

                    body[field] = value;

                    const response = await call('POST', endpoint.path, { body });

                    expect(response.status()).toBeLessThan(500);

                }
            );

        }

    }


    // ========================================================
    // Response Time (answered by the gateway, backend not called)
    // ========================================================

    test(
        '@regression PERFORMANCE - 405/404 response (GET) within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await call('GET', '/application-listing', {
                headers: { 'Content-Type': null }
            });

            const duration = Date.now() - start;

            console.log('Response time (ms):', duration);

            expectStatusIn(response, WRONG_METHOD_STATUSES);

            expect(duration).toBeLessThan(GATEWAY_RESPONSE_MS);

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

            // GET is answered by the gateway (404/405) so the backend is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    call('GET', '/application-listing', {
                        headers: { 'Content-Type': null }
                    })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});