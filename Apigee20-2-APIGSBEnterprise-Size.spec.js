import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.GSB_ENTERPRISE_BASE_PATH || '/MH-v1/gsb-enterprise';

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
 * Flows of the proxy (ProxyEndpoint "default", MH-GSB-Enterprise-Size-v1).
 *
 *   method      : the ONLY verb accepted (PreFlow: request.verb != "POST" => RF-MethodNotAllowed)
 *   path        : exact MatchesPath (no wildcards in this proxy)
 *   envPrefix   : prefix of the environment variables holding request bodies
 *                   <prefix>                -> default happy path body
 *                   <prefix>_CR             -> body with crNumber
 *                   <prefix>_NATIONAL       -> body with nationalNumber
 *                   <prefix>_FILE           -> body with the file identity object
 *                   <prefix>_NOT_FOUND      -> body that makes the backend return a business fault
 *   fileKey     : name of the file identity object read by JS-Build-*-Request
 *                   EnterpriseSizeService            -> fileInformation
 *                   EnterpriseSizeCertificateService -> fileNumber
 *   wrongFileKey: the key of the OTHER service; must NOT be accepted here
 *   validate    : schema check applied to the JSON built by JS-Format-*-Response
 */
const routes = [
    {
        name: 'Get Enterprise Size',
        method: 'POST',
        path: '/EnterpriseSizeService',
        envPrefix: 'ENTERPRISE_SIZE_REQUEST_BODY',
        body: parseBody('ENTERPRISE_SIZE_REQUEST_BODY'),
        fileKey: 'fileInformation',
        wrongFileKey: 'fileNumber',
        validate: validateEnterpriseSizeResponse
    },
    {
        name: 'Get Enterprise Size Certificate',
        method: 'POST',
        path: '/EnterpriseSizeCertificateService',
        envPrefix: 'ENTERPRISE_SIZE_CERTIFICATE_REQUEST_BODY',
        body: parseBody('ENTERPRISE_SIZE_CERTIFICATE_REQUEST_BODY'),
        fileKey: 'fileNumber',
        wrongFileKey: 'fileInformation',
        validate: validateCertificateResponse
    }
];

// Optional extra bodies per route (see envPrefix above)
for (const route of routes) {

    route.crBody = parseBody(`${route.envPrefix}_CR`);
    route.nationalBody = parseBody(`${route.envPrefix}_NATIONAL`);
    route.fileBody = parseBody(`${route.envPrefix}_FILE`);
    route.notFoundBody = parseBody(`${route.envPrefix}_NOT_FOUND`);
}

// Verbs that must be rejected by the PreFlow
const WRONG_METHODS = ['get', 'put', 'delete', 'patch'];

// Optional pause between tests so SA-PreventSpikes is not triggered
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 0);

/*
 * RF-MethodNotAllowed is in the PreFlow, so it is applied to every path
 * (known or unknown) and BEFORE the Content-Type check and the flow match.
 */
const EXPECTED_WRONG_METHOD_STATUS = Number(
    process.env.EXPECTED_WRONG_METHOD_STATUS || 405
);

/*
 * Status returned when the JS-Build-*-Request policy throws
 * (invalid JSON / no identity field). By default Apigee answers with a
 * generic javascript.* fault (usually 500). If a FaultRule maps it to a
 * clean 400, set EXPECTED_INVALID_BODY_STATUS=400 to assert it exactly.
 */
const EXPECTED_INVALID_BODY_STATUS = process.env.EXPECTED_INVALID_BODY_STATUS
    ? Number(process.env.EXPECTED_INVALID_BODY_STATUS)
    : null;

/*
 * Opt-in strict error contract: invalid bodies must return a clean JSON
 * 400 that does not leak policy / resource names (jsc://, "Execution of ...").
 */
const STRICT_ERROR_CONTRACT = process.env.STRICT_ERROR_CONTRACT === 'true';


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


function withExtraSegment(route) {

    return `${routeUrl(route)}/extra-segment`;
}


/*
 * Send a raw string as application/json. Used for bodies that Playwright
 * would otherwise serialize itself (null, arrays, malformed JSON).
 */
function postRaw(client, route, rawBody) {

    return client.post(routeUrl(route), {
        headers: { 'Content-Type': 'application/json' },
        data: rawBody
    });
}


// ------------------------------------------------------------
// Response contract helpers (JS-Format-*-Response)
// ------------------------------------------------------------

function expectNullableString(value) {

    expect(value === null || typeof value === 'string').toBe(true);
}


function expectNoSoapLeak(text) {

    const lower = text.toLowerCase();

    expect(lower).not.toContain('<soap');
    expect(lower).not.toContain('<?xml');
    expect(lower).not.toContain('xmlns');
    expect(lower).not.toContain('soapenv');
}


function validateSizeClassifications(obj) {

    expect(obj).toBeTruthy();

    for (const key of ['code', 'descriptionEn', 'descriptionAr']) {
        expect(typeof obj[key]).toBe('string');
    }
}


function validateDateObject(obj) {

    expect(obj).toBeTruthy();

    expectNullableString(obj.gregorian);
    expectNullableString(obj.hijri);
}


// JS-Format-GetEnterpriseSize-Response
function validateEnterpriseSizeResponse(json) {

    expect(typeof json.responseReference).toBe('string');

    validateSizeClassifications(json.sizeClassifications);

    expect(typeof json.revenueSize).toBe('string');
    expect(typeof json.laborersSize).toBe('string');

    for (const key of [
        'revenueRangeAr',
        'laborerCountRangeAr',
        'revenueRangeEn',
        'laborerCountRangeEn'
    ]) {
        expect(json).toHaveProperty(key);
        expectNullableString(json[key]);
    }
}


// JS-Format-GetEnterpriseSizeCertificate-Response
function validateCertificateResponse(json) {

    expect(typeof json.responseReference).toBe('string');
    expect(typeof json.certificateNumber).toBe('string');
    expect(typeof json.enterpriseName).toBe('string');

    for (const key of ['nationalNumber', 'crNumber', 'fileNumber']) {
        expect(json).toHaveProperty(key);
        expectNullableString(json[key]);
    }

    // enterpriseType is an object, or null when the node is missing
    expect(json).toHaveProperty('enterpriseType');

    if (json.enterpriseType !== null) {
        for (const key of ['code', 'descriptionEn', 'descriptionAr']) {
            expect(typeof json.enterpriseType[key]).toBe('string');
        }
    }

    validateSizeClassifications(json.sizeClassifications);

    validateDateObject(json.issueDate);
    validateDateObject(json.expiryDate);

    expect(Array.isArray(json.issuingReasons)).toBe(true);

    for (const reason of json.issuingReasons) {
        expect(typeof reason).toBe('string');
    }
}


/*
 * Normalized SOAP fault (JS-Format-*-Response):
 *   { "error": { "code": "...", "message": "..." } }
 *   code starts with "500-"  -> Technical -> HTTP 502
 *   any other code           -> Business  -> HTTP 400
 */
function validateErrorResponse(status, json) {

    expect(Object.keys(json)).toEqual(['error']);

    expect(typeof json.error.code).toBe('string');
    expect(json.error.code.length).toBeGreaterThan(0);

    expect(typeof json.error.message).toBe('string');
    expect(json.error.message.length).toBeGreaterThan(0);

    const expectedStatus = json.error.code.startsWith('500-') ? 502 : 400;

    expect(status).toBe(expectedStatus);
}


/*
 * A response coming from the target must be one of the two shapes built by
 * the formatter: the success JSON or the normalized error JSON.
 */
async function expectFormattedResponse(route, response) {

    const text = await response.text();

    expectNoSoapLeak(text);

    await expectJsonResponse(response);

    const json = JSON.parse(text);

    if (response.status() === 200) {
        route.validate(json);
    } else {
        expect([400, 502]).toContain(response.status());
        validateErrorResponse(response.status(), json);
    }

    return json;
}


/*
 * Assertions for a body rejected by JS-Build-*-Request.
 * The request never reaches the target, so it must not be a success.
 */
async function expectBuildRequestRejected(response) {

    await logResponse(response);

    // Gateway checks (401 / 404 / 405 / 415) must have passed
    expect([401, 404, 405, 415]).not.toContain(response.status());

    expect(response.status()).toBeGreaterThanOrEqual(400);

    if (EXPECTED_INVALID_BODY_STATUS) {
        expect(response.status()).toBe(EXPECTED_INVALID_BODY_STATUS);
    }

    if (STRICT_ERROR_CONTRACT) {

        expect(response.status()).toBe(400);

        await expectJsonResponse(response);

        const text = await response.text();

        expect(text).not.toContain('jsc://');
        expect(text).not.toContain('Execution of');
        expect(text).not.toContain('JS-Build-');
    }
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('GSB Enterprise Size API Proxy (MH-v1/gsb-enterprise) - Regression Tests', () => {

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
    // POST flows - happy path
    // Needs a valid request body: set ENTERPRISE_SIZE_REQUEST_BODY and
    // ENTERPRISE_SIZE_CERTIFICATE_REQUEST_BODY. Without it the tests
    // are skipped (an empty body is rejected by JS-Build-*-Request).
    // ========================================================

    for (const route of routes) {

        test(
            `@regression POST - ${route.name} is accepted by the proxy`,
            async () => {

                test.skip(!route.body, `Set ${route.envPrefix} to run`);

                const start = Date.now();

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
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

                test.skip(!route.body, `Set ${route.envPrefix} to run`);

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                // Success AND business / technical faults are all JSON
                await expectJsonResponse(response);

                expect(response.status()).toBeLessThan(500);

            }
        );

        test(
            `@regression POST - ${route.name} with unknown query parameter is not rejected by the proxy`,
            async () => {

                test.skip(!route.body, `Set ${route.envPrefix} to run`);

                const response = await apiClient.post(
                    `${routeUrl(route)}?unknownParameter=1`,
                    { data: route.body }
                );

                await logResponse(response);

                expect([401, 404, 405, 415]).not.toContain(response.status());

                expect(response.status()).toBeLessThan(500);

            }
        );

        test(
            `@regression POST - ${route.name} with application/json and no body is not rejected by the gateway`,
            async () => {

                const response = await apiClient.post(
                    routeUrl(route),
                    { headers: { 'Content-Type': 'application/json' } }
                );

                await logResponse(response);

                // Gateway checks only the Content-Type header, not the body
                expect([401, 404, 405, 415]).not.toContain(response.status());

            }
        );

    }


    // ========================================================
    // POST flows - Response format (JS-Format-*-Response)
    // SOAP -> JSON conversion: the client must never see XML, and
    // the JSON must follow the shape built by the formatter.
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @contract POST - ${route.name} successful response is valid JSON (not a SOAP envelope)`,
            async () => {

                test.skip(!route.body, `Set ${route.envPrefix} to run`);

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                await logResponse(response);

                if (response.status() === 200) {

                    const text = await response.text();

                    expect(() => JSON.parse(text)).not.toThrow();

                    expectNoSoapLeak(text);

                    await expectJsonResponse(response);

                }

                expect(response.status()).toBeLessThan(500);

            }
        );

        test(
            `@regression @contract POST - ${route.name} response matches the formatted JSON contract`,
            async () => {

                test.skip(!route.body, `Set ${route.envPrefix} to run`);

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                await logResponse(response);

                // 200 => success schema, 400 / 502 => { error: { code, message } }
                await expectFormattedResponse(route, response);

            }
        );

        test(
            `@regression @contract POST - ${route.name} returns 200 with the success schema for a known enterprise`,
            async () => {

                test.skip(
                    process.env.EXPECT_SUCCESS !== 'true' || !route.body,
                    `Set EXPECT_SUCCESS=true and ${route.envPrefix} (data that exists in the backend) to run`
                );

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                await logResponse(response);

                expect(response.status()).toBe(200);

                const json = await expectFormattedResponse(route, response);

                // The reference must be filled when the request succeeds
                expect(json.responseReference.length).toBeGreaterThan(0);

            }
        );

        test(
            `@regression @contract POST - ${route.name} backend fault is normalized to { error: { code, message } }`,
            async () => {

                test.skip(!route.notFoundBody, `Set ${route.envPrefix}_NOT_FOUND to run`);

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.notFoundBody }
                );

                await logResponse(response);

                // SOAP fault -> 400 (business) or 502 (technical), never 200 / 500
                expect([400, 502]).toContain(response.status());

                const json = await expectFormattedResponse(route, response);

                console.log('Fault code:', json.error.code);

            }
        );

    }


    // ========================================================
    // POST flows - Identity field (JS-Build-*-Request)
    //   crNumber  ->  nationalNumber  ->  file identity object
    //   (first one present wins)
    // Optional: set <prefix>_CR / _NATIONAL / _FILE to run
    // against real data. Each identity type must produce a
    // well-formed response (success or normalized fault).
    // ========================================================

    for (const route of routes) {

        const variants = [
            { label: 'crNumber', body: route.crBody, env: `${route.envPrefix}_CR` },
            { label: 'nationalNumber', body: route.nationalBody, env: `${route.envPrefix}_NATIONAL` },
            { label: route.fileKey, body: route.fileBody, env: `${route.envPrefix}_FILE` }
        ];

        for (const variant of variants) {

            test(
                `@regression @contract IDENTITY - ${route.name} with ${variant.label} is converted to SOAP and answered in JSON`,
                async () => {

                    test.skip(!variant.body, `Set ${variant.env} to run`);

                    const response = await apiClient.post(
                        routeUrl(route),
                        { data: variant.body }
                    );

                    await logResponse(response);

                    expect([401, 404, 405, 415]).not.toContain(response.status());

                    await expectFormattedResponse(route, response);

                }
            );

        }

    }


    // ========================================================
    // POST flows - Invalid body (JS-Build-*-Request throws)
    // Valid token + application/json, so the request passes the
    // PreFlow; the JS policy then rejects the body before the
    // target is called. No backend data is needed.
    // ========================================================

    for (const route of routes) {

        const invalidBodies = [
            { label: 'malformed JSON', raw: '{ invalid json' },
            { label: 'empty string', raw: '' },
            { label: 'JSON null', raw: 'null' },
            { label: 'JSON array', raw: '[]' },
            { label: 'empty object (no identity field)', raw: '{}' },
            { label: 'unrelated fields only', raw: JSON.stringify({ name: 'test', id: 1 }) },
            { label: 'empty crNumber', raw: JSON.stringify({ crNumber: '' }) },
            { label: 'empty nationalNumber', raw: JSON.stringify({ nationalNumber: '' }) },
            { label: 'null crNumber and nationalNumber', raw: JSON.stringify({ crNumber: null, nationalNumber: null }) },
            {
                label: `${route.fileKey} without sequenceNumber`,
                raw: JSON.stringify({ [route.fileKey]: { laborOffice: 1 } })
            },
            {
                label: `${route.fileKey} without laborOffice`,
                raw: JSON.stringify({ [route.fileKey]: { sequenceNumber: 1 } })
            },
            {
                label: `${route.fileKey} as empty object`,
                raw: JSON.stringify({ [route.fileKey]: {} })
            },
            {
                label: `${route.fileKey} with null values`,
                raw: JSON.stringify({ [route.fileKey]: { laborOffice: null, sequenceNumber: null } })
            },
            {
                label: `${route.wrongFileKey} (key of the other service)`,
                raw: JSON.stringify({ [route.wrongFileKey]: { laborOffice: 1, sequenceNumber: 1 } })
            },

            // "exactly one identity" rule (JS-Build-*-Request)
            {
                label: 'crNumber and nationalNumber together',
                raw: JSON.stringify({ crNumber: '1', nationalNumber: '2' })
            },
            {
                label: `crNumber and ${route.fileKey} together`,
                raw: JSON.stringify({ crNumber: '1', [route.fileKey]: { laborOffice: 1, sequenceNumber: 1 } })
            },
            {
                label: `nationalNumber and ${route.fileKey} together`,
                raw: JSON.stringify({ nationalNumber: '1', [route.fileKey]: { laborOffice: 1, sequenceNumber: 1 } })
            },
            {
                label: 'all three identities together',
                raw: JSON.stringify({
                    crNumber: '1',
                    nationalNumber: '2',
                    [route.fileKey]: { laborOffice: 1, sequenceNumber: 1 }
                })
            },

            // identity values must be a string or a number
            { label: 'crNumber as object', raw: JSON.stringify({ crNumber: { a: 1 } }) },
            { label: 'crNumber as array', raw: JSON.stringify({ crNumber: ['1'] }) },
            { label: 'crNumber as boolean', raw: JSON.stringify({ crNumber: true }) },
            { label: 'nationalNumber as object', raw: JSON.stringify({ nationalNumber: { a: 1 } }) },
            { label: `${route.fileKey} as string`, raw: JSON.stringify({ [route.fileKey]: 'abc' }) },
            { label: `${route.fileKey} as array`, raw: JSON.stringify({ [route.fileKey]: [1, 2] }) },
            {
                label: `${route.fileKey}.laborOffice as object`,
                raw: JSON.stringify({ [route.fileKey]: { laborOffice: { a: 1 }, sequenceNumber: 1 } })
            },

            // control characters are illegal in XML 1.0
            { label: 'crNumber with a control character', raw: JSON.stringify({ crNumber: 'a\u0001b' }) },
            { label: 'JSON string instead of object', raw: '"text"' }
        ];

        for (const invalid of invalidBodies) {

            test(
                `@regression @validation POST - ${route.name} rejects ${invalid.label}`,
                async () => {

                    const response = await postRaw(apiClient, route, invalid.raw);

                    await expectBuildRequestRejected(response);

                }
            );

        }

        test(
            `@regression @validation POST - ${route.name} rejects ${route.wrongFileKey} even when ${route.fileKey} is missing (not interchangeable)`,
            async () => {

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: { [route.wrongFileKey]: { laborOffice: 1, sequenceNumber: 1 } } }
                );

                await expectBuildRequestRejected(response);

            }
        );

        test(
            `@regression @validation POST - ${route.name} with a malformed body is not forwarded as a SOAP / XML response`,
            async () => {

                const response = await postRaw(apiClient, route, '{ invalid json');

                const text = await response.text();

                expectNoSoapLeak(text);

            }
        );

    }


    // ========================================================
    // SECURITY - XML injection through the identity value
    // JS-Build-*-Request XML-escapes every value, so crafted input
    // reaches the backend as plain text (a business fault, not a
    // modified SOAP envelope). These tests make sure such input is
    // never turned into a successful call or a raw SOAP answer.
    // If they fail, check that escapeXml() is still applied.
    // ========================================================

    for (const route of routes) {

        const injectionPayloads = [
            {
                label: 'closing tag + extra element in crNumber',
                body: { crNumber: '1</tem:CRNumber><tem:NationalNumber>1</tem:NationalNumber>' }
            },
            {
                label: 'markup in nationalNumber',
                body: { nationalNumber: '<![CDATA[x]]><x/>' }
            },
            {
                label: 'ampersand in crNumber',
                body: { crNumber: '1&2' }
            },
            {
                label: `markup in ${route.fileKey}.laborOffice`,
                body: { [route.fileKey]: { laborOffice: '1</tem:LaborOffice><x/>', sequenceNumber: 1 } }
            }
        ];

        for (const payload of injectionPayloads) {

            test(
                `@regression @security INJECTION - ${route.name} ${payload.label}`,
                async () => {

                    const response = await apiClient.post(
                        routeUrl(route),
                        { data: payload.body }
                    );

                    await logResponse(response);

                    const text = await response.text();

                    // Never a success, and never a raw SOAP / XML answer
                    expect(response.status()).not.toBe(200);

                    expectNoSoapLeak(text);

                    // Gateway checks must have passed (this is a body problem)
                    expect([401, 404, 405, 415]).not.toContain(response.status());

                }
            );

        }

    }


    // ========================================================
    // GATEWAY - Wrong HTTP method (RF-MethodNotAllowed)
    //   PreFlow condition: request.verb != "POST"
    // The check is in the PreFlow, so it applies to every path,
    // and it runs BEFORE the Content-Type check and the flow match.
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

        for (const route of routes) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${route.name} with text/plain returns 405 (method check before Content-Type check)`,
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


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    //   request.header.content-type != "application/json"
    // The check is in the PreFlow, so it applies to every POST
    // request, including POSTs to unknown paths.
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
                        data: '{}'
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(415);

                await expectJsonResponse(response);

            }
        );

    }


    /*
     * The policy condition is an EXACT comparison, so
     * "application/json; charset=utf-8" is rejected too.
     * Remove that case if you change the condition to "starts with".
     */
    for (const contentType of [
        'application/xml',
        'text/xml',
        'application/soap+xml',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'application/octet-stream',
        'application/json; charset=utf-8'
    ]) {

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
        '@regression @gateway PRECEDENCE - GET with text/plain returns 405 (not 415)',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/EnterpriseSizeService`,
                { headers: { 'Content-Type': 'text/plain' } }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - GET without Content-Type returns 405 (not 415)',
        async () => {

            const client = await createClientWithHeaders({
                Authorization: `Bearer ${token}`
            });

            const response = await client.get(`${BASE_PATH}/EnterpriseSizeService`);

            await logResponse(response);

            expect(response.status()).toBe(405);

            await client.dispose();

        }
    );


    test(
        '@regression @gateway PRECEDENCE - Invalid body on unknown path returns 404 (flow match before JS policy)',
        async () => {

            const response = await postRaw(
                apiClient,
                { path: '/invalid-endpoint' },
                '{ invalid json'
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with GET returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.get(
                `${BASE_PATH}/EnterpriseSizeService`
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
                `${BASE_PATH}/EnterpriseSizeService`,
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


    test(
        '@regression @auth PRECEDENCE - No token with invalid body returns 401 (not the JS policy error)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.post(
                `${BASE_PATH}/EnterpriseSizeService`,
                { data: '{ invalid json' }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // GATEWAY - Unknown Paths (RF-NotFound)
    // Valid token + POST + application/json, so the request
    // passes the whole PreFlow and reaches the "Unknown" flow.
    // MatchesPath is exact (no wildcards) and case sensitive.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',

        // EnterpriseSizeService: case, spelling, separators
        '/enterprisesizeservice',
        '/enterpriseSizeService',                     // first letter lower case
        '/ENTERPRISESIZE-SERVICE',
        '/Enterprise_Size_Service',
        '/enterprise-size-service',
        '/EnterpriseSizeServices',                    // plural
        '/EnterpriseSizeServic',                      // truncated
        '/EnterpriseSize',
        '/EnterpriseService',
        '/SizeService',

        // EnterpriseSizeService: extra segments / SOAP-style suffixes
        '/EnterpriseSizeService/extra-segment',
        '/EnterpriseSizeService/1',
        '/EnterpriseSizeService/GetEnterpriseSize',
        '/EnterpriseSizeService.svc',
        '/EnterpriseSizeService.asmx',
        '/EnterpriseSizeService/',                    // trailing slash

        // EnterpriseSizeCertificateService: case, spelling, separators
        '/enterprisesizecertificateservice',
        '/enterpriseSizeCertificateService',
        '/ENTERPRISESIZECERTIFICATE-SERVICE',
        '/Enterprise_Size_Certificate_Service',
        '/EnterpriseSizeCertificateServices',
        '/EnterpriseSizeCertificate',
        '/EnterpriseCertificateService',
        '/CertificateService',                        // belongs to the Zakat Certificate proxy

        // EnterpriseSizeCertificateService: extra segments / SOAP-style suffixes
        '/EnterpriseSizeCertificateService/extra-segment',
        '/EnterpriseSizeCertificateService/1',
        '/EnterpriseSizeCertificateService/GetEnterpriseSizeCertificate',
        '/EnterpriseSizeCertificateService.svc',
        '/EnterpriseSizeCertificateService/',         // trailing slash

        // generic
        '/enterprise',
        '/gsb-enterprise',
        '/listing'
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

            const response = await apiClient.post(
                BASE_PATH,
                { data: {} }
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    for (const route of routes) {

        test(
            `@regression @gateway PATH - POST ${route.name} with an extra segment should return 404`,
            async () => {

                const response = await apiClient.post(
                    withExtraSegment(route),
                    { data: {} }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        // Paths contain capital letters, so the lower-case path is a different path
        test(
            `@regression @gateway PATH - POST ${route.name} in lower case should return 404`,
            async () => {

                const response = await apiClient.post(
                    `${BASE_PATH}${route.path.toLowerCase()}`,
                    { data: {} }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

        // MatchesPath is case sensitive
        test(
            `@regression @gateway PATH - POST ${route.name} in upper case should return 404`,
            async () => {

                const response = await apiClient.post(
                    `${BASE_PATH}${route.path.toUpperCase()}`,
                    { data: {} }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    // The two services are NOT interchangeable: each path has its own SOAP action
    test(
        '@regression @gateway PATH - Each service has its own path (no cross routing)',
        async () => {

            const [sizeRoute, certRoute] = routes;

            const sizeStatus = (await apiClient.post(
                `${BASE_PATH}${sizeRoute.path}`,
                { data: {} }
            )).status();

            const certStatus = (await apiClient.post(
                `${BASE_PATH}${certRoute.path}`,
                { data: {} }
            )).status();

            // Both are known paths: they pass the flow match (never 404)
            expect(sizeStatus).not.toBe(404);
            expect(certStatus).not.toBe(404);

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
                    { data: route.body || {} }
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
                    { data: route.body || {} }
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


    for (const route of routes) {

        const authCases = [
            { label: 'Basic scheme instead of Bearer', header: 'Basic YWJjOjEyMw==' },
            { label: 'Empty bearer token', header: 'Bearer ' },
            { label: 'Malformed JWT-like token', header: 'Bearer aaa.bbb.ccc' }
        ];

        for (const authCase of authCases) {

            test(
                `@regression @auth AUTH - ${route.name}: ${authCase.label}`,
                async () => {

                    const client = await createClientWithHeaders({
                        Authorization: authCase.header,
                        'Content-Type': 'application/json'
                    });

                    const response = await client.post(
                        routeUrl(route),
                        { data: {} }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(401);

                    await client.dispose();

                }
            );

        }

    }


    test(
        '@regression @auth AUTH - Token in query string is not accepted',
        async () => {

            const noHeaderClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await noHeaderClient.post(
                `${BASE_PATH}/EnterpriseSizeService?access_token=${token}`,
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

            const response = await apiClient.get(`${BASE_PATH}/EnterpriseSizeService`);

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
                `${BASE_PATH}/EnterpriseSizeService`,
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


    for (const route of routes) {

        test(
            `@regression PERFORMANCE - ${route.name} invalid body is rejected within 3 seconds (no target call)`,
            async () => {

                const start = Date.now();

                const response = await postRaw(apiClient, route, '{}');

                const duration = Date.now() - start;

                console.log('Response time (ms):', duration);

                expect(response.status()).toBeGreaterThanOrEqual(400);

                expect(duration).toBeLessThan(3000);

            }
        );

    }


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

            // PUT on /EnterpriseSizeService is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/EnterpriseSizeService`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});