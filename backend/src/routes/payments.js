const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, isAdmin, requireApproval } = require('../middleware/auth');

// Enroll in course (direct enrollment, no payment required)
router.post('/enroll', authenticate, async (req, res) => {
  const { course_id } = req.body;
  const course = await db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const existing = await db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, course_id);
  if (existing) return res.json({ success: true, message: 'Already enrolled' });

  await db.prepare('INSERT INTO enrollments (id, user_id, course_id, payment_status, is_approved) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, course_id, 'approved', 0);
  res.json({ success: true, message: 'Enrollment request submitted! Waiting for admin approval.' });
});

// Get user enrollments
router.get('/my-courses', authenticate, async (req, res) => {
  const enrollments = await db.prepare(`
    SELECT e.*, c.title, c.slug, c.thumbnail, c.level, c.duration_hours, t.title as track_title, t.color as track_color
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN tracks t ON t.id = c.track_id
    WHERE e.user_id = ?
    ORDER BY e.enrolled_at DESC
  `).all(req.user.id);
  res.json(enrollments);
});

// Admin: Get stats
router.get('/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const stats = {
      total_users: (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get()).c,
      total_enrollments: (await db.prepare("SELECT COUNT(*) as c FROM enrollments").get()).c,
      pending_tasks: (await db.prepare("SELECT COUNT(*) as c FROM task_submissions WHERE status = 'pending'").get()).c,
      total_courses: (await db.prepare("SELECT COUNT(*) as c FROM courses WHERE is_published = 1").get()).c,
      pending_approvals: (await db.prepare("SELECT COUNT(*) as c FROM users WHERE is_approved = 0").get()).c,
      pending_enrollments: (await db.prepare("SELECT COUNT(*) as c FROM enrollments WHERE is_approved = 0").get()).c,
    };
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Admin: Get pending enrollments
router.get('/admin/pending-enrollments', authenticate, isAdmin, async (req, res) => {
  const enrollments = await db.prepare(`
    SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title, c.slug as course_slug
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN courses c ON c.id = e.course_id
    WHERE e.is_approved = 0
    ORDER BY e.enrolled_at DESC
  `).all();
  res.json(enrollments);
});

// Admin: Approve enrollment
router.put('/admin/enrollments/:id/approve', authenticate, isAdmin, async (req, res) => {
  const enrollment = await db.prepare('SELECT * FROM enrollments WHERE id = ?').get(req.params.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

  await db.prepare('UPDATE enrollments SET is_approved = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id, req.params.id);
  res.json({ success: true, message: 'Enrollment approved successfully!' });
});

// Admin: Reject enrollment
router.put('/admin/enrollments/:id/reject', authenticate, isAdmin, async (req, res) => {
  const enrollment = await db.prepare('SELECT * FROM enrollments WHERE id = ?').get(req.params.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

  await db.prepare('DELETE FROM enrollments WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Enrollment rejected and removed.' });
});

module.exports = router;