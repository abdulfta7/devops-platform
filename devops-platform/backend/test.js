const fs = require('fs');
const path = require('path');
const db = require('./src/database');

try {
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  db.prepare(`
    INSERT INTO articles (id, user_id, title, slug, content, excerpt, cover_image, tags, category, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, "some-user-id", "test title", "test-slug", "test content", "", null, "", "general", 1);
  console.log("SUCCESS");
} catch (e) {
  console.error("ERROR:", e);
}
