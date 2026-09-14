const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

// Get user notifications
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId);

  // Count unread
  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `).get(userId).count;

  res.json({
    notifications,
    unreadCount
  });
});

// Mark notification as read
router.put('/:id/read', authenticate, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(id, userId);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

// Mark all as read
router.put('/read-all', authenticate, (req, res) => {
  const userId = req.user.id;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  res.json({ success: true });
});

// Delete notification
router.delete('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(id, userId);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
  res.json({ success: true });
});

// Create notification (admin only)
router.post('/', authenticate, (req, res) => {
  const { userId, title, message, type } = req.body;
  const adminId = req.user.id;

  // Check if admin
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(adminId);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, title, message, type || 'info');

  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
  res.json(notification);
});

module.exports = router;
