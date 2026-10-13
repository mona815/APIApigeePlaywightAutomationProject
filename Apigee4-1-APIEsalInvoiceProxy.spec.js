import { test, expect, request } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createApiClient } from '../api-client.js';


// ============================================================
// Test Data
// ============================================================

const BASE_PATH = process.env.ESAL_BASE_PATH || '/MH-v1/esal';

const UPLOAD_PATH = `${BASE_PATH}/uploadInvoices`;

const CANCEL_PATH = `${BASE_PATH}/invoice/cancel`;

const SEARCH_PATH = `${BASE_PATH}/invoice/search`;

const STATISTICS_PATH = `${BASE_PATH}/invoice/statistics`;

const SUPPLIER_ID = process.env.ESAL_SUPPLIER_ID || '11804';

// Every endpoint of the proxy (all of them are POST only)
const endpoints = [
    { name: '/uploadInvoices',    path: UPLOAD_PATH },
    { name: '/invoice/cancel',    path: CANCEL_PATH },
    { name: '/invoice/search',    path: SEARCH_PATH },
    { name: '/invoice/statistics', path: STATISTICS_PATH }
];

// Values created at runtime and shared between tests
const state = {
    invoiceNumber: ''
};


// ============================================================
// Payload Builders
// ============================================================

function dateOffset(days = 0) {

    const date = new Date();

    date.setDate(date.getDate() + days);

    return date.toISOString().slice(0, 10);
}


function newInvoiceNumber() {

    return `GAZT_${randomUUID()}`;
}


function buildLineItem(overrides = {}) {

    return {
        serialNumber: 1,
        code: 79237648,
        descriptionEnglish: 'iron machinery',
        descriptionArabic: 'آلات حديدية',
        uomArabic: 'ع',
        uomignnglish: 'Nos',          // key exactly as used in the Postman collection
        price: 100,
        quantity: 1,
        amount: 100,
        foreignPrice: 50,
        discountPercent: 0,
        discountAmount: 0,
        amountAfterDiscount: 100,
        vatPercent: '0',
        totalVat: 0,
        priceAfterVat: 100,
        ...overrides
    };
}


function buildInvoice(overrides = {}) {

    const today = dateOffset(0);

    return {
        invoiceType: 'I',
        invoiceNumber: newInvoiceNumber(),
        invoiceIssueDate: today,
        invoiceReference: '',
        dueDate: today,
        dateOfDelivery: today,
        currency: 'SAR',
        foreignCurrency: 'USD',
        selfAccountForTax: false,
        totalBeforeVAT: 100,
        totalVAT: '0',
        grandTotal: 100,
        advanceAmount: 0,
        outstandingAmount: 100,
        remarksArabic: 'هذه الفاتورة متعلقة بعقد صادر في 20 يوليو 2016',
        remarksEnglish: 'This invoice relates to contract issued on 20 july 2016',
        narrationArabic: 'هذا هو السرد العربي',
        narrationEnglish: 'This is English Narration',
        milestonePayments: false,
        percentOfCompletion: null,
        profitMargin: {
            applied: false,
            procedureArabic: '',
            procedureEnglish: ''
        },
        customer: {
            code: 'GAZT123',
            nameArabic: 'مشتري',
            nameEnglish: 'Nandini Buyer',
            addressArabic1: 'عنوان المشتري',
            addressArabic2: 'الرياض',
            addressEnglish1: 'address buyer uam',
            addressEnglish2: 'Riyadh',
            vatRegisterationNumber: '5432670987',
            branch: 'Riyadh',
            email: 'nandini@buyer.com',
            contactNo: '+966156765677',
            regionEnglish: 'Eastern Province',
            regionArabic: 'المنطقة الشرقية',
            cityEnglish: 'Riyadh',
            cityArabic: 'الرياض',
            localityEnglish: 'Riyadh',
            localityArabic: 'الرياض',
            branchArabic: 'الرياض',
            plantEnglish: 'Riyadh',
            plantArabic: 'الرياض',
            segmentEnglish: 'Midsize',
            segmentArabic: 'متوسط',
            divisionEnglish: 'STC mobile',
            divisionArabic: 'قسم',
            prodLineEnglish: 'Health Insurance',
            prodLineArabic: 'تأمين'
        },
        supplier: {
            id: SUPPLIER_ID,
            bankSwiftCode: 'BK12334345',
            regionEnglish: 'Riyadh',
            regionArabic: 'الرياض',
            cityEnglish: 'Riyadh',
            cityArabic: 'الرياض',
            localityEnglish: 'Riyadh',
            localityArabic: 'الرياض',
            branchEnglish: 'Riyadh',
            branchArabic: 'الرياض',
            plantEnglish: 'Riyadh',
            plantArabic: 'الرياض',
            iban: 'DEC123',
            nameArabic: 'مورد',
            nameEnglish: 'Gazt supplier',
            addressArabic1: 'Eco space',
            addressArabic2: 'Eco space',
            addressEnglish1: 'Test',
            addressEnglish2: 'Test',
            vatRegisterationNumber: '',
            email: 'nandini@supplier.com',
            contactNo: ''
        },
        lineItems: [buildLineItem()],
        shipmentRefNumber: 'DL23GGG67',
        salespersonEnglish: 'Aman',
        salespersonArabic: 'أمان',
        ...overrides
    };
}


function buildUploadPayload(invoiceOverrides = {}, topLevelOverrides = {}) {

    return {
        id: `Test_API_${Date.now()}`,
        supplierId: SUPPLIER_ID,
        invoices: [buildInvoice(invoiceOverrides)],
        ...topLevelOverrides
    };
}


// Invoice with 15% VAT: 100 + 15 = 115
const vat15 = {
    totalBeforeVAT: 100,
    totalVAT: '15',
    grandTotal: 115,
    outstandingAmount: 115,
    lineItems: [
        buildLineItem({
            vatPercent: '15',
            totalVat: 15,
            priceAfterVat: 115
        })
    ]
};


function buildSearchPayload(overrides = {}) {

    return {
        pagination: {
            page: 1,
            limit: 10
        },
        supplierId: SUPPLIER_ID,
        filters: {
            dateFilter: {
                fromDate: `${dateOffset(-30)}T00:00:00.000Z`,
                toDate: `${dateOffset(1)}T00:00:00.000Z`
            },
            statusFilter: ['ALL'],
            typeFilter: ['ALL']
        },
        ...overrides
    };
}


/*
 * NOTE: the Postman collection has no "statistics" request, so this
 * body is an assumption. Adjust it to the real ESAL contract.
 */
function buildStatisticsPayload(overrides = {}) {

    return {
        supplierId: SUPPLIER_ID,
        filters: {
            dateFilter: {
                fromDate: `${dateOffset(-30)}T00:00:00.000Z`,
                toDate: `${dateOffset(1)}T00:00:00.000Z`
            }
        },
        ...overrides
    };
}


function buildCancelPayload(invoiceNumbers, overrides = {}) {

    return {
        invoices: invoiceNumbers.map(invoiceNumber => ({ invoiceNumber })),
        supplierId: SUPPLIER_ID,
        ...overrides
    };
}


// Deep copy, apply a change and return the payload
function mutated(payload, mutate) {

    const copy = structuredClone(payload);

    mutate(copy);

    return copy;
}


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


/*
 * A request is considered REJECTED when:
 *   - the status is 4xx, OR
 *   - the status is 2xx but the body reports an error
 *     (the Postman collection shows ESAL answers some business
 *      validation failures with 200 and an error in the body).
 * A 5xx is always a failure.
 *
 * Tune this single function once you know the real ESAL error format.
 */
async function expectRejected(response) {

    expect(response.status()).toBeLessThan(500);

    if (response.status() >= 400) {
        return;
    }

    const text = (await response.text())
        .toLowerCase()
        .replace(/"errors?"\s*:\s*(\[\s*\]|null|"")/g, '');

    expect(text).toMatch(/error|fail|invalid|reject|mandatory|required|not valid/);
}


async function expectAccepted(response) {

    expect([200, 201, 202]).toContain(response.status());

    await expectJsonResponse(response);
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

test.describe('ESAL Invoice API Proxy (MH-v1/esal) - Regression Tests', () => {

    // upload -> search -> statistics -> cancel share the uploaded invoice
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
    // POST - Upload Invoice
    // ========================================================

    test(
        '@regression POST - Upload invoice (type I)',
        async () => {

            const payload = buildUploadPayload();

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    data: payload
                }
            );

            await logResponse(response);

            await expectAccepted(response);

            state.invoiceNumber = payload.invoices[0].invoiceNumber;

        }
    );


    // ========================================================
    // POST - Upload Invoice With 15% VAT
    // ========================================================

    test(
        '@regression POST - Upload invoice with 15% VAT',
        async () => {

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    data: buildUploadPayload(vat15)
                }
            );

            await logResponse(response);

            await expectAccepted(response);

        }
    );


    // ========================================================
    // POST - Upload Invoice With Multiple Line Items
    // ========================================================

    test(
        '@regression POST - Upload invoice with multiple line items',
        async () => {

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    data: buildUploadPayload({
                        totalBeforeVAT: 200,
                        grandTotal: 200,
                        outstandingAmount: 200,
                        lineItems: [
                            buildLineItem({ serialNumber: 1 }),
                            buildLineItem({ serialNumber: 2, code: 79237649 })
                        ]
                    })
                }
            );

            await logResponse(response);

            await expectAccepted(response);

        }
    );


    // ========================================================
    // POST - Upload Credit Note / Proforma / Debit Note
    // ========================================================

    const documentTypes = [
        { name: 'Credit note (C)',  type: 'C', needsReference: false },
        { name: 'Proforma (P)',     type: 'P', needsReference: false },
        { name: 'Debit note (D)',   type: 'D', needsReference: true  }
    ];

    for (const doc of documentTypes) {

        test(
            `@regression POST - Upload ${doc.name}`,
            async () => {

                test.skip(
                    doc.needsReference && !state.invoiceNumber,
                    'No reference invoice (upload invoice must pass first)'
                );

                const response = await apiClient.post(
                    UPLOAD_PATH,
                    {
                        data: buildUploadPayload({
                            ...vat15,
                            invoiceType: doc.type,
                            invoiceReference: doc.needsReference ? state.invoiceNumber : ''
                        })
                    }
                );

                await logResponse(response);

                await expectAccepted(response);

            }
        );

    }


    // ========================================================
    // POST - Upload Duplicate Invoice Number
    // ========================================================

    test(
        '@regression POST - Upload invoice with duplicate invoice number',
        async () => {

            test.skip(!state.invoiceNumber, 'No invoice (upload invoice must pass first)');

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    data: buildUploadPayload({
                        invoiceNumber: state.invoiceNumber
                    })
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // ========================================================
    // POST - Upload Validation (data driven)
    // ========================================================

    const uploadValidationCases = [

        // ---- Top level
        { name: 'missing supplierId',          mutate: p => delete p.supplierId },
        { name: 'empty supplierId',            mutate: p => { p.supplierId = ''; } },
        { name: 'supplierId of another supplier', mutate: p => { p.supplierId = '99999999'; } },
        { name: 'missing invoices',            mutate: p => delete p.invoices },
        { name: 'empty invoices array',        mutate: p => { p.invoices = []; } },
        { name: 'invoices is not an array',    mutate: p => { p.invoices = 'not-an-array'; } },
        { name: 'invoices contains null',      mutate: p => { p.invoices = [null]; } },

        // ---- Header fields
        { name: 'invalid invoiceType',         mutate: p => { p.invoices[0].invoiceType = 'X'; } },
        { name: 'missing invoiceType',         mutate: p => delete p.invoices[0].invoiceType },
        { name: 'missing invoiceNumber',       mutate: p => delete p.invoices[0].invoiceNumber },
        { name: 'empty invoiceNumber',         mutate: p => { p.invoices[0].invoiceNumber = ''; } },
        { name: 'invoiceNumber too long',      mutate: p => { p.invoices[0].invoiceNumber = 'A'.repeat(500); } },
        { name: 'missing invoiceIssueDate',    mutate: p => delete p.invoices[0].invoiceIssueDate },
        { name: 'invalid invoiceIssueDate',    mutate: p => { p.invoices[0].invoiceIssueDate = 'not-a-date'; } },
        { name: 'wrong date format (DD/MM/YYYY)', mutate: p => { p.invoices[0].invoiceIssueDate = '31/12/2024'; } },
        { name: 'dueDate before issue date',   mutate: p => { p.invoices[0].dueDate = '2000-01-01'; } },
        { name: 'invalid currency',            mutate: p => { p.invoices[0].currency = 'XXX'; } },
        { name: 'missing currency',            mutate: p => delete p.invoices[0].currency },

        // ---- Amounts
        { name: 'negative grandTotal',         mutate: p => { p.invoices[0].grandTotal = -100; } },
        { name: 'grandTotal is text',          mutate: p => { p.invoices[0].grandTotal = 'abc'; } },
        { name: 'grandTotal does not match totals', mutate: p => { p.invoices[0].grandTotal = 999999; } },
        { name: 'missing totalBeforeVAT',      mutate: p => delete p.invoices[0].totalBeforeVAT },
        { name: 'VAT does not match vat percent', mutate: p => {
            p.invoices[0].totalVAT = '99';
            p.invoices[0].lineItems[0].vatPercent = '15';
        } },
        { name: 'outstandingAmount greater than grandTotal', mutate: p => { p.invoices[0].outstandingAmount = 1000000; } },

        // ---- Parties
        { name: 'missing customer',            mutate: p => delete p.invoices[0].customer },
        { name: 'missing customer code',       mutate: p => delete p.invoices[0].customer.code },
        { name: 'invalid customer email',      mutate: p => { p.invoices[0].customer.email = 'not-an-email'; } },
        { name: 'missing supplier',            mutate: p => delete p.invoices[0].supplier },

        // ---- Line items
        { name: 'missing lineItems',           mutate: p => delete p.invoices[0].lineItems },
        { name: 'empty lineItems',             mutate: p => { p.invoices[0].lineItems = []; } },
        { name: 'negative line quantity',      mutate: p => { p.invoices[0].lineItems[0].quantity = -1; } },
        { name: 'zero line quantity',          mutate: p => { p.invoices[0].lineItems[0].quantity = 0; } },
        { name: 'line price is text',          mutate: p => { p.invoices[0].lineItems[0].price = 'abc'; } },
        { name: 'line amount does not match price x quantity', mutate: p => { p.invoices[0].lineItems[0].amount = 5555; } },

        // ---- Credit / Debit notes
        { name: 'debit note with unknown referenced invoice', mutate: p => {
            p.invoices[0].invoiceType = 'D';
            p.invoices[0].invoiceReference = 'GAZT_DOES_NOT_EXIST_000';
        } }
    ];

    for (const validationCase of uploadValidationCases) {

        test(
            `@regression @validation POST - Upload invoice rejected: ${validationCase.name}`,
            async () => {

                const payload = mutated(buildUploadPayload(), validationCase.mutate);

                const response = await apiClient.post(
                    UPLOAD_PATH,
                    {
                        data: payload
                    }
                );

                await logResponse(response);

                await expectRejected(response);

            }
        );

    }


    // ========================================================
    // POST - Upload Malformed Bodies
    // ========================================================

    test(
        '@regression @validation POST - Upload with malformed JSON',
        async () => {

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: '{"supplierId": "11804", "invoices": ['
                }
            );

            await logResponse(response);

            await expectClientError(response);

        }
    );


    test(
        '@regression @validation POST - Upload with empty JSON object',
        async () => {

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    data: {}
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    test(
        '@regression @validation POST - Upload with JSON array instead of object',
        async () => {

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    data: []
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // ========================================================
    // POST - Search Invoices
    // ========================================================

    test(
        '@regression POST - Search invoices',
        async () => {

            const response = await apiClient.post(
                SEARCH_PATH,
                {
                    data: buildSearchPayload()
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

        }
    );


    test(
        '@regression POST - Search invoices by type and status',
        async () => {

            const response = await apiClient.post(
                SEARCH_PATH,
                {
                    data: buildSearchPayload({
                        filters: {
                            dateFilter: {
                                fromDate: `${dateOffset(-30)}T00:00:00.000Z`,
                                toDate: `${dateOffset(1)}T00:00:00.000Z`
                            },
                            statusFilter: ['ALL'],
                            typeFilter: ['I']
                        }
                    })
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Search Validation (data driven)
    // ========================================================

    const searchValidationCases = [
        { name: 'missing supplierId',      mutate: p => delete p.supplierId },
        { name: 'supplierId of another supplier', mutate: p => { p.supplierId = '99999999'; } },
        { name: 'missing pagination',      mutate: p => delete p.pagination },
        { name: 'page is zero',            mutate: p => { p.pagination.page = 0; } },
        { name: 'negative page',           mutate: p => { p.pagination.page = -1; } },
        { name: 'limit is zero',           mutate: p => { p.pagination.limit = 0; } },
        { name: 'negative limit',          mutate: p => { p.pagination.limit = -5; } },
        { name: 'limit is text',           mutate: p => { p.pagination.limit = 'ten'; } },
        { name: 'limit too large',         mutate: p => { p.pagination.limit = 1000000; } },
        { name: 'invalid fromDate',        mutate: p => { p.filters.dateFilter.fromDate = 'not-a-date'; } },
        { name: 'fromDate after toDate',   mutate: p => {
            p.filters.dateFilter.fromDate = `${dateOffset(10)}T00:00:00.000Z`;
            p.filters.dateFilter.toDate = `${dateOffset(-10)}T00:00:00.000Z`;
        } },
        { name: 'invalid statusFilter value', mutate: p => { p.filters.statusFilter = ['NOT_A_STATUS']; } },
        { name: 'invalid typeFilter value',   mutate: p => { p.filters.typeFilter = ['Z']; } },
        { name: 'statusFilter is not an array', mutate: p => { p.filters.statusFilter = 'ALL'; } }
    ];

    for (const validationCase of searchValidationCases) {

        test(
            `@regression @validation POST - Search rejected: ${validationCase.name}`,
            async () => {

                const response = await apiClient.post(
                    SEARCH_PATH,
                    {
                        data: mutated(buildSearchPayload(), validationCase.mutate)
                    }
                );

                await logResponse(response);

                await expectRejected(response);

            }
        );

    }


    test(
        '@regression @validation POST - Search with empty JSON object',
        async () => {

            const response = await apiClient.post(
                SEARCH_PATH,
                {
                    data: {}
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // ========================================================
    // POST - Invoice Statistics
    // ========================================================

    test(
        '@regression POST - Invoice statistics',
        async () => {

            const response = await apiClient.post(
                STATISTICS_PATH,
                {
                    data: buildStatisticsPayload()
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

        }
    );


    const statisticsValidationCases = [
        { name: 'missing supplierId',   mutate: p => delete p.supplierId },
        { name: 'supplierId of another supplier', mutate: p => { p.supplierId = '99999999'; } },
        { name: 'invalid fromDate',     mutate: p => { p.filters.dateFilter.fromDate = 'not-a-date'; } },
        { name: 'fromDate after toDate', mutate: p => {
            p.filters.dateFilter.fromDate = `${dateOffset(10)}T00:00:00.000Z`;
            p.filters.dateFilter.toDate = `${dateOffset(-10)}T00:00:00.000Z`;
        } }
    ];

    for (const validationCase of statisticsValidationCases) {

        test(
            `@regression @validation POST - Statistics rejected: ${validationCase.name}`,
            async () => {

                const response = await apiClient.post(
                    STATISTICS_PATH,
                    {
                        data: mutated(buildStatisticsPayload(), validationCase.mutate)
                    }
                );

                await logResponse(response);

                await expectRejected(response);

            }
        );

    }


    test(
        '@regression @validation POST - Statistics with empty JSON object',
        async () => {

            const response = await apiClient.post(
                STATISTICS_PATH,
                {
                    data: {}
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // ========================================================
    // POST - Cancel Invoice
    // ========================================================

    test(
        '@regression POST - Cancel invoice',
        async () => {

            test.skip(!state.invoiceNumber, 'No invoice (upload invoice must pass first)');

            const response = await apiClient.post(
                CANCEL_PATH,
                {
                    data: buildCancelPayload([state.invoiceNumber])
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(200);

            await expectJsonResponse(response);

        }
    );


    // ========================================================
    // POST - Cancel Invoice Again (already cancelled)
    // ========================================================

    test(
        '@regression @validation POST - Cancel invoice that is already cancelled',
        async () => {

            test.skip(!state.invoiceNumber, 'No invoice (upload invoice must pass first)');

            const response = await apiClient.post(
                CANCEL_PATH,
                {
                    data: buildCancelPayload([state.invoiceNumber])
                }
            );

            await logResponse(response);

            await expectRejected(response);

        }
    );


    // ========================================================
    // POST - Cancel Validation (data driven)
    // ========================================================

    const cancelValidationCases = [
        { name: 'invoice number does not exist',
          payload: () => buildCancelPayload(['GAZT_DOES_NOT_EXIST_000']) },
        { name: 'missing supplierId',
          payload: () => mutated(buildCancelPayload(['GAZT_X']), p => delete p.supplierId) },
        { name: 'supplierId of another supplier',
          payload: () => buildCancelPayload(['GAZT_X'], { supplierId: '99999999' }) },
        { name: 'missing invoices',
          payload: () => mutated(buildCancelPayload(['GAZT_X']), p => delete p.invoices) },
        { name: 'empty invoices array',
          payload: () => buildCancelPayload([]) },
        { name: 'invoices is not an array',
          payload: () => ({ invoices: 'GAZT_X', supplierId: SUPPLIER_ID }) },
        { name: 'invoice without invoiceNumber',
          payload: () => ({ invoices: [{}], supplierId: SUPPLIER_ID }) },
        { name: 'empty invoiceNumber',
          payload: () => buildCancelPayload(['']) },
        { name: 'empty JSON object',
          payload: () => ({}) }
    ];

    for (const validationCase of cancelValidationCases) {

        test(
            `@regression @validation POST - Cancel rejected: ${validationCase.name}`,
            async () => {

                const response = await apiClient.post(
                    CANCEL_PATH,
                    {
                        data: validationCase.payload()
                    }
                );

                await logResponse(response);

                await expectRejected(response);

            }
        );

    }


    // ========================================================
    // GATEWAY - Invalid Content-Type (RF-InvalidMediaType)
    // ========================================================

    for (const endpoint of endpoints) {

        for (const contentType of ['text/plain', 'application/xml']) {

            test(
                `@regression @gateway POST ${endpoint.name} with ${contentType} returns 415`,
                async () => {

                    const response = await apiClient.post(
                        endpoint.path,
                        {
                            headers: {
                                'Content-Type': contentType
                            },
                            data: 'invalid data'
                        }
                    );

                    await logResponse(response);

                    expect(response.status()).toBe(415);

                    await expectJsonResponse(response);

                }
            );

        }

    }


    test(
        '@regression @gateway POST /uploadInvoices with form-urlencoded returns 415',
        async () => {

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: 'supplierId=11804'
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    /*
     * The policy condition is: content-type != "application/json"
     * which is an EXACT comparison, so "application/json; charset=utf-8"
     * is rejected too. This test documents that behaviour.
     * Remove it if you change the condition to a "starts with" match.
     */
    test(
        '@regression @gateway POST /uploadInvoices with "application/json; charset=utf-8" returns 415',
        async () => {

            const response = await apiClient.post(
                UPLOAD_PATH,
                {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    data: JSON.stringify(buildUploadPayload())
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(415);

        }
    );


    // ========================================================
    // GATEWAY - Method Not Allowed (RF-MethodNotAllowed)
    // Every endpoint accepts POST only
    // ========================================================

    for (const endpoint of endpoints) {

        for (const method of ['get', 'put', 'delete', 'patch']) {

            test(
                `@regression @gateway METHOD - ${method.toUpperCase()} ${endpoint.name} is not allowed`,
                async () => {

                    const response = await apiClient[method](
                        endpoint.path,
                        method === 'get' || method === 'delete'
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
        '@regression @gateway PRECEDENCE - GET with text/plain returns 405 (method check before content-type)',
        async () => {

            const response = await apiClient.get(
                SEARCH_PATH,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    }
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PRECEDENCE - PUT with text/plain returns 405 (method check before content-type)',
        async () => {

            const response = await apiClient.put(
                UPLOAD_PATH,
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


    // ========================================================
    // GATEWAY - Unknown Paths (RF-NotFound)
    // ========================================================

    const invalidPaths = [
        '/invalid-endpoint',
        '/invoice',
        '/invoice/unknown',
        '/invoice/search/123',
        '/uploadInvoices/123',
        '/uploadAttachment',
        '/payment',
        '/paymentStatus'
    ];

    for (const path of invalidPaths) {

        test(
            `@regression @gateway PATH - POST ${path} should return 404`,
            async () => {

                const response = await apiClient.post(
                    `${BASE_PATH}${path}`,
                    {
                        data: {}
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(404);

                await expectJsonResponse(response);

            }
        );

    }


    test(
        '@regression @gateway PATH - GET on unknown path returns 405 (method check runs first)',
        async () => {

            const response = await apiClient.get(
                `${BASE_PATH}/invalid-endpoint`
            );

            await logResponse(response);

            expect(response.status()).toBe(405);

        }
    );


    test(
        '@regression @gateway PATH - POST text/plain on unknown path returns 415 (content-type check runs first)',
        async () => {

            const response = await apiClient.post(
                `${BASE_PATH}/invalid-endpoint`,
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
    // AUTHENTICATION (OA2-VerifyToken)
    // ========================================================

    for (const endpoint of endpoints) {

        test(
            `@regression @auth AUTH - POST ${endpoint.name} without Authorization header`,
            async () => {

                const unauthenticatedClient = await createClientWithHeaders({
                    'Content-Type': 'application/json'
                });

                const response = await unauthenticatedClient.post(
                    endpoint.path,
                    {
                        data: {}
                    }
                );

                await logResponse(response);

                expect(response.status()).toBe(401);

                await expectJsonResponse(response);

                await unauthenticatedClient.dispose();

            }
        );

        test(
            `@regression @auth AUTH - POST ${endpoint.name} with invalid bearer token`,
            async () => {

                const invalidTokenClient = await createClientWithHeaders({
                    Authorization: 'Bearer invalid-token-123456',
                    'Content-Type': 'application/json'
                });

                const response = await invalidTokenClient.post(
                    endpoint.path,
                    {
                        data: {}
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

    }


    test(
        '@regression @auth AUTH - Basic scheme instead of Bearer',
        async () => {

            const basicAuthClient = await createClientWithHeaders({
                Authorization: 'Basic YWJjOjEyMw==',
                'Content-Type': 'application/json'
            });

            const response = await basicAuthClient.post(
                UPLOAD_PATH,
                {
                    data: {}
                }
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
                UPLOAD_PATH,
                {
                    data: {}
                }
            );

            await logResponse(response);

            expect(response.status()).toBe(401);

            await emptyTokenClient.dispose();

        }
    );


    test(
        '@regression @auth PRECEDENCE - No token with GET returns 401 (not 405)',
        async () => {

            const unauthenticatedClient = await createClientWithHeaders({});

            const response = await unauthenticatedClient.get(
                UPLOAD_PATH
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
                UPLOAD_PATH,
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
    // Response Time (proxy-only response, no target call)
    // ========================================================

    test(
        '@regression PERFORMANCE - 405 response within 3 seconds',
        async () => {

            const start = Date.now();

            const response = await apiClient.get(SEARCH_PATH);

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

            // GET is answered by the proxy (405) so no invoice is created
            const responses = await Promise.all(
                Array.from({ length: 50 }, () =>
                    apiClient.get(SEARCH_PATH)
                )
            );

            const statuses = responses.map(r => r.status());

            console.log('Statuses:', statuses.join(','));

            expect(statuses).toContain(429);

        }
    );

});