const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get platform statistics
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  const stats = {
    users: (await db.prepare('SELECT COUNT(*) as count FROM users').get()).count,
    courses: (await db.prepare('SELECT COUNT(*) as count FROM courses WHERE is_published = 1').get()).count,
    enrollments: (await db.prepare('SELECT COUNT(*) as count FROM enrollments').get()).count,
    submissions: (await db.prepare('SELECT COUNT(*) as count FROM task_submissions').get()).count,
    revenue: (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'").get()).total,
    pending_approvals: (await db.prepare("SELECT COUNT(*) as count FROM users WHERE is_approved = 0").get()).count,
    pending_enrollments: (await db.prepare("SELECT COUNT(*) as count FROM enrollments WHERE is_approved = 0").get()).count,
  };
  res.json(stats);
});

// Get all users
router.get('/users', authenticate, isAdmin, async (req, res) => {
  const users = await db.prepare('SELECT id, name, email, phone, role, is_approved, approved_by, approved_at, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// Get pending users (for approval)
router.get('/users/pending', authenticate, isAdmin, async (req, res) => {
  const users = await db.prepare('SELECT id, name, email, phone, created_at FROM users WHERE is_approved = 0 ORDER BY created_at DESC').all();
  res.json(users);
});

// Approve user account
router.put('/users/:id/approve', authenticate, isAdmin, async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_approved) return res.status(400).json({ error: 'User already approved' });

  await db.prepare('UPDATE users SET is_approved = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.user.id, req.params.id);
  
  res.json({ success: true });
});

// Reject user account
router.delete('/users/:id/reject', authenticate, isAdmin, async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin user' });

  // Delete user and all related data
  await db.prepare('DELETE FROM enrollments WHERE user_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM video_progress WHERE user_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM task_submissions WHERE user_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  
  res.json({ success: true });
});

// Get all courses (admin view)
router.get('/courses', authenticate, isAdmin, async (req, res) => {
  const courses = await db.prepare(`
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
  `).all();
  res.json(courses);
});

// Get all submissions
router.get('/submissions', authenticate, isAdmin, async (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT ts.*, t.title as task_title, c.title as course_title, u.name as student_name, u.email as student_email
    FROM task_submissions ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN courses c ON c.id = t.course_id
    JOIN users u ON u.id = ts.user_id
  `;
  if (status) query += ` WHERE ts.status = '${status}'`;
  query += ' ORDER BY ts.submitted_at DESC';
  res.json(await db.prepare(query).all());
});

// Review a submission
router.put('/submissions/:id', authenticate, isAdmin, async (req, res) => {
  const { status, feedback } = req.body;
  await db.prepare('UPDATE task_submissions SET status = ?, feedback = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, feedback, req.params.id);
  res.json({ success: true });
});

// Delete a user
router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Toggle course publish status
router.put('/courses/:id/toggle', authenticate, isAdmin, async (req, res) => {
  const course = await db.prepare('SELECT is_published FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  await db.prepare('UPDATE courses SET is_published = ? WHERE id = ?').run(course.is_published ? 0 : 1, req.params.id);
  res.json({ success: true });
});

// Add roadmap step
router.post('/roadmap', authenticate, isAdmin, async (req, res) => {
  const { v4: uuidv4 } = require('uuid');
  const { track_id, course_id, title, description, step_type, order_num, is_required } = req.body;
  const id = uuidv4();
  await db.prepare('INSERT INTO roadmap_steps (id, track_id, course_id, title, description, step_type, order_num, is_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, track_id, course_id || null, title, description, step_type || 'course', order_num || 0, is_required ? 1 : 0);
  res.json({ id });
});

// Delete video
router.delete('/courses/videos/:videoId', authenticate, isAdmin, async (req, res) => {
  try {
    // Delete video progress first to avoid foreign key constraint
    await db.prepare('DELETE FROM video_progress WHERE video_id = ?').run(req.params.videoId);
    // Then delete the video
    await db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.videoId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting video:', err.message);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Delete task
router.delete('/courses/tasks/:taskId', authenticate, isAdmin, async (req, res) => {
  try {
    // Delete task submissions first to avoid foreign key constraint
    await db.prepare('DELETE FROM task_submissions WHERE task_id = ?').run(req.params.taskId);
    // Then delete the task
    await db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Update course price
router.put('/courses/:id/price', authenticate, isAdmin, async (req, res) => {
  const { price, is_free } = req.body;
  await db.prepare('UPDATE courses SET price=?, is_free=? WHERE id=?').run(price || 0, is_free ? 1 : 0, req.params.id);
  res.json({ success: true });
});

module.exports = router;
