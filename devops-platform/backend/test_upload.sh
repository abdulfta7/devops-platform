curl -X POST -H "Authorization: Bearer $(sqlite3 platform.db "SELECT id FROM users WHERE email='admin@devops.com'" | xargs -I {} sqlite3 platform.db "SELECT token FROM users WHERE id='{}'" || echo "none")" \
  -F "content=Test content for image" \
  -F "image=@backend/test.js" \
  http://localhost:5000/api/articles
