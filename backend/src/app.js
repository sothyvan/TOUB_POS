import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import orderRoutes from './routes/order.routes.js';
import productRoutes from './routes/product.routes.js';
import userRoutes from './routes/user.routes.js';
import reportRoutes from './routes/report.routes.js';
import stallRoutes from './routes/stall.routes.js';
import categoryRoutes from './routes/category.routes.js';
import telegramRoutes from './routes/telegram.routes.js';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestContext, requestLogger } from './middleware/logger.middleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger.js';
import { getRateLimitConfiguration } from './config/rate-limit.config.js';
import { rejectRequestsWhileDraining } from './services/application-lifecycle.service.js';
import {
  getApiContentSecurityPolicy,
  getApiDocsConfiguration,
  getSwaggerContentSecurityPolicy,
} from './config/security.config.js';
import { requireApiDocsAuthentication } from './middleware/api-docs.middleware.js';

const app = express();
const { trustProxyHops } = getRateLimitConfiguration();
const apiDocsConfiguration = getApiDocsConfiguration();

// Trust only the configured number of reverse-proxy hops when resolving req.ip.
app.set('trust proxy', trustProxyHops);

// ── Global Middleware ─────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: getApiContentSecurityPolicy(),
  },
}));
app.use(requestContext);
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    const isDev = process.env.NODE_ENV !== 'production';
    const allowedOrigin = process.env.FRONTEND_ORIGIN || (isDev ? 'http://localhost:5173' : null);

    if (isDev) {
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }

    if (!allowedOrigin) {
      return callback(new Error('FRONTEND_ORIGIN is required when NODE_ENV is production.'));
    }

    if (!origin || origin === allowedOrigin) {
      return callback(null, true);
    }

    callback(new Error(`CORS origin is not allowed: ${origin}`));
  },
}));
app.use(express.json());
app.use(requestLogger);
if (apiDocsConfiguration.enabled) {
  app.use(
    '/api/docs',
    requireApiDocsAuthentication(apiDocsConfiguration),
    helmet.contentSecurityPolicy({ directives: getSwaggerContentSecurityPolicy() }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument),
  );
}
app.use('/api/health', healthRoutes);
app.use(rejectRequestsWhileDraining);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stalls', stallRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/telegram', telegramRoutes);

// ── Global Error Handler (must be last) ──────────────────
app.use(errorHandler);

export default app;
