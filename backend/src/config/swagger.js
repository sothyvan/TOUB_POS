export const swaggerDocument = {
    openapi: "3.0.0",
    info: { title: 'Toub POS API', version: "1.0" },
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
        }
    },
    security: [{ bearerAuth: [] }],
    paths: {
        '/api/health': { get: { summary: 'Server Health Check'} },
        '/api/auth/login': {
            post: {
                summary: 'Log in',
                security: [],
                requestBody: {
                    content: { 'application/json': { schema: { type: 'object'} } }
                }
            }
        },
        '/api/products': {
            get: { summary: 'List products' },
            post: { summary: 'Create product' }
        },
        '/api/products/{id}': {
            put: { summary: 'Update product' },
            delete: { summary: 'Delete product' }
        },
        '/api/orders': {
            get: { summary: 'List all orders (Admin/Manager only)' },
            post: { summary: 'Create order' }
        },
        '/api/orders/mine': {
            get: { summary: 'Get my orders' }
        },
        '/api/users': {
            get: { summary: 'List users' },
            post: { summary: 'Create user' }
        },
        '/api/users/{id}': {
            put: { summary: 'Update user' },
            delete: { summary: 'Delete user' }
        },
        '/api/stalls': {
            get: { summary: 'List stalls' },
            post: { summary: 'Create stall' }
        },
        '/api/stalls/{id}': {
            put: { summary: 'Update stall' },
            delete: { summary: 'Delete stall' }
        },
        '/api/reports/daily': {
            get: { summary: 'Daily report' }
        },
        '/api/webhook/payment': {
            post: { summary: 'Payment webhook', security: [] }
        }
    }
}