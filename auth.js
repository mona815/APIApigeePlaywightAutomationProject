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

    console.log("Token response status:", response.status());

    const responseBody = await response.json();

    console.log("Token response:", responseBody);

    if (response.status() !== 200) {
        throw new Error(
            `Token generation failed: ${response.status()} ${JSON.stringify(responseBody)}`
        );
    }

    const token = responseBody.access_token;

    if (!token) {
        throw new Error("access_token was not returned");
    }

    await apiContext.dispose();

    return token;
}