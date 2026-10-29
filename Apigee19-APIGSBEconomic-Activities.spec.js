import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';
import { getBearerToken } from '../auth.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.GSB_ACTIVITIES_BASE_PATH || '/MH-v1/gsb-activities';

/*
 * Request body of POST /ISICActivitiesService.
 *
 * One proxy path fronts 8 SOAP operations. JS-Build-ISICActivitiesService-Request
 * selects the operation from the "operation" field of the body (it is mandatory)
 * and builds the matching SOAP request:
 *
 *   operation              kind        required fields
 *   ---------------------  ----------  --------------------------------------------
 *   getISICActivities      read-only   -  (chapterNo optional)
 *   getISICStructure       read-only   chapterNo
 *   getAgenciesList        read-only   -
 *   getISICRequestTrans    read-only   requestNo
 *   getISICUpdatesLogs     read-only   -  (dateFrom, dateTo optional)
 *   getAgenciesOfActivity  read-only   activityKey OR activityCode
 *   addISICActivity        WRITE       senderIdentifier (+ the activity fields)
 *   editISICActivity       WRITE       activityKey, activityCode, editType, senderIdentifier
 *
 * senderIdentifier is an object with ONE of: nationalId | userAccountId | userEmail.
 *
 * The tests that send a request to the SOAP backend use READ-ONLY operations.
 * addISICActivity / editISICActivity create requests in the backend, so the tests
 * that let them reach the backend only run with RUN_WRITE_OPERATION_TESTS=true.
 * (Requests that the script rejects are safe: they never reach the backend.)
 */
const READ_ONLY_OPERATIONS = [
    'getISICActivities',
    'getISICStructure',
    'getAgenciesList',
    'getISICRequestTrans',
    'getISICUpdatesLogs',
    'getAgenciesOfActivity'
];

// Order used by the script in its "Accepted values" message
const SCRIPT_OPERATION_ORDER = [
    'getISICActivities',
    'addISICActivity',
    'editISICActivity',
    'getAgenciesList',
    'getISICRequestTrans',
    'getISICStructure',
    'getISICUpdatesLogs',
    'getAgenciesOfActivity'
];

/*
 * Data used in the request bodies. The placeholder values pass the request
 * validation, so the call reaches the SOAP backend, which answers with a fault
 * for unknown ids (mapped to 404 / 400 / 502 by the proxy). Set the variables to
 * real values to get successful answers for the operations that need an id.
 */
const DATA = {
    chapterNo: process.env.ISIC_CHAPTER_NO || '1',
    activityCode: process.env.ISIC_ACTIVITY_CODE || '0000',
    activityKey: process.env.ISIC_ACTIVITY_KEY || '1',
    requestNo: process.env.ISIC_REQUEST_NO || '1000000000',
    nationalId: process.env.ISIC_SENDER_NATIONAL_ID || '1000000000'
};

// Operations whose success answer can only be checked with an existing id
const HAS_REAL_DATA = {
    getISICActivities: true,
    getISICStructure: true,
    getAgenciesList: true,
    getISICUpdatesLogs: true,
    getISICRequestTrans: Boolean(process.env.ISIC_REQUEST_NO),
    getAgenciesOfActivity: Boolean(process.env.ISIC_ACTIVITY_CODE || process.env.ISIC_ACTIVITY_KEY)
};

// Fields shared by addISICActivity and editISICActivity
function senderFields() {

    return {
        isLicenseNeeded: 'false',
        coordinatorName: 'Automation Test',
        coordinatorMobile: '0500000000',
        coordinatorEmail: 'automation@example.com',
        senderName: 'Automation Test',
        senderIdentifier: { nationalId: DATA.nationalId }
    };
}

// Minimal valid body of every operation
function operationBody(operation) {

    switch (operation) {

        case 'getISICActivities':
            return { operation };

        case 'getISICStructure':
            return { operation, chapterNo: DATA.chapterNo };

        case 'getAgenciesList':
            return { operation };

        case 'getISICRequestTrans':
            return { operation, requestNo: DATA.requestNo };

        case 'getISICUpdatesLogs':
            return { operation };

        case 'getAgenciesOfActivity':
            return process.env.ISIC_ACTIVITY_KEY && !process.env.ISIC_ACTIVITY_CODE
                ? { operation, activityKey: DATA.activityKey }
                : { operation, activityCode: DATA.activityCode };

        case 'addISICActivity':
            return {
                operation,
                activityDescriptionEn: 'Automation test activity',
                activityDescriptionAr: 'Automation test activity AR',
                activityExplainEn: 'Created by the automation suite',
                activityExplainAr: 'Created by the automation suite AR',
                activityCategory: 'Test',
                ...senderFields(),
                agencySupervisorList: [{ agencyId: '1', agencyName: 'Test agency' }]
            };

        case 'editISICActivity':
            return {
                operation,
                activityKey: DATA.activityKey,
                activityCode: DATA.activityCode,
                activityDescriptionAr: 'Automation test activity AR',
                editType: 1,
                suggestedEditEn: 'Automation suggested edit',
                suggestedEditAr: 'Automation suggested edit AR',
                explainEditReason: 'Automation test',
                ...senderFields()
            };

        default:
            throw new Error(`Unknown operation: ${operation}`);
    }
}

/*
 * Body of the generic happy-path tests: a read-only operation that needs no
 * data. Set ISIC_ACTIVITIES_REQUEST_BODY (full JSON) to test another operation.
 */
const ISIC_ACTIVITIES_BODY = process.env.ISIC_ACTIVITIES_REQUEST_BODY
    ? JSON.parse(process.env.ISIC_ACTIVITIES_REQUEST_BODY)
    : operationBody('getAgenciesList');

/*
 * Flows of the proxy (ProxyEndpoint "default", MH-GSB-Economic-Activities-v1).
 *
 *   method : the ONLY verb accepted (PreFlow: request.verb != "POST" => RF-MethodNotAllowed)
 *   path   : exact MatchesPath (no wildcards in this proxy)
 */
const routes = [
    {
        name: 'ISIC Activities Service',
        method: 'POST',
        path: '/ISICActivitiesService',
        body: ISIC_ACTIVITIES_BODY
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
 * JS-Build-ISICActivitiesService-Request throws an Error when the request body
 * is invalid. The proxy has no DefaultFaultRule, so Apigee answers with its
 * default fault for a failed JavaScript policy: HTTP 500 and a JSON body whose
 * "faultstring" contains the error message.
 * Set EXPECTED_VALIDATION_STATUS if a DefaultFaultRule that maps the error
 * (for example to 400) is added to the proxy.
 */
const EXPECTED_VALIDATION_STATUS = Number(
    process.env.EXPECTED_VALIDATION_STATUS || 500
);

// Maximum time for a call that reaches the SOAP backend
const MAX_RESPONSE_MS = Number(process.env.MAX_RESPONSE_MS || 5000);

// addISICActivity / editISICActivity create requests in the backend
const RUN_WRITE_OPERATION_TESTS = process.env.RUN_WRITE_OPERATION_TESTS === 'true';

// Request number that the backend is expected NOT to know
const NOT_FOUND_REQUEST_NO = process.env.NOT_FOUND_REQUEST_NO || '999999999999999';

/*
 * Messages thrown by JS-Build-ISICActivitiesService-Request. Quotes are left out
 * of the fragments because the fault body is JSON and escapes them.
 */
const VALIDATION_MESSAGES = [
    'Invalid JSON request body',
    'Request must include an',
    'Unknown operation:',
    'chapterNo is required for getISICStructure',
    'requestNo is required for getISICRequestTrans',
    'getAgenciesOfActivity requires one of: activityKey, activityCode',
    'senderIdentifier is required for addISICActivity/editISICActivity',
    'senderIdentifier must include one of: nationalId, userAccountId, userEmail',
    'activityKey is required for editISICActivity',
    'activityCode is required for editISICActivity',
    'editType is required for editISICActivity'
];


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
 * Status produced by JS-Format-ISICActivitiesService-Response for a SOAP fault.
 * Mirrors the script:
 *   code starts with "500-"  -> 502  (critical: internal / database / authentication)
 *   code "001-000001"        -> 404
 *   any other code           -> 400  (business error)
 */
function statusForErrorCode(code) {

    if (String(code).indexOf('500-') === 0) return 502;

    if (String(code) === '001-000001') return 404;

    return 400;
}


// true when the text is a fault raised by JS-Build-ISICActivitiesService-Request
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


function postOperation(client, body) {

    return postRaw(client, JSON.stringify(body));
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

    // A 404 must be a SOAP fault mapped by JS-Format (JSON with error.code),
    // not the RF-NotFound of the gateway
    if (status === 404) {

        const json = parseJson(text);

        expect(json.error).toBeDefined();

        expect(statusForErrorCode(json.error.code)).toBe(404);
    }
}


/*
 * The answer was produced by JS-Format-ISICActivitiesService-Response:
 * JSON, with a status of 200, 400, 404 or 502, and an "error" object whose
 * code matches the status. For a 200 and a known operation the structure of
 * the JSON is checked as well.
 */
async function expectFormattedResponse(response, operation) {

    const status = response.status();

    const text = await response.text();

    expect(isValidationFault(text)).toBe(false);

    expect([200, 400, 404, 502]).toContain(status);

    await expectJsonResponse(response);

    const json = parseJson(text);

    if (status === 200) {

        expect(json.error).toBeUndefined();

        if (operation && RESPONSE_SCHEMAS[operation]) {
            expectSchema(json, RESPONSE_SCHEMAS[operation]);
        }

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
 * Structure check. A schema lists:
 *   string   : keys that the script wraps in String()  -> always a string
 *   nullable : keys that go through opt()              -> string or null
 *   array    : keys holding a list of objects (each item has its own schema)
 * Any other key (for example the "raw" fallback of the script) fails the check.
 */
function expectSchema(value, schema) {

    expect(value !== null && typeof value === 'object' && !Array.isArray(value)).toBe(true);

    const strings = schema.string || [];

    const nullable = schema.nullable || [];

    const arrays = schema.array || {};

    expectKeys(value, [...strings, ...nullable, ...Object.keys(arrays)]);

    strings.forEach(key => expectString(value[key]));

    nullable.forEach(key => expectStringOrNull(value[key]));

    for (const [key, itemSchema] of Object.entries(arrays)) {

        expect(Array.isArray(value[key])).toBe(true);

        value[key].forEach(item => expectSchema(item, itemSchema));
    }
}


// ---- response structures, as built by JS-Format-ISICActivitiesService-Response

const ACTIVITY = {
    string: ['activityKey', 'activityCode', 'activityDescriptionAr', 'activityLevel'],
    nullable: ['activityDescriptionEn']
};

const CHAPTER_WITH_ACTIVITIES = {
    string: ['chapterKey', 'chapterNo', 'chapterCodeAr', 'chapterDescriptionEn', 'chapterDescriptionAr', 'chapterLevel'],
    nullable: ['chapterCodeEn'],
    array: { activities: ACTIVITY }
};

const AGENCY = { string: ['agencyId', 'agencyName'] };

const TRANSACTION = {
    string: ['transactionSeq'],
    nullable: ['transactionStepOwner', 'transactionStatus', 'transactionDate', 'transactionTime', 'transactionNote']
};

const REQUEST_TRANS = {
    string: ['requestNo', 'requestType', 'activityCode', 'editType', 'requestTime', 'requestStatus', 'requestStatusDesc'],
    nullable: ['activityDescriptionAr', 'editDesc', 'suggestedEditAr', 'requestDate'],
    array: { transactions: TRANSACTION }
};

const ACTIVITY_STRUCTURE = {
    string: ['activityKey', 'activityCode', 'activityDescriptionAr', 'activityLevel'],
    nullable: ['activityDescriptionEn', 'activityExplainEn', 'activityExplainAr', 'activityLicenseNeedFlag']
};

const CLASS_STRUCTURE = {
    string: ['classKey', 'classCode', 'classDescriptionAr', 'classLevel'],
    nullable: ['classDescriptionEn'],
    array: { activities: ACTIVITY_STRUCTURE }
};

const GROUP_STRUCTURE = {
    string: ['groupKey', 'groupCode', 'groupDescriptionAr', 'groupLevel'],
    nullable: ['groupDescriptionEn'],
    array: { classes: CLASS_STRUCTURE }
};

const DIVISION_STRUCTURE = {
    string: ['divisionKey', 'divisionCode', 'divisionDescriptionAr', 'divisionLevel'],
    nullable: ['divisionDescriptionEn'],
    array: { groups: GROUP_STRUCTURE }
};

const CHAPTER_STRUCTURE = {
    string: ['chapterKey', 'chapterNo', 'chapterCodeAr', 'chapterDescriptionAr', 'chapterLevel'],
    nullable: ['chapterCodeEn', 'chapterDescriptionEn'],
    array: { divisions: DIVISION_STRUCTURE }
};

const UPDATE_LOG = {
    string: ['updateLogId', 'updateLogType', 'updateLogDate', 'activityKey', 'activityCode', 'valueNew', 'activityLevel'],
    nullable: ['valueOld']
};

// Structure of a 200 answer for each operation
const RESPONSE_SCHEMAS = {
    getISICActivities: { array: { chapters: CHAPTER_WITH_ACTIVITIES } },
    editISICActivity: { array: { chapters: CHAPTER_WITH_ACTIVITIES } },   // same mapping as getISICActivities in the script
    addISICActivity: { nullable: ['requestNo'] },
    getAgenciesList: { array: { agencies: AGENCY } },
    getAgenciesOfActivity: { array: { agencies: AGENCY } },
    getISICRequestTrans: REQUEST_TRANS,
    getISICStructure: { array: { chapters: CHAPTER_STRUCTURE } },
    getISICUpdatesLogs: { array: { updateLogs: UPDATE_LOG } }
};


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

test.describe('GSB Economic Activities API Proxy (MH-v1/gsb-activities) - Regression Tests', () => {

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
    // POST flow - ISIC Activities Service (happy path)
    //
    // The flow runs JS-Build-ISICActivitiesService-Request (JSON -> SOAP) and
    // JS-Format-ISICActivitiesService-Response (SOAP -> JSON). Every answer
    // that comes out of the flow is JSON with a status of
    //   200  success
    //   404  SOAP fault 001-000001
    //   502  SOAP fault 500-xxxxxx (critical backend error)
    //   400  any other SOAP fault (business error)
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

                await expectFormattedResponse(response, route.body.operation);

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

                await expectFormattedResponse(response, route.body.operation);

            }
        );

    }


    // ========================================================
    // REQUEST VALIDATION (JS-Build-ISICActivitiesService-Request)
    //
    // The script throws an Error for an invalid body. With no
    // DefaultFaultRule in the proxy the answer is the Apigee fault
    // for a failed JavaScript policy (EXPECTED_VALIDATION_STATUS,
    // default 500) and the text of the Error is in the fault body.
    // Validation happens before the SOAP backend is called, so these
    // requests never reach it (also for the write operations).
    // ========================================================

    const rejectedBodies = [

        // ---- operation
        { name: 'missing operation (lists the accepted operations)', message: `Accepted values: ${SCRIPT_OPERATION_ORDER.join(', ')}`, build: () => ({}) },
        { name: 'empty operation', message: 'Request must include an', build: () => ({ operation: '' }) },
        { name: 'null operation', message: 'Request must include an', build: () => ({ operation: null }) },
        { name: 'unknown operation', message: 'Unknown operation: deleteISICActivity', build: () => ({ operation: 'deleteISICActivity' }) },
        { name: 'operation in the wrong case', message: 'Unknown operation: getagencieslist', build: () => ({ operation: 'getagencieslist' }) },
        { name: 'operation with the SOAP name instead of the REST name', message: 'Unknown operation: GetAgenciesList', build: () => ({ operation: 'GetAgenciesList' }) },
        { name: 'numeric operation', message: 'Unknown operation: 123', build: () => ({ operation: 123 }) },

        // ---- getISICStructure
        { name: 'getISICStructure without chapterNo', message: 'chapterNo is required for getISICStructure', build: () => ({ operation: 'getISICStructure' }) },
        { name: 'getISICStructure with null chapterNo', message: 'chapterNo is required for getISICStructure', build: () => ({ operation: 'getISICStructure', chapterNo: null }) },

        // ---- getISICRequestTrans
        { name: 'getISICRequestTrans without requestNo', message: 'requestNo is required for getISICRequestTrans', build: () => ({ operation: 'getISICRequestTrans' }) },
        { name: 'getISICRequestTrans with empty requestNo', message: 'requestNo is required for getISICRequestTrans', build: () => ({ operation: 'getISICRequestTrans', requestNo: '' }) },
        { name: 'getISICRequestTrans with requestNo 0 (falsy)', message: 'requestNo is required for getISICRequestTrans', build: () => ({ operation: 'getISICRequestTrans', requestNo: 0 }) },

        // ---- getAgenciesOfActivity
        { name: 'getAgenciesOfActivity without activityKey and activityCode', message: 'getAgenciesOfActivity requires one of: activityKey, activityCode', build: () => ({ operation: 'getAgenciesOfActivity' }) },
        { name: 'getAgenciesOfActivity with null activityKey and empty activityCode', message: 'getAgenciesOfActivity requires one of: activityKey, activityCode', build: () => ({ operation: 'getAgenciesOfActivity', activityKey: null, activityCode: '' }) },

        // ---- addISICActivity (senderIdentifier)
        { name: 'addISICActivity without senderIdentifier', message: 'senderIdentifier is required for addISICActivity/editISICActivity', build: () => { const b = operationBody('addISICActivity'); delete b.senderIdentifier; return b; } },
        { name: 'addISICActivity with null senderIdentifier', message: 'senderIdentifier is required for addISICActivity/editISICActivity', build: () => ({ ...operationBody('addISICActivity'), senderIdentifier: null }) },
        { name: 'addISICActivity with senderIdentifier without any identifier field', message: 'senderIdentifier must include one of: nationalId, userAccountId, userEmail', build: () => ({ ...operationBody('addISICActivity'), senderIdentifier: {} }) },
        { name: 'addISICActivity with an unknown senderIdentifier field only', message: 'senderIdentifier must include one of: nationalId, userAccountId, userEmail', build: () => ({ ...operationBody('addISICActivity'), senderIdentifier: { passportNumber: '1' } }) },
        { name: 'addISICActivity with empty senderIdentifier values', message: 'senderIdentifier must include one of: nationalId, userAccountId, userEmail', build: () => ({ ...operationBody('addISICActivity'), senderIdentifier: { nationalId: '', userAccountId: '', userEmail: '' } }) },
        { name: 'addISICActivity with senderIdentifier as a string', message: 'senderIdentifier must include one of: nationalId, userAccountId, userEmail', build: () => ({ ...operationBody('addISICActivity'), senderIdentifier: 'abc' }) },

        // ---- editISICActivity
        { name: 'editISICActivity without activityKey', message: 'activityKey is required for editISICActivity', build: () => { const b = operationBody('editISICActivity'); delete b.activityKey; return b; } },
        { name: 'editISICActivity with null activityKey', message: 'activityKey is required for editISICActivity', build: () => ({ ...operationBody('editISICActivity'), activityKey: null }) },
        { name: 'editISICActivity without activityCode', message: 'activityCode is required for editISICActivity', build: () => { const b = operationBody('editISICActivity'); delete b.activityCode; return b; } },
        { name: 'editISICActivity with empty activityCode', message: 'activityCode is required for editISICActivity', build: () => ({ ...operationBody('editISICActivity'), activityCode: '' }) },
        { name: 'editISICActivity without editType', message: 'editType is required for editISICActivity', build: () => { const b = operationBody('editISICActivity'); delete b.editType; return b; } },
        { name: 'editISICActivity with null editType', message: 'editType is required for editISICActivity', build: () => ({ ...operationBody('editISICActivity'), editType: null }) },
        { name: 'editISICActivity without senderIdentifier', message: 'senderIdentifier is required for addISICActivity/editISICActivity', build: () => { const b = operationBody('editISICActivity'); delete b.senderIdentifier; return b; } },
        { name: 'editISICActivity with senderIdentifier without any identifier field', message: 'senderIdentifier must include one of: nationalId, userAccountId, userEmail', build: () => ({ ...operationBody('editISICActivity'), senderIdentifier: {} }) },

        // ---- body that is not a JSON object
        { name: 'malformed JSON', message: 'Invalid JSON request body', raw: '{ invalid json' },
        { name: 'JSON array instead of an object', message: 'Request must include an', raw: '[]' },
        { name: 'JSON string instead of an object', message: 'Request must include an', raw: '"text"' },

        // ---- no readable body at all: the script fails, the text of the error depends on the runtime
        { name: 'empty body', message: null, raw: undefined },
        { name: 'JSON null', message: null, raw: 'null' }
    ];

    for (const c of rejectedBodies) {

        test(
            `@regression @validation REQUEST - ${c.name} is rejected by JS-Build`,
            async () => {

                const text = 'raw' in c ? c.raw : JSON.stringify(c.build());

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
     * Only READ-ONLY operations: they cannot change data in the backend.
     * The backend answer (usually a fault for the placeholder ids) is formatted
     * by JS-Format, so it is JSON with a mapped status. A 200 answer is also
     * checked against the structure of its operation.
     */
    const acceptedBodies = [

        { name: 'getISICActivities without chapterNo', body: { operation: 'getISICActivities' } },
        { name: 'getISICActivities with chapterNo', body: { operation: 'getISICActivities', chapterNo: DATA.chapterNo } },

        { name: 'getISICStructure with chapterNo', body: operationBody('getISICStructure') },
        { name: 'getISICStructure with chapterNo 0 (only null / missing is rejected)', body: { operation: 'getISICStructure', chapterNo: 0 } },

        { name: 'getAgenciesList', body: operationBody('getAgenciesList') },
        { name: 'getAgenciesList with unknown extra fields (ignored)', body: { operation: 'getAgenciesList', unexpectedField: 'x', another: { nested: true } } },

        { name: 'getISICRequestTrans with requestNo', body: operationBody('getISICRequestTrans') },

        { name: 'getISICUpdatesLogs without dates', body: { operation: 'getISICUpdatesLogs' } },
        { name: 'getISICUpdatesLogs with dateFrom only', body: { operation: 'getISICUpdatesLogs', dateFrom: '2024-01-01' } },
        { name: 'getISICUpdatesLogs with dateTo only', body: { operation: 'getISICUpdatesLogs', dateTo: '2024-12-31' } },
        { name: 'getISICUpdatesLogs with dateFrom and dateTo', body: { operation: 'getISICUpdatesLogs', dateFrom: '2024-01-01', dateTo: '2024-12-31' } },

        { name: 'getAgenciesOfActivity with activityKey', body: { operation: 'getAgenciesOfActivity', activityKey: DATA.activityKey } },
        { name: 'getAgenciesOfActivity with activityKey 0 (only null / missing is rejected)', body: { operation: 'getAgenciesOfActivity', activityKey: 0 } },
        { name: 'getAgenciesOfActivity with activityCode', body: { operation: 'getAgenciesOfActivity', activityCode: DATA.activityCode } },
        { name: 'getAgenciesOfActivity with both (activityKey has priority)', body: { operation: 'getAgenciesOfActivity', activityKey: DATA.activityKey, activityCode: DATA.activityCode } },

        // values are XML-escaped by the script (esc())
        { name: 'XML special characters in requestNo (escaped)', body: { operation: 'getISICRequestTrans', requestNo: 'A&B<C>D' } },
        {
            name: 'XML injection attempt in requestNo (escaped)',
            body: { operation: 'getISICRequestTrans', requestNo: '1</tem:RequestNo><tem:Injected>x</tem:Injected><tem:RequestNo>2' }
        }
    ];

    for (const c of acceptedBodies) {

        test(
            `@regression @validation REQUEST - ${c.name} passes validation and reaches the target`,
            async () => {

                const response = await postOperation(apiClient, c.body);

                await logResponse(response);

                await expectFormattedResponse(response, c.body.operation);

            }
        );

    }


    /*
     * WRITE operations. These requests pass the validation and are sent to the
     * backend, where they can CREATE a request. Opt-in only.
     */
    const writeBodies = [

        { name: 'addISICActivity with senderIdentifier.nationalId', body: operationBody('addISICActivity') },
        {
            name: 'addISICActivity with senderIdentifier.userAccountId',
            body: { ...operationBody('addISICActivity'), senderIdentifier: { userAccountId: 'automation-user' } }
        },
        {
            name: 'addISICActivity with senderIdentifier.userEmail',
            body: { ...operationBody('addISICActivity'), senderIdentifier: { userEmail: 'automation@example.com' } }
        },
        {
            name: 'addISICActivity with the three agency lists',
            body: {
                ...operationBody('addISICActivity'),
                agencySupervisorList: [{ agencyId: '1', agencyName: 'Supervisor agency' }],
                agencyLicensorsList: [{ agencyId: '2', agencyName: 'Licensor agency' }],
                agencyRelatedList: [{ agencyId: '3', agencyName: 'Related agency' }]
            }
        },
        { name: 'editISICActivity', body: operationBody('editISICActivity') }
    ];

    for (const c of writeBodies) {

        test(
            `@regression @validation @write REQUEST - ${c.name} passes validation and reaches the target (can create data)`,
            async () => {

                test.skip(
                    !RUN_WRITE_OPERATION_TESTS,
                    'Set RUN_WRITE_OPERATION_TESTS=true to run. WARNING: the request reaches the backend and can create a request there'
                );

                const response = await postOperation(apiClient, c.body);

                await logResponse(response);

                await expectFormattedResponse(response, c.body.operation);

            }
        );

    }


    // ========================================================
    // RESPONSE MAPPING (JS-Format-ISICActivitiesService-Response)
    // ========================================================

    test(
        '@regression @contract RESPONSE - a SOAP fault is converted to { error: { code, message } } with the mapped status',
        async () => {

            // Unknown request number: the backend is expected to answer with a fault
            const response = await postOperation(
                apiClient,
                { operation: 'getISICRequestTrans', requestNo: NOT_FOUND_REQUEST_NO }
            );

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
        '@regression @contract RESPONSE - unknown request number is mapped to 404 with error code 001-000001',
        async () => {

            test.skip(
                process.env.RUN_NOT_FOUND_TEST !== 'true',
                'Set RUN_NOT_FOUND_TEST=true (needs a backend that answers fault 001-000001 for an unknown request number)'
            );

            const response = await postOperation(
                apiClient,
                { operation: 'getISICRequestTrans', requestNo: NOT_FOUND_REQUEST_NO }
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            const json = await expectFormattedError(response);

            expect(json.error.code).toBe('001-000001');

        }
    );


    // One structure check for every read-only operation
    for (const operation of READ_ONLY_OPERATIONS) {

        test(
            `@regression @contract RESPONSE - ${operation} successful response has the expected structure`,
            async () => {

                test.skip(
                    !HAS_REAL_DATA[operation],
                    'Set ISIC_REQUEST_NO (getISICRequestTrans) or ISIC_ACTIVITY_CODE / ISIC_ACTIVITY_KEY (getAgenciesOfActivity) to an existing value'
                );

                const response = await postOperation(apiClient, operationBody(operation));

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

                expectSchema(json, RESPONSE_SCHEMAS[operation]);

            }
        );

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
                    `${BASE_PATH}/ISICActivitiesService`,
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
                `${BASE_PATH}/ISICActivitiesService`,
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

            const response = await client.get(`${BASE_PATH}/ISICActivitiesService`);

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
                `${BASE_PATH}/ISICActivitiesService`
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
                `${BASE_PATH}/ISICActivitiesService`,
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

        // MatchesPath is case sensitive and the real path is mixed case
        '/isicactivitiesservice',
        '/isicActivitiesService',                     // first letters lower case
        '/ISICACTIVITIES-SERVICE',
        '/IsicActivitiesService',
        '/ISICactivitiesService',
        '/ISICActivitiesservice',

        // spelling / separator variants
        '/isic-activities-service',
        '/ISIC_Activities_Service',
        '/ISICActivitiesServices',                    // plural
        '/ISICActivitiesServic',                      // truncated
        '/ISICActivities',
        '/ISICActivity',
        '/ActivitiesService',
        '/EconomicActivitiesService',
        '/ISICService',
        '/ISIC',

        // extra segments / SOAP-style suffixes
        '/ISICActivitiesService/extra-segment',
        '/ISICActivitiesService/1',
        '/ISICActivitiesService/1/2',
        '/ISICActivitiesService/GetActivities',
        '/ISICActivitiesService.svc',
        '/ISICActivitiesService.asmx',

        // generic
        '/activities',
        '/economic-activities',
        '/gsb-activities',
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

        // The real path is mixed case (ISICActivitiesService), so a lower-case path is a different path
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
                `${BASE_PATH}/ISICActivitiesService`,
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
                `${BASE_PATH}/ISICActivitiesService`,
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
                `${BASE_PATH}/ISICActivitiesService`,
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
                `${BASE_PATH}/ISICActivitiesService?access_token=${token}`,
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

            const response = await apiClient.get(`${BASE_PATH}/ISICActivitiesService`);

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
                `${BASE_PATH}/ISICActivitiesService`,
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

            // PUT on /ISICActivitiesService is answered by the proxy (405) so the target is not called
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.put(`${BASE_PATH}/ISICActivitiesService`, { data: {} })
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});