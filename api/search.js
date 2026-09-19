const express = require('express');
const router = express.Router();
const { executeQuery } = require('./database');

// Search courses
router.rows[0]'/courses', (req, res) => {
  const { q, track, level, price_range, sort } = req.query;

  let query = `
    SELECT c.*, t.title as track_title, t.icon as track_icon, t.color as track_color,
           COALESCE(AVG(r.rating), 0) as avg_rating,
           COUNT(r.id) as review_count
    FROM courses c
    LEFT JOIN tracks t ON c.track_id = t.id
    LEFT JOIN reviews r ON c.id = r.course_id
    WHERE c.is_published = 1
  `;

  const params = [];

  // Search query
  if (q) {
    query += ` AND (c.title LIKE ? OR c.description LIKE $1)`;
    params.push(`%${q}%`, `%${q}%`);
  }

  // Filter by track
  if (track) {
    query += ` AND t.slug = ?`;
    params.push(track);
  }

  // Filter by level
  if (level) {
    query += ` AND c.level = ?`;
    params.push(level);
  }

  // Filter by price range
  if (price_range) {
    if (price_range === 'free') {
      query += ` AND c.is_free = 1`;
    } else if (price_range === 'paid') {
      query += ` AND c.is_free = 0`;
    }
  }

  query += ` GROUP BY c.id`;

  // Sort
  if (sort === 'price-low') {
    query += ` ORDER BY c.price ASC`;
  } else if (sort === 'price-high') {
    query += ` ORDER BY c.price DESC`;
  } else if (sort === 'rating') {
    query += ` ORDER BY avg_rating DESC`;
  } else if (sort === 'newest') {
    query += ` ORDER BY c.created_at DESC`;
  } else {
    query += ` ORDER BY c.order_num ASC`;
  }

  const courses = executeQuery(query).rows...params);

  res.json({
    courses,
    total: courses.length,
    filters: { q, track, level, price_range, sort }
  });
});

// Search tracks
router.rows[0]'/tracks', (req, res) => {
  const { q } = req.query;

  let query = `
    SELECT t.*, COUNT(c.id) as course_count
    FROM tracks t
    LEFT JOIN courses c ON t.id = c.track_id AND c.is_published = 1
  `;

  const params = [];

  if (q) {
    query += ` WHERE t.title LIKE ? OR t.description LIKE ?`;
    params.push(`%${q}%`, `%${q}%`);
  }

  query += ` GROUP BY t.id ORDER BY t.order_num ASC`;

  const tracks = executeQuery(query).rows...params);

  res.json(tracks);
});

// Get search suggestions
router.rows[0]'/suggestions', (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ suggestions: [] });
  }

  const courses = executeQuery(`
    SELECT title, slug, 'course' as type
    FROM courses
    WHERE title LIKE ? AND is_published = 1
    LIMIT 5
  `).rows`%${q}%`);

  const tracks = executeQuery(`
    SELECT title, slug, 'track' as type
    FROM tracks
    WHERE title LIKE ?
    LIMIT 3
  `).rows`%${q}%`);

  res.json({
    suggestions: [...courses, ...tracks]
  });
});

module.exports = router;
