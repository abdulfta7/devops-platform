const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingResult = await executeQuery('SELECT id FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await executeQuery('INSERT INTO users (id, name, email, password, phone, verification_token) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, name, email, hash, phone, verificationToken]);

    const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userResult = await executeQuery('SELECT id, name, email, phone, role, avatar, is_approved, is_verified FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0];

    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    sendEmail({
      to: email,
      subject: 'Welcome to CloudNexa Academy - Verify Your Email',
      html: `<p>Hi ${name},</p><p>Please verify your email by clicking: <a href="${verifyUrl}">Verify Email</a></p>`,
    }).catch(console.error);

    res.json({ token, user, message: 'Registration successful! Please check your email to verify your account.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const userResult = await executeQuery('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json(req.user);
});

const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await executeQuery('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [name, phone || null, req.user.id]);
    const userResult = await executeQuery('SELECT id, name, email, phone, role, avatar FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, user: userResult.rows[0] });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Update Avatar
router.put('/profile/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    await executeQuery('UPDATE users SET avatar = $1 WHERE id = $2', [req.file.path, req.user.id]);
    const userResult = await executeQuery('SELECT id, name, email, phone, role, avatar FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, user: userResult.rows[0] });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({ error: 'Avatar update failed' });
  }
});

// Change Password
router.put('/profile/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userResult = await executeQuery('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Invalid current password' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    await executeQuery('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Request Password Reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const userResult = await executeQuery('SELECT id, name FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await executeQuery('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]);

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const message = `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Please click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link is valid for 1 hour.</p>
    `;

    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: message,
      });
      res.json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
      await executeQuery('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1', [user.id]);
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Forgot password failed' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const userResult = await executeQuery('SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > $2',
      [token, new Date().toISOString()]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hash = bcrypt.hashSync(password, 10);

    await executeQuery('UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, user.id]);

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Reset password failed' });
  }
});

// Verify Email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    const userResult = await executeQuery('SELECT id FROM users WHERE verification_token = $1', [token]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    await executeQuery('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = $1', [user.id]);

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

module.exports = router;
