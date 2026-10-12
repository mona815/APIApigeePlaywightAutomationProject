import { test, expect } from '@playwright/test';
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

            const unauthenticatedClient = await test.request.newContext({
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

            const invalidTokenClient = await test.request.newContext({
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

});