const jwt = require('jsonwebtoken');
const { executeQuery } = require('../database');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await executeQuery('SELECT id, name, email, phone, role, avatar, is_approved FROM users WHERE id = $1', [decoded.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is approved (for course access)
const requireApproval = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.is_approved) {
    return next();
  }
  return res.status(403).json({ error: 'Account pending approval. Please wait for admin to approve your account.' });
};

// Middleware to check if user can enroll (allows enrollment even if account not approved)
const requireEnrollmentAccess = (req, res, next) => {
  // Allow enrollment for all authenticated users (including those pending account approval)
  // The enrollment itself will require admin approval
  // Also handle case where user.is_approved might be undefined (old data)
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, isAdmin, requireApproval, requireEnrollmentAccess };
