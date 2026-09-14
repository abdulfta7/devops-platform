const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// Get course reviews
router.get('/course/:courseId', (req, res) => {
  const { courseId } = req.params;
  const reviews = db.prepare(`
    SELECT r.*, u.name, u.avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.course_id = ?
    ORDER BY r.created_at DESC
  `).all(courseId);

  // Calculate average rating
  const avgRating = db.prepare(`
    SELECT AVG(rating) as avg, COUNT(*) as count
    FROM reviews
    WHERE course_id = ?
  `).get(courseId);

  res.json({
    reviews,
    averageRating: avgRating.avg || 0,
    totalReviews: avgRating.count || 0
  });
});

// Add review
router.post('/', authenticate, (req, res) => {
  const { courseId, rating, comment } = req.body;
  const userId = req.user.id;

  if (!courseId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid rating' });
  }

  // Check if user is enrolled
  const enrollment = db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  if (!enrollment) {
    return res.status(403).json({ error: 'You must be enrolled to review this course' });
  }

  // Check if already reviewed
  const existing = db.prepare('SELECT * FROM reviews WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  if (existing) {
    return res.status(400).json({ error: 'You have already reviewed this course' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO reviews (id, user_id, course_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, courseId, rating, comment);

  const review = db.prepare(`
    SELECT r.*, u.name, u.avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(id);

  res.json(review);
});

// Update review
router.put('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  if (review.user_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  db.prepare(`
    UPDATE reviews
    SET rating = ?, comment = ?
    WHERE id = ?
  `).run(rating, comment, id);

  const updated = db.prepare(`
    SELECT r.*, u.name, u.avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(id);

  res.json(updated);
});

// Delete review
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  if (review.user_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
