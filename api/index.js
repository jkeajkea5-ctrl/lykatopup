import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/db.js';
import { ensureDefaultAdmin } from './services/bootstrap.js';
import { sanitizeMongoOperators } from './middleware/sanitize.js';
import { requireDatabase } from './middleware/database.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import packageRoutes from './routes/packages.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import deliveryRoutes from './routes/delivery.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import storefrontRoutes from './routes/storefront.js';

const app = express();
const port = process.env.PORT || 5000;
const configuredClientOrigins = process.env.CLIENT_URL?.split(',').map((origin) => origin.trim()).filter(Boolean) || [];
const localClientOrigins = process.env.NODE_ENV === 'production' ? [] : ['http://localhost', 'http://localhost:5173'];
const clientOrigins = [...new Set([...configuredClientOrigins, ...localClientOrigins])];

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'img-src': ["'self'", 'data:', 'https:']
    }
  }
}));
app.use(cors({ origin: clientOrigins.length ? clientOrigins : true, credentials: true }));
app.use(express.json({ limit: '8mb' }));
app.use(sanitizeMongoOperators);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 400 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60 }));
app.use('/api/payments', rateLimit({ windowMs: 60 * 1000, limit: 80 }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Lyka Topup API' });
});

app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/games', requireDatabase, gameRoutes);
app.use('/api/packages', requireDatabase, packageRoutes);
app.use('/api/storefront', requireDatabase, storefrontRoutes);
app.use('/api/orders', requireDatabase, orderRoutes);
app.use('/api/payments', requireDatabase, paymentRoutes);
app.use('/api/delivery', requireDatabase, deliveryRoutes);
app.use('/api/admin', requireDatabase, adminRoutes);
app.use('/api/settings', requireDatabase, settingsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

if (process.env.MONGODB_URI) {
  connectDatabase()
    .then(ensureDefaultAdmin)
    .catch((error) => {
      console.error('Database startup failed', error);
    });
} else {
  console.warn('MONGODB_URI is not set. Database routes will fail until it is configured.');
}

if (process.env.VERCEL !== '1') {
  app.listen(port, () => console.log(`Lyka Topup API running on http://localhost:${port}`));
}

export default app;
