const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authenticate, isAdmin, requireApproval } = require('../middleware/auth');

const { storage } = require('../config/cloudinary');
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Get all courses (with optional track filter)
router.get('/', async (req, res) => {
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
  const params = [];
  if (track) { query += ' AND t.slug = ?'; params.push(track); }
  query += ' GROUP BY c.id ORDER BY c.order_num';
  res.json(await db.prepare(query).all(...params));
});

// Get single course
router.get('/:slug', async (req, res) => {
  const course = await db.prepare(`
    SELECT c.*, t.title as track_title, t.slug as track_slug, t.color as track_color
    FROM courses c
    LEFT JOIN tracks t ON t.id = c.track_id
    WHERE c.slug = ?
  `).get(req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const videos = await db.prepare('SELECT * FROM videos WHERE course_id = ? ORDER BY order_num').all(course.id);
  const tasks = await db.prepare('SELECT id, title, description, difficulty, order_num FROM tasks WHERE course_id = ? ORDER BY order_num').all(course.id);

  // Get rating info
  const ratingInfo = await db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
    FROM reviews
    WHERE course_id = ?
  `).get(course.id);

  res.json({
    ...course,
    videos,
    tasks,
    avg_rating: ratingInfo.avg_rating || 0,
    review_count: ratingInfo.review_count || 0
  });
});

// Check enrollment
router.get('/:slug/enrollment', authenticate, async (req, res) => {
  const course = await db.prepare('SELECT * FROM courses WHERE slug = ?').get(req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const enrollment = await db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, course.id);
  // Enrollment is always explicit — even admins appear as not-enrolled unless they actually enroll
  // (admin can still access video content via the videos endpoint which has its own admin bypass)
  const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
  res.json({ enrolled: !!enrollment, is_free: course.is_free === 1, is_approved: enrollment?.is_approved === 1, hasAccess });
});

// Get course videos (protected if paid)
router.get('/:slug/videos', async (req, res) => {
  const course = await db.prepare('SELECT * FROM courses WHERE slug = ?').get(req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const videos = await db.prepare('SELECT * FROM videos WHERE course_id = ? ORDER BY order_num').all(course.id);

  // If user is authenticated, check enrollment
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await db.prepare('SELECT id, role FROM users WHERE id = ?').get(decoded.id);

      if (user) {
        const enrollment = await db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(user.id, course.id);
        const hasAccess = (enrollment && enrollment.is_approved === 1) || user.role === 'admin';

        if (hasAccess) {
          // Get progress for each video
          const progress = await db.prepare('SELECT video_id, watched, progress_seconds FROM video_progress WHERE user_id = ?').all(user.id);
          const progressMap = {};
          progress.forEach(p => progressMap[p.video_id] = p);

          return res.json(videos.map(v => ({ ...v, locked: false, progress: progressMap[v.id] || null })));
        }
      }
    } catch (err) {
      // Invalid token, continue with preview-only access
    }
  }

  // No authentication or no access - return preview videos only
  return res.json(videos.map(v => ({
    ...v,
    video_url: v.is_preview === 1 ? v.video_url : null,
    locked: v.is_preview === 0
  })));
});

// Update video progress
router.post('/:slug/videos/:videoId/progress', authenticate, async (req, res) => {
  const { watched, progress_seconds } = req.body;
  const video = await db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.videoId);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const existing = await db.prepare('SELECT id FROM video_progress WHERE user_id = ? AND video_id = ?').get(req.user.id, video.id);
  if (existing) {
    await db.prepare('UPDATE video_progress SET watched = ?, progress_seconds = ? WHERE user_id = ? AND video_id = ?').run(watched ? 1 : 0, progress_seconds || 0, req.user.id, video.id);
  } else {
    await db.prepare('INSERT INTO video_progress (id, user_id, video_id, watched, progress_seconds) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, video.id, watched ? 1 : 0, progress_seconds || 0);
  }
  res.json({ success: true });
});

// Admin: Create course
router.post('/', authenticate, isAdmin, upload.single('thumbnail'), async (req, res) => {
  const { track_id, title, slug, description, price, is_free, level, duration_hours, order_num } = req.body;
  const id = uuidv4();
  const thumbnail = req.file ? req.file.path : null;
  await db.prepare('INSERT INTO courses (id, track_id, title, slug, description, thumbnail, price, is_free, level, duration_hours, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, track_id, title, slug, description, thumbnail, price || 0, is_free === 'true' || is_free === true ? 1 : 0, level || 'beginner', parseInt(duration_hours) || 0, parseInt(order_num) || 0);
  res.json({ id, title, slug });
});

// Admin: Update course
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  const { title, description, price, is_free, level, duration_hours, order_num, is_published } = req.body;
  await db.prepare('UPDATE courses SET title=?, description=?, price=?, is_free=?, level=?, duration_hours=?, order_num=?, is_published=? WHERE id=?').run(title, description, price, is_free ? 1 : 0, level, duration_hours, order_num, is_published ? 1 : 0, req.params.id);
  res.json({ success: true });
});

// Admin: Delete course
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const courseId = req.params.id;
    await db.prepare('DELETE FROM video_progress WHERE video_id IN (SELECT id FROM videos WHERE course_id = ?)').run(courseId);
    await db.prepare('DELETE FROM videos WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM task_submissions WHERE task_id IN (SELECT id FROM tasks WHERE course_id = ?)').run(courseId);
    await db.prepare('DELETE FROM tasks WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM enrollments WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM reviews WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM roadmap_steps WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM payments WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM certificates WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM discussions WHERE course_id = ?').run(courseId);
    await db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Failed to delete course due to server error' });
  }
});

// Admin: Add video to course
router.post('/:courseId/videos', authenticate, isAdmin, upload.single('video'), async (req, res) => {
  const { title, description, video_url, duration_minutes, order_num, is_preview } = req.body;
  const id = uuidv4();
  const finalUrl = req.file ? req.file.path : video_url;
  await db.prepare('INSERT INTO videos (id, course_id, title, description, video_url, duration_minutes, order_num, is_preview) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, req.params.courseId, title, description, finalUrl, duration_minutes || 0, order_num || 0, is_preview ? 1 : 0);
  res.json({ id, title });
});

// Admin: Add task to course
router.post('/:courseId/tasks', authenticate, isAdmin, async (req, res) => {
  const { title, description, instructions, expected_output, difficulty, order_num } = req.body;
  const id = uuidv4();
  await db.prepare('INSERT INTO tasks (id, course_id, title, description, instructions, expected_output, difficulty, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, req.params.courseId, title, description, instructions, expected_output, difficulty || 'medium', order_num || 0);
  res.json({ id, title });
});

// Admin: Delete video
router.delete('/videos/:videoId', authenticate, isAdmin, async (req, res) => {
  await db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.videoId);
  res.json({ success: true });
});

// Admin: Update video
router.put('/videos/:videoId', authenticate, isAdmin, async (req, res) => {
  const { title, description, video_url, duration_minutes, order_num, is_preview } = req.body;
  await db.prepare('UPDATE videos SET title=?, description=?, video_url=?, duration_minutes=?, order_num=?, is_preview=? WHERE id=?')
    .run(title, description, video_url, duration_minutes || 0, order_num || 0, is_preview ? 1 : 0, req.params.videoId);
  res.json({ success: true });
});

// Admin: Get full course details (videos + tasks)
router.get('/:courseId/manage', authenticate, isAdmin, async (req, res) => {
  const course = await db.prepare('SELECT c.*, t.title as track_title FROM courses c LEFT JOIN tracks t ON t.id = c.track_id WHERE c.id = ?').get(req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const videos = await db.prepare('SELECT * FROM videos WHERE course_id = ? ORDER BY order_num').all(course.id);
  const tasks = await db.prepare('SELECT * FROM tasks  WHERE course_id = ? ORDER BY order_num').all(course.id);
  res.json({ ...course, videos, tasks });
});

// Admin: Delete task
router.delete('/tasks/:taskId', authenticate, isAdmin, async (req, res) => {
  await db.prepare('DELETE FROM task_submissions WHERE task_id = ?').run(req.params.taskId);
  await db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ success: true });
});

// Admin: Update task
router.put('/tasks/:taskId', authenticate, isAdmin, async (req, res) => {
  const { title, description, instructions, expected_output, difficulty, order_num } = req.body;
  await db.prepare('UPDATE tasks SET title=?, description=?, instructions=?, expected_output=?, difficulty=?, order_num=? WHERE id=?')
    .run(title, description, instructions, expected_output, difficulty || 'medium', order_num || 0, req.params.taskId);
  res.json({ success: true });
});

// Admin: Add video via file upload OR url (multipart)
router.post('/:courseId/videos/upload', authenticate, isAdmin, upload.single('file'), async (req, res) => {
  const { title, description, video_url, duration_minutes, order_num, is_preview } = req.body;
  const id = uuidv4();
  const finalUrl = req.file ? req.file.path : video_url;
  if (!finalUrl) return res.status(400).json({ error: 'Provide a file or video_url' });
  await db.prepare('INSERT INTO videos (id, course_id, title, description, video_url, duration_minutes, order_num, is_preview) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.courseId, title, description, finalUrl, parseInt(duration_minutes) || 0, parseInt(order_num) || 0, is_preview === 'true' || is_preview === true ? 1 : 0);
  res.json({ id, title, video_url: finalUrl });
});

module.exports = router;
