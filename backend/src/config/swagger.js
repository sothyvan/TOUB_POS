const errorResponse = {
    description: 'Error response',
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Validation failed' }
                }
            }
        }
    }
};

const jwtResponse = {
    description: 'Short-lived access JWT response; also sets rotating refresh and CSRF cookies',
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
                            csrfToken: {
                                type: 'string',
                                example: '<csrf-proof>',
                                description: 'Non-credential proof copied to X-CSRF-Token for refresh/logout.'
                            },
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
            'Protected routes require a short-lived in-memory Authorization: Bearer <token>.',
            'Session restoration uses a rotating HttpOnly refresh cookie plus X-CSRF-Token.',
            'Protected requests verify the JWT session_version against the current active user. User changes may return 401 SESSION_INVALIDATED.',
            'Rate-limited auth endpoints may return 429 RATE_LIMITED. Production instances share Redis counters and use an explicit trusted-proxy hop count.',
            'Bakong Open API tokens are backend-only; the frontend never calls Bakong directly.'
        ].join(' ')
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            refreshCookie: { type: 'apiKey', in: 'cookie', name: 'toub_refresh_token' },
            csrfHeader: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }
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
                summary: 'Compatibility readiness check',
                description: 'Returns 200 only after startup completes and MySQL responds within the configured readiness timeout. Returns 503 while starting, draining, or database-unavailable.',
                security: [],
                responses: {
                    200: { description: 'API is ready for business traffic' },
                    503: { description: 'API is not ready for business traffic' }
                }
            }
        },
        '/api/health/live': {
            get: {
                summary: 'Process liveness check',
                description: 'Reports whether the Node process can answer HTTP. It does not test MySQL and must not be used to route business traffic.',
                security: [],
                responses: {
                    200: { description: 'Node process is alive' }
                }
            }
        },
        '/api/health/ready': {
            get: {
                summary: 'Dependency-aware readiness check',
                description: 'Returns 200 only after startup completes and MySQL responds within the configured readiness timeout. Database error details are not returned.',
                security: [],
                responses: {
                    200: { description: 'API is ready for business traffic' },
                    503: { description: 'API is starting, draining, or MySQL is unavailable' }
                }
            }
        },
        '/api/auth/login': {
            post: {
                summary: 'Platform Admin/Owner/Manager username-password login',
                description: 'Issues a short-lived access JWT and rotating HttpOnly refresh session for platform_admin, owner, and manager accounts. Cashier accounts must use /api/auth/pin. Platform Admin is API/bootstrap-only and does not access the management portal.',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['username', 'password'],
                                properties: {
                                    username: { type: 'string', maxLength: 50, example: 'owner' },
                                    password: { type: 'string', maxLength: 72, example: 'owner123' }
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
                description: 'Issues a short-lived device-bound access JWT plus an 8-hour rotating refresh session for a cashier assigned to the registered terminal stall. Platform Admin/Owner/Manager accounts cannot use PIN login.',
                security: [],
                parameters: [{
                    name: 'X-Device-Token',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Raw token stored only by the registered cashier terminal.'
                }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['userId', 'pin'],
                                properties: {
                                    userId: { type: 'integer', minimum: 1, example: 2 },
                                    pin: { type: 'string', pattern: '^\\d{4}$', example: '1111' }
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
        '/api/auth/refresh': {
            post: {
                summary: 'Rotate refresh session and issue a new access JWT',
                description: 'Consumes the current refresh token once, rotates both refresh and CSRF cookies, and returns a new short-lived access token. Cashier refreshes also require the registered X-Device-Token.',
                security: [{ refreshCookie: [], csrfHeader: [] }],
                parameters: [
                    {
                        name: 'X-CSRF-Token',
                        in: 'header',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Must equal the readable toub_csrf_token cookie.'
                    },
                    {
                        name: 'X-Device-Token',
                        in: 'header',
                        required: false,
                        schema: { type: 'string' },
                        description: 'Required when refreshing a cashier session.'
                    }
                ],
                responses: {
                    200: jwtResponse,
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    429: { $ref: '#/components/responses/TooManyRequests' }
                }
            }
        },
        '/api/auth/logout': {
            post: {
                summary: 'Revoke the current refresh session',
                description: 'Revokes the presented refresh token and clears the refresh and CSRF cookies.',
                security: [{ refreshCookie: [], csrfHeader: [] }],
                parameters: [{
                    name: 'X-CSRF-Token',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' }
                }],
                responses: {
                    200: { description: 'Refresh session revoked and cookies cleared' },
                    403: { $ref: '#/components/responses/Forbidden' }
                }
            }
        },
        '/api/auth/cashiers': {
            get: {
                summary: 'List cashier profiles for PIN login',
                description: 'Device-authenticated endpoint used by the terminal login screen. Returns only active cashiers assigned to the registered device stall; sensitive credential fields are never returned.',
                security: [],
                parameters: [{
                    name: 'X-Device-Token',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' }
                }]
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
                    'Requires a unique Idempotency-Key header for the checkout attempt.',
                    'An exact replay returns the existing order with HTTP 200; reusing the key for different request data returns 409.',
                    'Frontend sends product IDs, quantities, optional notes, and payment method only.',
                    'Backend derives cashier/stall, calculates trusted totals, snapshots item names/prices, and starts the order as pending_payment.',
                    'KHQR is disabled by default; khqr requests return 503 KHQR_DISABLED unless KHQR_ENABLED=true.'
                ].join(' '),
                parameters: [{
                    name: 'Idempotency-Key',
                    in: 'header',
                    required: true,
                    schema: {
                        type: 'string',
                        minLength: 16,
                        maxLength: 64,
                        example: '0d635ea2-8ea1-46a0-a195-a3ef02032594'
                    },
                    description: 'Stable client-generated key reused only when retrying the same checkout request.'
                }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['items', 'payment_method'],
                                properties: {
                                    payment_method: { type: 'string', enum: ['cash', 'khqr'], example: 'cash' },
                                    items: {
                                        type: 'array',
                                        minItems: 1,
                                        maxItems: 100,
                                        items: {
                                            type: 'object',
                                            additionalProperties: false,
                                            required: ['product_id', 'quantity'],
                                            properties: {
                                                product_id: { type: 'integer', minimum: 1, example: 1 },
                                                quantity: { type: 'integer', minimum: 1, maximum: 100, example: 2 },
                                                notes: { type: 'string', maxLength: 500, example: 'No sugar' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Existing order returned for an exact idempotent replay' },
                    201: { description: 'Order created as pending_payment' },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    409: {
                        ...errorResponse,
                        description: 'Idempotency-Key was already used for different order data'
                    },
                    503: {
                        ...errorResponse,
                        description: 'KHQR payment method is temporarily disabled'
                    }
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
        '/api/auth/device-status': {
            get: {
                summary: 'Validate current cashier terminal session',
                description: 'Cashier only. Requires matching Bearer JWT and X-Device-Token. Returns 401 with DEVICE_REVOKED when management has revoked the device.',
                parameters: [{
                    name: 'X-Device-Token',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' }
                }],
                responses: {
                    200: { description: 'Device is active' },
                    401: { $ref: '#/components/responses/Unauthorized' }
                }
            }
        },
        '/api/orders/{id}/check-khqr-status': {
            post: {
                summary: 'Check KHQR payment status',
                description: [
                    'Allowed for the creating cashier, or an owner/manager within the same business owner scope.',
                    'Returns 503 KHQR_DISABLED while KHQR_ENABLED=false.',
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
                        description: 'KHQR is disabled, or Bakong status checking/account configuration is misconfigured'
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
                                additionalProperties: false,
                                required: ['cash_received_usd'],
                                properties: {
                                    cash_received_usd: {
                                        type: 'number',
                                        minimum: 0.01,
                                        maximum: 99999999.99,
                                        multipleOf: 0.01,
                                        example: 10.00
                                    }
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
                    'Requeues the durable Telegram dispatch job for paid orders whose kitchen ticket is missing or failed.',
                    'The background worker performs the external send. Orders with pending, sent, or done Telegram tickets are not resent.'
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
                    200: { description: 'Telegram dispatch requeued; response contains the refreshed order' },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    403: { $ref: '#/components/responses/Forbidden' },
                    404: { $ref: '#/components/responses/NotFound' },
                    409: { description: 'Telegram ticket/job is already queued, processing, sent, or done' },
                    503: { description: 'Telegram bot is not configured' }
                }
            }
        },
        '/api/users': {
            get: {
                summary: 'List users',
                description: 'Platform Admin/Owner/Manager only. Platform Admin sees owner accounts only; Managers see/manage cashier accounts only. Password, PIN, and internal session-version fields are never returned.'
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
                description: 'Owner/Manager only, with server-side role and credential rules. Platform Admin cannot update users in this temporary bootstrap implementation. A successful update increments the target user session version and invalidates existing JWT/socket sessions.'
            },
            delete: {
                summary: 'Delete user',
                description: 'Owner/Manager only. Platform Admin cannot delete users in this temporary bootstrap implementation. Frontend destructive actions require typed confirmation. Soft deletion invalidates the target user JWT/socket sessions immediately.'
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
                description: 'Owner/Manager only. Backend verifies the stall and cashier, transactionally replaces any previous assignment, and invalidates that cashier\'s active sessions without deregistering their terminals.'
            }
        },
        '/api/stalls/{id}/staff/{userId}': {
            delete: {
                summary: 'Remove cashier from stall',
                description: 'Owner/Manager only. Removes the assignment and immediately invalidates the cashier\'s active sessions without deregistering the physical terminal.'
            }
        },
        '/api/stalls/{id}/telegram-cooks': {
            get: {
                summary: 'List stall Telegram cooks',
                description: 'Owner/Manager only. Returns Telegram-only identities for a same-business stall.'
            },
            post: {
                summary: 'Authorize a Telegram cook',
                description: 'Owner/Manager only. Creates or reactivates a stall-scoped Telegram identity. This does not create a web user or JWT role.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['telegram_user_id', 'display_name'],
                                properties: {
                                    telegram_user_id: { type: 'string', example: '123456789' },
                                    display_name: { type: 'string', example: 'Kitchen Dara' }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/stalls/{id}/telegram-cooks/{cookId}': {
            delete: {
                summary: 'Revoke a Telegram cook',
                description: 'Owner/Manager only. Deactivates one stall-scoped Telegram identity without affecting other cooks.'
            }
        },
        '/api/stalls/{id}/telegram-connection': {
            post: {
                summary: 'Create a Telegram kitchen-group connection link',
                description: 'Owner only. Returns a short-lived Telegram startgroup link for the same-business stall. The raw one-time token is returned in the link while only its SHA-256 hash is stored. Telegram consumes the token when the bot is added to a group.',
                responses: {
                    201: { description: 'Short-lived Telegram group-selection link created' },
                    404: { description: 'Stall not found in this business' },
                    503: { description: 'Telegram bot is not configured or cannot be verified' }
                }
            }
        },
        '/api/stalls/{id}/register-device': {
            post: {
                summary: 'Register a cashier terminal to a stall',
                description: 'Owner/Manager only. Creates an additional named device and returns its raw token once. The database stores only a SHA-256 hash.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['device_name'],
                                properties: {
                                    device_name: { type: 'string', minLength: 2, maxLength: 100, example: 'Front Counter Tablet' }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/stalls/{id}/devices/{deviceId}': {
            delete: {
                summary: 'Deregister one cashier terminal',
                description: 'Owner/Manager only. Revokes only the selected device, invalidates its device-bound cashier JWT access, and emits a targeted device:revoked event. Other stall devices remain active.'
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
                description: 'Owner/Manager only. Supports range, custom date window, stall, cashier, and paginated ledger search filters. Returns backend-scoped summary, stall/cashier/hourly breakdowns, and ledger rows. Dashboard callers may request period-aware trend and previous-period comparison data.',
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
                    },
                    {
                        name: 'search',
                        in: 'query',
                        schema: { type: 'string', maxLength: 100 },
                        description: 'Searches ledger rows by exact order ID or partial payment reference, cashier username, stall name/location, payment method, or status.'
                    },
                    {
                        name: 'include_trends',
                        in: 'query',
                        schema: { type: 'boolean', default: false },
                        description: 'When true, includes dashboard trend points and previous-period comparisons. Today and one-day custom ranges are hourly; week/month and custom ranges up to 31 days are daily; longer custom ranges use seven-day buckets.'
                    }
                ],
                responses: {
                    200: { description: 'Sales report summary and ledger rows' },
                    400: { description: 'Invalid filter input' },
                    401: { description: 'Unauthenticated' },
                    403: { description: 'Owner/Manager role required' }
                }
            }
        }
    }
};
