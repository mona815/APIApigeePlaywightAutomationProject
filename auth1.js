import { request } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export async function getBearerToken() {

    const apiContext = await request.newContext({
        baseURL: process.env.BASE_URL
    });

    const response = await apiContext.post(
        '/mona/generate-bearer-token/v1',
        {
            form: {
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        }
    );

    const body = await response.json();

    console.log('Token status:', response.status());

    if (response.status() !== 200) {
        throw new Error(
            `Token generation failed: ${response.status()} ${JSON.stringify(body)}`
        );
    }

    if (!body.access_token) {
        throw new Error('access_token was not returned');
    }

    await apiContext.dispose();

    return body.access_token;
}