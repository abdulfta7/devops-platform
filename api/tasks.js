const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('./database');
const { authenticate, isAdmin } = require('./middleware/auth');

// Get task details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const taskResult = await executeQuery(`
      SELECT t.*, c.title as course_title, c.slug as course_slug, c.is_free, c.id as cid
      FROM tasks t
      JOIN courses c ON c.id = t.course_id
      WHERE t.id = $1
    `, [req.params.id]);
    const task = taskResult.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check access — enrollment with approval is always required, even for free courses
    const enrollmentResult = await executeQuery('SELECT id, is_approved FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, task.cid]);
    const enrollment = enrollmentResult.rows[0];
    const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
    if (!hasAccess) return res.status(403).json({ error: 'Please enroll in this course first and wait for approval' });

    // Get user's submission
    const submissionResult = await executeQuery('SELECT * FROM task_submissions WHERE task_id = $1 AND user_id = $2 ORDER BY submitted_at DESC LIMIT 1', [task.id, req.user.id]);
    const submission = submissionResult.rows[0];

    res.json({ ...task, submission });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Submit task
router.post('/:id/submit', authenticate, async (req, res) => {
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
router.get('/my/submissions', authenticate, async (req, res) => {
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

// Admin: Get all pending submissions
router.get('/admin/pending', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT ts.*, t.title as task_title, c.title as course_title, u.name as student_name, u.email as student_email
      FROM task_submissions ts
      JOIN tasks t ON t.id = ts.task_id
      JOIN courses c ON c.id = t.course_id
      JOIN users u ON u.id = ts.user_id
      WHERE ts.status = 'pending'
      ORDER BY ts.submitted_at ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

// Admin: Review submission
router.put('/admin/submissions/:id/review', authenticate, isAdmin, async (req, res) => {
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

// Admin: Get all tasks
router.get('/admin/all', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT t.*, c.title as course_title
      FROM tasks t
      JOIN courses c ON c.id = t.course_id
      ORDER BY c.title, t.order_num
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).json({ error: 'Failed to fetch all tasks' });
  }
});

module.exports = router;
