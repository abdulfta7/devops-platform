const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('./database');
const { authenticate, isAdmin } = require('./middleware/auth');

// ── ensure tables exist ────────────────────────────────────────────────────
(async () => {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS live_courses (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        slug         TEXT UNIQUE NOT NULL,
        description  TEXT,
        details      TEXT,
        instructor   TEXT,
        price        REAL DEFAULT 0,
        currency     TEXT DEFAULT 'EGP',
        start_date   TEXT,
        schedule     TEXT,
        duration     TEXT,
        seats        INTEGER DEFAULT 0,
        is_open      INTEGER DEFAULT 1,
        is_published INTEGER DEFAULT 1,
        cover_emoji  TEXT DEFAULT '🎓',
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS live_registrations (
        id          TEXT PRIMARY KEY,
        course_id   TEXT NOT NULL,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL,
        phone       TEXT NOT NULL,
        age         TEXT,
        experience  TEXT,
        note        TEXT,
        status      TEXT DEFAULT 'pending',
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES live_courses(id)
      );
    `);
  } catch (error) {
    console.error('Error creating live courses tables:', error);
  }
})();

// ── PUBLIC ─────────────────────────────────────────────────────────────────

// Get all published live courses
router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT lc.*,
             COUNT(lr.id) as reg_count
      FROM live_courses lc
      LEFT JOIN live_registrations lr ON lr.course_id = lc.id
      WHERE lc.is_published = 1
      GROUP BY lc.id
      ORDER BY lc.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching live courses:', error);
    res.status(500).json({ error: 'Failed to fetch live courses' });
  }
});

// Get single live course by slug
router.get('/:slug', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT lc.*, COUNT(lr.id) as reg_count
      FROM live_courses lc
      LEFT JOIN live_registrations lr ON lr.course_id = lc.id
      WHERE lc.slug = $1 AND lc.is_published = 1
      GROUP BY lc.id
    `, [req.params.slug]);
    const course = result.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) {
    console.error('Error fetching live course:', error);
    res.status(500).json({ error: 'Failed to fetch live course' });
  }
});

// Register for a live course (public — no login needed)
router.post('/:slug/register', async (req, res) => {
  try {
    const courseResult = await executeQuery("SELECT * FROM live_courses WHERE slug = $1 AND is_published = 1", [req.params.slug]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!course.is_open) return res.status(400).json({ error: 'Registration is closed for this course' });

    const { name, email, phone, age, experience, note } = req.body;
    if (!name?.trim())  return res.status(400).json({ error: 'Name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!phone?.trim()) return res.status(400).json({ error: 'Phone is required' });

    // Prevent duplicate registration by email
    const existsResult = await executeQuery("SELECT id FROM live_registrations WHERE course_id = $1 AND email = $2", [course.id, email.trim().toLowerCase()]);
    if (existsResult.rows.length > 0) return res.status(400).json({ error: 'This email is already registered for this course' });

    const id = uuidv4();
    await executeQuery(`
      INSERT INTO live_registrations (id, course_id, name, email, phone, age, experience, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, course.id, name.trim(), email.trim().toLowerCase(), phone.trim(), age || '', experience || '', note || '']);

    res.json({ success: true, message: `✅ Registered successfully! We'll contact you on ${phone.trim()} with course details.` });
  } catch (error) {
    console.error('Error registering for live course:', error);
    res.status(500).json({ error: 'Failed to register for live course' });
  }
});

// ── ADMIN ──────────────────────────────────────────────────────────────────

// Get all live courses (admin — includes unpublished)
router.get('/admin/all', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT lc.*,
             COUNT(lr.id) as reg_count,
             SUM(CASE WHEN lr.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
      FROM live_courses lc
      LEFT JOIN live_registrations lr ON lr.course_id = lc.id
      GROUP BY lc.id
      ORDER BY lc.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all live courses:', error);
    res.status(500).json({ error: 'Failed to fetch all live courses' });
  }
});

// Get registrations for a course
router.get('/admin/:courseId/registrations', authenticate, isAdmin, async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT * FROM live_courses WHERE id = $1', [req.params.courseId]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const regsResult = await executeQuery("SELECT * FROM live_registrations WHERE course_id = $1 ORDER BY registered_at DESC", [req.params.courseId]);
    res.json({ course, registrations: regsResult.rows });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Create live course
router.post('/admin/create', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, slug, description, details, instructor, price, currency, start_date, schedule, duration, seats, cover_emoji } = req.body;
    if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });
    const id = uuidv4();
    await executeQuery(`
      INSERT INTO live_courses (id,title,slug,description,details,instructor,price,currency,start_date,schedule,duration,seats,cover_emoji)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [id, title, slug, description||'', details||'', instructor||'', price||0, currency||'EGP', start_date||'', schedule||'', duration||'', seats||0, cover_emoji||'🎓']);
    res.json({ id, slug });
  } catch (error) {
    console.error('Error creating live course:', error);
    res.status(500).json({ error: 'Failed to create live course' });
  }
});

// Update live course
router.put('/admin/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, details, instructor, price, currency, start_date, schedule, duration, seats, is_open, is_published, cover_emoji } = req.body;
    await executeQuery(`
      UPDATE live_courses
      SET title=$1,description=$2,details=$3,instructor=$4,price=$5,currency=$6,
          start_date=$7,schedule=$8,duration=$9,seats=$10,is_open=$11,is_published=$12,cover_emoji=$13
      WHERE id=$14
    `, [title, description, details, instructor, price, currency, start_date, schedule, duration, seats, is_open?1:0, is_published?1:0, cover_emoji, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating live course:', error);
    res.status(500).json({ error: 'Failed to update live course' });
  }
});

// Update registration status (confirm / cancel)
router.put('/admin/registrations/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'confirmed' | 'cancelled' | 'pending'
    await executeQuery("UPDATE live_registrations SET status = $1 WHERE id = $2", [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({ error: 'Failed to update registration status' });
  }
});

// Delete registration
router.delete('/admin/registrations/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await executeQuery("DELETE FROM live_registrations WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

// Delete live course
router.delete('/admin/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await executeQuery("DELETE FROM live_registrations WHERE course_id = $1", [req.params.id]);
    await executeQuery("DELETE FROM live_courses WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting live course:', error);
    res.status(500).json({ error: 'Failed to delete live course' });
  }
});

// Export registrations as CSV
router.get('/admin/:courseId/export', authenticate, isAdmin, async (req, res) => {
  try {
    const courseResult = await executeQuery('SELECT * FROM live_courses WHERE id = $1', [req.params.courseId]);
    const course = courseResult.rows[0];
    if (!course) return res.status(404).json({ error: 'Not found' });
    const regsResult = await executeQuery("SELECT * FROM live_registrations WHERE course_id = $1 ORDER BY registered_at", [req.params.courseId]);
    const regs = regsResult.rows;

    const header = 'Name,Email,Phone,Age,Experience,Note,Status,Registered At\n';
    const rows   = regs.map(r =>
      `"${r.name}","${r.email}","${r.phone}","${r.age}","${r.experience}","${r.note}","${r.status}","${r.registered_at}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${course.slug}-registrations.csv"`);
    res.send(header + rows);
  } catch (error) {
    console.error('Error exporting registrations:', error);
    res.status(500).json({ error: 'Failed to export registrations' });
  }
});

module.exports = router;
