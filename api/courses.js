const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('./database');
const { authenticate, isAdmin, requireApproval } = require('./middleware/auth');

const { storage } = require('../backend/src/config/cloudinary');
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Get all courses (with optional track filter)
router.get('/', async (req, res) => {
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
router.get('/:slug', async (req, res) => {
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
router.get('/:slug/enrollment', authenticate, async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT * FROM courses WHERE slug = $1', [req.params.slug]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const enrollmentResult = await executeQuery('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [req.user.id, course.id]);
    const enrollment = enrollmentResult.rows[0];
    // Enrollment is always explicit — even admins appear as not-enrolled unless they actually enroll
    // (admin can still access video content via the videos endpoint which has its own admin bypass)
    const hasAccess = (enrollment && enrollment.is_approved === 1) || req.user.role === 'admin';
    res.json({ enrolled: !!enrollment, is_free: course.is_free === 1, is_approved: enrollment?.is_approved === 1, hasAccess });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

// Get course videos (protected if paid)
router.get('/:slug/videos', async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT * FROM courses WHERE slug = $1', [req.params.slug]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const videosResult = await executeQuery('SELECT * FROM videos WHERE course_id = $1 ORDER BY order_num', [course.id]);
    const videos = videosResult.rows;

    // If user is authenticated, check enrollment
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userResult = await executeQuery('SELECT id, role FROM users WHERE id = $1', [decoded.id]);
        const user = userResult.rows[0];

        if (user) {
          const enrollmentResult = await executeQuery('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [user.id, course.id]);
          const enrollment = enrollmentResult.rows[0];
          const hasAccess = (enrollment && enrollment.is_approved === 1) || user.role === 'admin';

          if (hasAccess) {
            // Get progress for each video
            const progressResult = await executeQuery('SELECT video_id, watched, progress_seconds FROM video_progress WHERE user_id = $1', [user.id]);
            const progress = progressResult.rows;
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
  } catch (error) {
    console.error('Error fetching course videos:', error);
    res.status(500).json({ error: 'Failed to fetch course videos' });
  }
});

// Update video progress
router.post('/:slug/videos/:videoId/progress', authenticate, async (req, res) => {
  try {
    const { watched, progress_seconds } = req.body;
    const videoResult = await executeQuery('SELECT * FROM videos WHERE id = $1', [req.params.videoId]);
    const video = videoResult.rows[0];
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const existingResult = await executeQuery('SELECT id FROM video_progress WHERE user_id = $1 AND video_id = $2', [req.user.id, video.id]);
    const existing = existingResult.rows[0];
    if (existing) {
      await executeQuery('UPDATE video_progress SET watched = $1, progress_seconds = $2 WHERE user_id = $3 AND video_id = $4',
        [watched ? 1 : 0, progress_seconds || 0, req.user.id, video.id]);
    } else {
      await executeQuery('INSERT INTO video_progress (id, user_id, video_id, watched, progress_seconds) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), req.user.id, video.id, watched ? 1 : 0, progress_seconds || 0]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating video progress:', error);
    res.status(500).json({ error: 'Failed to update video progress' });
  }
});

// Admin: Create course
router.post('/', authenticate, isAdmin, upload.single('thumbnail'), async (req, res) => {
  try {
    const { track_id, title, slug, description, price, is_free, level, duration_hours, order_num } = req.body;
    const id = uuidv4();
    const thumbnail = req.file ? req.file.path : null;
    await executeQuery('INSERT INTO courses (id, track_id, title, slug, description, thumbnail, price, is_free, level, duration_hours, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [id, track_id, title, slug, description, thumbnail, price || 0, is_free === 'true' || is_free === true ? 1 : 0, level || 'beginner', parseInt(duration_hours) || 0, parseInt(order_num) || 0]);
    res.json({ id, title, slug });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Admin: Update course
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, price, is_free, level, duration_hours, order_num, is_published } = req.body;
    await executeQuery('UPDATE courses SET title=$1, description=$2, price=$3, is_free=$4, level=$5, duration_hours=$6, order_num=$7, is_published=$8 WHERE id=$9',
      [title, description, price, is_free ? 1 : 0, level, duration_hours, order_num, is_published ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Admin: Delete course
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const courseId = req.params.id;
    await executeQuery('DELETE FROM video_progress WHERE video_id IN (SELECT id FROM videos WHERE course_id = $1)', [courseId]);
    await executeQuery('DELETE FROM videos WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM task_submissions WHERE task_id IN (SELECT id FROM tasks WHERE course_id = $1)', [courseId]);
    await executeQuery('DELETE FROM tasks WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM enrollments WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM reviews WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM roadmap_steps WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM payments WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM certificates WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM discussions WHERE course_id = $1', [courseId]);
    await executeQuery('DELETE FROM courses WHERE id = $1', [courseId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Failed to delete course due to server error' });
  }
});

// Admin: Add video to course
router.post('/:courseId/videos', authenticate, isAdmin, upload.single('video'), async (req, res) => {
  try {
    const { title, description, video_url, duration_minutes, order_num, is_preview } = req.body;
    const id = uuidv4();
    const finalUrl = req.file ? req.file.path : video_url;
    await executeQuery('INSERT INTO videos (id, course_id, title, description, video_url, duration_minutes, order_num, is_preview) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.params.courseId, title, description, finalUrl, duration_minutes || 0, order_num || 0, is_preview ? 1 : 0]);
    res.json({ id, title });
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ error: 'Failed to add video' });
  }
});

// Admin: Add task to course
router.post('/:courseId/tasks', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, instructions, expected_output, difficulty, order_num } = req.body;
    const id = uuidv4();
    await executeQuery('INSERT INTO tasks (id, course_id, title, description, instructions, expected_output, difficulty, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.params.courseId, title, description, instructions, expected_output, difficulty || 'medium', order_num || 0]);
    res.json({ id, title });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Admin: Delete video
router.delete('/videos/:videoId', authenticate, isAdmin, async (req, res) => {
  try {
    await executeQuery('DELETE FROM videos WHERE id = $1', [req.params.videoId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Admin: Update video
router.put('/videos/:videoId', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, video_url, duration_minutes, order_num, is_preview } = req.body;
    await executeQuery('UPDATE videos SET title=$1, description=$2, video_url=$3, duration_minutes=$4, order_num=$5, is_preview=$6 WHERE id=$7',
      [title, description, video_url, duration_minutes || 0, order_num || 0, is_preview ? 1 : 0, req.params.videoId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// Admin: Get full course details (videos + tasks)
router.get('/:courseId/manage', authenticate, isAdmin, async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT c.*, t.title as track_title FROM courses c LEFT JOIN tracks t ON t.id = c.track_id WHERE c.id = $1', [req.params.courseId]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const videosResult = await executeQuery('SELECT * FROM videos WHERE course_id = $1 ORDER BY order_num', [course.id]);
    const tasksResult = await executeQuery('SELECT * FROM tasks  WHERE course_id = $1 ORDER BY order_num', [course.id]);
    res.json({ ...course, videos: videosResult.rows, tasks: tasksResult.rows });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

// Admin: Delete task
router.delete('/tasks/:taskId', authenticate, isAdmin, async (req, res) => {
  try {
    await executeQuery('DELETE FROM task_submissions WHERE task_id = $1', [req.params.taskId]);
    await executeQuery('DELETE FROM tasks WHERE id = $1', [req.params.taskId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Admin: Update task
router.put('/tasks/:taskId', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, instructions, expected_output, difficulty, order_num } = req.body;
    await executeQuery('UPDATE tasks SET title=$1, description=$2, instructions=$3, expected_output=$4, difficulty=$5, order_num=$6 WHERE id=$7',
      [title, description, instructions, expected_output, difficulty || 'medium', order_num || 0, req.params.taskId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Admin: Add video via file upload OR url (multipart)
router.post('/:courseId/videos/upload', authenticate, isAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, video_url, duration_minutes, order_num, is_preview } = req.body;
    const id = uuidv4();
    const finalUrl = req.file ? req.file.path : video_url;
    if (!finalUrl) return res.status(400).json({ error: 'Provide a file or video_url' });
    await executeQuery('INSERT INTO videos (id, course_id, title, description, video_url, duration_minutes, order_num, is_preview) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.params.courseId, title, description, finalUrl, parseInt(duration_minutes) || 0, parseInt(order_num) || 0, is_preview === 'true' || is_preview === true ? 1 : 0]);
    res.json({ id, title, video_url: finalUrl });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

module.exports = router;
