const environments = {

    DEV: {
        baseURL: 'https://dev-api.cloudypedia.net',
        employeePath: '/mona/v1/employees',
        tokenPath: '/mona/generate-bearer-token/v1'
    },

    TEST: {
        baseURL: 'https://test-api.cloudypedia.net',
        employeePath: '/mona/v1/employees',
        tokenPath: '/mona/generate-bearer-token/v1'
    },

    PREPROD: {
        baseURL: 'https://preprod-api.cloudypedia.net',
        employeePath: '/mona/v1/employees',
        tokenPath: '/mona/generate-bearer-token/v1'
    },

    PROD: {
        baseURL: 'https://api.cloudypedia.net',
        employeePath: '/mona/v1/employees',
        tokenPath: '/mona/generate-bearer-token/v1'
    }

};

export default environments;