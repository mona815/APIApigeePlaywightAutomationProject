import { request } from '@playwright/test';
import { getBearerToken } from './auth1.js';

export async function createApiClient() {

    const token = await getBearerToken();

    const apiContext = await request.newContext({

        baseURL: process.env.BASE_URL,

        extraHTTPHeaders: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        }

    });

    return apiContext;
}