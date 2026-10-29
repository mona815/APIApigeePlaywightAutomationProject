import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.GSB_LICENSE_BASE_PATH || '/MH-v1/gsb-license';

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
 * IMPORTANT: the proxy XML defines the Shop License flow as
 *     proxy.pathsuffix MatchesPath "/ShopLicenseService."
 * i.e. the path ends with a literal dot (the flow description refers to
 * ShopLicenseService.GetShopLicenseInfo, so this is probably a typo in the
 * XML). The spec follows the XML exactly. If the proxy is corrected, set
 * SHOP_LICENSE_PATH=/ShopLicenseService and the "without the trailing dot"
 * test is skipped automatically.
 */
const SHOP_LICENSE_PATH = process.env.SHOP_LICENSE_PATH || '/ShopLicenseService.';

/*
 * Flows of the proxy (ProxyEndpoint "default", MH-GSB-License-v1).
 *
 *   method    : the ONLY verb accepted (PreFlow: request.verb != "POST" => RF-MethodNotAllowed)
 *   path      : exact MatchesPath (no wildcards in this proxy)
 *   envPrefix : prefix of the environment variables holding request bodies
 *                 <prefix>              -> default happy path body
 *                 <prefix>_NOT_FOUND    -> body that makes the backend return a fault
 *                 <prefix>_<VARIANT>    -> one body per identifier type (see variants)
 *   variants  : identifier types read by JS-Build-*-Request
 *   validate  : (requestBody) => schema check for the JSON built by JS-Format-*-Response
 */
const routes = [
    {
        name: 'Shop License Service',
        method: 'POST',
        path: SHOP_LICENSE_PATH,
        envPrefix: 'SHOP_LICENSE_REQUEST_BODY',
        // JS-Build-ShopLicenseService-Request: unifiedLicenseNumber | ownerIdentifier
        variants: [
            { label: 'unifiedLicenseNumber', suffix: 'UNIFIED' },
            { label: 'ownerIdentifier', suffix: 'OWNER' }
        ],
        validate: () => validateShopResponse
    },
    {
        name: 'Building License Service',
        method: 'POST',
        path: '/BuildingLicenseService',
        envPrefix: 'BUILDING_LICENSE_REQUEST_BODY',
        // JS-Build-BuildingLicenseService-Request: operation + (licenseNumber | ownerIdentifier | landIdentifier)
        variants: [
            { label: 'licenseNumber', suffix: 'LICENSE' },
            { label: 'ownerIdentifier', suffix: 'OWNER' },
            { label: 'landIdentifier', suffix: 'LAND' }
        ],
        // The formatter output depends on the "operation" sent by the client
        validate: (body) => BUILDING_VALIDATORS[body && body.operation] || validateBuildingInfoResponse
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

// Building License: the two operations selected by the "operation" field
const BUILDING_OPERATIONS = [
    {
        operation: 'getLicensesInfo',
        env: 'BUILDING_LICENSE_INFO_REQUEST_BODY',
        body: parseBody('BUILDING_LICENSE_INFO_REQUEST_BODY')
    },
    {
        operation: 'getLicensesDetailsInfo',
        env: 'BUILDING_LICENSE_DETAILS_REQUEST_BODY',
        body: parseBody('BUILDING_LICENSE_DETAILS_REQUEST_BODY')
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


// ---- Shop License (JS-Format-ShopLicenseService-Response) ----

function validateShopResponse(json) {

    expectString(json.ownerName);
    expect(json).toHaveProperty('ownerIdentifier');
    expectNullableString(json.ownerIdentifier);

    expectArrayOf(json.licenses, (license) => {

        expectStrings(license, [
            'unifiedLicenseNumber', 'amanah', 'baladiaName',
            'issueDate', 'expiryDate', 'licenseStatus', 'shopArea'
        ]);

        expectNullableStrings(license, ['commercialName', 'doorsCount', 'shopAddress']);

        expectArrayOf(license.activities, (activity) => {

            expectStrings(activity, [
                'activityISICCode', 'activityISICDescription',
                'activityAmanahDescription', 'activityArea'
            ]);

            expectArrayOf(activity.boards, (board) => {
                expectStrings(board, ['boardType', 'boardArea']);
            });
        });

        // object, or null when the node is missing
        expect(license).toHaveProperty('locationCoordinates');

        if (license.locationCoordinates !== null) {
            expectNullableStrings(license.locationCoordinates, ['longitude', 'latitude']);
        }
    });
}


// ---- Building License (JS-Format-BuildingLicenseService-Response) ----

function validateBuildingOwner(owner) {

    expectString(owner.ownerName);
    expectLookup(owner.ownerType);
    expect(owner).toHaveProperty('ownerIdentifier');
    expectNullableString(owner.ownerIdentifier);
}


// operation = getLicensesInfo
function validateBuildingInfoResponse(json) {

    // The formatter falls back to { raw } for an unknown operation: never expected here
    expect(json).not.toHaveProperty('raw');

    expectArrayOf(json.licenses, (license) => {

        expectStrings(license, [
            'amanahName', 'baladiyaName', 'licenseNumber',
            'floorsCountIncludingGround', 'wallPerimeter', 'numberOfUnits'
        ]);

        expectNullableStrings(license, [
            'districtName', 'licenseIssueDate', 'licenseExpiryDate',
            'ownershipDocNumber', 'ownershipDocDate', 'buildingPercentage', 'officeName'
        ]);

        for (const key of ['licenseType', 'licenseStatus', 'ownershipDocType']) {
            expect(license).toHaveProperty(key);
            expectLookup(license[key]);
        }

        expectArrayOf(license.owners, validateBuildingOwner);

        expectArrayOf(license.lands, (land) => {
            expectStrings(land, ['planNumber', 'landNumber']);
            expectNullableStrings(land, ['planName', 'landArea']);
        });
    });
}


// operation = getLicensesDetailsInfo
function validateBuildingDetailsResponse(json) {

    expect(json).not.toHaveProperty('raw');

    expectStrings(json, ['amanahName', 'baladiyaName', 'requestNumber']);

    expectNullableStrings(json, [
        'districtName', 'licenseNumber', 'licenseIssueDate', 'licenseExpiryDate',
        'requestDate', 'ownershipDocNumber', 'ownershipDocDate'
    ]);

    for (const key of ['licenseType', 'licenseStatus', 'ownershipDocType']) {
        expect(json).toHaveProperty(key);
        expectLookup(json[key]);
    }

    expectArrayOf(json.owners, (owner) => {
        validateBuildingOwner(owner);
        expectNullableStrings(owner, ['nationality', 'email', 'mobileNumber']);
    });

    expectArrayOf(json.lands, (land) => {

        expectStrings(land, ['planNumber', 'landNumber', 'landArea']);
        expectNullableString(land.planName);

        expect(land).toHaveProperty('locationCoordinates');

        if (land.locationCoordinates !== null) {
            expectStrings(land.locationCoordinates, ['longitude', 'latitude']);
        }
    });

    expectArrayOf(json.boundaries, (boundary) => {
        expectLookup(boundary.side);
        expectStrings(boundary, ['boundary', 'length']);
        expectNullableStrings(boundary, ['ertidad', 'outcropping', 'truncate']);
    });

    const info = json.buildingInfo;

    expect(info).toBeTruthy();
    expectStrings(info, ['krookiNumber', 'floorsCountIncludingGround', 'numberOfUnits']);
    expectNullableStrings(info, ['buildingPercentage', 'wallPerimeter']);
    expectLookup(info.buildType);

    expectArrayOf(info.components, (component) => {
        expectLookup(component.componentName);
        expectLookup(component.componentUsage);
        expectStrings(component, ['numberOfUnits', 'componentArea']);
    });

    // Optional blocks: object, or null when the node is missing
    expect(json).toHaveProperty('engineeringOfficeDetails');

    if (json.engineeringOfficeDetails !== null) {
        expectStrings(json.engineeringOfficeDetails, ['officeName', 'officeLicenseNumber']);
        expectNullableStrings(json.engineeringOfficeDetails, [
            'email', 'telephoneNumber', 'faxNumber', 'internetAddress'
        ]);
    }

    expect(json).toHaveProperty('buildingCompletionDetails');

    if (json.buildingCompletionDetails !== null) {
        expectNullableStrings(json.buildingCompletionDetails, [
            'completionLicenseNumber', 'completionLicenseIssueDate'
        ]);
    }

    expect(json).toHaveProperty('thermalConductivityDetails');

    if (json.thermalConductivityDetails !== null) {
        expectNullableStrings(json.thermalConductivityDetails, [
            'wallsConductivity', 'wallsIsolation',
            'ceilingsConductivity', 'ceilingsIsolation',
            'windowsConductivity', 'windowsIsolation'
        ]);
    }
}


const BUILDING_VALIDATORS = {
    getLicensesInfo: validateBuildingInfoResponse,
    getLicensesDetailsInfo: validateBuildingDetailsResponse
};


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
 * Invalid bodies per route. Valid token + application/json, so they pass
 * the PreFlow; the JS policy then throws before the target is called.
 */
function invalidBodiesFor(route) {

    const common = [
        { label: 'malformed JSON', raw: '{ invalid json' },
        { label: 'empty string', raw: '' },
        { label: 'JSON null', raw: 'null' },
        { label: 'JSON array', raw: '[]' },
        { label: 'JSON string instead of object', raw: '"text"' },
        { label: 'empty object', raw: '{}' },
        { label: 'unrelated fields only', raw: JSON.stringify({ name: 'test', id: 1 }) }
    ];

    if (route.name === 'Shop License Service') {

        return [
            ...common,
            { label: 'empty unifiedLicenseNumber', raw: JSON.stringify({ unifiedLicenseNumber: '' }) },
            { label: 'null unifiedLicenseNumber', raw: JSON.stringify({ unifiedLicenseNumber: null }) },
            { label: 'empty ownerIdentifier object', raw: JSON.stringify({ ownerIdentifier: {} }) },
            { label: 'ownerIdentifier with empty values', raw: JSON.stringify({ ownerIdentifier: { nationalId: '', crNumber: '' } }) },
            { label: 'ownerIdentifier with an unsupported key', raw: JSON.stringify({ ownerIdentifier: { unknownId: '1' } }) },
            // iqamaNumber is a Building License identifier, not a Shop License one
            { label: 'ownerIdentifier.iqamaNumber (Building License key)', raw: JSON.stringify({ ownerIdentifier: { iqamaNumber: '1' } }) },
            // Building License request sent to the Shop License path
            { label: 'Building License body (operation + licenseNumber)', raw: JSON.stringify({ operation: 'getLicensesInfo', licenseNumber: '1' }) },
            { label: 'landIdentifier only (Building License key)', raw: JSON.stringify({ landIdentifier: { planNumber: '1', landNumber: '1' } }) }
        ];
    }

    return [
        ...common,

        // "operation" is mandatory and whitelisted
        { label: 'missing operation', raw: JSON.stringify({ licenseNumber: '1' }) },
        { label: 'empty operation', raw: JSON.stringify({ operation: '', licenseNumber: '1' }) },
        { label: 'null operation', raw: JSON.stringify({ operation: null, licenseNumber: '1' }) },
        { label: 'unknown operation', raw: JSON.stringify({ operation: 'getSomething', licenseNumber: '1' }) },
        { label: 'operation in PascalCase (case sensitive)', raw: JSON.stringify({ operation: 'GetLicensesInfo', licenseNumber: '1' }) },
        { label: 'operation in lower case', raw: JSON.stringify({ operation: 'getlicensesinfo', licenseNumber: '1' }) },
        { label: 'operation with surrounding spaces', raw: JSON.stringify({ operation: ' getLicensesInfo ', licenseNumber: '1' }) },
        { label: 'operation as number', raw: JSON.stringify({ operation: 1, licenseNumber: '1' }) },
        { label: 'operation as object', raw: JSON.stringify({ operation: { a: 1 }, licenseNumber: '1' }) },
        { label: 'operation with SOAP markup', raw: JSON.stringify({ operation: 'GetLicensesInfo</tem:GetLicensesInfo><x/>', licenseNumber: '1' }) },

        // valid operation but no / invalid identifier
        ...['getLicensesInfo', 'getLicensesDetailsInfo'].flatMap((operation) => [
            { label: `${operation} without identifier`, raw: JSON.stringify({ operation }) },
            { label: `${operation} with empty licenseNumber`, raw: JSON.stringify({ operation, licenseNumber: '' }) },
            { label: `${operation} with empty ownerIdentifier object`, raw: JSON.stringify({ operation, ownerIdentifier: {} }) },
            { label: `${operation} with ownerIdentifier unsupported key`, raw: JSON.stringify({ operation, ownerIdentifier: { unknownId: '1' } }) },
            // gulfId / charityId belong to the Shop License service
            { label: `${operation} with ownerIdentifier.gulfId (Shop License key)`, raw: JSON.stringify({ operation, ownerIdentifier: { gulfId: '1' } }) },
            { label: `${operation} with ownerIdentifier.charityId (Shop License key)`, raw: JSON.stringify({ operation, ownerIdentifier: { charityId: '1' } }) },
            { label: `${operation} with landIdentifier without landNumber`, raw: JSON.stringify({ operation, landIdentifier: { planNumber: '1' } }) },
            { label: `${operation} with landIdentifier without planNumber`, raw: JSON.stringify({ operation, landIdentifier: { landNumber: '1' } }) },
            { label: `${operation} with empty landIdentifier object`, raw: JSON.stringify({ operation, landIdentifier: {} }) },
            { label: `${operation} with landIdentifier as string`, raw: JSON.stringify({ operation, landIdentifier: 'abc' }) },
            // Shop License request sent to the Building License path
            { label: `${operation} with unifiedLicenseNumber (Shop License key)`, raw: JSON.stringify({ operation, unifiedLicenseNumber: '1' }) }
        ]),

        // Shop License body sent to the Building License path (no operation)
        { label: 'Shop License body (unifiedLicenseNumber, no operation)', raw: JSON.stringify({ unifiedLicenseNumber: '1' }) }
    ];
}


/*
 * Bodies that carry a crafted value. The build scripts escape & < > before
 * building the SOAP envelope, so these reach the backend as plain text.
 */
function injectionPayloadsFor(route) {

    if (route.name === 'Shop License Service') {

        return [
            { label: 'markup in unifiedLicenseNumber', body: { unifiedLicenseNumber: '1</tem:UnifiedLicenseNumber><x/>' } },
            { label: 'ampersand in unifiedLicenseNumber', body: { unifiedLicenseNumber: '1&2' } },
            { label: 'CDATA in ownerIdentifier.nationalId', body: { ownerIdentifier: { nationalId: '<![CDATA[x]]><x/>' } } },
            { label: 'markup in ownerIdentifier.crNumber', body: { ownerIdentifier: { crNumber: '1</tem:CRNumber><x/>' } } },
            { label: 'unifiedLicenseNumber as object', body: { unifiedLicenseNumber: { a: 1 } } },
            { label: 'unifiedLicenseNumber as array', body: { unifiedLicenseNumber: ['1', '2'] } }
        ];
    }

    return ['getLicensesInfo', 'getLicensesDetailsInfo'].flatMap((operation) => [
        { label: `${operation}: markup in licenseNumber`, body: { operation, licenseNumber: '1</tem:LicenseNumber><x/>' } },
        { label: `${operation}: ampersand in licenseNumber`, body: { operation, licenseNumber: '1&2' } },
        { label: `${operation}: CDATA in ownerIdentifier.nationalId`, body: { operation, ownerIdentifier: { nationalId: '<![CDATA[x]]><x/>' } } },
        { label: `${operation}: markup in landIdentifier.planNumber`, body: { operation, landIdentifier: { planNumber: '1</tem:PlanNumber><x/>', landNumber: '1' } } },
        { label: `${operation}: markup in landIdentifier.landNumber`, body: { operation, landIdentifier: { planNumber: '1', landNumber: '1</tem:LandNumber><x/>' } } },
        { label: `${operation}: licenseNumber as object`, body: { operation, licenseNumber: { a: 1 } } }
    ]);
}


/*
 * Bodies with more than one identifier. The scripts currently use the first
 * one present; these only run with ENFORCE_SINGLE_IDENTITY=true.
 */
function multiIdentityBodiesFor(route) {

    if (route.name === 'Shop License Service') {

        return [
            {
                label: 'unifiedLicenseNumber and ownerIdentifier together',
                body: { unifiedLicenseNumber: '1', ownerIdentifier: { nationalId: '1' } }
            },
            {
                label: 'ownerIdentifier with two keys (nationalId + crNumber)',
                body: { ownerIdentifier: { nationalId: '1', crNumber: '2' } }
            }
        ];
    }

    return ['getLicensesInfo', 'getLicensesDetailsInfo'].flatMap((operation) => [
        { label: `${operation}: licenseNumber and ownerIdentifier together`, body: { operation, licenseNumber: '1', ownerIdentifier: { nationalId: '1' } } },
        { label: `${operation}: licenseNumber and landIdentifier together`, body: { operation, licenseNumber: '1', landIdentifier: { planNumber: '1', landNumber: '1' } } },
        { label: `${operation}: ownerIdentifier with two keys (nationalId + crNumber)`, body: { operation, ownerIdentifier: { nationalId: '1', crNumber: '2' } } }
    ]);
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('GSB License API Proxy (MH-v1/gsb-license) - Regression Tests', () => {

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
    // Shop License Service, Building License Service
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


    // Building License: both operations behind the same path
    for (const op of BUILDING_OPERATIONS) {

        const route = routes.find(r => r.name === 'Building License Service');

        test(
            `@regression @contract OPERATION - Building License ${op.operation} returns the matching schema`,
            async () => {

                test.skip(!op.body, `Set ${op.env} to run`);

                // The request body must select the operation under test
                expect(op.body.operation).toBe(op.operation);

                const response = await apiClient.post(
                    routeUrl(route),
                    { data: op.body }
                );

                await logResponse(response);

                await expectFormattedResponse(route, response, op.body);

            }
        );

    }


    // ========================================================
    // POST flows - Invalid body (JS-Build-*-Request throws)
    // No backend data is needed: the request never reaches the target.
    // ========================================================

    for (const route of routes) {

        for (const invalid of invalidBodiesFor(route)) {

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

        for (const payload of injectionPayloadsFor(route)) {

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

        for (const multi of multiIdentityBodiesFor(route)) {

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
                    `${BASE_PATH}/BuildingLicenseService`,
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
                `${BASE_PATH}/BuildingLicenseService`,
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

            const response = await client.get(`${BASE_PATH}/BuildingLicenseService`);

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
                `${BASE_PATH}/BuildingLicenseService`
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
                `${BASE_PATH}/BuildingLicenseService`,
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
                `${BASE_PATH}/BuildingLicenseService`,
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

        // ShopLicenseService. : case, spelling, separators (the real path ends with a dot)
        '/shoplicenseservice.',
        '/shopLicenseService.',                       // first letter lower case
        '/SHOPLICENSE-SERVICE.',
        '/Shop-License-Service.',
        '/ShopLicenseServices.',                      // plural
        '/ShopLicenseServic.',                        // truncated
        '/ShopLicense.',
        '/ShopLicenceService.',                       // British spelling
        '/ShopLicenseService..',                      // two dots
        '/ShopLicenseService.GetShopLicenseInfo',     // operation name after the dot
        '/ShopLicenseService.svc',
        '/ShopLicenseService.asmx',
        '/ShopLicenseService./1',

        // BuildingLicenseService: case, spelling, separators
        '/buildinglicenseservice',
        '/buildingLicenseService',                    // first letter lower case
        '/BUILDINGLICENSE-SERVICE',
        '/Building_License_Service',
        '/building-license-service',
        '/BuildingLicenseServices',                   // plural
        '/BuildingLicenseServic',                     // truncated
        '/BuildingLicense',
        '/BuildingLicenceService',                    // British spelling
        '/LicenseService',
        '/BuildingLicenseService.',                   // trailing dot belongs to the Shop path only

        // BuildingLicenseService: extra segments / SOAP-style suffixes
        '/BuildingLicenseService/1',
        '/BuildingLicenseService/GetBuildingLicense',
        '/BuildingLicenseService.svc',
        '/BuildingLicenseService.asmx',

        // generic
        '/license',
        '/gsb-license',
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


    // ========================================================
    // Shop License path: the XML MatchesPath ends with a dot
    //   "/ShopLicenseService."  -> matches
    //   "/ShopLicenseService"   -> does NOT match (404) while the XML is as it is
    // ========================================================

    test(
        '@regression @gateway PATH - POST /ShopLicenseService without the trailing dot returns 404 (as defined in the proxy XML)',
        async () => {

            test.skip(
                SHOP_LICENSE_PATH !== '/ShopLicenseService.',
                'SHOP_LICENSE_PATH override is set, so the proxy path was changed'
            );

            const response = await apiClient.post(
                `${BASE_PATH}/ShopLicenseService`,
                { data: {} }
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    // The two services are NOT interchangeable: each path has its own build script
    test(
        '@regression @gateway PATH - Each service has its own path (no cross routing)',
        async () => {

            for (const route of routes) {

                const response = await apiClient.post(routeUrl(route), { data: {} });

                // Known path: the flow matches (never 404 from RF-NotFound)
                expect(response.status()).not.toBe(404);
            }

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


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.post(
                `${BASE_PATH}/BuildingLicenseService`,
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
                `${BASE_PATH}/BuildingLicenseService`,
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
                `${BASE_PATH}/BuildingLicenseService`,
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
                `${BASE_PATH}/BuildingLicenseService?access_token=${token}`,
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

            const response = await apiClient.get(`${BASE_PATH}/BuildingLicenseService`);

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
                `${BASE_PATH}/BuildingLicenseService`,
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

            // PUT on /BuildingLicenseService is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/BuildingLicenseService`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});
