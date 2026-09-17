const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get platform statistics
router.get('/stats', authenticate, isAdmin, async (req, res) => {
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
      pending_tasks: 0, // Will be calculated separately if needed
    };
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all users
router.get('/users', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery('SELECT id, name, email, phone, role, is_approved, approved_by, approved_at, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get pending users (for approval)
router.get('/users/pending', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery('SELECT id, name, email, phone, created_at FROM users WHERE is_approved = 0 ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Approve user account
router.put('/users/:id/approve', authenticate, isAdmin, async (req, res) => {
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
router.delete('/users/:id/reject', authenticate, isAdmin, async (req, res) => {
  try {
    const userResult = await executeQuery('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin user' });

    // Delete user and all related data
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
router.get('/courses', authenticate, isAdmin, async (req, res) => {
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
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get all submissions
router.get('/submissions', authenticate, isAdmin, async (req, res) => {
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
router.put('/submissions/:id', authenticate, isAdmin, async (req, res) => {
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

// Delete a user
router.delete('/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await executeQuery('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Toggle course publish status
router.put('/courses/:id/toggle', authenticate, isAdmin, async (req, res) => {
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

// Add roadmap step
router.post('/roadmap', authenticate, isAdmin, async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const { track_id, course_id, title, description, step_type, order_num, is_required } = req.body;
    const id = uuidv4();
    await executeQuery('INSERT INTO roadmap_steps (id, track_id, course_id, title, description, step_type, order_num, is_required) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, track_id, course_id || null, title, description, step_type || 'course', order_num || 0, is_required ? 1 : 0]);
    res.json({ id });
  } catch (error) {
    console.error('Error adding roadmap step:', error);
    res.status(500).json({ error: 'Failed to add roadmap step' });
  }
});

// Delete video
router.delete('/courses/videos/:videoId', authenticate, isAdmin, async (req, res) => {
  try {
    // Delete video progress first to avoid foreign key constraint
    await executeQuery('DELETE FROM video_progress WHERE video_id = $1', [req.params.videoId]);
    // Then delete the video
    await executeQuery('DELETE FROM videos WHERE id = $1', [req.params.videoId]);
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
    await executeQuery('DELETE FROM task_submissions WHERE task_id = $1', [req.params.taskId]);
    // Then delete the task
    await executeQuery('DELETE FROM tasks WHERE id = $1', [req.params.taskId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting task:', err.message);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Update course price
router.put('/courses/:id/price', authenticate, isAdmin, async (req, res) => {
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

module.exports = router;
