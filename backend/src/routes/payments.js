const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('../database');
const { authenticate, isAdmin, requireApproval } = require('../middleware/auth');

// Enroll in course (direct enrollment, no payment required)
router.post('/enroll', authenticate, async (req, res) => {
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
router.get('/my-courses', authenticate, async (req, res) => {
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
router.get('/admin/stats', authenticate, isAdmin, async (req, res) => {
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
router.get('/admin/pending-enrollments', authenticate, isAdmin, async (req, res) => {
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
router.put('/admin/enrollments/:id/approve', authenticate, isAdmin, async (req, res) => {
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
router.put('/admin/enrollments/:id/reject', authenticate, isAdmin, async (req, res) => {
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

module.exports = router;