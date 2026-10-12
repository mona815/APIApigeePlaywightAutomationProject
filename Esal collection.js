// ============================================================
// ESAL API services PreProd Automation Collection
// Generated from the Postman collection - one entry per request,
// in the original order. Secrets / tokens are NOT stored here:
//   {{variables}} are resolved at runtime from ESAL_<name> in .env,
//   tokens come from the login requests, invoice numbers are generated.
// ============================================================

export const collection = [

    //  1. INT3DP_Login_Gazt_11804
    {
        n: 1,
        name: "INT3DP_Login_Gazt_11804",
        method: "POST",
        path: "/esal/api/cas/login",
        section: 1,
        login: true,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: "cas",
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"username": "{{gaztsupplierusername}}", "password": "{{gaztsupplierpassword}}"}, "contentType": "application/json"}
    },

    //  2. 1.UploadInvoice_Gazt_Invoice(M)
    {
        n: 2,
        name: "1.UploadInvoice_Gazt_Invoice(M)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "0", "grandTotal": 100, "advanceAmount": 0, "outstandingAmount": 100, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "0", "totalVat": 0, "priceAfterVat": 100}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    //  3. 1.UploadInvoice_Gazt_Invoice(M) Copy
    {
        n: 3,
        name: "1.UploadInvoice_Gazt_Invoice(M) Copy",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 300, "totalVAT": "0", "grandTotal": 100, "advanceAmount": 0, "outstandingAmount": 100, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": -100, "quantity": 1, "amount": -100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": -100, "vatPercent": "0", "totalVat": 0, "priceAfterVat": -100}, {"serialNumber": 2, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "0", "totalVat": 0, "priceAfterVat": 100}, {"serialNumber": 3, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "0", "totalVat": 0, "priceAfterVat": 100}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    //  4. 2.UploadInvoice_Gazt_Invoice_15%VAT(M)
    {
        n: 4,
        name: "2.UploadInvoice_Gazt_Invoice_15%VAT(M)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    //  5. 3.UploadInvoice_Gazt_Credit(M)
    {
        n: 5,
        name: "3.UploadInvoice_Gazt_Credit(M)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "C", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    //  6. 4.UploadInvoice_Gazt_Proforma(M)
    {
        n: 6,
        name: "4.UploadInvoice_Gazt_Proforma(M)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "P", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123678", "nameArabic": "m Buyer", "nameEnglish": "m Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670989", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765667", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    //  7. 5.UploadInvoice_Gazt_Debit(M)
    {
        n: 7,
        name: "5.UploadInvoice_Gazt_Debit(M)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "D", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "GAZT_32ab5dbb-6b3b-4591-bd8f-1219cce4bad5", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    //  8. 6.UploadInvoice_Gazt_Invoice(NM)
    {
        n: 8,
        name: "6.UploadInvoice_Gazt_Invoice(NM)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123678", "nameArabic": "m Buyer", "nameEnglish": "m Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670989", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765667", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    //  9. 7.UploadInvoice_Gazt_Credit(NM)
    {
        n: 9,
        name: "7.UploadInvoice_Gazt_Credit(NM)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "C", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123678", "nameArabic": "m Buyer", "nameEnglish": "m Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670989", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765667", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 10. 8.UploadInvoice_Gazt_Proforma(NM)
    {
        n: 10,
        name: "8.UploadInvoice_Gazt_Proforma(NM)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "P", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 11. 9.UploadInvoice_Gazt_Debit(NM)
    {
        n: 11,
        name: "9.UploadInvoice_Gazt_Debit(NM)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 1,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "D", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "GAZT_75ccbe5c-161f-482d-acfd-17e7fc22167b", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123678", "nameArabic": "m Buyer", "nameEnglish": "m Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670989", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765667", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 12. Login_Sadad_11803
    {
        n: 12,
        name: "Login_Sadad_11803",
        method: "POST",
        path: "/esal/api/cas/login",
        section: 12,
        login: true,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: "cas",
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"username": "{{sadadsupplierusername}}", "password": "{{sadadsupplierpassword}}"}, "contentType": "application/json"}
    },

    // 13. 10.UploadInvoice_Sadad_Invoice(M)
    {
        n: 13,
        name: "10.UploadInvoice_Sadad_Invoice(M)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "SADAD123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 14. 11.UploadInvoice_Sadad_Credit(M)
    {
        n: 14,
        name: "11.UploadInvoice_Sadad_Credit(M)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "C", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "SADAD123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 15. 12.UploadInvoice_Sadad_Proforma(M)
    {
        n: 15,
        name: "12.UploadInvoice_Sadad_Proforma(M)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "P", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "SADAD123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 16. 13.UploadInvoice_Sadad_Debit(M)
    {
        n: 16,
        name: "13.UploadInvoice_Sadad_Debit(M)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "D", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "SADAD_8a5e3db9-4d82-49a0-8439-e54c0f21e99b", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "SADAD123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 17. 14.UploadInvoice_Sadad_Invoice(NM)
    {
        n: 17,
        name: "14.UploadInvoice_Sadad_Invoice(NM)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "NM123", "nameArabic": "Nandini nm Buyer", "nameEnglish": "Nandini nm Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765670", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 18. 15.UploadInvoice_Sadad_Credit(NM)
    {
        n: 18,
        name: "15.UploadInvoice_Sadad_Credit(NM)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "C", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "NM123", "nameArabic": "Nandini nm Buyer", "nameEnglish": "Nandini nm Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765670", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 19. 16.UploadInvoice_Sadad_Proforma(NM)
    {
        n: 19,
        name: "16.UploadInvoice_Sadad_Proforma(NM)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "P", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "NM123", "nameArabic": "Nandini nm Buyer", "nameEnglish": "Nandini nm Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765670", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 20. 17.UploadInvoice_Sadad_Debit(NM)
    {
        n: 20,
        name: "17.UploadInvoice_Sadad_Debit(NM)",
        method: "POST",
        path: "/esal/api/v1/uploadInvoices",
        section: 12,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "SADAD_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1995", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "D", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "SADAD_b4f48688-01f8-4df2-83c6-f0801c40f648", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "NM123", "nameArabic": "Nandini nm Buyer", "nameEnglish": "Nandini nm Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "nandini123@buyer.com", "contactNo": "+966156765670", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Sadad Supplier", "nameEnglish": "Sadad Supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "sadad@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 21. 18.Login_sync_11804
    {
        n: 21,
        name: "18.Login_sync_11804",
        method: "POST",
        path: "/esal/api/cas/login",
        section: 21,
        login: true,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: "cas",
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"username": "{{gaztsupplierusername}}", "password": "{{gaztsupplierpassword}}"}, "contentType": "application/json"}
    },

    // 22. 19.Sync_GAZT_Invoice
    {
        n: 22,
        name: "19.Sync_GAZT_Invoice",
        method: "POST",
        path: "/esal/api/v3/uploadInvoices",
        section: 21,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "1 invoice 80 fields Memeber", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "INR", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 5, "grandTotal": 105, "advanceAmount": 0, "outstandingAmount": 105, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "9924 Selby Ave. جيرسي سيتي ، نيو جيرسي", "addressArabic2": "جيرسي", "addressEnglish1": "9924 Selby Ave. Jersey City, NJ 07302", "addressEnglish2": "Jersey", "vatRegisterationNumber": 747383764263647, "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض"}, "supplier": {"id": "{{gaztsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "BK12334345", "iban": "DEC123"}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 45, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": 5, "totalVat": 5, "priceAfterVat": 105}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض"}]}, "contentType": "application/json"}
    },

    // 23. 20.Sync_GAZT_Proforma
    {
        n: 23,
        name: "20.Sync_GAZT_Proforma",
        method: "POST",
        path: "/esal/api/v3/uploadInvoices",
        section: 21,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "1 invoice 80 fields Memeber", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "P", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "INR", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 5, "grandTotal": 105, "advanceAmount": 0, "outstandingAmount": 105, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "9924 Selby Ave. جيرسي سيتي ، نيو جيرسي", "addressArabic2": "جيرسي", "addressEnglish1": "9924 Selby Ave. Jersey City, NJ 07302", "addressEnglish2": "Jersey", "vatRegisterationNumber": 747383764263647, "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض"}, "supplier": {"id": "{{gaztsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "BK12334345", "iban": "DEC123"}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 45, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": 5, "totalVat": 5, "priceAfterVat": 105}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض"}]}, "contentType": "application/json"}
    },

    // 24. 21.Sync_GAZT_Debit note(negative scenario)
    {
        n: 24,
        name: "21.Sync_GAZT_Debit note(negative scenario)",
        method: "POST",
        path: "/esal/api/v3/uploadInvoices",
        section: 21,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "1 invoice 80 fields Memeber", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "D", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "INR", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 5, "grandTotal": 105, "advanceAmount": 0, "outstandingAmount": 105, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "9924 Selby Ave. جيرسي سيتي ، نيو جيرسي", "addressArabic2": "جيرسي", "addressEnglish1": "9924 Selby Ave. Jersey City, NJ 07302", "addressEnglish2": "Jersey", "vatRegisterationNumber": 747383764263647, "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض"}, "supplier": {"id": "{{gaztsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "BK12334345", "iban": "DEC123"}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 45, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": 5, "totalVat": 5, "priceAfterVat": 105}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض"}]}, "contentType": "application/json"}
    },

    // 25. 22.Sync_GAZT_Credit note(negative scenario)
    {
        n: 25,
        name: "22.Sync_GAZT_Credit note(negative scenario)",
        method: "POST",
        path: "/esal/api/v3/uploadInvoices",
        section: 21,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "1 invoice 80 fields Memeber", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "C", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "INR", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 5, "grandTotal": 105, "advanceAmount": 0, "outstandingAmount": 105, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "9924 Selby Ave. جيرسي سيتي ، نيو جيرسي", "addressArabic2": "جيرسي", "addressEnglish1": "9924 Selby Ave. Jersey City, NJ 07302", "addressEnglish2": "Jersey", "vatRegisterationNumber": 747383764263647, "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض"}, "supplier": {"id": "{{gaztsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "BK12334345", "iban": "DEC123"}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 45, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": 5, "totalVat": 5, "priceAfterVat": 105}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض"}]}, "contentType": "application/json"}
    },

    // 26. 23.CasToken Check
    {
        n: 26,
        name: "23.CasToken Check",
        method: "POST",
        path: "/esal/api/cas-token/check",
        section: 21,
        login: false,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: null,
        waitMs: 15000,
        pre: {},
        headers: {},
        body: {"type": "text", "text": "token={{token}}", "contentType": "text/plain"}
    },

    // 27. 24.RefreshToken
    {
        n: 27,
        name: "24.RefreshToken",
        method: "POST",
        path: "/esal/api/cas/refreshToken",
        section: 21,
        login: false,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {"Authorization": "{{refreshtoken}}"},
        body: {"type": "none", "contentType": "application/json"}
    },

    // 28. Login_Fasah_696
    {
        n: 28,
        name: "Login_Fasah_696",
        method: "POST",
        path: "/esal/api/cas/login",
        section: 28,
        login: true,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: "cas",
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"username": "{{fasahsupplierusername}}", "password": "{{fasahsupplierpassword}}"}, "contentType": "application/json"}
    },

    // 29. 25.FASAH Invoice SS1-697(csvgazt)
    {
        n: 29,
        name: "25.FASAH Invoice SS1-697(csvgazt)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 28,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "fasahinvoiceNumber", "prefix": ""},
        headers: {},
        body: {"type": "json", "json": {"supplierId": "{{fasahsupplierid}}", "id": "DEL_0130_01", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 839.47, "totalVAT": 41.98, "grandTotal": 881.45, "advanceAmount": 0.0, "outstandingAmount": 881.45, "remarksArabic": "", "remarksEnglish": "", "narrationArabic": "", "narrationEnglish": "", "milestonePayments": false, "percentOfCompletion": 0, "shipmentRefNumber": "", "salespersonEnglish": "", "salespersonArabic": "", "supplier": {"id": "{{subsupplierid1}}", "regionEnglish": "Najran Region", "regionArabic": "منطقة نجران", "cityEnglish": "Najran", "cityArabic": "نجران", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchEnglish": "Al-Naseem(East)", "branchArabic": "ركة الاتصالات السعودية", "plantEnglish": "Taybah", "plantArabic": "طيبة", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "عمليات المشتري", "nameEnglish": "BUYERONE FASAH", "addressArabic1": "1 - الرياض", "addressArabic2": "Riyadh Riyadh Region", "addressEnglish1": "BLDG# 4044 / 1 - PBOX-7705-RIYADH-12392", "addressEnglish2": "Riyadh Riyadh Region", "vatRegisterationNumber": 123456654, "branch": "", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966123453212", "regionEnglish": "Royal Province", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "الدمام", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchArabic": "النسيم (شرق)", "plantEnglish": "Taybah", "plantArabic": "طيبة", "segmentEnglish": "Large Corporates", "segmentArabic": "الشركات الكبيرة", "divisionEnglish": "STC mobile", "divisionArabic": "شركة الاتصالات السعودية", "prodLineEnglish": "Health Insurance", "prodLineArabic": "تأمين صحي"}, "lineItems": [{"serialNumber": 1, "code": "GRH13083647", "descriptionEnglish": "Group Health", "descriptionArabic": "التأمين الصحي", "uomArabic": "UOM", "uomEnglish": "", "price": 839.47, "quantity": 1, "amount": 839.47, "discountPercent": 0.0, "discountAmount": 0.0, "amountAfterDiscount": 839.47, "vatPercent": 5.0, "totalVat": 41.98, "priceAfterVat": 881.45}]}]}, "contentType": "application/json"}
    },

    // 30. 26.FASAH Invoice SS2-699(csvgazt)
    {
        n: 30,
        name: "26.FASAH Invoice SS2-699(csvgazt)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 28,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "fasahinvoiceNumber", "prefix": "FASAH_"},
        headers: {},
        body: {"type": "json", "json": {"supplierId": "{{fasahsupplierid}}", "id": "DEL_1121_01", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 839.47, "totalVAT": 41.98, "grandTotal": 881.45, "advanceAmount": 0.0, "outstandingAmount": 881.45, "remarksArabic": "", "remarksEnglish": "", "narrationArabic": "", "narrationEnglish": "", "milestonePayments": false, "percentOfCompletion": 0, "shipmentRefNumber": "", "salespersonEnglish": "", "salespersonArabic": "", "supplier": {"id": "{{subsupplierid2}}", "regionEnglish": "Najran Region", "regionArabic": "منطقة نجران", "cityEnglish": "Najran", "cityArabic": "نجران", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchEnglish": "Al-Naseem(East)", "branchArabic": "ركة الاتصالات السعودية", "plantEnglish": "Taybah", "plantArabic": "طيبة", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "عمليات المشتري", "nameEnglish": "BUYERONE FASAH", "addressArabic1": "1 - الرياض", "addressArabic2": "Riyadh Riyadh Region", "addressEnglish1": "BLDG# 4044 / 1 - PBOX-7705-RIYADH-12392", "addressEnglish2": "Riyadh Riyadh Region", "vatRegisterationNumber": 123456654, "branch": "", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966123453212", "regionEnglish": "Royal Province", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "الدمام", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchArabic": "النسيم (شرق)", "plantEnglish": "Taybah", "plantArabic": "طيبة", "segmentEnglish": "Large Corporates", "segmentArabic": "الشركات الكبيرة", "divisionEnglish": "STC mobile", "divisionArabic": "شركة الاتصالات السعودية", "prodLineEnglish": "Health Insurance", "prodLineArabic": "تأمين صحي"}, "lineItems": [{"serialNumber": 1, "code": "GRH13083647", "descriptionEnglish": "Group Health", "descriptionArabic": "التأمين الصحي", "uomArabic": "UOM", "uomEnglish": "", "price": 839.47, "quantity": 1, "amount": 839.47, "discountPercent": 0.0, "discountAmount": 0.0, "amountAfterDiscount": 839.47, "vatPercent": 5.0, "totalVat": 41.98, "priceAfterVat": 881.45}]}]}, "contentType": "application/json"}
    },

    // 31. 27.FASAH Invoice SS1-697(sadad)
    {
        n: 31,
        name: "27.FASAH Invoice SS1-697(sadad)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 28,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "fasahinvoiceNumber", "prefix": "FASAH_"},
        headers: {},
        body: {"type": "json", "json": {"supplierId": "{{fasahsupplierid}}", "id": "DEL_0130_02", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 839.47, "totalVAT": 41.98, "grandTotal": 881.45, "advanceAmount": 0.0, "outstandingAmount": 881.45, "remarksArabic": "", "remarksEnglish": "", "narrationArabic": "", "narrationEnglish": "", "milestonePayments": false, "percentOfCompletion": 0, "shipmentRefNumber": "", "salespersonEnglish": "", "salespersonArabic": "", "supplier": {"id": "{{subsupplierid1}}", "regionEnglish": "Najran Region", "regionArabic": "منطقة نجران", "cityEnglish": "Najran", "cityArabic": "نجران", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchEnglish": "Al-Naseem(East)", "branchArabic": "ركة الاتصالات السعودية", "plantEnglish": "Taybah", "plantArabic": "طيبة", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "عمليات المشتري", "nameEnglish": "BUYERONE FASAH", "addressArabic1": "1 - الرياض", "addressArabic2": "Riyadh Riyadh Region", "addressEnglish1": "BLDG# 4044 / 1 - PBOX-7705-RIYADH-12392", "addressEnglish2": "Riyadh Riyadh Region", "vatRegisterationNumber": 123456654, "branch": "", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966123453212", "regionEnglish": "Royal Province", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "الدمام", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchArabic": "النسيم (شرق)", "plantEnglish": "Taybah", "plantArabic": "طيبة", "segmentEnglish": "Large Corporates", "segmentArabic": "الشركات الكبيرة", "divisionEnglish": "STC mobile", "divisionArabic": "شركة الاتصالات السعودية", "prodLineEnglish": "Health Insurance", "prodLineArabic": "تأمين صحي"}, "lineItems": [{"serialNumber": 1, "code": "GRH13083647", "descriptionEnglish": "Group Health", "descriptionArabic": "التأمين الصحي", "uomArabic": "UOM", "uomEnglish": "", "price": 839.47, "quantity": 1, "amount": 839.47, "discountPercent": 0.0, "discountAmount": 0.0, "amountAfterDiscount": 839.47, "vatPercent": 5.0, "totalVat": 41.98, "priceAfterVat": 881.45}]}]}, "contentType": "application/json"}
    },

    // 32. 28.FASAH Invoice SS2-699(sadad)
    {
        n: 32,
        name: "28.FASAH Invoice SS2-699(sadad)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 28,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "fasahinvoiceNumber", "prefix": "FASAH_"},
        headers: {},
        body: {"type": "json", "json": {"supplierId": "{{fasahsupplierid}}", "id": "DEL_1207_01", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 839.47, "totalVAT": 41.98, "grandTotal": 881.45, "advanceAmount": 0.0, "outstandingAmount": 881.45, "remarksArabic": "", "remarksEnglish": "", "narrationArabic": "", "narrationEnglish": "", "milestonePayments": false, "percentOfCompletion": 0, "shipmentRefNumber": "", "salespersonEnglish": "", "salespersonArabic": "", "supplier": {"id": "{{subsupplierid2}}", "regionEnglish": "Najran Region", "regionArabic": "منطقة نجران", "cityEnglish": "Najran", "cityArabic": "نجران", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchEnglish": "Al-Naseem(East)", "branchArabic": "ركة الاتصالات السعودية", "plantEnglish": "Taybah", "plantArabic": "طيبة", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "عمليات المشتري", "nameEnglish": "BUYERONE FASAH", "addressArabic1": "1 - الرياض", "addressArabic2": "Riyadh Riyadh Region", "addressEnglish1": "BLDG# 4044 / 1 - PBOX-7705-RIYADH-12392", "addressEnglish2": "Riyadh Riyadh Region", "vatRegisterationNumber": 123456654, "branch": "", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966123453212", "regionEnglish": "Royal Province", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "الدمام", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchArabic": "النسيم (شرق)", "plantEnglish": "Taybah", "plantArabic": "طيبة", "segmentEnglish": "Large Corporates", "segmentArabic": "الشركات الكبيرة", "divisionEnglish": "STC mobile", "divisionArabic": "شركة الاتصالات السعودية", "prodLineEnglish": "Health Insurance", "prodLineArabic": "تأمين صحي"}, "lineItems": [{"serialNumber": 1, "code": "GRH13083647", "descriptionEnglish": "Group Health", "descriptionArabic": "التأمين الصحي", "uomArabic": "UOM", "uomEnglish": "", "price": 839.47, "quantity": 1, "amount": 839.47, "discountPercent": 0.0, "discountAmount": 0.0, "amountAfterDiscount": 839.47, "vatPercent": 5.0, "totalVat": 41.98, "priceAfterVat": 881.45}]}]}, "contentType": "application/json"}
    },

    // 33. 29.FASAH Invoice SS2-699(sadad)-NM
    {
        n: 33,
        name: "29.FASAH Invoice SS2-699(sadad)-NM",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 28,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "fasahinvoiceNumber", "prefix": "FASAH_"},
        headers: {},
        body: {"type": "json", "json": {"supplierId": "{{fasahsupplierid}}", "id": "DEL_01301_01", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 839.47, "totalVAT": 41.98, "grandTotal": 881.45, "advanceAmount": 0.0, "outstandingAmount": 881.45, "remarksArabic": "", "remarksEnglish": "", "narrationArabic": "", "narrationEnglish": "", "milestonePayments": false, "percentOfCompletion": 0, "shipmentRefNumber": "", "salespersonEnglish": "", "salespersonArabic": "", "supplier": {"id": "{{subsupplierid2}}", "regionEnglish": "Najran Region", "regionArabic": "منطقة نجران", "cityEnglish": "Najran", "cityArabic": "نجران", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchEnglish": "Al-Naseem(East)", "branchArabic": "ركة الاتصالات السعودية", "plantEnglish": "Taybah", "plantArabic": "طيبة", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1f", "nameArabic": "عمليات المشتري", "nameEnglish": "BUYER", "addressArabic1": "1 - الرياض", "addressArabic2": "Riyadh Riyadh Region", "addressEnglish1": "BLDG# 4044 / 1 - PBOX-7705-RIYADH-12392", "addressEnglish2": "Riyadh Riyadh Region", "vatRegisterationNumber": 123456654, "branch": "", "email": "buyerone.fasah190@mailinator.com", "contactNo": "+966123453212", "regionEnglish": "Royal Province", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "الدمام", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchArabic": "النسيم (شرق)", "plantEnglish": "Taybah", "plantArabic": "طيبة", "segmentEnglish": "Large Corporates", "segmentArabic": "الشركات الكبيرة", "divisionEnglish": "STC mobile", "divisionArabic": "شركة الاتصالات السعودية", "prodLineEnglish": "Health Insurance", "prodLineArabic": "تأمين صحي"}, "lineItems": [{"serialNumber": 1, "code": "GRH13083647", "descriptionEnglish": "Group Health", "descriptionArabic": "التأمين الصحي", "uomArabic": "UOM", "uomEnglish": "", "price": 839.47, "quantity": 1, "amount": 839.47, "discountPercent": 0.0, "discountAmount": 0.0, "amountAfterDiscount": 839.47, "vatPercent": 5.0, "totalVat": 41.98, "priceAfterVat": 881.45}]}]}, "contentType": "application/json"}
    },

    // 34. 30.FASAH Sync Invoice(csvgazt)
    {
        n: 34,
        name: "30.FASAH Sync Invoice(csvgazt)",
        method: "POST",
        path: "/esal/api/v3/uploadInvoices",
        section: 28,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "fasahinvoiceNumber", "prefix": "Fasah_sync_"},
        headers: {},
        body: {"type": "json", "json": {"supplierId": "{{fasahsupplierid}}", "id": "DEL_0130_03", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 839.47, "totalVAT": 41.98, "grandTotal": 881.45, "advanceAmount": 0.0, "outstandingAmount": 881.45, "remarksArabic": "", "remarksEnglish": "", "narrationArabic": "", "narrationEnglish": "", "milestonePayments": false, "percentOfCompletion": 0, "shipmentRefNumber": "", "salespersonEnglish": "", "salespersonArabic": "", "supplier": {"id": "{{subsupplierid1}}", "regionEnglish": "Najran Region", "regionArabic": "منطقة نجران", "cityEnglish": "Najran", "cityArabic": "نجران", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchEnglish": "Al-Naseem(East)", "branchArabic": "ركة الاتصالات السعودية", "plantEnglish": "Taybah", "plantArabic": "طيبة", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "عمليات المشتري", "nameEnglish": "BUYERONE FASAH", "addressArabic1": "1 - الرياض", "addressArabic2": "Riyadh Riyadh Region", "addressEnglish1": "BLDG# 4044 / 1 - PBOX-7705-RIYADH-12392", "addressEnglish2": "Riyadh Riyadh Region", "vatRegisterationNumber": 123456654, "branch": "", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966123453212", "regionEnglish": "Royal Province", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "الدمام", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchArabic": "النسيم (شرق)", "plantEnglish": "Taybah", "plantArabic": "طيبة", "segmentEnglish": "Large Corporates", "segmentArabic": "الشركات الكبيرة", "divisionEnglish": "STC mobile", "divisionArabic": "شركة الاتصالات السعودية", "prodLineEnglish": "Health Insurance", "prodLineArabic": "تأمين صحي"}, "lineItems": [{"serialNumber": 1, "code": "GRH13083647", "descriptionEnglish": "Group Health", "descriptionArabic": "التأمين الصحي", "uomArabic": "UOM", "uomEnglish": "", "price": 839.47, "quantity": 1, "amount": 839.47, "discountPercent": 0.0, "discountAmount": 0.0, "amountAfterDiscount": 839.47, "vatPercent": 5.0, "totalVat": 41.98, "priceAfterVat": 881.45}]}]}, "contentType": "application/json"}
    },

    // 35. 31.FASAH Sync Proforma(csvgazt)
    {
        n: 35,
        name: "31.FASAH Sync Proforma(csvgazt)",
        method: "POST",
        path: "/esal/api/v3/uploadInvoices",
        section: 28,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"supplierId": "{{fasahsupplierid}}", "id": "DEL_0130_03", "invoices": [{"invoiceType": "P", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 839.47, "totalVAT": 41.98, "grandTotal": 881.45, "advanceAmount": 0.0, "outstandingAmount": 881.45, "remarksArabic": "", "remarksEnglish": "", "narrationArabic": "", "narrationEnglish": "", "milestonePayments": false, "percentOfCompletion": 0, "shipmentRefNumber": "", "salespersonEnglish": "", "salespersonArabic": "", "supplier": {"id": "{{subsupplierid1}}", "regionEnglish": "Najran Region", "regionArabic": "منطقة نجران", "cityEnglish": "Najran", "cityArabic": "نجران", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchEnglish": "Al-Naseem(East)", "branchArabic": "ركة الاتصالات السعودية", "plantEnglish": "Taybah", "plantArabic": "طيبة", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "عمليات المشتري", "nameEnglish": "BUYERONE FASAH", "addressArabic1": "1 - الرياض", "addressArabic2": "Riyadh Riyadh Region", "addressEnglish1": "BLDG# 4044 / 1 - PBOX-7705-RIYADH-12392", "addressEnglish2": "Riyadh Riyadh Region", "vatRegisterationNumber": 123456654, "branch": "", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966123453212", "regionEnglish": "Royal Province", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "الدمام", "localityEnglish": "Al-Margab", "localityArabic": "آل Margab", "branchArabic": "النسيم (شرق)", "plantEnglish": "Taybah", "plantArabic": "طيبة", "segmentEnglish": "Large Corporates", "segmentArabic": "الشركات الكبيرة", "divisionEnglish": "STC mobile", "divisionArabic": "شركة الاتصالات السعودية", "prodLineEnglish": "Health Insurance", "prodLineArabic": "تأمين صحي"}, "lineItems": [{"serialNumber": 1, "code": "GRH13083647", "descriptionEnglish": "Group Health", "descriptionArabic": "التأمين الصحي", "uomArabic": "UOM", "uomEnglish": "", "price": 839.47, "quantity": 1, "amount": 839.47, "discountPercent": 0.0, "discountAmount": 0.0, "amountAfterDiscount": 839.47, "vatPercent": 5.0, "totalVat": 41.98, "priceAfterVat": 881.45}]}]}, "contentType": "application/json"}
    },

    // 36. Login_Gazt_11804
    {
        n: 36,
        name: "Login_Gazt_11804",
        method: "POST",
        path: "/esal/api/cas/login",
        section: 36,
        login: true,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: "cas",
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"username": "{{gaztsupplierusername}}", "password": "{{gaztsupplierpassword}}"}, "contentType": "application/json"}
    },

    // 37. 32.UploadInvoice_Invoice(Multiple line)
    {
        n: 37,
        name: "32.UploadInvoice_Invoice(Multiple line)",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 200, "totalVAT": "0", "grandTotal": 200, "advanceAmount": 0, "outstandingAmount": 200, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "0", "totalVat": 0, "priceAfterVat": 100}, {"serialNumber": 2, "code": 79237649, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "0", "totalVat": 0, "priceAfterVat": 100}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 38. 33.UploadInvoice_Gazt_Debit(M)_wrong referenced invoice
    {
        n: 38,
        name: "33.UploadInvoice_Gazt_Debit(M)_wrong referenced invoice",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "D", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "GAZT_AF54142B-7743-4406-A259-100692498926", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{gaztsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 39. 34.CancelInvoice_11804
    {
        n: 39,
        name: "34.CancelInvoice_11804",
        method: "POST",
        path: "/esal/api/v1/invoice/cancel",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"invoices": [{"invoiceNumber": "GAZT_823eee72-25ea-4b8d-a3a1-e1c9abd3d7c0"}], "supplierId": "11804"}, "contentType": "application/json"}
    },

    // 40. 35.InvoiceSearch_11804
    {
        n: 40,
        name: "35.InvoiceSearch_11804",
        method: "POST",
        path: "/esal/api/v1/invoice/search",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"pagination": {"page": 1, "limit": 10}, "supplierId": "11804", "filters": {"dateFilter": {"fromDate": "2022-11-01T05:13:56.991Z", "toDate": "2022-12-10T05:13:56.991Z"}, "statusFilter": ["ALL"], "typeFilter": ["ALL"], "relationIdFilter": ["166832"]}}, "contentType": "application/json"}
    },

    // 41. 36.PaymentStatus_Partial_11804
    {
        n: 41,
        name: "36.PaymentStatus_Partial_11804",
        method: "GET",
        path: "/esal/api/v1/paymentStatus?invoiceNumber=GAZT_11E5636C-C905-464F-A767-8C75C036E5D9",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 42. 37.PaymentStatus_Exact_11804
    {
        n: 42,
        name: "37.PaymentStatus_Exact_11804",
        method: "GET",
        path: "/esal/api/v1/paymentStatus?invoiceNumber=GAZT_BE7D0EB7-78B5-453C-A211-AAD0DE9A5458",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 43. 38.PaymentStatus_Pending_11804
    {
        n: 43,
        name: "38.PaymentStatus_Pending_11804",
        method: "GET",
        path: "/esal/api/v1/paymentStatus?invoiceNumber=GAZT_47974AEF-B8FD-4831-ABCA-CD8800F60B69",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 44. 39.PaymentStatus_Undelivered_11804
    {
        n: 44,
        name: "39.PaymentStatus_Undelivered_11804",
        method: "GET",
        path: "/esal/api/v1/paymentStatus?invoiceNumber=INVS_TEST_NOV09_01",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 400,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 45. 40.PaymentStatus_Cancelled_11804
    {
        n: 45,
        name: "40.PaymentStatus_Cancelled_11804",
        method: "GET",
        path: "/esal/api/v1/paymentStatus?invoiceNumber=GAZT_AF54142B-7743-4406-A259-100692498926",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 400,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 46. 41.PaymentStatus_Closed_11804
    {
        n: 46,
        name: "41.PaymentStatus_Closed_11804",
        method: "GET",
        path: "/esal/api/v1/paymentStatus?invoiceNumber=GAZT_9E13D41E-4284-42FF-B666-EB69C42011B8",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 47. 42.PaymentStatus_Deleted_11804
    {
        n: 47,
        name: "42.PaymentStatus_Deleted_11804",
        method: "GET",
        path: "/esal/api/v1/paymentStatus?invoiceNumber=GAZT_748850E2-1DD0-4072-A4D3-EAB89EB71E5D",
        section: 36,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 400,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 48. Login_Gazt_11828
    {
        n: 48,
        name: "Login_Gazt_11828",
        method: "POST",
        path: "/esal/api/cas/login",
        section: 48,
        login: true,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: "cas",
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"username": "{{paymentsuppliername}}", "password": "{{paymentsupplierpassword}}"}, "contentType": "application/json"}
    },

    // 49. 43.PaymentUpdate_11828
    {
        n: 49,
        name: "43.PaymentUpdate_11828",
        method: "POST",
        path: "/esal/api/v1/payment?detail=false",
        section: 48,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"payments": [{"currency": "SAR", "customerCode": "API123", "date": "{{currentdate}}", "invoiceReference": "invc_NM_Dec30_0625", "paymentAmount": 100, "paymentReference": "202212401", "remarks": "File"}], "supplierId": "11828"}, "contentType": "application/json"}
    },

    // 50. 44.PaymentUpdate_Cancelled_11828
    {
        n: 50,
        name: "44.PaymentUpdate_Cancelled_11828",
        method: "POST",
        path: "/esal/api/v1/payment?detail=false",
        section: 48,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"payments": [{"currency": "SAR", "customerCode": "harini123", "date": "{{currentdate}}", "invoiceReference": "INVC_NM_DEC30_0629", "paymentAmount": 100, "paymentReference": "2022123002", "remarks": "File"}], "supplierId": "11828"}, "contentType": "application/json"}
    },

    // 51. 45.PaymentUpdate_Closed_11828
    {
        n: 51,
        name: "45.PaymentUpdate_Closed_11828",
        method: "POST",
        path: "/esal/api/v1/payment?detail=false",
        section: 48,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"payments": [{"currency": "SAR", "customerCode": "harini123", "date": "{{currentdate}}", "invoiceReference": "invc_NM_Dec30_0623", "paymentAmount": 100, "paymentReference": "2022123000", "remarks": "File"}], "supplierId": "11828"}, "contentType": "application/json"}
    },

    // 52. 46.PaymentUpdate_Deleted_11828
    {
        n: 52,
        name: "46.PaymentUpdate_Deleted_11828",
        method: "POST",
        path: "/esal/api/v1/payment?detail=false",
        section: 48,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"payments": [{"currency": "SAR", "customerCode": "harini123", "date": "{{currentdate}}", "invoiceReference": "INVC_NM_DEC30_0606", "paymentAmount": 100, "paymentReference": "2022123001", "remarks": "File"}], "supplierId": "11828"}, "contentType": "application/json"}
    },

    // 53. 47.PaymentUpdate_Disputed_11828
    {
        n: 53,
        name: "47.PaymentUpdate_Disputed_11828",
        method: "POST",
        path: "/esal/api/v1/payment?detail=false",
        section: 48,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"payments": [{"currency": "SAR", "customerCode": "API123", "date": "{{currentdate}}", "invoiceReference": "INVS_TEST_DEC30_15", "paymentAmount": 200, "paymentReference": "2022123002", "remarks": "File"}], "supplierId": "11828"}, "contentType": "application/json"}
    },

    // 54. 48.PaymentUpdate_Rejected_11828
    {
        n: 54,
        name: "48.PaymentUpdate_Rejected_11828",
        method: "POST",
        path: "/esal/api/v1/payment?detail=false",
        section: 48,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"payments": [{"currency": "SAR", "customerCode": "API123", "date": "{{currentdate}}", "invoiceReference": "INVS_TEST_DEC30_13", "paymentAmount": 200, "paymentReference": "2022123002", "remarks": "File"}], "supplierId": "11828"}, "contentType": "application/json"}
    },

    // 55. 49.OAuth_Login_11828
    {
        n: 55,
        name: "49.OAuth_Login_11828",
        method: "POST",
        path: "/esal/api/v2/oauth/token?grant_type=password&scope=api&username={{paymentsuppliername}}&password={{paymentsupplierpassword}}",
        section: 55,
        login: true,
        auth: "basic",
        authVar: null,
        expect: 200,
        saves: "oauth",
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 56. OAuth_UploadInvoice_gazt_11828
    {
        n: 56,
        name: "OAuth_UploadInvoice_gazt_11828",
        method: "POST",
        path: "/esal/api/v2.1/uploadInvoices",
        section: 55,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "oauthGAZT_"},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"supplierId": "{{paymentsupplierid}}", "id": "upload_oauth_dec7_1", "groupReferenceNumber": null, "totalInvoices": null, "process": null, "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceIssueTime": null, "invoiceReference": null, "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "INR", "exemptedAmount": null, "amountNotSubjToTaxation": null, "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 15, "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض", "supplier": {"id": "{{paymentsupplierid}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "BK12334345", "iban": "DEC123", "additionalNumber": null}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "pocsupbuy", "nameArabic": "توني تينجلر", "nameEnglish": "GAZTPOC Supplier", "addressArabic1": "9924 Selby Ave. جيرسي سيتي ، نيو جيرسي", "addressArabic2": "جيرسي", "addressEnglish1": "9924 Selby Ave. Jersey City, NJ 07302", "addressEnglish2": "Jersey", "vatRegisterationNumber": 12323232323, "branch": "Riyadh ", "email": "gaztpoc@Ppsuplier.com", "contactNo": "+966984940587", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض", "postalCode": null, "stateEnglish": null, "stateArabic": null, "countryCode": null}, "lineItems": [{"serialNumber": 1, "code": "79237648", "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "foreignPrice": 45, "quantity": 1, "amount": 100, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}]}]}, "contentType": "application/json"}
    },

    // 57. 50.OAuth_PaymentUpdate_11828
    {
        n: 57,
        name: "50.OAuth_PaymentUpdate_11828",
        method: "POST",
        path: "/esal/api/v2/payment?detail=false",
        section: 55,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"payments": [{"currency": "SAR", "customerCode": "harini123", "date": "{{currentdate}}", "invoiceReference": "Invs_test_dec30_17", "paymentAmount": 200, "paymentReference": "124300677819", "remarks": "File"}], "supplierId": "11828"}, "contentType": "application/json"}
    },

    // 58. OAuth_Login_11804
    {
        n: 58,
        name: "OAuth_Login_11804",
        method: "POST",
        path: "/esal/api/v2/oauth/token?grant_type=password&scope=api&username={{gaztsupplierusername}}&password={{gaztsupplierpassword}}",
        section: 58,
        login: true,
        auth: "basic",
        authVar: null,
        expect: 200,
        saves: "oauth",
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 59. 51.OAuth_UploadInvoice_gazt_11804
    {
        n: 59,
        name: "51.OAuth_UploadInvoice_gazt_11804",
        method: "POST",
        path: "/esal/api/v2.1/uploadInvoices",
        section: 58,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "oauthGAZT_"},
        headers: {"jwttoken": "Bearer {{token1}}"},
        body: {"type": "json", "json": {"supplierId": "{{gaztsupplierid1}}", "id": "upload_oauth_dec7_1", "groupReferenceNumber": null, "totalInvoices": null, "process": null, "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceIssueTime": null, "invoiceReference": null, "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "INR", "exemptedAmount": null, "amountNotSubjToTaxation": null, "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 15, "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض", "supplier": {"id": "{{gaztsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "BK12334345", "iban": "DEC123", "additionalNumber": null}, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "pocsupbuy", "nameArabic": "توني تينجلر", "nameEnglish": "GAZTPOC Supplier", "addressArabic1": "9924 Selby Ave. جيرسي سيتي ، نيو جيرسي", "addressArabic2": "جيرسي", "addressEnglish1": "9924 Selby Ave. Jersey City, NJ 07302", "addressEnglish2": "Jersey", "vatRegisterationNumber": 12323232323, "branch": "Riyadh ", "email": "gaztpoc@Ppsuplier.com", "contactNo": "+966984940587", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض", "postalCode": null, "stateEnglish": null, "stateArabic": null, "countryCode": null}, "lineItems": [{"serialNumber": 1, "code": "79237648", "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "foreignPrice": 45, "quantity": 1, "amount": 100, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}]}]}, "contentType": "application/json"}
    },

    // 60. 52.OAuth_Sync Invoice_Gazt_11804
    {
        n: 60,
        name: "52.OAuth_Sync Invoice_Gazt_11804",
        method: "POST",
        path: "/esal/api/v3.1/uploadInvoices",
        section: 58,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "oautsynchGAZT_"},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"id": "1 invoice 80 fields Memeber", "supplierId": "{{gaztsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "INR", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 5, "grandTotal": 105, "advanceAmount": 0, "outstandingAmount": 105, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "9924 Selby Ave. جيرسي سيتي ، نيو جيرسي", "addressArabic2": "جيرسي", "addressEnglish1": "9924 Selby Ave. Jersey City, NJ 07302", "addressEnglish2": "Jersey", "vatRegisterationNumber": 747383764263647, "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض"}, "supplier": {"id": "{{gaztsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "BK12334345", "iban": "DEC123"}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 45, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": 5, "totalVat": 5, "priceAfterVat": 105}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض"}]}, "contentType": "application/json"}
    },

    // 61. OAuth_Login_Sadad_11803
    {
        n: 61,
        name: "OAuth_Login_Sadad_11803",
        method: "POST",
        path: "/esal/api/v2/oauth/token?grant_type=password&scope=api&username={{sadadsupplierusername}}&password={{sadadsupplierpassword}}",
        section: 61,
        login: true,
        auth: "basic",
        authVar: null,
        expect: 200,
        saves: "oauth",
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 62. 53.OAuth_UploadInvoice_sadad_11803
    {
        n: 62,
        name: "53.OAuth_UploadInvoice_sadad_11803",
        method: "POST",
        path: "/esal/api/v1.1/uploadInvoices",
        section: 61,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "Oauthsadad_"},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"id": "oauth_nov25_sadad_01", "supplierId": "{{sadadsupplierid1}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "15", "grandTotal": 115, "advanceAmount": 0, "outstandingAmount": 115, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "pocsupbuy", "nameArabic": "??????? UAM", "nameEnglish": "GAZTPOC Supplier", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "12323232323", "branch": "Riyadh ", "email": "gaztpoc@Ppsuplier.com", "contactNo": "+966984940587", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{sadadsupplierid1}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "GAZT PPPOC Onfly1", "nameEnglish": "GAZT PPPOC Onfly1", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "gaztPPpoc@onfly1.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "15", "totalVat": 15, "priceAfterVat": 115}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 63. OAuth_Login_Fasah_696
    {
        n: 63,
        name: "OAuth_Login_Fasah_696",
        method: "POST",
        path: "/esal/api/v2/oauth/token?grant_type=password&scope=api&username={{fasahsupplierusername}}&password={{fasahsupplierpassword}}",
        section: 63,
        login: true,
        auth: "basic",
        authVar: null,
        expect: 200,
        saves: "oauth",
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 64. 54.OAuth_FASAH Invoice_697
    {
        n: 64,
        name: "54.OAuth_FASAH Invoice_697",
        method: "POST",
        path: "/esal/api/v2.1/uploadInvoices",
        section: 63,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "Oauthfasah_"},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"id": "SUP1-BUY1", "supplierId": "{{fasahsupplierid}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 5, "grandTotal": 105, "advanceAmount": 0, "outstandingAmount": 105, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "المشتري الفرعي 1", "nameEnglish": "SubBuyer1", "addressArabic1": "72 جارتنر ستريت جونزبورو ،", "addressArabic2": "GA 30236", "addressEnglish1": "72 Gartner Street  Jonesboro,", "addressEnglish2": "GA 30236", "vatRegisterationNumber": 789152658745236, "branch": "Riyadh ", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966509928373", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض"}, "supplier": {"id": "{{subsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": 5, "totalVat": 5, "priceAfterVat": 105}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض"}]}, "contentType": "application/json"}
    },

    // 65. 55.OAuth_FASAH Sync Invoice_697
    {
        n: 65,
        name: "55.OAuth_FASAH Sync Invoice_697",
        method: "POST",
        path: "/esal/api/v3.1/uploadInvoices",
        section: 63,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "fasahinvoiceNumber", "prefix": "Oauthfasah_"},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"id": "SUP1-OAUTHSYNC_FASAH", "supplierId": "{{fasahsupplierid}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{fasahinvoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "exemptedAmount": false, "amountNotSubjToTaxation": false, "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": 5, "grandTotal": 105, "advanceAmount": 0, "outstandingAmount": 105, "remarksArabic": "تتعلق هذه الفاتورة بالعقد الصادر في 20 يوليو 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "هذا هو السرد العربي", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "Sup1fasah", "nameArabic": "المشتري الفرعي 1", "nameEnglish": "SubBuyer1", "addressArabic1": "72 جارتنر ستريت جونزبورو ،", "addressArabic2": "GA 30236", "addressEnglish1": "72 Gartner Street  Jonesboro,", "addressEnglish2": "GA 30236", "vatRegisterationNumber": 789152658745236, "branch": "Riyadh ", "email": "buyerone.fasah@mailinator.com", "contactNo": "+966509928373", "regionEnglish": "Eastern Province ", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "segmentEnglish": "Midsize", "segmentArabic": "مدينة الرياض", "divisionEnglish": "STC mobile ", "divisionArabic": "مدينة الرياض", "prodLineEnglish": "Health Insurance", "prodLineArabic": "مدينة الرياض"}, "supplier": {"id": "{{subsupplierid1}}", "regionEnglish": "Riyadh", "regionArabic": "مدينة الرياض", "cityEnglish": "Riyadh", "cityArabic": "مدينة الرياض", "localityEnglish": "Riyadh", "localityArabic": "مدينة الرياض", "branchEnglish": "Riyadh", "branchArabic": "مدينة الرياض", "plantEnglish": "Riyadh", "plantArabic": "مدينة الرياض", "bankSwiftCode": "TCZBSAJE", "iban": "SA6588142121893762416973"}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "مكائن ​​الحديد", "uomArabic": "غ", "uomEnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": 5, "totalVat": 5, "priceAfterVat": 105}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "مدينة الرياض"}]}, "contentType": "application/json"}
    },

    // 66. OAuth_Login_11804 Copy
    {
        n: 66,
        name: "OAuth_Login_11804 Copy",
        method: "POST",
        path: "/esal/api/v2/oauth/token?grant_type=password&scope=api&username={{gaztsupplierusername}}&password={{gaztsupplierpassword}}",
        section: 66,
        login: true,
        auth: "basic",
        authVar: null,
        expect: 200,
        saves: "oauth",
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 67. 56.OAuth_CasTokenCheck_11804
    {
        n: 67,
        name: "56.OAuth_CasTokenCheck_11804",
        method: "POST",
        path: "/esal/api/v2/cas-token/check",
        section: 66,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 15000,
        pre: {},
        headers: {},
        body: {"type": "text", "text": "token= {{token}}", "contentType": "text/plain"}
    },

    // 68. 57.OAuth_RefreshToken_11804
    {
        n: 68,
        name: "57.OAuth_RefreshToken_11804",
        method: "POST",
        path: "/esal/api/v2/cas/refreshToken",
        section: 66,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 15000,
        pre: {},
        headers: {"jwttoken": "{{refreshtoken}}"},
        body: {"type": "none", "contentType": "application/json"}
    },

    // 69. 58.OAuth_InvoiceSearch_11804
    {
        n: 69,
        name: "58.OAuth_InvoiceSearch_11804",
        method: "POST",
        path: "/esal/api/v2/invoice/search",
        section: 66,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"pagination": {"page": 1, "limit": 10}, "supplierId": "11804", "filters": {"dateFilter": {"fromDate": "2022-12-12T05:13:56.991Z", "toDate": "2022-12-30T05:13:56.991Z"}, "statusFilter": ["ALL"], "typeFilter": ["ALL"], "relationIdFilter": ["166832"]}}, "contentType": "application/json"}
    },

    // 70. 59.OAuth_CancelInvoice_11804
    {
        n: 70,
        name: "59.OAuth_CancelInvoice_11804",
        method: "POST",
        path: "/esal/api/v2/invoice/cancel",
        section: 66,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "json", "json": {"invoices": [{"invoiceNumber": "oautsynchGAZT_a9039934-ac42-4cf8-9f54-5a9cb2d18039"}], "supplierId": "11804"}, "contentType": "application/json"}
    },

    // 71. 60.OAuth_PaymentStatus_11804
    {
        n: 71,
        name: "60.OAuth_PaymentStatus_11804",
        method: "GET",
        path: "/esal/api/v2/paymentStatus?invoiceNumber=GAZT_44D6B26F-47A5-4ACF-BCA4-A381341A6455",
        section: 66,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: null
    },

    // 72. Login_Gazt_UA_11829
    {
        n: 72,
        name: "Login_Gazt_UA_11829",
        method: "POST",
        path: "/esal/api/cas/login",
        section: 72,
        login: true,
        auth: "none",
        authVar: null,
        expect: 200,
        saves: "cas",
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "json", "json": {"username": "{{UAsupplierusername}}", "password": "{{UAsupplierpassword}}"}, "contentType": "application/json"}
    },

    // 73. UploadInvoice_Gazt_Invoice_11829
    {
        n: 73,
        name: "UploadInvoice_Gazt_Invoice_11829",
        method: "POST",
        path: "/esal/api/v2/uploadInvoices",
        section: 72,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {"var": "invoiceNumber", "prefix": "GAZT_"},
        headers: {},
        body: {"type": "json", "json": {"id": "Test_API_1", "supplierId": "{{UAsupplierid}}", "invoices": [{"invoiceType": "I", "invoiceNumber": "{{invoiceNumber}}", "invoiceIssueDate": "{{currentdate}}", "invoiceReference": "", "dueDate": "{{currentdate}}", "dateOfDelivery": "{{currentdate}}", "currency": "SAR", "foreignCurrency": "USD", "selfAccountForTax": false, "totalBeforeVAT": 100, "totalVAT": "0", "grandTotal": 100, "advanceAmount": 0, "outstandingAmount": 100, "remarksArabic": "????? ??? ???????? ?????? ?????? ?? 20 ????? 2016", "remarksEnglish": "This invoice relates to contract issued on 20 july 2016  ", "narrationArabic": "??? ?? ????? ??????", "narrationEnglish": "This is English Narration", "milestonePayments": false, "percentOfCompletion": null, "profitMargin": {"applied": false, "procedureArabic": "", "procedureEnglish": ""}, "customer": {"code": "GAZT123", "nameArabic": "Nandini Buyer", "nameEnglish": "Nandini Buyer", "addressArabic1": "????? ???????", "addressArabic2": "????? ??????", "addressEnglish1": "address buyer uam", "addressEnglish2": "Riyadh", "vatRegisterationNumber": "5432670987", "branch": "Riyadh ", "email": "nandini@buyer.com", "contactNo": "+966156765677", "regionEnglish": "Eastern Province ", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "segmentEnglish": "Midsize", "segmentArabic": "????? ??????", "divisionEnglish": "STC mobile ", "divisionArabic": "????? ??????", "prodLineEnglish": "Health Insurance", "prodLineArabic": "????? ??????"}, "supplier": {"id": "{{UAsupplierid}}", "bankSwiftCode": "BK12334345", "regionEnglish": "Riyadh", "regionArabic": "????? ??????", "cityEnglish": "Riyadh", "cityArabic": "????? ??????", "localityEnglish": "Riyadh", "localityArabic": "????? ??????", "branchEnglish": "Riyadh", "branchArabic": "????? ??????", "plantEnglish": "Riyadh", "plantArabic": "????? ??????", "iban": "DEC123", "nameArabic": "Gazt supplier", "nameEnglish": "Gazt supplier", "addressArabic1": "Eco space", "addressArabic2": "Eco space", "addressEnglish1": "Test", "addressEnglish2": "Test", "vatRegisterationNumber": "", "email": "nandini@supplier.com", "contactNo": ""}, "lineItems": [{"serialNumber": 1, "code": 79237648, "descriptionEnglish": "iron machinery ", "descriptionArabic": "????? ????????", "uomArabic": "?", "uomignnglish": "Nos", "price": 100, "quantity": 1, "amount": 100, "foreignPrice": 50, "discountPercent": 0, "discountAmount": 0, "amountAfterDiscount": 100, "vatPercent": "0", "totalVat": 0, "priceAfterVat": 100}], "shipmentRefNumber": "DL23GGG67", "salespersonEnglish": "Aman", "salespersonArabic": "????? ??????"}]}, "contentType": "application/json"}
    },

    // 74. 61.UploadAttachement_11829
    {
        n: 74,
        name: "61.UploadAttachement_11829",
        method: "POST",
        path: "/esal/api/v1/uploadAttachment",
        section: 72,
        login: false,
        auth: "bearer",
        authVar: "token",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {},
        body: {"type": "multipart", "fields": [{"key": "uploadFile", "kind": "file", "value": ""}, {"key": "supplierid", "kind": "text", "value": "{{UAsupplierid}}"}]}
    },

    // 75. Oauth_Login_UA_11829
    {
        n: 75,
        name: "Oauth_Login_UA_11829",
        method: "POST",
        path: "/esal/api/v2/oauth/token?grant_type=password&scope=api&username={{UAsupplierusername}}&password={{UAsupplierpassword}}",
        section: 75,
        login: true,
        auth: "basic",
        authVar: null,
        expect: 200,
        saves: "oauth",
        waitMs: 0,
        pre: {},
        headers: {},
        body: null
    },

    // 76. 62.OAuth_UploadAttachement_11829
    {
        n: 76,
        name: "62.OAuth_UploadAttachement_11829",
        method: "POST",
        path: "/esal/api/v2/uploadAttachment",
        section: 75,
        login: false,
        auth: "bearer",
        authVar: "bearertoken",
        expect: 200,
        saves: null,
        waitMs: 0,
        pre: {},
        headers: {"jwttoken": "Bearer {{token}}"},
        body: {"type": "multipart", "fields": [{"key": "uploadFile", "kind": "file", "value": ""}, {"key": "supplierid", "kind": "text", "value": "{{UAsupplierid}}"}]}
    },
];