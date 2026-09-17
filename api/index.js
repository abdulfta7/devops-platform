const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('../backend/src/database');

// Import routes
const authRoutes = require('../backend/src/routes/auth');
const tracksRoutes = require('../backend/src/routes/tracks');
const coursesRoutes = require('../backend/src/routes/courses');
const tasksRoutes = require('../backend/src/routes/tasks');
const paymentsRoutes = require('../backend/src/routes/payments');
const adminRoutes = require('../backend/src/routes/admin');
const liveRoutes = require('../backend/src/routes/live');
const reviewsRoutes = require('../backend/src/routes/reviews');
const certificatesRoutes = require('../backend/src/routes/certificates');
const notificationsRoutes = require('../backend/src/routes/notifications');
const searchRoutes = require('../backend/src/routes/search');
const articlesRoutes = require('../backend/src/routes/articles');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting with Vercel compatibility
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['forwarded'] !== undefined
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['forwarded'] !== undefined
});

if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
}

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracks', tracksRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/articles', articlesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = async (req, res) => {
  // Set proper headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Wrap the response to close DB connection after response
  const originalEnd = res.end;
  let dbClosed = false;
  res.end = function(...args) {
    if (!dbClosed) {
      dbClosed = true;
      db.close().catch(err => console.error('Error closing DB:', err));
    }
    originalEnd.apply(this, args);
  };

  app(req, res);
};
