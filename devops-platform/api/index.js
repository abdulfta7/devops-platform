require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/auth', require('../backend/src/routes/auth'));
app.use('/tracks', require('../backend/src/routes/tracks'));
app.use('/courses', require('../backend/src/routes/courses'));
app.use('/tasks', require('../backend/src/routes/tasks'));
app.use('/payments', require('../backend/src/routes/payments'));
app.use('/admin', require('../backend/src/routes/admin'));
app.use('/live', require('../backend/src/routes/live'));
app.use('/reviews', require('../backend/src/routes/reviews'));
app.use('/certificates', require('../backend/src/routes/certificates'));
app.use('/notifications', require('../backend/src/routes/notifications'));
app.use('/search', require('../backend/src/routes/search'));
app.use('/articles', require('../backend/src/routes/articles'));

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;