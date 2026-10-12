import { test, expect, request } from '@playwright/test';
import { createApiClient } from '../api-client.js';


// ============================================================
// Test Data
// ============================================================

const employeeId = `EMP-PLAYWRIGHT-${Date.now()}`;

const employeeData = {
    employeeId: employeeId,
    employeeName: 'Playwright Test',
    employeeEmail: 'playwright@test.com',
    department: 'Testing',
    joinDate: '08/01/2022',
    phoneNumber: '+201010480231',
    jobTitle: 'QA Engineer',
    salary: 40000,
    isRemote: true,
    skills: [
        'Playwright',
        'API Testing',
        'Apigee'
    ],
    certifications: [
        {
            certificateName: 'API Testing',
            issueDate: '15/01/2023'
        }
    ]
};


// ------------------------------------------------------------
// Postman collection "Demo Employee_API" - request bodies
// ------------------------------------------------------------

const collectionAddEmployee = {
    employeeId: '12',
    employeeName: 'Test Ahmed',
    employeeEmail: 'mona@cloudypedia.net',
    department: 'Development',
    joinDate: '08/01/2022',
    phoneNumber: '+201010480231',
    jobTitle: 'QC and API team',
    salary: 40000,
    isRemote: true,
    skills: [
        'Apigee X',
        'Drupal Development'
    ],
    certifications: [
        {
            certificateName: 'Professional Drupal Architect',
            issueDate: '15/01/2023'
        }
    ]
};

const collectionUpdateEmployee = {
    employeeId: '111',
    employeeName: 'Ahmed Updated',
    employeeEmail: 'mona@cloudypedia.net',
    department: 'Development',
    joinDate: '08/01/2022',
    phoneNumber: '+201010480231',
    jobTitle: 'Senior API Architect',
    salary: 50000,
    isRemote: true,
    skills: [
        'Apigee X',
        'Drupal Development',
        'OAuth'
    ],
    certifications: [
        {
            certificateName: 'Professional Drupal Architect',
            issueDate: '15/01/2023'
        }
    ]
};

const TOKEN_PATH = '/mona/generate-bearer-token/v1';


// ============================================================
// Helper Functions
// ============================================================

async function expectJsonResponse(response) {

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
}


async function logResponse(response) {

    console.log('-----------------------------------');
    console.log('Status:', response.status());
    //console.log('Headers:', await response.allHeaders());
    console.log('Body:', await response.text());
    console.log('-----------------------------------');
}


// Client that is NOT authenticated (used by token / auth tests)
async function createAnonymousClient(headers = {}) {

    return request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: headers
    });
}


// Calls the token endpoint with the credentials sent as form fields
async function requestToken(client, form) {

    return client.post(
        TOKEN_PATH,
        {
            form
        }
    );
}


// ============================================================
// API REGRESSION TESTS
// ============================================================

test.describe('Employee Management API - Regression Tests', () => {

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
    // POSTMAN COLLECTION - Demo Employee_API
    // Same requests, same data and same order as the collection:
    //   1. Get Employee   2. Add Employee   3. Generate Token
    //   4. Update Employee   5. Delete Employee
    // ========================================================

    test.describe('Postman collection - Demo Employee_API', () => {

        // Add -> Update -> Delete work on the same data
        test.describe.configure({ mode: 'serial' });


        // ----------------------------------------------------
        // 1 - Get Employee (id=11)
        // ----------------------------------------------------

        test(
            '@regression @collection GET - Get Employee (id=11)',
            async () => {

                const response = await apiClient.get(
                    '/mona/v1/employees?id=11'
                );

                await logResponse(response);

                expect(response.status()).toBe(200);

                await expectJsonResponse(response);

            }
        );


        // ----------------------------------------------------
        // 2 - Add Employee (employeeId 12)
        // ----------------------------------------------------

        test(
            '@regression @collection POST - Add Employee (id=12)',
            async () => {

                // Make the test repeatable: remove employee 12 left by a previous run
                await apiClient.delete('/mona/v1/employees?id=12');

                const response = await apiClient.post(
                    '/mona/v1/employees',
                    {
                        data: collectionAddEmployee
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(201);

                await expectJsonResponse(response);

            }
        );


        // ----------------------------------------------------
        // 3 - Generate Token
        // The collection sends client_id / client_secret / grant_type
        // as headers and grant_type=client_credentials as form body
        // ----------------------------------------------------

        test(
            '@regression @collection POST - Generate Token (credentials in headers, as the collection)',
            async () => {

                const client = await createAnonymousClient();

                const response = await client.post(
                    TOKEN_PATH,
                    {
                        headers: {
                            client_id: process.env.CLIENT_ID,
                            client_secret: process.env.CLIENT_SECRET,
                            grant_type: 'client_credentials'
                        },
                        form: {
                            grant_type: 'client_credentials'
                        }
                    }
                );

                console.log('Status:', response.status());

                expect(response.status()).toBe(200);

                await expectJsonResponse(response);

                const body = await response.json();

                expect(body.access_token).toBeDefined();

                await client.dispose();

            }
        );


        // ----------------------------------------------------
        // 4 - Update Employee (id=11)
        // NOTE: the collection updates the shared employee 11
        // ----------------------------------------------------

        test(
            '@regression @collection PUT - Update Employee (id=11)',
            async () => {

                const response = await apiClient.put(
                    '/mona/v1/employees?id=11',
                    {
                        data: collectionUpdateEmployee
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(200);

                await expectJsonResponse(response);

            }
        );


        // ----------------------------------------------------
        // 5 - Delete Employee (id=12)
        // ----------------------------------------------------

        test(
            '@regression @collection DELETE - Delete Employee (id=12)',
            async () => {

                const response = await apiClient.delete(
                    '/mona/v1/employees?id=12',
                    {
                        data: collectionUpdateEmployee
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(200);

            }
        );

    });


    // ========================================================
    // GET - Positive
    // ========================================================

    test(
        '@regression GET - Get existing employee',
        async () => {

            const response = await apiClient.get(
                '/mona/v1/employees?id=11'
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body).toBeDefined();

            // Adjust these according to your actual response structure
            expect(body.employeeId || body.data?.employeeId).toBeDefined();

        }
    );


    // ========================================================
    // GET - Employee Not Found
    // ========================================================

    test(
        '@regression GET - Employee does not exist',
        async () => {

            const response = await apiClient.get(
                '/mona/v1/employees?id=999999'
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.status).toBe('error');

            expect(body.message).toBe('Employee not found');

        }
    );


    // ========================================================
    // GET - Missing ID
    // ========================================================

    test(
        '@regression GET - Missing employee ID',
        async () => {

            const response = await apiClient.get(
                '/mona/v1/employees'
            );

            await logResponse(response);

            // Change to 400 if your Apigee implementation
            // returns 400 for missing ID.
            expect([400, 404]).toContain(response.status());

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // GET - Invalid ID
    // ========================================================

    test(
        '@regression GET - Invalid employee ID',
        async () => {

            const response = await apiClient.get(
                '/mona/v1/employees?id=ABC'
            );

            await logResponse(response);

            expect([400, 404]).toContain(response.status());

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Create Employee
    // ========================================================

    test(
        '@regression POST - Create new employee',
        async () => {

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: employeeData
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(201);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body).toBeDefined();

        }
    );


    // ========================================================
    // POST - Duplicate Employee
    // ========================================================

    test(
        '@regression POST - Duplicate employee should return 409',
        async () => {

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: employeeData
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(409);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Invalid Content-Type
    // ========================================================

    test(
        '@regression POST - Invalid Content-Type',
        async () => {

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: JSON.stringify(employeeData)
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

            await expectJsonResponse(response);

        }
    );
    
    // ========================================================
    // POST - Invalid Email
    // ========================================================

    test(
        '@regression POST - Invalid email',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: `EMP-INVALID-EMAIL-${Date.now()}`,
                employeeEmail: 'invalid-email'
            };

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Invalid Phone
    // ========================================================

    test(
        '@regression POST - Invalid Egyptian phone number',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: `EMP-INVALID-PHONE-${Date.now()}`,
                phoneNumber: '123456'
            };

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Missing Required Field
    // ========================================================

    test(
        '@regression POST - Missing employeeName',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: `EMP-MISSING-NAME-${Date.now()}`
            };

            delete invalidEmployee.employeeName;

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Invalid Department
    // ========================================================

    test(
        '@regression POST - Invalid department',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: `EMP-INVALID-DEPT-${Date.now()}`,
                department: 'Accounting'
            };

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Invalid Date
    // ========================================================

    test(
        '@regression POST - Invalid join date',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: `EMP-INVALID-DATE-${Date.now()}`,
                joinDate: '2026-99-99'
            };

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // PUT - Update Existing Employee
    // ========================================================

    test(
        '@regression PUT - Update existing employee',
        async () => {

            const updatedEmployee = {
                ...employeeData,
                employeeName: 'Playwright Updated Employee',
                salary: 45000
            };

            const response = await apiClient.put(
                `/mona/v1/employees?id=${employeeId}`,
                {
                    data: updatedEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // PUT - Employee Not Found
    // ========================================================

    test(
        '@regression PUT - Update non-existing employee',
        async () => {

            const response = await apiClient.put(
                '/mona/v1/employees?id=EMP-DOES-NOT-EXIST',
                {
                    data: employeeData
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.status).toBe('error');

            expect(body.message).toBe('Employee not found');

        }
    );


    // ========================================================
    // PUT - Invalid Content-Type
    // ========================================================

    test(
        '@regression PUT - Invalid Content-Type',
        async () => {

            const response = await apiClient.put(
                `/mona/v1/employees?id=${employeeId}`,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    data: JSON.stringify(employeeData)
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // DELETE - Non-existing Employee
    // ========================================================

    test(
        '@regression DELETE - Non-existing employee',
        async () => {

            const response = await apiClient.delete(
                '/mona/v1/employees?id=EMP-DOES-NOT-EXIST'
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // DELETE - Existing Employee
    // ========================================================

    test(
        '@regression DELETE - Delete employee',
        async () => {

            const response = await apiClient.delete(
                `/mona/v1/employees?id=${employeeId}`
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // GET - Verify Deleted Employee
    // ========================================================

    test(
        '@regression GET - Verify deleted employee cannot be retrieved',
        async () => {

            const response = await apiClient.get(
                `/mona/v1/employees?id=${employeeId}`
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // Authentication - Missing Token
    // ========================================================

    test(
        '@regression AUTH - Missing Authorization header',
        async () => {

            const unauthenticatedClient = await request.newContext({
                baseURL: process.env.BASE_URL
            });

            const response = await unauthenticatedClient.get(
                '/mona/v1/employees?id=11'
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await expectJsonResponse(response);

            await unauthenticatedClient.dispose();

        }
    );


    // ========================================================
    // Authentication - Invalid Token
    // ========================================================

    test(
        '@regression AUTH - Invalid bearer token',
        async () => {

            const invalidTokenClient = await request.newContext({
                baseURL: process.env.BASE_URL,
                extraHTTPHeaders: {
                    Authorization: 'Bearer invalid-token-123456'
                }
            });

            const response = await invalidTokenClient.get(
                '/mona/v1/employees?id=11'
            );

            await logResponse(response);

            /*
             * Expected result is 401.
             *
             * If you receive 429, Apigee rate limiting
             * is being triggered before OAuth validation.
             */
            expect(response.status()).toBe(401);

            await expectJsonResponse(response);

            await invalidTokenClient.dispose();

        }
    );


    // ========================================================
    // Invalid HTTP Method
    // ========================================================

    test(
        '@regression METHOD - Unsupported HTTP method',
        async () => {

            const response = await apiClient.patch(
                '/mona/v1/employees?id=11',
                {
                    data: employeeData
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    // ========================================================
    // Invalid Endpoint
    // ========================================================

    test(
        '@regression PATH - Invalid endpoint should return 404',
        async () => {

            const response = await apiClient.get(
                '/mona/v1/invalid-endpoint'
            );

            await logResponse(response);

            expect(response.status()).toBe(404);

        }
    );


    // ========================================================
    // Business Validation - Negative Salary
    // ========================================================

    test(
        '@regression BUSINESS - Negative salary',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: `EMP-NEGATIVE-SALARY-${Date.now()}`,
                salary: -1000
            };

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // Business Validation - Invalid Remote Flag
    // ========================================================

    test(
        '@regression BUSINESS - Invalid isRemote value',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: `EMP-INVALID-REMOTE-${Date.now()}`,
                isRemote: 'yes'
            };

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // BUSINESS VALIDATION - Invalid Employee ID
    // ========================================================

    test(
        '@regression BUSINESS - Invalid employee ID format',
        async () => {

            const invalidEmployee = {
                ...employeeData,
                employeeId: '123'
            };

            const response = await apiClient.post(
                '/mona/v1/employees',
                {
                    data: invalidEmployee
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(400);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // TOKEN ENDPOINT - /mona/generate-bearer-token/v1
    // ========================================================

    test(
        '@regression TOKEN - Generate token with valid credentials',
        async () => {

            const client = await createAnonymousClient();

            const response = await requestToken(
                client,
                {
                    client_id: process.env.CLIENT_ID,
                    client_secret: process.env.CLIENT_SECRET,
                    grant_type: 'client_credentials'
                }
            );

            console.log('Status:', response.status());

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

            const body = await response.json();

            expect(body.access_token).toBeDefined();

            await client.dispose();

        }
    );


    test(
        '@regression TOKEN - Generated token can call the Employee API',
        async () => {

            const tokenClient = await createAnonymousClient();

            const tokenResponse = await requestToken(
                tokenClient,
                {
                    client_id: process.env.CLIENT_ID,
                    client_secret: process.env.CLIENT_SECRET,
                    grant_type: 'client_credentials'
                }
            );

            const { access_token } = await tokenResponse.json();

            const client = await createAnonymousClient({
                Authorization: `Bearer ${access_token}`
            });

            const response = await client.get(
                '/mona/v1/employees?id=11'
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await tokenClient.dispose();
            await client.dispose();

        }
    );


    /*
     * Negative token requests. An OAuth server answers a bad request with
     * 400 (invalid_request / unsupported_grant_type) or 401 (invalid_client),
     * so both are accepted. Tighten these once you know your policy's codes.
     */
    const invalidTokenRequests = [
        {
            name: 'wrong client secret',
            form: () => ({
                client_id: process.env.CLIENT_ID,
                client_secret: 'wrong-secret',
                grant_type: 'client_credentials'
            })
        },
        {
            name: 'wrong client id',
            form: () => ({
                client_id: 'wrong-client-id',
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        },
        {
            name: 'missing client id',
            form: () => ({
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        },
        {
            name: 'missing client secret',
            form: () => ({
                client_id: process.env.CLIENT_ID,
                grant_type: 'client_credentials'
            })
        },
        {
            name: 'missing grant_type',
            form: () => ({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET
            })
        },
        {
            name: 'unsupported grant_type (password)',
            form: () => ({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'password'
            })
        },
        {
            name: 'empty body',
            form: () => ({})
        }
    ];

    for (const invalidRequest of invalidTokenRequests) {

        test(
            `@regression TOKEN - Rejected: ${invalidRequest.name}`,
            async () => {

                const client = await createAnonymousClient();

                const response = await requestToken(client, invalidRequest.form());

                await logResponse(response);

                expect([400, 401]).toContain(response.status());

                await expectJsonResponse(response);

                const body = await response.json();

                expect(body.access_token).toBeUndefined();

                await client.dispose();

            }
        );

    }


    test(
        '@regression TOKEN - GET on the token endpoint is not allowed',
        async () => {

            const client = await createAnonymousClient();

            const response = await client.get(TOKEN_PATH);

            await logResponse(response);

            expect([404, 405]).toContain(response.status());

            await client.dispose();

        }
    );


    // ========================================================
    // AUTHENTICATION - POST / PUT / DELETE (not only GET)
    // ========================================================

    const protectedCalls = [
        {
            name: 'POST',
            call: (client) => client.post('/mona/v1/employees', { data: employeeData })
        },
        {
            name: 'PUT',
            call: (client) => client.put('/mona/v1/employees?id=11', { data: employeeData })
        },
        {
            name: 'DELETE',
            call: (client) => client.delete('/mona/v1/employees?id=12')
        }
    ];

    for (const protectedCall of protectedCalls) {

        test(
            `@regression AUTH - ${protectedCall.name} without Authorization header`,
            async () => {

                const client = await createAnonymousClient();

                const response = await protectedCall.call(client);

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await client.dispose();

            }
        );

        test(
            `@regression AUTH - ${protectedCall.name} with invalid bearer token`,
            async () => {

                const client = await createAnonymousClient({
                    Authorization: 'Bearer invalid-token-123456'
                });

                const response = await protectedCall.call(client);

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await client.dispose();

            }
        );

    }


    test(
        '@regression AUTH - Basic scheme instead of Bearer',
        async () => {

            const client = await createAnonymousClient({
                Authorization: 'Basic YWJjOjEyMw=='
            });

            const response = await client.get(
                '/mona/v1/employees?id=11'
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await client.dispose();

        }
    );


    test(
        '@regression AUTH - Empty bearer token',
        async () => {

            const client = await createAnonymousClient({
                Authorization: 'Bearer '
            });

            const response = await client.get(
                '/mona/v1/employees?id=11'
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await client.dispose();

        }
    );


});