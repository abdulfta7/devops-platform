const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get task details
router.get('/:id', authenticate, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, c.title as course_title, c.slug as course_slug, c.is_free, c.id as cid
    FROM tasks t
    JOIN courses c ON c.id = t.course_id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Check access — enrollment with approval is always required, even for free courses
  const enrollment = db.prepare('SELECT id, is_approved FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, task.cid);
  const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
  if (!hasAccess) return res.status(403).json({ error: 'Please enroll in this course first and wait for approval' });

  // Get user's submission
  const submission = db.prepare('SELECT * FROM task_submissions WHERE task_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1').get(task.id, req.user.id);

  res.json({ ...task, submission });
});

// Submit task
router.post('/:id/submit', authenticate, (req, res) => {
  const { answer } = req.body;
  const task = db.prepare('SELECT t.*, c.is_free, c.id as cid FROM tasks t JOIN courses c ON c.id = t.course_id WHERE t.id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const enrollment = db.prepare('SELECT id, is_approved FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, task.cid);
  const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
  if (!hasAccess) return res.status(403).json({ error: 'Please enroll first and wait for approval' });

  const id = uuidv4();
  db.prepare('INSERT INTO task_submissions (id, task_id, user_id, answer, status) VALUES (?, ?, ?, ?, ?)').run(id, task.id, req.user.id, answer, 'pending');
  res.json({ id, status: 'pending', message: 'Submission received! Your instructor will review it shortly.' });
});

// Get user's submissions
router.get('/my/submissions', authenticate, (req, res) => {
  const submissions = db.prepare(`
    SELECT ts.*, t.title as task_title, t.difficulty, c.title as course_title, c.slug as course_slug
    FROM task_submissions ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN courses c ON c.id = t.course_id
    WHERE ts.user_id = ?
    ORDER BY ts.submitted_at DESC
  `).all(req.user.id);
  res.json(submissions);
});

// Admin: Get all pending submissions
router.get('/admin/pending', authenticate, isAdmin, (req, res) => {
  const submissions = db.prepare(`
    SELECT ts.*, t.title as task_title, c.title as course_title, u.name as student_name, u.email as student_email
    FROM task_submissions ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN courses c ON c.id = t.course_id
    JOIN users u ON u.id = ts.user_id
    WHERE ts.status = 'pending'
    ORDER BY ts.submitted_at ASC
  `).all();
  res.json(submissions);
});

// Admin: Review submission
router.put('/admin/submissions/:id/review', authenticate, isAdmin, (req, res) => {
  const { status, feedback } = req.body;
  db.prepare('UPDATE task_submissions SET status = ?, feedback = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, feedback, req.params.id);
  res.json({ success: true });
});

// Admin: Get all tasks
router.get('/admin/all', authenticate, isAdmin, (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, c.title as course_title
    FROM tasks t
    JOIN courses c ON c.id = t.course_id
    ORDER BY c.title, t.order_num
  `).all();
  res.json(tasks);
});

module.exports = router;
