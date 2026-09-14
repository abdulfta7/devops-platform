const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Generate certificate
router.post('/course/:courseId', authenticate, (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  // Check if user completed the course (all videos watched)
  const courseVideos = db.prepare('SELECT id FROM videos WHERE course_id = ?').all(courseId);
  const watchedVideos = db.prepare(`
    SELECT v.id
    FROM videos v
    JOIN video_progress vp ON v.id = vp.video_id
    WHERE v.course_id = ? AND vp.user_id = ? AND vp.watched = 1
  `).all(courseId, userId);

  if (watchedVideos.length < courseVideos.length) {
    return res.status(400).json({ error: 'Complete all course videos to get certificate' });
  }

  // Check if certificate already exists
  const existing = db.prepare('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  if (existing) {
    return res.json(existing);
  }

  // Get course and user info
  const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId);
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);

  if (!course || !user) {
    return res.status(404).json({ error: 'Course or user not found' });
  }

  // Generate PDF certificate
  const doc = new PDFDocument({ layout: 'landscape', size: 'letter' });
  const certId = uuidv4();
  const certPath = path.join(__dirname, '..', 'uploads', `certificate_${certId}.pdf`);

  doc.pipe(fs.createWriteStream(certPath));

  // Certificate design
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');

  // Border
  doc.lineWidth(3);
  doc.rect(50, 50, doc.page.width - 100, doc.page.height - 100).stroke('#1a365d');

  // Title
  doc.fontSize(48).fill('#1a365d').font('Helvetica-Bold')
    .text('Certificate of Completion', 0, 100, { align: 'center' });

  // This certifies that
  doc.fontSize(24).fill('#4a5568').font('Helvetica')
    .text('This certifies that', 0, 180, { align: 'center' });

  // Student name
  doc.fontSize(36).fill('#2d3748').font('Helvetica-Bold')
    .text(user.name, 0, 220, { align: 'center' });

  // Has successfully completed
  doc.fontSize(24).fill('#4a5568').font('Helvetica')
    .text('has successfully completed the course', 0, 280, { align: 'center' });

  // Course name
  doc.fontSize(32).fill('#1a365d').font('Helvetica-Bold')
    .text(course.title, 0, 320, { align: 'center' });

  // Date
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.fontSize(18).fill('#718096').font('Helvetica')
    .text(`Issued on ${date}`, 0, 400, { align: 'center' });

  // Certificate ID
  doc.fontSize(12).fill('#a0aec0').font('Helvetica')
    .text(`Certificate ID: ${certId}`, 0, 450, { align: 'center' });

  doc.end();

  // Save certificate record
  const certificateUrl = `/uploads/certificate_${certId}.pdf`;
  db.prepare(`
    INSERT INTO certificates (id, user_id, course_id, certificate_url)
    VALUES (?, ?, ?, ?)
  `).run(certId, userId, courseId, certificateUrl);

  const certificate = db.prepare('SELECT * FROM certificates WHERE id = ?').get(certId);
  res.json(certificate);
});

// Get user certificates
router.get('/my-certificates', authenticate, (req, res) => {
  const userId = req.user.id;
  const certificates = db.prepare(`
    SELECT c.*, co.title as course_title, u.name as user_name
    FROM certificates c
    JOIN courses co ON c.course_id = co.id
    JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ?
    ORDER BY c.issued_at DESC
  `).all(userId);

  res.json(certificates);
});

// Get certificate by ID
router.get('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const certificate = db.prepare(`
    SELECT c.*, co.title as course_title, u.name as user_name
    FROM certificates c
    JOIN courses co ON c.course_id = co.id
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(id);

  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found' });
  }

  res.json(certificate);
});

module.exports = router;
