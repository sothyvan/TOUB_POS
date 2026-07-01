const errorResponse = {
    description: 'Error response',
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    code: { type: 'integer', example: 400 },
                    message: { type: 'string', example: 'Validation failed' }
                }
            }
        }
    }
};

const jwtResponse = {
    description: 'JWT login response',
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    token: { type: 'string', example: '<jwt>' },
                    user: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer', example: 1 },
                            username: { type: 'string', example: 'owner' },
                            role: { type: 'string', enum: ['owner', 'manager', 'cashier'] }
                        }
                    }
                }
            }
        }
    }
};

export const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Toub POS API',
        version: '1.0',
        description: [
            'TouB POS API documentation.',
            'RBAC roles: owner, manager, cashier.',
            'Owner/Manager use username + password. Cashier uses PIN login.',
            'Protected routes require Authorization: Bearer <token>.',
            'Rate-limited auth endpoints may return 429.'
        ].join(' ')
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        },
        responses: {
            BadRequest: errorResponse,
            Unauthorized: errorResponse,
            Forbidden: errorResponse,
            NotFound: errorResponse,
            TooManyRequests: {
                ...errorResponse,
                description: 'Rate limit exceeded'
            }
        }
    },
    security: [{ bearerAuth: [] }],
    paths: {
        '/api/health': {
            get: {
                summary: 'Server health check',
                security: [],
                responses: {
                    200: { description: 'API is healthy' }
                }
            }
        },
        '/api/auth/login': {
            post: {
                summary: 'Owner/Manager username-password login',
                description: 'Issues a JWT for owner and manager accounts. Cashier accounts must use /api/auth/pin.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['username', 'password'],
                                properties: {
                                    username: { type: 'string', example: 'owner' },
                                    password: { type: 'string', example: 'owner123' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: jwtResponse,
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    429: { $ref: '#/components/responses/TooManyRequests' }
                }
            }
        },
        '/api/auth/pin': {
            post: {
                summary: 'Cashier PIN login',
                description: 'Issues a JWT for cashier accounts using a bcrypt-hashed PIN. Owner/Manager accounts cannot use PIN login.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['userId', 'pin'],
                                properties: {
                                    userId: { type: 'integer', example: 2 },
                                    pin: { type: 'string', example: '1111' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: jwtResponse,
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    429: { $ref: '#/components/responses/TooManyRequests' }
                }
            }
        },
        '/api/auth/cashiers': {
            get: {
                summary: 'List cashier profiles for PIN login',
                description: 'Public endpoint used by the cashier terminal login screen. Sensitive credential fields are never returned.',
                security: []
            }
        },
        '/api/products': {
            get: {
                summary: 'List products',
                description: 'Authenticated users can list products. Cashier responses are scoped to assigned-stall visible products.'
            },
            post: {
                summary: 'Create product',
                description: 'Owner/Manager only.'
            }
        },
        '/api/products/{id}': {
            put: {
                summary: 'Update product',
                description: 'Owner/Manager only.'
            },
            delete: {
                summary: 'Delete product',
                description: 'Owner/Manager only.'
            }
        },
        '/api/orders': {
            get: {
                summary: 'List all orders',
                description: 'Owner/Manager only.'
            },
            post: {
                summary: 'Create backend-owned order',
                description: [
                    'Cashier only.',
                    'Frontend sends product IDs, quantities, optional notes, and payment method only.',
                    'Backend derives cashier/stall, calculates trusted totals, snapshots item names/prices, and starts the order as pending_payment.'
                ].join(' '),
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['items', 'payment_method'],
                                properties: {
                                    payment_method: { type: 'string', enum: ['cash', 'khqr'], example: 'cash' },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['product_id', 'quantity'],
                                            properties: {
                                                product_id: { type: 'integer', example: 1 },
                                                quantity: { type: 'integer', example: 2 },
                                                notes: { type: 'string', example: 'No sugar' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Order created as pending_payment' },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' }
                }
            }
        },
        '/api/orders/mine': {
            get: {
                summary: 'Get my orders',
                description: 'Cashier only. Returns orders created by the authenticated cashier.'
            }
        },
        '/api/orders/{id}/confirm-cash': {
            post: {
                summary: 'Confirm cash payment',
                description: [
                    'Allowed for the creating cashier, owner, or manager.',
                    'Only cash orders in pending_payment status can be confirmed.',
                    'Confirmation changes status to paid, sets completed_at, and writes a cash_payment_confirmed audit log.'
                ].join(' '),
                responses: {
                    200: { description: 'Cash payment confirmed and order marked paid' },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/api/users': {
            get: {
                summary: 'List users',
                description: 'Owner/Manager only. Managers see/manage cashier accounts only. Password and PIN hashes are never returned.'
            },
            post: {
                summary: 'Create user',
                description: 'Owner can create owner, manager, and cashier users. Manager can create cashier users only. Owner/Manager require password; cashier requires PIN.'
            }
        },
        '/api/users/me/stall': {
            get: {
                summary: 'Get assigned stall for current user',
                description: 'Used by the cashier workspace to load the authenticated user/stall assignment from the backend.'
            }
        },
        '/api/users/{id}': {
            put: {
                summary: 'Update user',
                description: 'Owner/Manager only, with server-side role and credential rules.'
            },
            delete: {
                summary: 'Delete user',
                description: 'Owner/Manager only. Frontend destructive actions require typed confirmation.'
            }
        },
        '/api/stalls': {
            get: {
                summary: 'List stalls',
                description: 'Owner/Manager only.'
            },
            post: {
                summary: 'Create stall',
                description: 'Owner/Manager only. Privileged fields such as owner_id, device_token, and telegram_chat_id are not trusted from the frontend.'
            }
        },
        '/api/stalls/{id}': {
            put: {
                summary: 'Update stall',
                description: 'Owner/Manager only.'
            },
            delete: {
                summary: 'Delete stall',
                description: 'Owner/Manager only.'
            }
        },
        '/api/stalls/{id}/staff': {
            post: {
                summary: 'Assign cashier to stall',
                description: 'Owner/Manager only. Backend verifies the stall exists, the user exists, and the assigned user is a cashier.'
            }
        },
        '/api/stalls/{id}/staff/{userId}': {
            delete: {
                summary: 'Remove cashier from stall',
                description: 'Owner/Manager only.'
            }
        },
        '/api/reports/daily': {
            get: {
                summary: 'Daily report',
                description: 'Owner/Manager only.'
            }
        },
        '/api/webhook/payment': {
            post: {
                summary: 'Payment webhook placeholder',
                description: 'Real KHQR webhook confirmation belongs to Phase 5 and is not implemented yet.',
                security: [],
                responses: {
                    501: { description: 'KHQR webhook confirmation is not implemented yet' }
                }
            }
        }
    }
};
