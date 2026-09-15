const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get all tracks with course count
router.get('/', async (req, res) => {
  const tracks = await db.prepare(`
    SELECT t.*, COUNT(c.id) as course_count
    FROM tracks t
    LEFT JOIN courses c ON c.track_id = t.id AND c.is_published = 1
    GROUP BY t.id
    ORDER BY t.order_num
  `).all();
  res.json(tracks);
});

// Get single track with courses
router.get('/:slug', async (req, res) => {
  const track = await db.prepare('SELECT * FROM tracks WHERE slug = ?').get(req.params.slug);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const courses = await db.prepare(`
    SELECT * FROM courses WHERE track_id = ? AND is_published = 1 ORDER BY order_num
  `).all(track.id);

  res.json({ ...track, courses });
});

// Get roadmap for a track
router.get('/:slug/roadmap', async (req, res) => {
  const track = await db.prepare('SELECT * FROM tracks WHERE slug = ?').get(req.params.slug);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  const steps = await db.prepare(`
    SELECT rs.id, rs.track_id, rs.course_id, rs.title, rs.description,
           rs.step_type, rs.level_num, rs.level_title, rs.order_num, rs.is_required,
           c.title as course_title, c.slug as course_slug, c.price, c.is_free,
           c.level as course_level, c.duration_hours
    FROM roadmap_steps rs
    LEFT JOIN courses c ON c.id = rs.course_id
    WHERE rs.track_id = ?
    ORDER BY rs.level_num, rs.order_num
  `).all(track.id);

  res.json({ track, steps });
});

// Admin: Create track
router.post('/', authenticate, isAdmin, async (req, res) => {
  const { title, slug, description, icon, color, order_num } = req.body;
  const id = uuidv4();
  await db.prepare('INSERT INTO tracks (id, title, slug, description, icon, color, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, title, slug, description, icon, color, order_num || 0);
  res.json({ id, title, slug, description, icon, color });
});

// Admin: Update track
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  const { title, description, icon, color, order_num } = req.body;
  await db.prepare('UPDATE tracks SET title=?, description=?, icon=?, color=?, order_num=? WHERE id=?').run(title, description, icon, color, order_num, req.params.id);
  res.json({ success: true });
});

module.exports = router;
