const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get all tracks with course count
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT t.*, COUNT(c.id) as course_count
      FROM tracks t
      LEFT JOIN courses c ON c.track_id = t.id AND c.is_published = 1
      GROUP BY t.id
      ORDER BY t.order_num
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Get single track with courses
router.get('/:slug', async (req, res) => {
  try {
    const trackResult = await executeQuery('SELECT * FROM tracks WHERE slug = $1', [req.params.slug]);
    const track = trackResult.rows[0];
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const coursesResult = await executeQuery(`
      SELECT * FROM courses WHERE track_id = $1 AND is_published = 1 ORDER BY order_num
    `, [track.id]);

    res.json({ ...track, courses: coursesResult.rows });
  } catch (error) {
    console.error('Error fetching track:', error);
    res.status(500).json({ error: 'Failed to fetch track' });
  }
});

// Get roadmap for a track
router.get('/:slug/roadmap', async (req, res) => {
  try {
    const trackResult = await executeQuery('SELECT * FROM tracks WHERE slug = $1', [req.params.slug]);
    const track = trackResult.rows[0];
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const stepsResult = await executeQuery(`
      SELECT rs.id, rs.track_id, rs.course_id, rs.title, rs.description,
             rs.step_type, rs.level_num, rs.level_title, rs.order_num, rs.is_required,
             c.title as course_title, c.slug as course_slug, c.price, c.is_free,
             c.level as course_level, c.duration_hours
      FROM roadmap_steps rs
      LEFT JOIN courses c ON c.id = rs.course_id
      WHERE rs.track_id = $1
      ORDER BY rs.level_num, rs.order_num
    `, [track.id]);

    res.json({ track, steps: stepsResult.rows });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// Admin: Create track
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, slug, description, icon, color, order_num } = req.body;
    const id = uuidv4();
    await executeQuery('INSERT INTO tracks (id, title, slug, description, icon, color, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, title, slug, description, icon, color, order_num || 0]);
    res.json({ id, title, slug, description, icon, color });
  } catch (error) {
    console.error('Error creating track:', error);
    res.status(500).json({ error: 'Failed to create track' });
  }
});

// Admin: Update track
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, icon, color, order_num } = req.body;
    await executeQuery('UPDATE tracks SET title=$1, description=$2, icon=$3, color=$4, order_num=$5 WHERE id=$6',
      [title, description, icon, color, order_num, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating track:', error);
    res.status(500).json({ error: 'Failed to update track' });
  }
});

module.exports = router;
