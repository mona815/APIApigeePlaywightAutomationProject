import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.GSB_COMMERCIAL_EJAR_BASE_PATH || '/MH-v1/gsb-commercial-ejar';

/*
 * Request body of POST /CommercialEjarEnquiryService.
 *
 * JS-Build-GetTenancyContract-Request converts it into the SOAP call
 * CommercialEjarEnquiryService.GetTenancyContract and requires:
 *
 *   tenancyContractNumber : truthy value
 *   versionNumber         : truthy value (the number 0 is rejected)
 *   tenantRepIdentifier   : object with ONE of
 *                           nationalId | iqamaNumber | visitorId |
 *                           gccNationalId | gccPassportNumber | otherId
 *
 * Without real data the placeholder values below are used. They pass the
 * request validation, so the call reaches the SOAP backend, which normally
 * answers with a "contract not found" fault (mapped to 404 by the proxy).
 * To test a successful response set TENANCY_CONTRACT_REQUEST_BODY (full JSON)
 * or TENANCY_CONTRACT_NUMBER + TENANCY_VERSION_NUMBER + TENANT_NATIONAL_ID.
 */
const SAMPLE = {
    tenancyContractNumber: process.env.TENANCY_CONTRACT_NUMBER || '1234567890',
    versionNumber: process.env.TENANCY_VERSION_NUMBER || '1',
    nationalId: process.env.TENANT_NATIONAL_ID || '1000000000'
};

// true when the person running the tests supplied data of an existing contract
const HAS_REAL_DATA = Boolean(
    process.env.TENANCY_CONTRACT_REQUEST_BODY || process.env.TENANCY_CONTRACT_NUMBER
);

function validBody() {

    return {
        tenancyContractNumber: SAMPLE.tenancyContractNumber,
        versionNumber: SAMPLE.versionNumber,
        tenantRepIdentifier: { nationalId: SAMPLE.nationalId }
    };
}

const TENANCY_CONTRACT_BODY = process.env.TENANCY_CONTRACT_REQUEST_BODY
    ? JSON.parse(process.env.TENANCY_CONTRACT_REQUEST_BODY)
    : validBody();

/*
 * Flows of the proxy (ProxyEndpoint "default", MH-GSB-Commercial-Ejar-v1).
 *
 *   method : the ONLY verb accepted (PreFlow: request.verb != "POST" => RF-MethodNotAllowed)
 *   path   : exact MatchesPath (no wildcards in this proxy)
 */
const routes = [
    {
        name: 'Commercial Ejar Enquiry Service',
        method: 'POST',
        path: '/CommercialEjarEnquiryService',
        body: TENANCY_CONTRACT_BODY
    }
];

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
 * JS-Build-GetTenancyContract-Request throws an Error when the request body is
 * invalid. The proxy has no DefaultFaultRule, so Apigee answers with its default
 * fault for a failed JavaScript policy: HTTP 500 and a JSON body whose
 * "faultstring" contains the error message.
 * Set EXPECTED_VALIDATION_STATUS if a DefaultFaultRule that maps the error
 * (for example to 400) is added to the proxy.
 */
const EXPECTED_VALIDATION_STATUS = Number(
    process.env.EXPECTED_VALIDATION_STATUS || 500
);

// Maximum time for a call that reaches the SOAP backend
const MAX_RESPONSE_MS = Number(process.env.MAX_RESPONSE_MS || 5000);

// Messages thrown by JS-Build-GetTenancyContract-Request
const VALIDATION_MESSAGES = [
    'Invalid JSON request body',
    'tenancyContractNumber is required',
    'versionNumber is required',
    'tenantRepIdentifier is required',
    'tenantRepIdentifier must include one of'
];

// Identifier fields accepted in tenantRepIdentifier (the JS checks them in this order)
const TENANT_ID_FIELDS = [
    'nationalId',
    'iqamaNumber',
    'visitorId',
    'gccNationalId',
    'gccPassportNumber',
    'otherId'
];

// Contract id that the backend is expected NOT to know (opt-in test)
const NOT_FOUND_CONTRACT_NUMBER = process.env.NOT_FOUND_CONTRACT_NUMBER || '999999999999999';


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


/*
 * Status produced by JS-Format-GetTenancyContract-Response for a SOAP fault.
 * Mirrors the script:
 *   code starts with "500-"  -> 502
 *   code "001-000001"        -> 404  (contract not found)
 *   any other code           -> 400
 */
function statusForErrorCode(code) {

    if (String(code).indexOf('500-') === 0) return 502;

    if (String(code) === '001-000001') return 404;

    return 400;
}


// true when the text is the fault raised by JS-Build-GetTenancyContract-Request
function isValidationFault(text) {

    return VALIDATION_MESSAGES.some(message => text.includes(message));
}


function parseJson(text) {

    expect(() => JSON.parse(text)).not.toThrow();

    return JSON.parse(text);
}


// POST to the flow with a raw (already serialised) body and an explicit JSON Content-Type
function postRaw(client, text) {

    return client.post(
        routeUrl(routes[0]),
        {
            headers: { 'Content-Type': 'application/json' },
            data: text
        }
    );
}


/*
 * The request got through the PreFlow, the flow match and the request
 * validation of JS-Build. Whatever the SOAP backend answered is not checked.
 */
async function expectReachedTarget(response) {

    const status = response.status();

    const text = await response.text();

    // Not rejected by the PreFlow ...
    expect([401, 405, 415]).not.toContain(status);

    // ... and not rejected by the request validation
    expect(isValidationFault(text)).toBe(false);

    // A 404 must be the "contract not found" answer of JS-Format
    // (JSON with error.code), not the RF-NotFound of the gateway
    if (status === 404) {

        const json = parseJson(text);

        expect(json.error).toBeDefined();

        expect(statusForErrorCode(json.error.code)).toBe(404);
    }
}


/*
 * The answer was produced by JS-Format-GetTenancyContract-Response:
 * JSON, with a status of 200, 400, 404 or 502, and an "error" object
 * whose code matches the status.
 */
async function expectFormattedResponse(response) {

    const status = response.status();

    const text = await response.text();

    expect(isValidationFault(text)).toBe(false);

    expect([200, 400, 404, 502]).toContain(status);

    await expectJsonResponse(response);

    const json = parseJson(text);

    if (status === 200) {

        expect(json.error).toBeUndefined();

    } else {

        expect(json.error).toBeDefined();

        expect(status).toBe(statusForErrorCode(json.error.code));
    }

    return json;
}


// Formatted SOAP fault: { error: { code, message } } with the mapped status
async function expectFormattedError(response) {

    const json = await expectFormattedResponse(response);

    expect(response.status()).not.toBe(200);

    expect(Object.keys(json)).toEqual(['error']);

    expect(Object.keys(json.error).sort()).toEqual(['code', 'message']);

    expect(typeof json.error.code).toBe('string');

    expect(typeof json.error.message).toBe('string');

    return json;
}


function expectString(value) {

    expect(typeof value).toBe('string');
}


function expectStringOrNull(value) {

    expect(value === null || typeof value === 'string').toBe(true);
}


function expectKeys(object, keys) {

    expect(Object.keys(object).sort()).toEqual([...keys].sort());
}


/*
 * Structure of a successful answer, as built by JS-Format-GetTenancyContract-Response.
 * Values that the script wraps in String() are always strings; values that go
 * through opt() are a string or null.
 */
function expectTenancyContractSchema(json) {

    expectKeys(json, [
        'tenantRepIdentifier',
        'tenancyContractNumber',
        'versionNumber',
        'propertyAddress',
        'commercialCenterName',
        'buildingLicense',
        'buildingCompletionCertificate',
        'tenantEntityIdentifier',
        'contractStartDate',
        'contractEndDate',
        'contractStatus',
        'contractStatusId',
        'isContractActive',
        'units'
    ]);

    ['tenancyContractNumber', 'versionNumber', 'contractStatus',
        'contractStatusId', 'isContractActive'].forEach(key => expectString(json[key]));

    ['tenantRepIdentifier', 'commercialCenterName', 'buildingLicense',
        'buildingCompletionCertificate', 'tenantEntityIdentifier'].forEach(key => expectStringOrNull(json[key]));

    // propertyAddress
    expectKeys(json.propertyAddress, [
        'city', 'neighborhood', 'streetName', 'scheme',
        'block', 'buildingNumber', 'additionalNumber', 'postalCode'
    ]);

    expectString(json.propertyAddress.buildingNumber);

    ['city', 'neighborhood', 'streetName', 'scheme', 'block',
        'additionalNumber', 'postalCode'].forEach(key => expectStringOrNull(json.propertyAddress[key]));

    // contract dates
    for (const dateKey of ['contractStartDate', 'contractEndDate']) {

        expectKeys(json[dateKey], ['gregorian', 'hijri']);

        expectStringOrNull(json[dateKey].gregorian);

        expectStringOrNull(json[dateKey].hijri);
    }

    // units
    expect(Array.isArray(json.units)).toBe(true);

    for (const unit of json.units) {

        expectKeys(unit, [
            'unitNumber', 'floorNumber', 'shopNumber',
            'storeOpenings', 'shopFloors', 'shopArea'
        ]);

        ['unitNumber', 'floorNumber', 'shopNumber', 'shopFloors'].forEach(key => expectString(unit[key]));

        ['storeOpenings', 'shopArea'].forEach(key => expectStringOrNull(unit[key]));
    }
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

test.describe('GSB Commercial Ejar API Proxy (MH-v1/gsb-commercial-ejar) - Regression Tests', () => {

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
    // POST flow - Commercial Ejar Enquiry Service (happy path)
    //
    // The flow runs JS-Build-GetTenancyContract-Request (JSON -> SOAP) and
    // JS-Format-GetTenancyContract-Response (SOAP -> JSON). Every answer
    // that comes out of the flow is JSON with a status of
    //   200  contract found
    //   404  SOAP fault 001-000001 (contract not found)
    //   502  SOAP fault 500-xxxxxx (backend error)
    //   400  any other SOAP fault
    // ========================================================

    for (const route of routes) {

        test(
            `@regression POST - ${route.name} is accepted by the proxy`,
            async () => {

                const start = Date.now();

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                const duration = Date.now() - start;

                await logResponse(response);

                // Passed the PreFlow, the flow match and the request validation
                await expectReachedTarget(response);

                expect(duration).toBeLessThan(MAX_RESPONSE_MS);

            }
        );

        test(
            `@regression POST - ${route.name} returns a formatted JSON response (200 or mapped error)`,
            async () => {

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: route.body }
                );

                await logResponse(response);

                await expectFormattedResponse(response);

            }
        );

        test(
            `@regression POST - ${route.name} with unknown query parameter is not rejected by the proxy`,
            async () => {

                const response = await apiClient.post(
                    `${routeUrl(route)}?unknownParameter=1`,
                    { data: route.body }
                );

                await logResponse(response);

                await expectFormattedResponse(response);

            }
        );

    }


    // ========================================================
    // REQUEST VALIDATION (JS-Build-GetTenancyContract-Request)
    //
    // The script throws an Error for an invalid body. With no
    // DefaultFaultRule in the proxy the answer is the Apigee fault
    // for a failed JavaScript policy (EXPECTED_VALIDATION_STATUS,
    // default 500) and the text of the Error is in the fault body.
    // The checks use placeholder data, because validation happens
    // before the SOAP backend is called.
    // ========================================================

    const rejectedBodies = [

        // tenancyContractNumber
        { name: 'missing tenancyContractNumber', message: 'tenancyContractNumber is required', build: b => { delete b.tenancyContractNumber; return b; } },
        { name: 'empty tenancyContractNumber', message: 'tenancyContractNumber is required', build: b => ({ ...b, tenancyContractNumber: '' }) },
        { name: 'null tenancyContractNumber', message: 'tenancyContractNumber is required', build: b => ({ ...b, tenancyContractNumber: null }) },
        { name: 'tenancyContractNumber 0 (falsy)', message: 'tenancyContractNumber is required', build: b => ({ ...b, tenancyContractNumber: 0 }) },

        // versionNumber
        { name: 'missing versionNumber', message: 'versionNumber is required', build: b => { delete b.versionNumber; return b; } },
        { name: 'empty versionNumber', message: 'versionNumber is required', build: b => ({ ...b, versionNumber: '' }) },
        { name: 'versionNumber 0 (falsy)', message: 'versionNumber is required', build: b => ({ ...b, versionNumber: 0 }) },

        // tenantRepIdentifier
        { name: 'missing tenantRepIdentifier', message: 'tenantRepIdentifier is required', build: b => { delete b.tenantRepIdentifier; return b; } },
        { name: 'null tenantRepIdentifier', message: 'tenantRepIdentifier is required', build: b => ({ ...b, tenantRepIdentifier: null }) },
        { name: 'tenantRepIdentifier without any identifier field', message: 'tenantRepIdentifier must include one of', build: b => ({ ...b, tenantRepIdentifier: {} }) },
        { name: 'tenantRepIdentifier with an unknown identifier field only', message: 'tenantRepIdentifier must include one of', build: b => ({ ...b, tenantRepIdentifier: { passportNumber: '1' } }) },
        { name: 'tenantRepIdentifier with empty identifier values', message: 'tenantRepIdentifier must include one of', build: b => ({ ...b, tenantRepIdentifier: { nationalId: '', iqamaNumber: '' } }) },
        { name: 'tenantRepIdentifier as a string instead of an object', message: 'tenantRepIdentifier must include one of', build: b => ({ ...b, tenantRepIdentifier: 'abc' }) },

        // body that is not a JSON object
        { name: 'malformed JSON', message: 'Invalid JSON request body', raw: '{ invalid json' },
        { name: 'JSON array instead of an object', message: 'tenancyContractNumber is required', raw: '[]' },
        { name: 'JSON string instead of an object', message: 'tenancyContractNumber is required', raw: '"text"' },

        // no readable body at all: the script fails, the text of the error depends on the runtime
        { name: 'empty body', message: null, raw: undefined },
        { name: 'JSON null', message: null, raw: 'null' }
    ];

    for (const c of rejectedBodies) {

        test(
            `@regression @validation REQUEST - ${c.name} is rejected by JS-Build${c.message ? ` ("${c.message}")` : ''}`,
            async () => {

                const text = 'raw' in c ? c.raw : JSON.stringify(c.build(validBody()));

                const response = await postRaw(apiClient, text);

                await logResponse(response);

                expect(response.status()).toBe(EXPECTED_VALIDATION_STATUS);

                if (c.message) {
                    expect(await response.text()).toContain(c.message);
                }

            }
        );

    }


    /*
     * Bodies that must pass the validation and reach the SOAP backend.
     * The backend answer (usually "contract not found") is formatted by
     * JS-Format, so it is JSON with a mapped status.
     */
    const acceptedBodies = [

        // every identifier type of tenantRepIdentifier
        ...TENANT_ID_FIELDS.map(field => ({
            name: `tenantRepIdentifier with only ${field}`,
            body: { ...validBody(), tenantRepIdentifier: { [field]: SAMPLE.nationalId } }
        })),

        {
            name: 'tenantRepIdentifier with two identifiers (the first one in priority order is used)',
            body: { ...validBody(), tenantRepIdentifier: { nationalId: SAMPLE.nationalId, iqamaNumber: '2000000000' } }
        },
        {
            name: 'numeric tenancyContractNumber and versionNumber',
            body: { ...validBody(), tenancyContractNumber: 1234567890, versionNumber: 1 }
        },
        {
            name: 'versionNumber "0" as a string (a non-empty string is truthy)',
            body: { ...validBody(), versionNumber: '0' }
        },
        {
            name: 'unknown extra fields (ignored)',
            body: { ...validBody(), unexpectedField: 'x', another: { nested: true } }
        },

        // values are XML-escaped by the script (esc())
        {
            name: 'XML special characters in tenancyContractNumber (escaped)',
            body: { ...validBody(), tenancyContractNumber: 'A&B<C>D' }
        },
        {
            name: 'XML injection attempt in tenancyContractNumber (escaped)',
            body: { ...validBody(), tenancyContractNumber: '1</tem:TenancyContractNumber><tem:Injected>x</tem:Injected><tem:TenancyContractNumber>2' }
        }
    ];

    for (const c of acceptedBodies) {

        test(
            `@regression @validation REQUEST - ${c.name} passes validation and reaches the target`,
            async () => {

                const response = await postRaw(apiClient, JSON.stringify(c.body));

                await logResponse(response);

                await expectFormattedResponse(response);

            }
        );

    }


    // ========================================================
    // RESPONSE MAPPING (JS-Format-GetTenancyContract-Response)
    // ========================================================

    test(
        '@regression @contract RESPONSE - a SOAP fault is converted to { error: { code, message } } with the mapped status',
        async () => {

            // Placeholder data: the backend is expected to answer with a fault
            const response = await postRaw(apiClient, JSON.stringify(validBody()));

            await logResponse(response);

            test.skip(
                response.status() === 200,
                'The request succeeded, so there is no SOAP fault to check'
            );

            const json = await expectFormattedError(response);

            // 500-xxx -> 502, 001-000001 -> 404, anything else -> 400
            expect(response.status()).toBe(statusForErrorCode(json.error.code));

        }
    );


    test(
        '@regression @contract RESPONSE - unknown contract is mapped to 404 with error code 001-000001',
        async () => {

            test.skip(
                process.env.RUN_NOT_FOUND_TEST !== 'true',
                'Set RUN_NOT_FOUND_TEST=true (needs a backend that answers fault 001-000001 for an unknown contract)'
            );

            const response = await postRaw(
                apiClient,
                JSON.stringify({ ...validBody(), tenancyContractNumber: NOT_FOUND_CONTRACT_NUMBER })
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            const json = await expectFormattedError(response);

            expect(json.error.code).toBe('001-000001');

        }
    );


    test(
        '@regression @contract RESPONSE - successful response has the tenancy contract structure',
        async () => {

            test.skip(
                !HAS_REAL_DATA,
                'Set TENANCY_CONTRACT_REQUEST_BODY (or TENANCY_CONTRACT_NUMBER, TENANCY_VERSION_NUMBER, TENANT_NATIONAL_ID) to an existing contract'
            );

            const response = await apiClient.post(
                routeUrl(routes[0]),
                { data: routes[0].body }
            );

            await logResponse(response);

            test.skip(
                response.status() !== 200,
                `No successful response to validate (status ${response.status()})`
            );

            await expectJsonResponse(response);

            const text = await response.text();

            // JSON, not the SOAP envelope returned by the backend
            expect(text.toLowerCase()).not.toContain('<soap');

            expect(text.toLowerCase()).not.toContain('<?xml');

            const json = parseJson(text);

            expect(json.error).toBeUndefined();

            expectTenancyContractSchema(json);

            // The answer is about the contract that was requested
            if (routes[0].body.tenancyContractNumber !== undefined) {

                expect.soft(json.tenancyContractNumber)
                    .toBe(String(routes[0].body.tenancyContractNumber));
            }

        }
    );


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
                    `${BASE_PATH}/CommercialEjarEnquiryService`,
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
                `${BASE_PATH}/CommercialEjarEnquiryService`,
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

            const response = await client.get(`${BASE_PATH}/CommercialEjarEnquiryService`);

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
                `${BASE_PATH}/CommercialEjarEnquiryService`
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
                `${BASE_PATH}/CommercialEjarEnquiryService`,
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
    // Valid token + POST + application/json, so the request
    // passes the whole PreFlow and reaches the "Unknown" flow.
    // MatchesPath is exact (no wildcards) and case sensitive.
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',

        // MatchesPath is case sensitive and the real path is CamelCase
        '/commercialejarenquiryservice',
        '/commercialEjarEnquiryService',              // first letter lower case
        '/COMMERCIAL-EJAR-ENQUIRY-SERVICE',
        '/Commercialejarenquiryservice',
        '/CommercialEjarenquiryservice',

        // spelling / separator variants
        '/commercial-ejar-enquiry-service',
        '/Commercial_Ejar_Enquiry_Service',
        '/CommercialEjarEnquiryServices',             // plural
        '/CommercialEjarEnquiryServic',               // truncated
        '/CommercialEjarEnquiry',
        '/CommercialEjarService',
        '/EjarEnquiryService',
        '/EnquiryService',
        '/CommercialEjar',

        // extra segments / SOAP-style suffixes
        '/CommercialEjarEnquiryService/extra-segment',
        '/CommercialEjarEnquiryService/1',
        '/CommercialEjarEnquiryService/1/2',
        '/CommercialEjarEnquiryService/GetTenancyContract',
        '/CommercialEjarEnquiryService.svc',
        '/CommercialEjarEnquiryService.asmx',

        // operation name used as a path (it is a SOAP operation, not a route)
        '/GetTenancyContract',
        '/get-tenancy-contract',
        '/tenancy-contract',

        // generic
        '/gsb-commercial-ejar',
        '/ejar',
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

        // The real path is CamelCase, so a lower-case path is a different path
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
                    { data: route.body }
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
                    { data: route.body }
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
                `${BASE_PATH}/CommercialEjarEnquiryService`,
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
                `${BASE_PATH}/CommercialEjarEnquiryService`,
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
                `${BASE_PATH}/CommercialEjarEnquiryService`,
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
                `${BASE_PATH}/CommercialEjarEnquiryService?access_token=${token}`,
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

            const response = await apiClient.get(`${BASE_PATH}/CommercialEjarEnquiryService`);

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
                `${BASE_PATH}/CommercialEjarEnquiryService`,
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

            // PUT on /CommercialEjarEnquiryService is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/CommercialEjarEnquiryService`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});