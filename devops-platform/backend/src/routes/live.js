const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db      = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');

// ── ensure tables exist ────────────────────────────────────────────────────
db.exec(`
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

// ── PUBLIC ─────────────────────────────────────────────────────────────────

// Get all published live courses
router.get('/', (req, res) => {
  const courses = db.prepare(`
    SELECT lc.*,
           COUNT(lr.id) as reg_count
    FROM live_courses lc
    LEFT JOIN live_registrations lr ON lr.course_id = lc.id
    WHERE lc.is_published = 1
    GROUP BY lc.id
    ORDER BY lc.created_at DESC
  `).all();
  res.json(courses);
});

// Get single live course by slug
router.get('/:slug', (req, res) => {
  const course = db.prepare(`
    SELECT lc.*, COUNT(lr.id) as reg_count
    FROM live_courses lc
    LEFT JOIN live_registrations lr ON lr.course_id = lc.id
    WHERE lc.slug = ? AND lc.is_published = 1
    GROUP BY lc.id
  `).get(req.params.slug);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

// Register for a live course (public — no login needed)
router.post('/:slug/register', (req, res) => {
  const course = db.prepare("SELECT * FROM live_courses WHERE slug = ? AND is_published = 1").get(req.params.slug);
  if (!course)        return res.status(404).json({ error: 'Course not found' });
  if (!course.is_open) return res.status(400).json({ error: 'Registration is closed for this course' });

  const { name, email, phone, age, experience, note } = req.body;
  if (!name?.trim())  return res.status(400).json({ error: 'Name is required' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
  if (!phone?.trim()) return res.status(400).json({ error: 'Phone is required' });

  // Prevent duplicate registration by email
  const exists = db.prepare("SELECT id FROM live_registrations WHERE course_id = ? AND email = ?").get(course.id, email.trim().toLowerCase());
  if (exists) return res.status(400).json({ error: 'This email is already registered for this course' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO live_registrations (id, course_id, name, email, phone, age, experience, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, course.id, name.trim(), email.trim().toLowerCase(), phone.trim(), age || '', experience || '', note || '');

  res.json({ success: true, message: `✅ Registered successfully! We'll contact you on ${phone.trim()} with course details.` });
});

// ── ADMIN ──────────────────────────────────────────────────────────────────

// Get all live courses (admin — includes unpublished)
router.get('/admin/all', authenticate, isAdmin, (req, res) => {
  const courses = db.prepare(`
    SELECT lc.*,
           COUNT(lr.id) as reg_count,
           SUM(CASE WHEN lr.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
    FROM live_courses lc
    LEFT JOIN live_registrations lr ON lr.course_id = lc.id
    GROUP BY lc.id
    ORDER BY lc.created_at DESC
  `).all();
  res.json(courses);
});

// Get registrations for a course
router.get('/admin/:courseId/registrations', authenticate, isAdmin, (req, res) => {
  const course = db.prepare('SELECT * FROM live_courses WHERE id = ?').get(req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const regs = db.prepare("SELECT * FROM live_registrations WHERE course_id = ? ORDER BY registered_at DESC").all(req.params.courseId);
  res.json({ course, registrations: regs });
});

// Create live course
router.post('/admin/create', authenticate, isAdmin, (req, res) => {
  const { title, slug, description, details, instructor, price, currency, start_date, schedule, duration, seats, cover_emoji } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO live_courses (id,title,slug,description,details,instructor,price,currency,start_date,schedule,duration,seats,cover_emoji)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, title, slug, description||'', details||'', instructor||'', price||0, currency||'EGP', start_date||'', schedule||'', duration||'', seats||0, cover_emoji||'🎓');
  res.json({ id, slug });
});

// Update live course
router.put('/admin/:id', authenticate, isAdmin, (req, res) => {
  const { title, description, details, instructor, price, currency, start_date, schedule, duration, seats, is_open, is_published, cover_emoji } = req.body;
  db.prepare(`
    UPDATE live_courses
    SET title=?,description=?,details=?,instructor=?,price=?,currency=?,
        start_date=?,schedule=?,duration=?,seats=?,is_open=?,is_published=?,cover_emoji=?
    WHERE id=?
  `).run(title, description, details, instructor, price, currency, start_date, schedule, duration, seats, is_open?1:0, is_published?1:0, cover_emoji, req.params.id);
  res.json({ success: true });
});

// Update registration status (confirm / cancel)
router.put('/admin/registrations/:id', authenticate, isAdmin, (req, res) => {
  const { status } = req.body; // 'confirmed' | 'cancelled' | 'pending'
  db.prepare("UPDATE live_registrations SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true });
});

// Delete registration
router.delete('/admin/registrations/:id', authenticate, isAdmin, (req, res) => {
  db.prepare("DELETE FROM live_registrations WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Delete live course
router.delete('/admin/:id', authenticate, isAdmin, (req, res) => {
  db.prepare("DELETE FROM live_registrations WHERE course_id = ?").run(req.params.id);
  db.prepare("DELETE FROM live_courses WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Export registrations as CSV
router.get('/admin/:courseId/export', authenticate, isAdmin, (req, res) => {
  const course = db.prepare('SELECT * FROM live_courses WHERE id = ?').get(req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Not found' });
  const regs = db.prepare("SELECT * FROM live_registrations WHERE course_id = ? ORDER BY registered_at").all(req.params.courseId);

  const header = 'Name,Email,Phone,Age,Experience,Note,Status,Registered At\n';
  const rows   = regs.map(r =>
    `"${r.name}","${r.email}","${r.phone}","${r.age}","${r.experience}","${r.note}","${r.status}","${r.registered_at}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${course.slug}-registrations.csv"`);
  res.send(header + rows);
});

module.exports = router;
