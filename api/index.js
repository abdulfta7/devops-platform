const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { executeQuery } = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// Import authentication middleware
const { authenticate, isAdmin, requireApproval } = require('./middleware/auth');
const { validateRegistration, validateLogin } = require('./middleware/validation');

// Cloudinary config
const { storage } = require('./config/cloudinary');
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

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

// ── AUTH ROUTES ────────────────────────────────────────────────────────

// Register
app.post('/api/auth/register', validateRegistration, async (req, res) => {
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

    res.json({ token, user, message: 'Registration successful!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', validateLogin, async (req, res) => {
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
app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json(req.user);
});

// Update profile
app.put('/api/auth/profile', authenticate, async (req, res) => {
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
app.put('/api/auth/profile/avatar', authenticate, upload.single('avatar'), async (req, res) => {
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
app.put('/api/auth/profile/password', authenticate, async (req, res) => {
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
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const userResult = await executeQuery('SELECT id, name FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User with this email does not exist' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000).toISOString();

    await executeQuery('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]);

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Forgot password failed' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
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
app.post('/api/auth/verify-email', async (req, res) => {
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

// ── TRACKS ROUTES ────────────────────────────────────────────────────────

// Get all tracks with course count
app.get('/api/tracks', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT t.*, COUNT(c.id) as course_count
      FROM tracks t
      LEFT JOIN courses c ON c.track_id = t.id AND c.is_published = 1
      GROUP BY t.id
      ORDER BY t.order_num
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Get single track with courses
app.get('/api/tracks/:slug', async (req, res) => {
  try {
    const trackResult = await executeQuery('SELECT * FROM tracks WHERE slug = $1', [req.params.slug]);
    const track = trackResult.rows[0];
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const coursesResult = await executeQuery(`
      SELECT * FROM courses WHERE track_id = $1 AND is_published = 1 ORDER BY order_num
    `, [track.id]);

    res.json({ ...track, courses: coursesResult.rows });
  } catch (error) {
    console.error('Error fetching track:', error);
    res.status(500).json({ error: 'Failed to fetch track' });
  }
});

// Get roadmap for a track
app.get('/api/tracks/:slug/roadmap', async (req, res) => {
  try {
    const trackResult = await executeQuery('SELECT * FROM tracks WHERE slug = $1', [req.params.slug]);
    const track = trackResult.rows[0];
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const stepsResult = await executeQuery(`
      SELECT rs.id, rs.track_id, rs.course_id, rs.title, rs.description,
             rs.step_type, rs.level_num, rs.level_title, rs.order_num, rs.is_required,
             c.title as course_title, c.slug as course_slug, c.price, c.is_free,
             c.level as course_level, c.duration_hours
      FROM roadmap_steps rs
      LEFT JOIN courses c ON c.id = rs.course_id
      WHERE rs.track_id = $1
      ORDER BY rs.level_num, rs.order_num
    `, [track.id]);

    res.json({ track, steps: stepsResult.rows });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// Admin: Create track
app.post('/api/tracks', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, slug, description, icon, color, order_num } = req.body;
    const id = uuidv4();
    await executeQuery('INSERT INTO tracks (id, title, slug, description, icon, color, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, title, slug, description, icon, color, order_num || 0]);
    res.json({ id, title, slug, description, icon, color });
  } catch (error) {
    console.error('Error creating track:', error);
    res.status(500).json({ error: 'Failed to create track' });
  }
});

// Admin: Update track
app.put('/api/tracks/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, icon, color, order_num } = req.body;
    await executeQuery('UPDATE tracks SET title=$1, description=$2, icon=$3, color=$4, order_num=$5 WHERE id=$6',
      [title, description, icon, color, order_num, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating track:', error);
    res.status(500).json({ error: 'Failed to update track' });
  }
});

// ── COURSES ROUTES ───────────────────────────────────────────────────────

// Get all courses (with optional track filter)
app.get('/api/courses', async (req, res) => {
  try {
    const { track } = req.query;
    let query = `
      SELECT c.*, t.title as track_title, t.slug as track_slug, t.color as track_color,
             COUNT(DISTINCT v.id) as video_count,
             COUNT(DISTINCT tk.id) as task_count
      FROM courses c
      LEFT JOIN tracks t ON t.id = c.track_id
      LEFT JOIN videos v ON v.course_id = c.id
      LEFT JOIN tasks tk ON tk.course_id = c.id
      WHERE c.is_published = 1
    `;
    if (track) { query += ' AND t.slug = $1'; }
    query += ' GROUP BY c.id ORDER BY c.order_num';

    const result = track ? await executeQuery(query, [track]) : await executeQuery(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get single course
app.get('/api/courses/:slug', async (req, res) => {
  try {
    const courseResult = await executeQuery(`
      SELECT c.*, t.title as track_title, t.slug as track_slug, t.color as track_color
      FROM courses c
      LEFT JOIN tracks t ON t.id = c.track_id
      WHERE c.slug = $1
    `, [req.params.slug]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const videosResult = await executeQuery('SELECT * FROM videos WHERE course_id = $1 ORDER BY order_num', [course.id]);
    const tasksResult = await executeQuery('SELECT id, title, description, difficulty, order_num FROM tasks WHERE course_id = $1 ORDER BY order_num', [course.id]);

    // Get rating info
    const ratingInfoResult = await executeQuery(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM reviews
      WHERE course_id = $1
    `, [course.id]);
    const ratingInfo = ratingInfoResult.rows[0];

    res.json({
      ...course,
      videos: videosResult.rows,
      tasks: tasksResult.rows,
      avg_rating: ratingInfo.avg_rating || 0,
      review_count: ratingInfo.review_count || 0
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Check enrollment
app.get('/api/courses/:slug/enrollment', authenticate, async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT * FROM courses WHERE slug = $1', [req.params.slug]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrollmentResult = await executeQuery('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, course.id]);
    const enrollment = enrollmentResult.rows[0];
    const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
    res.json({ enrolled: !!enrollment, is_free: course.is_free === 1, is_approved: enrollment?.is_approved === 1, hasAccess });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

// Enroll in course
app.post('/api/payments/enroll', authenticate, async (req, res) => {
  try {
    const { course_id } = req.body;
    const courseResult = await executeQuery('SELECT * FROM courses WHERE id = $1', [course_id]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const existingResult = await executeQuery('SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, course_id]);
    if (existingResult.rows.length > 0) return res.json({ success: true, message: 'Already enrolled' });

    await executeQuery('INSERT INTO enrollments (id, user_id, course_id, payment_status, is_approved) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), req.user.id, course_id, 'approved', 0]);
    res.json({ success: true, message: 'Enrollment request submitted! Waiting for admin approval.' });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// Get user enrollments
app.get('/api/payments/my-courses', authenticate, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT e.*, c.title, c.slug, c.thumbnail, c.level, c.duration_hours, t.title as track_title, t.color as track_color
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN tracks t ON t.id = c.track_id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Admin: Get stats
app.get('/api/payments/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const totalUsersResult = await executeQuery("SELECT COUNT(*) as c FROM users WHERE role = 'student'");
    const totalEnrollmentsResult = await executeQuery("SELECT COUNT(*) as c FROM enrollments");
    const pendingTasksResult = await executeQuery("SELECT COUNT(*) as c FROM task_submissions WHERE status = 'pending'");
    const totalCoursesResult = await executeQuery("SELECT COUNT(*) as c FROM courses WHERE is_published = 1");
    const pendingApprovalsResult = await executeQuery("SELECT COUNT(*) as c FROM users WHERE is_approved = 0");
    const pendingEnrollmentsResult = await executeQuery("SELECT COUNT(*) as c FROM enrollments WHERE is_approved = 0");

    const stats = {
      total_users: totalUsersResult.rows[0].c,
      total_enrollments: totalEnrollmentsResult.rows[0].c,
      pending_tasks: pendingTasksResult.rows[0].c,
      total_courses: totalCoursesResult.rows[0].c,
      pending_approvals: pendingApprovalsResult.rows[0].c,
      pending_enrollments: pendingEnrollmentsResult.rows[0].c,
    };
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Admin: Get pending enrollments
app.get('/api/payments/admin/pending-enrollments', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title, c.slug as course_slug
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN courses c ON c.id = e.course_id
      WHERE e.is_approved = 0
      ORDER BY e.enrolled_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch pending enrollments' });
  }
});

// Admin: Approve enrollment
app.put('/api/payments/admin/enrollments/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const enrollmentResult = await executeQuery('SELECT * FROM enrollments WHERE id = $1', [req.params.id]);
    const enrollment = enrollmentResult.rows[0];
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    await executeQuery('UPDATE enrollments SET is_approved = 1, approved_by = $1, approved_at = CURRENT_TIMESTAMP WHERE id = $2',
      [req.user.id, req.params.id]);
    res.json({ success: true, message: 'Enrollment approved successfully!' });
  } catch (error) {
    console.error('Error approving enrollment:', error);
    res.status(500).json({ error: 'Failed to approve enrollment' });
  }
});

// Admin: Reject enrollment
app.put('/api/payments/admin/enrollments/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const enrollmentResult = await executeQuery('SELECT * FROM enrollments WHERE id = $1', [req.params.id]);
    const enrollment = enrollmentResult.rows[0];
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    await executeQuery('DELETE FROM enrollments WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Enrollment rejected and removed.' });
  } catch (error) {
    console.error('Error rejecting enrollment:', error);
    res.status(500).json({ error: 'Failed to reject enrollment' });
  }
});

// ── ADMIN ROUTES ────────────────────────────────────────────────────────

// Get platform statistics
app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const usersResult = await executeQuery('SELECT COUNT(*) as count FROM users');
    const coursesResult = await executeQuery('SELECT COUNT(*) as count FROM courses WHERE is_published = 1');
    const enrollmentsResult = await executeQuery('SELECT COUNT(*) as count FROM enrollments');
    const submissionsResult = await executeQuery('SELECT COUNT(*) as count FROM task_submissions');
    const revenueResult = await executeQuery("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'");
    const pendingApprovalsResult = await executeQuery("SELECT COUNT(*) as count FROM users WHERE is_approved = 0");
    const pendingEnrollmentsResult = await executeQuery("SELECT COUNT(*) as count FROM enrollments WHERE is_approved = 0");

    const stats = {
      total_users: usersResult.rows[0].count,
      total_courses: coursesResult.rows[0].count,
      total_enrollments: enrollmentsResult.rows[0].count,
      total_submissions: submissionsResult.rows[0].count,
      revenue: revenueResult.rows[0].total,
      pending_approvals: pendingApprovalsResult.rows[0].count,
      pending_enrollments: pendingEnrollmentsResult.rows[0].count,
      pending_tasks: 0,
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all users
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery('SELECT id, name, email, phone, role, is_approved, approved_by, approved_at, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get pending users (for approval)
app.get('/api/admin/users/pending', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery('SELECT id, name, email, phone, created_at FROM users WHERE is_approved = 0 ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Approve user account
app.put('/api/admin/users/:id/approve', authenticate, isAdmin, async (req, res) => {
  try {
    const userResult = await executeQuery('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_approved) return res.status(400).json({ error: 'User already approved' });

    await executeQuery('UPDATE users SET is_approved = 1, approved_by = $1, approved_at = CURRENT_TIMESTAMP WHERE id = $2',
      [req.user.id, req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Reject user account
app.delete('/api/admin/users/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const userResult = await executeQuery('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin user' });

    await executeQuery('DELETE FROM enrollments WHERE user_id = $1', [req.params.id]);
    await executeQuery('DELETE FROM video_progress WHERE user_id = $1', [req.params.id]);
    await executeQuery('DELETE FROM task_submissions WHERE user_id = $1', [req.params.id]);
    await executeQuery('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// Get all courses (admin view)
app.get('/api/admin/courses', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT c.*, t.title as track_title,
             COUNT(DISTINCT v.id) as video_count,
             COUNT(DISTINCT tk.id) as task_count,
             COUNT(DISTINCT e.id) as enrollment_count
      FROM courses c
      LEFT JOIN tracks t ON t.id = c.track_id
      LEFT JOIN videos v ON v.course_id = c.id
      LEFT JOIN tasks tk ON tk.course_id = c.id
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id
      ORDER BY c.order_num
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin courses:', error);
    res.status(500).json({ error: 'Failed to fetch admin courses' });
  }
});

// Get all submissions
app.get('/api/admin/submissions', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ts.*, t.title as task_title, c.title as course_title, u.name as student_name, u.email as student_email
      FROM task_submissions ts
      JOIN tasks t ON t.id = ts.task_id
      JOIN courses c ON c.id = t.course_id
      JOIN users u ON u.id = ts.user_id
    `;
    if (status) query += ` WHERE ts.status = $1`;
    query += ' ORDER BY ts.submitted_at DESC';

    const result = status
      ? await executeQuery(query, [status])
      : await executeQuery(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// Review a submission
app.put('/api/admin/submissions/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, feedback } = req.body;
    await executeQuery('UPDATE task_submissions SET status = $1, feedback = $2, reviewed_at = CURRENT_TIMESTAMP WHERE id = $3',
      [status, feedback, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reviewing submission:', error);
    res.status(500).json({ error: 'Failed to review submission' });
  }
});

// Toggle course publish status
app.put('/api/admin/courses/:id/toggle', authenticate, isAdmin, async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT is_published FROM courses WHERE id = $1', [req.params.id]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await executeQuery('UPDATE courses SET is_published = $1 WHERE id = $2',
      [course.is_published ? 0 : 1, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling course:', error);
    res.status(500).json({ error: 'Failed to toggle course' });
  }
});

// Update course price
app.put('/api/admin/courses/:id/price', authenticate, isAdmin, async (req, res) => {
  try {
    const { price, is_free } = req.body;
    await executeQuery('UPDATE courses SET price=$1, is_free=$2 WHERE id=$3',
      [price || 0, is_free ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating course price:', error);
    res.status(500).json({ error: 'Failed to update course price' });
  }
});

// ── TASKS ROUTES ────────────────────────────────────────────────────────

// Get task details
app.get('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const taskResult = await executeQuery(`
      SELECT t.*, c.title as course_title, c.slug as course_slug, c.is_free, c.id as cid
      FROM tasks t
      JOIN courses c ON c.id = t.course_id
      WHERE t.id = $1
    `, [req.params.id]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const enrollmentResult = await executeQuery('SELECT id, is_approved FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, task.cid]);
    const enrollment = enrollmentResult.rows[0];
    const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
    if (!hasAccess) return res.status(403).json({ error: 'Please enroll in this course first and wait for approval' });

    const submissionResult = await executeQuery('SELECT * FROM task_submissions WHERE task_id = $1 AND user_id = $2 ORDER BY submitted_at DESC LIMIT 1', [task.id, req.user.id]);
    const submission = submissionResult.rows[0];

    res.json({ ...task, submission });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Submit task
app.post('/api/tasks/:id/submit', authenticate, async (req, res) => {
  try {
    const { answer } = req.body;
    const taskResult = await executeQuery('SELECT t.*, c.is_free, c.id as cid FROM tasks t JOIN courses c ON c.id = t.course_id WHERE t.id = $1', [req.params.id]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const enrollmentResult = await executeQuery('SELECT id, is_approved FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, task.cid]);
    const enrollment = enrollmentResult.rows[0];
    const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
    if (!hasAccess) return res.status(403).json({ error: 'Please enroll first and wait for approval' });

    const id = uuidv4();
    await executeQuery('INSERT INTO task_submissions (id, task_id, user_id, answer, status) VALUES ($1, $2, $3, $4, $5)',
      [id, task.id, req.user.id, answer, 'pending']);
    res.json({ id, status: 'pending', message: 'Submission received! Your instructor will review it shortly.' });
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

// Get user's submissions
app.get('/api/tasks/my/submissions', authenticate, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT ts.*, t.title as task_title, t.difficulty, c.title as course_title, c.slug as course_slug
      FROM task_submissions ts
      JOIN tasks t ON t.id = ts.task_id
      JOIN courses c ON c.id = t.course_id
      WHERE ts.user_id = $1
      ORDER BY ts.submitted_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// ── LIVE COURSES ROUTES ─────────────────────────────────────────────────────

// Get all published live courses
app.get('/api/live', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT lc.*,
             COUNT(lr.id) as reg_count
      FROM live_courses lc
      LEFT JOIN live_registrations lr ON lr.course_id = lc.id
      WHERE lc.is_published = 1
      GROUP BY lc.id
      ORDER BY lc.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching live courses:', error);
    res.status(500).json({ error: 'Failed to fetch live courses' });
  }
});

// Get single live course by slug
app.get('/api/live/:slug', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT lc.*, COUNT(lr.id) as reg_count
      FROM live_courses lc
      LEFT JOIN live_registrations lr ON lr.course_id = lc.id
      WHERE lc.slug = $1 AND lc.is_published = 1
      GROUP BY lc.id
    `, [req.params.slug]);
    const course = result.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    console.error('Error fetching live course:', error);
    res.status(500).json({ error: 'Failed to fetch live course' });
  }
});

// Register for a live course (public — no login needed)
app.post('/api/live/:slug/register', async (req, res) => {
  try {
    const courseResult = await executeQuery("SELECT * FROM live_courses WHERE slug = $1 AND is_published = 1", [req.params.slug]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!course.is_open) return res.status(400).json({ error: 'Registration is closed for this course' });

    const { name, email, phone, age, experience, note } = req.body;
    if (!name?.trim())  return res.status(400).json({ error: 'Name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!phone?.trim()) return res.status(400).json({ error: 'Phone is required' });

    const existsResult = await executeQuery("SELECT id FROM live_registrations WHERE course_id = $1 AND email = $2", [course.id, email.trim().toLowerCase()]);
    if (existsResult.rows.length > 0) return res.status(400).json({ error: 'This email is already registered for this course' });

    const id = uuidv4();
    await executeQuery(`
      INSERT INTO live_registrations (id, course_id, name, email, phone, age, experience, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, course.id, name.trim(), email.trim().toLowerCase(), phone.trim(), age || '', experience || '', note || '']);

    res.json({ success: true, message: `✅ Registered successfully! We'll contact you on ${phone.trim()} with course details.` });
  } catch (error) {
    console.error('Error registering for live course:', error);
    res.status(500).json({ error: 'Failed to register for live course' });
  }
});

// Admin: Get all live courses
app.get('/api/live/admin/all', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT lc.*,
             COUNT(lr.id) as reg_count,
             SUM(CASE WHEN lr.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
      FROM live_courses lc
      LEFT JOIN live_registrations lr ON lr.course_id = lc.id
      GROUP BY lc.id
      ORDER BY lc.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all live courses:', error);
    res.status(500).json({ error: 'Failed to fetch all live courses' });
  }
});

// Admin: Get registrations for a course
app.get('/api/live/admin/:courseId/registrations', authenticate, isAdmin, async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT * FROM live_courses WHERE id = $1', [req.params.courseId]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const regsResult = await executeQuery("SELECT * FROM live_registrations WHERE course_id = $1 ORDER BY registered_at DESC", [req.params.courseId]);
    res.json({ course, registrations: regsResult.rows });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Admin: Create live course
app.post('/api/live/admin/create', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, slug, description, details, instructor, price, currency, start_date, schedule, duration, seats, cover_emoji } = req.body;
    if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });
    const id = uuidv4();
    await executeQuery(`
      INSERT INTO live_courses (id,title,slug,description,details,instructor,price,currency,start_date,schedule,duration,seats,cover_emoji)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [id, title, slug, description||'', details||'', instructor||'', price||0, currency||'EGP', start_date||'', schedule||'', duration||'', seats||0, cover_emoji||'🎓']);
    res.json({ id, slug });
  } catch (error) {
    console.error('Error creating live course:', error);
    res.status(500).json({ error: 'Failed to create live course' });
  }
});

// Admin: Update live course
app.put('/api/live/admin/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, details, instructor, price, currency, start_date, schedule, duration, seats, is_open, is_published, cover_emoji } = req.body;
    await executeQuery(`
      UPDATE live_courses
      SET title=$1,description=$2,details=$3,instructor=$4,price=$5,currency=$6,
          start_date=$7,schedule=$8,duration=$9,seats=$10,is_open=$11,is_published=$12,cover_emoji=$13
      WHERE id=$14
    `, [title, description, details, instructor, price, currency, start_date, schedule, duration, seats, is_open?1:0, is_published?1:0, cover_emoji, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating live course:', error);
    res.status(500).json({ error: 'Failed to update live course' });
  }
});

// ── HEALTH CHECK ────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Initialize database on startup
let dbInitialized = false;
const ensureDbInitialized = async () => {
  if (!dbInitialized) {
    try {
      console.log('Initializing database...');
      // Test database connection
      await executeQuery('SELECT 1');
      dbInitialized = true;
      console.log('Database initialized successfully');
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  }
};

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = async (req, res) => {
  // Initialize database on first request
  await ensureDbInitialized();

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

  app(req, res);
};
