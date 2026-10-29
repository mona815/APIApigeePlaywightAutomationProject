import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.GSB_WASEL_ADDRESS_BASE_PATH || '/MH-v1/gsb-wasel-address';

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
 * Flows of the proxy (ProxyEndpoint "default", MH-GSB-Wasel-Address-v1).
 *
 *   method    : the ONLY verb accepted (PreFlow: request.verb != "POST" => RF-MethodNotAllowed)
 *   path      : exact MatchesPath (no wildcards in this proxy)
 *   envPrefix : prefix of the environment variables holding request bodies
 *                 <prefix>              -> default happy path body
 *                 <prefix>_NOT_FOUND    -> body that makes the backend return a fault
 *                 <prefix>_<VARIANT>    -> one body per identifier type (see variants)
 *   variants  : identifier types read by JS-Build-WaselAddressService-Request.
 *               The script picks the SOAP operation from the identifier:
 *                 personalId                                  -> GetIndividualWaselAddress
 *                 commercialRegistrationNumber / sevenHundredNumber / laborOfficeIdentity
 *                                                             -> GetCommercialWaselAddress
 *   validate  : (requestBody) => schema check for the JSON built by JS-Format-WaselAddressService-Response
 */
const routes = [
    {
        name: 'Wasel Address Service',
        method: 'POST',
        path: '/SPWaselAddressService',
        envPrefix: 'WASEL_ADDRESS_REQUEST_BODY',
        variants: [
            { label: 'personalId (GetIndividualWaselAddress)', suffix: 'PERSONAL' },
            { label: 'commercialRegistrationNumber (GetCommercialWaselAddress)', suffix: 'CR' },
            { label: 'sevenHundredNumber (GetCommercialWaselAddress)', suffix: 'SEVEN_HUNDRED' },
            { label: 'laborOfficeIdentity (GetCommercialWaselAddress)', suffix: 'LABOR_OFFICE' }
        ],
        validate: () => validateWaselResponse
    }
];

for (const route of routes) {

    route.body = parseBody(route.envPrefix);
    route.notFoundBody = parseBody(`${route.envPrefix}_NOT_FOUND`);

    for (const variant of route.variants) {
        variant.env = `${route.envPrefix}_${variant.suffix}`;
        variant.body = parseBody(variant.env);
    }
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
 * Status returned when JS-Build-*-Request throws (invalid JSON, unknown
 * operation, no identifier ...). By default Apigee answers with a generic
 * javascript.* fault (usually 500). If a FaultRule maps it to a clean 400,
 * set EXPECTED_INVALID_BODY_STATUS=400 to assert it exactly.
 */
const EXPECTED_INVALID_BODY_STATUS = process.env.EXPECTED_INVALID_BODY_STATUS
    ? Number(process.env.EXPECTED_INVALID_BODY_STATUS)
    : null;

/*
 * Opt-in strict error contract (needs RF-BadRequest + FR-InvalidRequest deployed):
 * invalid bodies must return a clean JSON 400
 * { error: { code: "400-INVALID_REQUEST", message } } that does not leak
 * policy / resource names (jsc://, "Execution of ...").
 */
const STRICT_ERROR_CONTRACT = process.env.STRICT_ERROR_CONTRACT === 'true';

/*
 * Opt-in: the build scripts pick the FIRST identifier present
 * (e.g. licenseNumber wins over ownerIdentifier). Set this to true once the
 * scripts reject requests with more than one identifier.
 */
const ENFORCE_SINGLE_IDENTITY = process.env.ENFORCE_SINGLE_IDENTITY === 'true';


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

function expectString(value) {

    expect(typeof value).toBe('string');
}


function expectNullableString(value) {

    expect(value === null || typeof value === 'string').toBe(true);
}


function expectStrings(obj, keys) {

    for (const key of keys) {
        expect(obj).toHaveProperty(key);
        expectString(obj[key]);
    }
}


function expectNullableStrings(obj, keys) {

    for (const key of keys) {
        expect(obj).toHaveProperty(key);
        expectNullableString(obj[key]);
    }
}


// lookup(): null, or { code, name }
function expectLookup(value) {

    if (value === null) {
        return;
    }

    expectStrings(value, ['code', 'name']);
}


function expectArrayOf(value, validateItem) {

    expect(Array.isArray(value)).toBe(true);

    value.forEach(validateItem);
}


function expectNoSoapLeak(text) {

    const lower = text.toLowerCase();

    expect(lower).not.toContain('<soap');
    expect(lower).not.toContain('<?xml');
    expect(lower).not.toContain('xmlns');
    expect(lower).not.toContain('soapenv');
}


// ---- Wasel Address (JS-Format-WaselAddressService-Response) ----
// Both operations return the same WaselAddressesListStructure.

function validateWaselResponse(json) {

    expect(Object.keys(json)).toEqual(['waselAddresses']);

    // An empty list is a valid answer
    expectArrayOf(json.waselAddresses, (address) => {

        expectStrings(address, ['buildingNumber', 'additionalNumber', 'zipcode']);

        expectNullableStrings(address, [
            'unitNumber',
            'districtAreaArabic', 'districtAreaEnglish',
            'streetNameArabic', 'streetNameEnglish',
            'cityNameArabic', 'cityNameEnglish',
            'fullName', 'latitude', 'longitude'
        ]);
    });
}


/*
 * Normalized SOAP fault (JS-Format-*-Response):
 *   { "error": { "code": "...", "message": "..." } }
 *   code starts with "500-"  -> Technical            -> HTTP 502
 *   code "001-000001"        -> Business: not found  -> HTTP 404
 *   any other code           -> Business             -> HTTP 400
 */
function expectedStatusForFaultCode(code) {

    if (code.startsWith('500-')) {
        return 502;
    }

    return code === '001-000001' ? 404 : 400;
}


function validateErrorResponse(status, json) {

    expect(Object.keys(json)).toEqual(['error']);

    expect(typeof json.error.code).toBe('string');
    expect(json.error.code.length).toBeGreaterThan(0);

    expect(typeof json.error.message).toBe('string');
    expect(json.error.message.length).toBeGreaterThan(0);

    expect(status).toBe(expectedStatusForFaultCode(json.error.code));
}


/*
 * A response coming from the target must be one of the two shapes built by
 * the formatter: the success JSON or the normalized error JSON.
 */
async function expectFormattedResponse(route, response, requestBody) {

    const text = await response.text();

    expectNoSoapLeak(text);

    await expectJsonResponse(response);

    const json = JSON.parse(text);

    if (response.status() === 200) {
        route.validate(requestBody)(json);
    } else {
        expect([400, 404, 502]).toContain(response.status());
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

        // Body produced by RF-BadRequest (FaultRule FR-InvalidRequest)
        const json = JSON.parse(text);

        expect(Object.keys(json)).toEqual(['error']);
        expect(json.error.code).toBe('400-INVALID_REQUEST');
        expect(typeof json.error.message).toBe('string');
        expect(json.error.message.length).toBeGreaterThan(0);
    }
}


/*
 * Request that must never be a success: the backend may answer with a
 * business fault, but never 200 and never a raw SOAP / XML answer.
 */
async function expectNeverSucceeds(response) {

    await logResponse(response);

    const text = await response.text();

    expect(response.status()).not.toBe(200);

    expectNoSoapLeak(text);

    expect([401, 404, 405, 415]).not.toContain(response.status());
}


/*
 * Invalid bodies. Valid token + application/json, so they pass the PreFlow;
 * the JS policy then throws before the target is called.
 */
function invalidBodiesFor() {

    return [
        { label: 'malformed JSON', raw: '{ invalid json' },
        { label: 'empty string', raw: '' },
        { label: 'JSON null', raw: 'null' },
        { label: 'JSON array', raw: '[]' },
        { label: 'JSON string instead of object', raw: '"text"' },
        { label: 'empty object (no identifier)', raw: '{}' },
        { label: 'unrelated fields only', raw: JSON.stringify({ name: 'test', id: 1 }) },

        // empty / null identifiers
        { label: 'empty personalId', raw: JSON.stringify({ personalId: '' }) },
        { label: 'null personalId', raw: JSON.stringify({ personalId: null }) },
        { label: 'empty commercialRegistrationNumber', raw: JSON.stringify({ commercialRegistrationNumber: '' }) },
        { label: 'empty sevenHundredNumber', raw: JSON.stringify({ sevenHundredNumber: '' }) },
        {
            label: 'all identifiers empty or null',
            raw: JSON.stringify({ personalId: '', commercialRegistrationNumber: null, sevenHundredNumber: '' })
        },

        // laborOfficeIdentity needs labourOfficeId AND sequenceNumber
        { label: 'laborOfficeIdentity without sequenceNumber', raw: JSON.stringify({ laborOfficeIdentity: { labourOfficeId: 1 } }) },
        { label: 'laborOfficeIdentity without labourOfficeId', raw: JSON.stringify({ laborOfficeIdentity: { sequenceNumber: 1 } }) },
        { label: 'laborOfficeIdentity as empty object', raw: JSON.stringify({ laborOfficeIdentity: {} }) },
        { label: 'laborOfficeIdentity with null values', raw: JSON.stringify({ laborOfficeIdentity: { labourOfficeId: null, sequenceNumber: null } }) },
        { label: 'laborOfficeIdentity with empty values', raw: JSON.stringify({ laborOfficeIdentity: { labourOfficeId: '', sequenceNumber: '' } }) },
        { label: 'laborOfficeIdentity as string', raw: JSON.stringify({ laborOfficeIdentity: 'abc' }) },
        { label: 'laborOfficeIdentity as array', raw: JSON.stringify({ laborOfficeIdentity: [1, 2] }) },

        // spelling matters: the parent key is "laborOfficeIdentity", the child key is "labourOfficeId"
        {
            label: 'laborOfficeId (American spelling of the child key)',
            raw: JSON.stringify({ laborOfficeIdentity: { laborOfficeId: 1, sequenceNumber: 1 } })
        },
        {
            label: 'labourOfficeIdentity (British spelling of the parent key)',
            raw: JSON.stringify({ labourOfficeIdentity: { labourOfficeId: 1, sequenceNumber: 1 } })
        },
        {
            label: 'laborOfficeIdentity with sequence key in lower case',
            raw: JSON.stringify({ laborOfficeIdentity: { labourOfficeId: 1, sequencenumber: 1 } })
        },

        // keys that belong to other GSB services, or are misspelled
        { label: 'nationalId (not a Wasel key)', raw: JSON.stringify({ nationalId: '1' }) },
        { label: 'crNumber (Enterprise Size key)', raw: JSON.stringify({ crNumber: '1' }) },
        { label: 'commercialRegistrationNo (misspelled key)', raw: JSON.stringify({ commercialRegistrationNo: '1' }) },
        { label: 'personalID (wrong case)', raw: JSON.stringify({ personalID: '1' }) },
        { label: 'licenseNumber (License key)', raw: JSON.stringify({ licenseNumber: '1' }) },
        { label: 'unifiedLicenseNumber (License key)', raw: JSON.stringify({ unifiedLicenseNumber: '1' }) },
        { label: 'only the SOAP operation name', raw: JSON.stringify({ operation: 'GetIndividualWaselAddress' }) },

    ];
}


/*
 * Bodies that carry a crafted value. The build script escapes & < > before
 * building the SOAP envelope, so these reach the backend as plain text.
 * Objects / arrays / booleans are not valid identifiers.
 */
function injectionPayloadsFor() {

    return [
        { label: 'markup in personalId', body: { personalId: '1</tem:PersonalID><x/>' } },
        { label: 'ampersand in personalId', body: { personalId: '1&2' } },
        { label: 'CDATA in personalId', body: { personalId: '<![CDATA[x]]><x/>' } },
        { label: 'markup in commercialRegistrationNumber', body: { commercialRegistrationNumber: '1</tem:CommercialRegistrationNumber><x/>' } },
        { label: 'markup in sevenHundredNumber', body: { sevenHundredNumber: '1</tem:SevenHundredNumber><x/>' } },
        { label: 'markup in laborOfficeIdentity.labourOfficeId', body: { laborOfficeIdentity: { labourOfficeId: '1</tem:LabourOfficeID><x/>', sequenceNumber: 1 } } },
        { label: 'markup in laborOfficeIdentity.sequenceNumber', body: { laborOfficeIdentity: { labourOfficeId: 1, sequenceNumber: '1</tem:SequenceNumber><x/>' } } },
        { label: 'personalId as object', body: { personalId: { a: 1 } } },
        { label: 'personalId as array', body: { personalId: ['1', '2'] } },
        { label: 'personalId as boolean', body: { personalId: true } },
        { label: 'commercialRegistrationNumber as object', body: { commercialRegistrationNumber: { a: 1 } } },
        { label: 'sevenHundredNumber as object', body: { sevenHundredNumber: { a: 1 } } },
        { label: 'laborOfficeIdentity.labourOfficeId as object', body: { laborOfficeIdentity: { labourOfficeId: { a: 1 }, sequenceNumber: 1 } } },
        { label: 'personalId with a control character', body: { personalId: 'a\u0001b' } }
    ];
}


/*
 * Bodies with more than one identifier. The original script used the first
 * one present (personalId > commercialRegistrationNumber > sevenHundredNumber
 * > laborOfficeIdentity); the patched script rejects them. These only run
 * with ENFORCE_SINGLE_IDENTITY=true.
 */
function multiIdentityBodiesFor() {

    const labor = { labourOfficeId: 1, sequenceNumber: 1 };

    return [
        { label: 'personalId and commercialRegistrationNumber together', body: { personalId: '1', commercialRegistrationNumber: '2' } },
        { label: 'personalId and sevenHundredNumber together', body: { personalId: '1', sevenHundredNumber: '2' } },
        { label: 'personalId and laborOfficeIdentity together', body: { personalId: '1', laborOfficeIdentity: labor } },
        { label: 'commercialRegistrationNumber and sevenHundredNumber together', body: { commercialRegistrationNumber: '1', sevenHundredNumber: '2' } },
        { label: 'commercialRegistrationNumber and laborOfficeIdentity together', body: { commercialRegistrationNumber: '1', laborOfficeIdentity: labor } },
        { label: 'sevenHundredNumber and laborOfficeIdentity together', body: { sevenHundredNumber: '1', laborOfficeIdentity: labor } },
        {
            label: 'all four identifiers together',
            body: { personalId: '1', commercialRegistrationNumber: '2', sevenHundredNumber: '3', laborOfficeIdentity: labor }
        }
    ];
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('GSB Wasel Address API Proxy (MH-v1/gsb-wasel-address) - Regression Tests', () => {

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
    // POST flow - Wasel Address Service (happy path)
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
    // Needs real request bodies (see environment variables).
    // ========================================================

    for (const route of routes) {

        test(
            `@regression @contract POST - ${route.name} response matches the formatted JSON contract`,
            async () => {

                test.skip(!route.body, `Set ${route.envPrefix} to run`);

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                await logResponse(response);

                // 200 => success schema, 400 / 404 / 502 => { error: { code, message } }
                await expectFormattedResponse(route, response, route.body);

            }
        );

        test(
            `@regression @contract POST - ${route.name} returns 200 with the success schema for existing data`,
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

                await expectFormattedResponse(route, response, route.body);

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

                // SOAP fault -> 400 / 404 (business) or 502 (technical), never 200 / 500
                expect([400, 404, 502]).toContain(response.status());

                const json = await expectFormattedResponse(route, response, route.notFoundBody);

                console.log('Fault code:', json.error.code);

            }
        );

        test(
            `@regression @contract POST - ${route.name} "no data found" fault 001-000001 returns 404`,
            async () => {

                test.skip(
                    !route.notFoundBody || process.env.EXPECT_NOT_FOUND_CODE !== 'true',
                    `Set ${route.envPrefix}_NOT_FOUND (data that does not exist) and EXPECT_NOT_FOUND_CODE=true to run`
                );

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.notFoundBody }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                const json = await response.json();

                expect(json.error.code).toBe('001-000001');

            }
        );

        // One test per identifier type read by JS-Build-*-Request
        for (const variant of route.variants) {

            test(
                `@regression @contract IDENTITY - ${route.name} with ${variant.label} is converted to SOAP and answered in JSON`,
                async () => {

                    test.skip(!variant.body, `Set ${variant.env} to run`);

                    const response = await apiClient.post(
                        routeUrl(route),
                        { data: variant.body }
                    );

                    await logResponse(response);

                    // 404 is allowed here: it can be the backend "no data found" fault (001-000001),
                    // which expectFormattedResponse validates below
                    expect([401, 405, 415]).not.toContain(response.status());

                    await expectFormattedResponse(route, response, variant.body);

                }
            );

        }

    }


    // ========================================================
    // POST flows - Invalid body (JS-Build-*-Request throws)
    // No backend data is needed: the request never reaches the target.
    // ========================================================

    for (const route of routes) {

        for (const invalid of invalidBodiesFor()) {

            test(
                `@regression @validation POST - ${route.name} rejects ${invalid.label}`,
                async () => {

                    const response = await postRaw(apiClient, route, invalid.raw);

                    await expectBuildRequestRejected(response);

                }
            );

        }

        test(
            `@regression @validation POST - ${route.name} with a malformed body is not forwarded as a SOAP / XML response`,
            async () => {

                const response = await postRaw(apiClient, route, '{ invalid json');

                expectNoSoapLeak(await response.text());

            }
        );

    }


    // ========================================================
    // SECURITY - XML injection / wrong value types
    // JS-Build-*-Request escapes & < > in every value, so crafted input
    // reaches the backend as plain text. A value that is an object or an
    // array is not a valid identifier. None of these may succeed.
    // ========================================================

    for (const route of routes) {

        for (const payload of injectionPayloadsFor()) {

            test(
                `@regression @security INJECTION - ${route.name} ${payload.label}`,
                async () => {

                    const response = await apiClient.post(
                        routeUrl(route),
                        { data: payload.body }
                    );

                    await expectNeverSucceeds(response);

                }
            );

        }

    }


    // ========================================================
    // VALIDATION - More than one identifier (opt-in)
    // Run with ENFORCE_SINGLE_IDENTITY=true once the build scripts
    // reject ambiguous requests instead of using the first identifier.
    // ========================================================

    for (const route of routes) {

        for (const multi of multiIdentityBodiesFor()) {

            test(
                `@regression @validation SINGLE-IDENTITY - ${route.name} rejects ${multi.label}`,
                async () => {

                    test.skip(
                        !ENFORCE_SINGLE_IDENTITY,
                        'Set ENFORCE_SINGLE_IDENTITY=true to run'
                    );

                    const response = await apiClient.post(
                        routeUrl(route),
                        { data: multi.body }
                    );

                    await expectBuildRequestRejected(response);

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

        test(
            `@regression @gateway METHOD - ${method.toUpperCase()} with text/plain returns 405 (method check before Content-Type check)`,
            async () => {

                const response = await send(
                    apiClient,
                    method,
                    `${BASE_PATH}/SPWaselAddressService`,
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


    for (const contentType of [
        'application/xml',
        'text/xml',
        'application/soap+xml',
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
                `${BASE_PATH}/SPWaselAddressService`,
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

            const response = await client.get(`${BASE_PATH}/SPWaselAddressService`);

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

            const response = await unauthenticatedClient.get(
                `${BASE_PATH}/SPWaselAddressService`
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
                `${BASE_PATH}/SPWaselAddressService`,
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
        '@regression @auth PRECEDENCE - No token with invalid body returns 401 (not the JS policy error)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'application/json'
            });

            const response = await unauthenticatedClient.post(
                `${BASE_PATH}/SPWaselAddressService`,
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

        // MatchesPath is case sensitive and the real path is mixed case
        '/spwaseladdressservice',
        '/spWaselAddressService',                     // first letters lower case
        '/SPWASELADDRESS-SERVICE',
        '/SpWaselAddressService',
        '/SPwaselAddressService',
        '/SPWaselAddressservice',

        // spelling / separator variants
        '/sp-wasel-address-service',
        '/SP_Wasel_Address_Service',
        '/SPWaselAddressServices',                    // plural
        '/SPWaselAddressServic',                      // truncated
        '/WaselAddressService',                       // "SP" prefix missing
        '/SPWaselAddress',
        '/SPWasel',
        '/WaselAddress',
        '/AddressService',
        '/SPAddressService',

        // extra segments / SOAP-style suffixes
        '/SPWaselAddressService/extra-segment',
        '/SPWaselAddressService/1',
        '/SPWaselAddressService/1/2',
        '/SPWaselAddressService/GetAddress',
        '/SPWaselAddressService.svc',
        '/SPWaselAddressService.asmx',
        '/SPWaselAddressService/GetIndividualWaselAddress',
        '/SPWaselAddressService/GetCommercialWaselAddress',
        '/SPWaselAddressService.',                    // trailing dot (Shop License path style)

        // generic
        '/wasel-address',
        '/gsb-wasel-address',
        '/address',
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

        // The real path is mixed case (SPWaselAddressService), so a lower-case path is a different path
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


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.post(
                `${BASE_PATH}/SPWaselAddressService`,
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
                `${BASE_PATH}/SPWaselAddressService`,
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
                `${BASE_PATH}/SPWaselAddressService`,
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
                `${BASE_PATH}/SPWaselAddressService?access_token=${token}`,
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

            const response = await apiClient.get(`${BASE_PATH}/SPWaselAddressService`);

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
                `${BASE_PATH}/SPWaselAddressService`,
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

            // PUT on /SPWaselAddressService is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/SPWaselAddressService`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});