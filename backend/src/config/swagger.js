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
                    data: {
                        type: 'object',
                        properties: {
                            token: { type: 'string', example: '<jwt>' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'integer', example: 1 },
                                    username: { type: 'string', example: 'owner' },
                                    role: { type: 'string', enum: ['platform_admin', 'owner', 'manager', 'cashier'] },
                                    owner_id: { type: 'integer', nullable: true, example: null }
                                }
                            }
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
            'RBAC roles: platform_admin, owner, manager, cashier.',
            'Platform Admin is a temporary API/bootstrap role for creating business owners only.',
            'Platform Admin/Owner/Manager use username + password. Cashier uses PIN login.',
            'Protected routes require Authorization: Bearer <token>.',
            'Rate-limited auth endpoints may return 429.',
            'Bakong Open API tokens are backend-only; the frontend never calls Bakong directly.'
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
                summary: 'Platform Admin/Owner/Manager username-password login',
                description: 'Issues a JWT for platform_admin, owner, and manager accounts. Cashier accounts must use /api/auth/pin. Platform Admin is API/bootstrap-only and does not access the management portal.',
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
                description: 'Issues a JWT for cashier accounts using a bcrypt-hashed PIN. Platform Admin/Owner/Manager accounts cannot use PIN login.',
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
        '/api/products/imagekit-auth': {
            get: {
                summary: 'Get ImageKit upload authentication parameters',
                description: 'Owner/Manager only. Returns short-lived token, signature, expire, publicKey, and urlEndpoint for browser-direct product image uploads.',
                responses: {
                    200: {
                        description: 'ImageKit auth parameters generated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                token: { type: 'string', example: 'uuid-token' },
                                                expire: { type: 'integer', example: 1720000000 },
                                                signature: { type: 'string', example: 'hmac-signature' },
                                                publicKey: { type: 'string', example: 'public_xxx' },
                                                urlEndpoint: { type: 'string', example: 'https://ik.imagekit.io/toub-pos' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' }
                }
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
                    'Backend derives cashier/stall, calculates trusted totals, snapshots item names/prices, and starts the order as pending_payment.',
                    'KHQR orders generate an Individual KHQR payload plus md5, payment reference, and expiry metadata.'
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
        '/api/orders/{id}': {
            get: {
                summary: 'Get one order',
                description: 'Cashiers can fetch their own orders only. Owner/Manager can fetch orders only within their own business owner scope. Passive order read.'
            }
        },
        '/api/orders/{id}/check-khqr-status': {
            post: {
                summary: 'Check KHQR payment status',
                description: [
                    'Allowed for the creating cashier, or an owner/manager within the same business owner scope.',
                    'Frontend calls this endpoint while the KHQR modal is open.',
                    'The backend calls Bakong Open API by qr_md5 and validates amount/currency/configured destination account before marking paid.',
                    'The Bakong Open API token is backend-only and is never exposed to the frontend.'
                ].join(' '),
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' }
                    }
                ],
                responses: {
                    200: {
                        description: 'KHQR status check completed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                paymentStatus: { type: 'string', example: 'pending_payment' },
                                                providerStatus: { type: 'string', enum: ['paid', 'already_paid', 'not_found', 'failed', 'error', 'expired', 'not_checked'] },
                                                checkMode: { type: 'string', enum: ['bakong'] },
                                                alreadyProcessed: { type: 'boolean', example: false },
                                                message: { type: 'string', example: 'Payment has not been found yet.' },
                                                order: { type: 'object' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    503: {
                        ...errorResponse,
                        description: 'Bakong status checking or account configuration is misconfigured'
                    }
                }
            }
        },
        '/api/orders/{id}/confirm-cash': {
            post: {
                summary: 'Confirm cash payment',
                description: [
                    'Allowed for the creating cashier, or an owner/manager within the same business owner scope.',
                    'Only cash orders in pending_payment status can be confirmed.',
                    'Request includes cash_received_usd. Backend rejects underpayment, calculates change_due_usd, changes status to paid, sets completed_at, and writes a cash_payment_confirmed audit log.'
                ].join(' '),
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['cash_received_usd'],
                                properties: {
                                    cash_received_usd: { type: 'string', example: '10.00' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Cash payment confirmed and order marked paid' },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/api/orders/{id}/retry-telegram': {
            post: {
                summary: 'Retry Telegram kitchen ticket dispatch',
                description: [
                    'Allowed for the creating cashier, or an owner/manager within the same business owner scope.',
                    'Retries Telegram dispatch for paid orders whose kitchen ticket is missing or failed.',
                    'Pending tickets are still in progress. Orders with pending, sent, or done Telegram tickets are not resent.'
                ].join(' '),
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'integer' }
                    }
                ],
                responses: {
                    200: { description: 'Telegram dispatch retried; response contains the refreshed order' },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    409: { description: 'Telegram ticket is already pending, sent, or done' },
                    503: { description: 'Telegram bot is not configured' }
                }
            }
        },
        '/api/users': {
            get: {
                summary: 'List users',
                description: 'Platform Admin/Owner/Manager only. Platform Admin sees owner accounts only; Managers see/manage cashier accounts only. Password and PIN hashes are never returned.'
            },
            post: {
                summary: 'Create user',
                description: 'Platform Admin can create owner accounts only. Owner can create manager and cashier users only. Manager can create cashier users only. Platform Admin/Owner/Manager require password; cashier requires PIN.'
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
                description: 'Owner/Manager only, with server-side role and credential rules. Platform Admin cannot update users in this temporary bootstrap implementation.'
            },
            delete: {
                summary: 'Delete user',
                description: 'Owner/Manager only. Platform Admin cannot delete users in this temporary bootstrap implementation. Frontend destructive actions require typed confirmation.'
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
        '/api/reports/sales': {
            get: {
                summary: 'Filtered sales report',
                description: 'Owner/Manager only. Supports range, custom date window, stall, and cashier filters. Returns backend-scoped summary, stall/cashier/hourly breakdowns, and ledger rows for the sales report UI.',
                parameters: [
                    {
                        name: 'range',
                        in: 'query',
                        schema: { type: 'string', enum: ['today', 'week', 'month', 'custom'] },
                        description: 'Report range. Defaults to today.'
                    },
                    {
                        name: 'start_date',
                        in: 'query',
                        schema: { type: 'string', format: 'date' },
                        description: 'Required when range is custom.'
                    },
                    {
                        name: 'end_date',
                        in: 'query',
                        schema: { type: 'string', format: 'date' },
                        description: 'Required when range is custom.'
                    },
                    {
                        name: 'stall_id',
                        in: 'query',
                        schema: { type: 'integer' },
                        description: 'Optional same-business stall filter.'
                    },
                    {
                        name: 'cashier_id',
                        in: 'query',
                        schema: { type: 'integer' },
                        description: 'Optional cashier filter.'
                    }
                ],
                responses: {
                    200: { description: 'Sales report summary and ledger rows' },
                    400: { description: 'Invalid filter input' },
                    401: { description: 'Unauthenticated' },
                    403: { description: 'Owner/Manager role required' }
                }
            }
        },
        '/api/webhook/payment': {
            post: {
                summary: 'Legacy payment webhook placeholder',
                description: 'Use /api/orders/{id}/check-khqr-status for Bakong status checking.',
                security: [],
                responses: {
                    501: { description: 'Legacy placeholder path' }
                }
            }
        }
    }
};
