import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.DEEWAN_BASE_PATH || '/MH-v1/deewan';

const SMS_PATH = `${BASE_PATH}/sms/messages`;

const VERIFICATION_PATH = `${BASE_PATH}/mfa/verifications`;

/*
 * Tests that really send an SMS / OTP (and may cost money) only run when
 *   RUN_LIVE_TESTS=true
 * and DEEWAN_TEST_PHONE is a number you own.
 */
const RUN_LIVE = process.env.RUN_LIVE_TESTS === 'true';

const TEST_PHONE = process.env.DEEWAN_TEST_PHONE || '+201000000000';

const SENDER = process.env.DEEWAN_SENDER || 'Playwright';

/*
 * NOTE: adjust the field names below to the real Deewan target contract.
 * The proxy XML does not define the request body, so these are assumptions.
 */
const smsData = {
    sender: SENDER,
    recipient: TEST_PHONE,
    content: `Playwright test ${Date.now()}`
};

const verificationData = {
    recipient: TEST_PHONE,
    sender: SENDER
};

// Values discovered at runtime and shared between tests
const state = {
    verificationId: process.env.VERIFICATION_ID || ''
};


// ============================================================
// Helper Functions
// ============================================================

async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
}


async function expectClientError(response) {

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
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

test.describe('Deewan API Proxy (MH-v1/deewan) - Regression Tests', () => {

    // Verification tests share verificationId, so they must run in order
    test.describe.configure({ mode: 'serial' });

    let apiClient;


    // --------------------------------------------------------
    // Setup
    // --------------------------------------------------------

    test.beforeAll(async () => {

        apiClient = await createApiClient();

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
    // SMS - Send Message (LIVE)
    // ========================================================

    test(
        '@regression @live POST - Send SMS message',
        async () => {

            test.skip(!RUN_LIVE, 'Set RUN_LIVE_TESTS=true to send a real SMS');

            const response = await apiClient.post(
                SMS_PATH,
                {
                    data: smsData
                }
            );

            await logResponse(response);

            expect([200, 201, 202]).toContain(response.status());

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body).toBeDefined();

        }
    );


    // ========================================================
    // SMS - Empty Body
    // ========================================================

    test(
        '@regression POST - Send SMS with empty body',
        async () => {

            const response = await apiClient.post(
                SMS_PATH,
                {
                    data: {}
                }
            );

            await logResponse(response);

            await expectClientError(response);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // SMS - Missing Content
    // ========================================================

    test(
        '@regression POST - Send SMS without content',
        async () => {

            const invalidMessage = {
                ...smsData
            };

            delete invalidMessage.content;

            const response = await apiClient.post(
                SMS_PATH,
                {
                    data: invalidMessage
                }
            );

            await logResponse(response);

            await expectClientError(response);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // SMS - Invalid Content-Type
    // ========================================================

    test(
        '@regression POST - Send SMS Invalid Content-Type',
        async () => {

            const response = await apiClient.post(
                SMS_PATH,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: JSON.stringify(smsData)
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // SMS - Method Not Allowed
    // ========================================================

    for (const method of ['get', 'put', 'delete', 'patch']) {

        test(
            `@regression METHOD - ${method.toUpperCase()} /sms/messages is not allowed`,
            async () => {

                const response = await apiClient[method](
                    SMS_PATH,
                    method === 'get' || method === 'delete'
                        ? {}
                        : { data: smsData }
                );

                await logResponse(response);

                expect(response.status()).toBe(405);

            }
        );

    }


    // ========================================================
    // SMS - PUT with wrong Content-Type (415 wins over 405)
    // ========================================================

    test(
        '@regression PRECEDENCE - PUT /sms/messages with text/plain returns 415',
        async () => {

            /*
             * The Content-Type policy runs in the PreFlow,
             * before the "Method Not Allowed" conditional flow.
             */
            const response = await apiClient.put(
                SMS_PATH,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    // ========================================================
    // MFA - Send Verification (LIVE)
    // ========================================================

    test(
        '@regression @live POST - Send verification',
        async () => {

            test.skip(!RUN_LIVE, 'Set RUN_LIVE_TESTS=true to send a real OTP');

            const response = await apiClient.post(
                VERIFICATION_PATH,
                {
                    data: verificationData
                }
            );

            await logResponse(response);

            expect([200, 201, 202]).toContain(response.status());

            await expectJsonResponse(response);

            const body = await response.json();

            // Adjust to the real response structure
            const id = body.id || body.verificationId || body.verification_id || body.data?.id;

            expect(id).toBeDefined();

            state.verificationId = state.verificationId || String(id);

        }
    );


    // ========================================================
    // MFA - Send Verification Empty Body
    // ========================================================

    test(
        '@regression POST - Send verification with empty body',
        async () => {

            const response = await apiClient.post(
                VERIFICATION_PATH,
                {
                    data: {}
                }
            );

            await logResponse(response);

            await expectClientError(response);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // MFA - Send Verification Invalid Content-Type
    // ========================================================

    test(
        '@regression POST - Send verification Invalid Content-Type',
        async () => {

            const response = await apiClient.post(
                VERIFICATION_PATH,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: JSON.stringify(verificationData)
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // MFA - Check Verification With Wrong Code (LIVE)
    // ========================================================

    test(
        '@regression @live PUT - Check verification with wrong code',
        async () => {

            test.skip(!state.verificationId, 'No verification id (send verification must run first)');

            const response = await apiClient.put(
                VERIFICATION_PATH,
                {
                    data: {
                        id: state.verificationId,
                        code: '000000'
                    }
                }
            );

            await logResponse(response);

            await expectClientError(response);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // MFA - Check Verification Empty Body
    // ========================================================

    test(
        '@regression PUT - Check verification with empty body',
        async () => {

            const response = await apiClient.put(
                VERIFICATION_PATH,
                {
                    data: {}
                }
            );

            await logResponse(response);

            await expectClientError(response);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // MFA - Check Verification Invalid Content-Type
    // ========================================================

    test(
        '@regression PUT - Check verification Invalid Content-Type',
        async () => {

            const response = await apiClient.put(
                VERIFICATION_PATH,
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


    // ========================================================
    // MFA - Track Verification (LIVE)
    // ========================================================

    test(
        '@regression @live GET - Track verification',
        async () => {

            test.skip(!state.verificationId, 'No verification id (send verification must run first)');

            const response = await apiClient.get(
                `${VERIFICATION_PATH}?id=${encodeURIComponent(state.verificationId)}`
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // MFA - Track Verification Unknown ID
    // ========================================================

    test(
        '@regression GET - Track verification that does not exist',
        async () => {

            const response = await apiClient.get(
                `${VERIFICATION_PATH}?id=UNKNOWN-VERIFICATION-000`
            );

            await logResponse(response);

            // Request passes the proxy; the target decides the exact code
            await expectClientError(response);

        }
    );


    // ========================================================
    // MFA - Method Not Allowed
    // ========================================================

    for (const method of ['delete', 'patch']) {

        test(
            `@regression METHOD - ${method.toUpperCase()} /mfa/verifications is not allowed`,
            async () => {

                const response = await apiClient[method](
                    VERIFICATION_PATH,
                    method === 'delete'
                        ? {}
                        : { data: verificationData }
                );

                await logResponse(response);

                expect(response.status()).toBe(405);

            }
        );

    }


    // ========================================================
    // Authentication - Missing Token
    // ========================================================

    const protectedCalls = [
        { name: 'POST /sms/messages',        method: 'post', path: SMS_PATH,          body: smsData },
        { name: 'POST /mfa/verifications',   method: 'post', path: VERIFICATION_PATH, body: verificationData },
        { name: 'PUT /mfa/verifications',    method: 'put',  path: VERIFICATION_PATH, body: { id: 'x', code: '000000' } },
        { name: 'GET /mfa/verifications',    method: 'get',  path: `${VERIFICATION_PATH}?id=1` }
    ];

    for (const call of protectedCalls) {

        test(
            `@regression AUTH - ${call.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await unauthenticatedClient[call.method](
                    call.path,
                    call.body ? { data: call.body } : {}
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

    }


    // ========================================================
    // Authentication - Invalid Token
    // ========================================================

    test(
        '@regression AUTH - Invalid bearer token',
        async () => {

            const invalidTokenClient = await createClientWithHeaders({
                Authorization: 'Bearer invalid-token-123456',
                'Content-Type': 'application/json'
            });

            const response = await invalidTokenClient.post(
                SMS_PATH,
                {
                    data: smsData
                }
            );

            await logResponse(response);

            /*
             * Expected result is 401.
             *
             * If you receive 429, Apigee rate limiting
             * (SA-PreventSpikes) is triggered BEFORE
             * OA2-VerifyToken in the PreFlow.
             */
            expect(response.status()).toBe(401);

            await expectJsonResponse(response);

            await invalidTokenClient.dispose();

        }
    );


    // ========================================================
    // Authentication - Non-Bearer Scheme
    // ========================================================

    test(
        '@regression AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.post(
                SMS_PATH,
                {
                    data: smsData
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await basicAuthClient.dispose();

        }
    );


    // ========================================================
    // Authentication runs before Content-Type validation
    // ========================================================

    test(
        '@regression PRECEDENCE - No token and text/plain returns 401 (not 415)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({
                'Content-Type': 'text/plain'
            });

            const response = await unauthenticatedClient.post(
                SMS_PATH,
                {
                    data: 'invalid data'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // Invalid Endpoints
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/sms',
        '/sms/messages/123',
        '/mfa',
        '/mfa/verifications/123',
        '/sms/unknown'
    ];

    for (const path of invalidPaths) {

        test(
            `@regression PATH - GET ${path} should return 404`,
            async () => {

                const response = await apiClient.get(
                    `${BASE_PATH}${path}`
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

            }
        );

    }


    // ========================================================
    // Response Time (proxy-only response, no target call)
    // ========================================================

    test(
        '@regression PERFORMANCE - 405 response within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.get(SMS_PATH);

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

            // GET /sms/messages is answered by the proxy (405) so no SMS is sent
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.get(SMS_PATH)
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});