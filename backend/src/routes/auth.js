const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Register
router.post('/register', validateRegistration, async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await db.prepare('INSERT INTO users (id, name, email, password, phone, verification_token) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, email, hash, phone, verificationToken);

  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const user = await db.prepare('SELECT id, name, email, phone, role, avatar, is_approved, is_verified FROM users WHERE id = ?').get(id);

  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  sendEmail({
    to: email,
    subject: 'Welcome to CloudNexa Academy - Verify Your Email',
    html: `<p>Hi ${name},</p><p>Please verify your email by clicking: <a href="${verifyUrl}">Verify Email</a></p>`,
  }).catch(console.error);

  res.json({ token, user, message: 'Registration successful! Please check your email to verify your account.' });
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
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
  const { name, phone } = req.body;
  await db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone || null, req.user.id);
  const user = await db.prepare('SELECT id, name, email, phone, role, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user });
});

// Update Avatar
router.put('/profile/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  await db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(req.file.path, req.user.id);
  const user = await db.prepare('SELECT id, name, email, phone, role, avatar FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user });
});

// Change Password
router.put('/profile/password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Invalid current password' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true, message: 'Password updated successfully' });
});

// Request Password Reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(404).json({ error: 'User with this email does not exist' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

  await db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
    .run(resetToken, resetTokenExpires, user.id);

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
    await db.prepare('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(user.id);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  const user = await db.prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?')
    .get(token, new Date().toISOString());

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const hash = bcrypt.hashSync(password, 10);

  await db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(hash, user.id);

  res.json({ success: true, message: 'Password has been reset successfully' });
});

// Verify Email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;

  const user = await db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);

  if (!user) {
    return res.status(400).json({ error: 'Invalid verification token' });
  }

  await db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);

  res.json({ success: true, message: 'Email verified successfully' });
});

module.exports = router;
