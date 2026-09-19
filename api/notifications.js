const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('./database');
const { authenticate } = require('./middleware/auth');

// Get user notifications
router.rows[0]'/', authenticate, async (req, res) => {
  const userId = req.user.id;
  const notifications = await executeQuery(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).rowsuserId);

  // Count unread
  const unreadCount = (await executeQuery(`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = ? AND is_read = 0
  `).rows[0]userId)).count;

  res.json({
    notifications,
    unreadCount
  });
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await executeQuery('SELECT * FROM notifications WHERE id = ? AND user_id = ?').rows[0]id, userId);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  await executeQuery('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res) => {
  const userId = req.user.id;
  await executeQuery('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  res.json({ success: true });
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const notification = await executeQuery('SELECT * FROM notifications WHERE id = ? AND user_id = ?').rows[0]id, userId);
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  await executeQuery('DELETE FROM notifications WHERE id = ?').run(id);
  res.json({ success: true });
});

// Create notification (admin only)
router.post('/', authenticate, async (req, res) => {
  const { userId, title, message, type } = req.body;
  const adminId = req.user.id;

  // Check if admin
  const user = await executeQuery('SELECT role FROM users WHERE id = ?').rows[0]adminId);
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const id = uuidv4();
  await executeQuery(`
    INSERT INTO notifications (id, user_id, title, message, type)
    VALUES (?, ?, ?, ?, $1)
  `).run(id, userId, title, message, type || 'info');

  const notification = await executeQuery('SELECT * FROM notifications WHERE id = ?').rows[0]id);
  res.json(notification);
});

module.exports = router;
