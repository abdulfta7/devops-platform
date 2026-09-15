const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const { storage } = require('../config/cloudinary');
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Get all published articles
router.get('/', async (req, res) => {
  const { category, tag } = req.query;
  let query = `
    SELECT a.*, u.name as author_name, u.avatar as author_avatar,
           COUNT(DISTINCT al.id) as likes_count,
           COUNT(DISTINCT ac.id) as comments_count
    FROM articles a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN article_likes al ON al.article_id = a.id
    LEFT JOIN article_comments ac ON ac.article_id = a.id
    WHERE a.is_published = 1
  `;
  const params = [];
  
  if (category) {
    query += ' AND a.category = ?';
    params.push(category);
  }
  
  if (tag) {
    query += ' AND a.tags LIKE ?';
    params.push(`%${tag}%`);
  }
  
  query += ' GROUP BY a.id ORDER BY a.created_at DESC';
  
  const articles = await db.prepare(query).all(...params);
  res.json(articles);
});

// Get single article by ID
router.get('/:id', async (req, res) => {
  const article = await db.prepare(`
    SELECT a.*, u.name as author_name, u.avatar as author_avatar,
           COUNT(DISTINCT al.id) as likes_count,
           COUNT(DISTINCT ac.id) as comments_count
    FROM articles a
    LEFT JOIN users u ON u.id = a.user_id
    LEFT JOIN article_likes al ON al.article_id = a.id
    LEFT JOIN article_comments ac ON ac.article_id = a.id
    WHERE a.id = ?
    GROUP BY a.id
  `).get(req.params.id);
  
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  // Increment view count
  await db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(req.params.id);
  
  // Get comments for this article
  const comments = await db.prepare(`
    SELECT ac.*, u.name as author_name, u.avatar as author_avatar
    FROM article_comments ac
    LEFT JOIN users u ON u.id = ac.user_id
    WHERE ac.article_id = ? AND ac.parent_id IS NULL
    ORDER BY ac.created_at DESC
  `).all(req.params.id);
  
  // Get replies for each comment
  const commentsWithReplies = await Promise.all(comments.map(async comment => {
    const replies = await db.prepare(`
      SELECT ac.*, u.name as author_name, u.avatar as author_avatar
      FROM article_comments ac
      LEFT JOIN users u ON u.id = ac.user_id
      WHERE ac.parent_id = ?
      ORDER BY ac.created_at ASC
    `).all(comment.id);
    return { ...comment, replies };
  }));
  
  // Check if current user liked this article
  let userLiked = false;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const like = await db.prepare('SELECT id FROM article_likes WHERE article_id = ? AND user_id = ?').get(req.params.id, decoded.id);
      userLiked = !!like;
    } catch (err) {
      // Token invalid, ignore
    }
  }
  
  res.json({ ...article, comments: commentsWithReplies, user_liked: userLiked });
});

// Create new article
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    let { title, slug, content, excerpt, tags, category } = req.body;
    const id = uuidv4();
    
    if (!content) return res.status(400).json({ error: 'Content is required' });
    
    if (!title) {
      title = content.substring(0, 50).replace(/\n/g, ' ') + (content.length > 50 ? '...' : '');
    }
    if (!slug) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.substring(0,6);
    }
    
    let cover_image = req.file ? req.file.path : null;
    
    // Check if slug already exists, if so append random
    let existing = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
    if (existing) slug = slug + '-' + id.substring(0,4);
    
    await db.prepare(`
      INSERT INTO articles (id, user_id, title, slug, content, excerpt, cover_image, tags, category, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, slug, content, excerpt || '', cover_image, tags || '', category || 'general', 1);
    
    res.json({ id, title, slug });
  } catch (err) {
    console.error('ARTICLE CREATE ERROR:', err);
    res.status(500).json({ error: err.message || 'Internal server error from try-catch' });
  }
});

// Update article
router.put('/:id', authenticate, async (req, res) => {
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  // Only author or admin can update
  if (article.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  const { title, content, excerpt, cover_image, tags, category, is_published } = req.body;
  
  await db.prepare(`
    UPDATE articles 
    SET title = ?, content = ?, excerpt = ?, cover_image = ?, tags = ?, category = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title, content, excerpt, cover_image, tags, category, is_published ? 1 : 0, req.params.id);
  
  res.json({ success: true });
});

// Delete article
router.delete('/:id', authenticate, async (req, res) => {
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  // Only author or admin can delete
  if (article.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  await db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Like/Unlike article
router.post('/:id/like', authenticate, async (req, res) => {
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  const existingLike = await db.prepare('SELECT id FROM article_likes WHERE article_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  
  if (existingLike) {
    // Unlike
    await db.prepare('DELETE FROM article_likes WHERE article_id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ liked: false });
  } else {
    // Like
    const id = uuidv4();
    await db.prepare('INSERT INTO article_likes (id, article_id, user_id) VALUES (?, ?, ?)').run(id, req.params.id, req.user.id);
    res.json({ liked: true });
  }
});

// Add comment to article
router.post('/:id/comments', authenticate, async (req, res) => {
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  const { content, parent_id } = req.body;
  const id = uuidv4();
  
  await db.prepare('INSERT INTO article_comments (id, article_id, user_id, content, parent_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, content, parent_id || null);
  
  // Get the created comment with author info
  const comment = await db.prepare(`
    SELECT ac.*, u.name as author_name, u.avatar as author_avatar
    FROM article_comments ac
    LEFT JOIN users u ON u.id = ac.user_id
    WHERE ac.id = ?
  `).get(id);
  
  res.json(comment);
});

// Update comment
router.put('/comments/:commentId', authenticate, async (req, res) => {
  const comment = await db.prepare('SELECT * FROM article_comments WHERE id = ?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  
  // Only author can update
  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  const { content } = req.body;
  await db.prepare('UPDATE article_comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(content, req.params.commentId);
  
  res.json({ success: true });
});

// Delete comment
router.delete('/comments/:commentId', authenticate, async (req, res) => {
  const comment = await db.prepare('SELECT * FROM article_comments WHERE id = ?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  
  // Only author or admin can delete
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  await db.prepare('DELETE FROM article_comments WHERE id = ?').run(req.params.commentId);
  res.json({ success: true });
});

// Share article
router.post('/:id/share', authenticate, async (req, res) => {
  const article = await db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  const { platform } = req.body;
  const id = uuidv4();
  
  await db.prepare('INSERT INTO article_shares (id, article_id, user_id, platform) VALUES (?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, platform);
  
  res.json({ success: true });
});

// Get user's articles
router.get('/user/my-articles', authenticate, async (req, res) => {
  const articles = await db.prepare(`
    SELECT a.*, COUNT(DISTINCT al.id) as likes_count, COUNT(DISTINCT ac.id) as comments_count
    FROM articles a
    LEFT JOIN article_likes al ON al.article_id = a.id
    LEFT JOIN article_comments ac ON ac.article_id = a.id
    WHERE a.user_id = ?
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all(req.user.id);
  
  res.json(articles);
});

module.exports = router;