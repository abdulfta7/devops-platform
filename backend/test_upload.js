const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const db = require('./src/database');
const jwt = require('jsonwebtoken');

async function test() {
  require('dotenv').config();
  const admin = db.prepare("SELECT id FROM users WHERE role='admin'").get();
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET || 'dev_secret_key');

  fs.writeFileSync('dummy.jpg', 'fake image content');

  const formData = new FormData();
  formData.append('title', 'Cloudinary Test Article');
  formData.append('content', 'This is a test content.');
  formData.append('image', fs.createReadStream('dummy.jpg'));

  try {
    const res = await axios.post('http://localhost:5000/api/articles', formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    console.log("Success:", res.data);
    
    const article = db.prepare("SELECT cover_image FROM articles WHERE id = ?").get(res.data.id);
    console.log("Saved URL:", article.cover_image);

    fs.unlinkSync('dummy.jpg');
    db.prepare("DELETE FROM articles WHERE id = ?").run(res.data.id);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
test();
