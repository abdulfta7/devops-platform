require('dotenv').config();
const db = require('../backend/src/database');

async function testDatabase() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('Testing database connection...');

    const result = await db.get('SELECT COUNT(*) as count FROM users');
    console.log('Users count:', result.count);

    const adminResult = await db.all('SELECT * FROM users WHERE role = $1', ['admin']);
    console.log('Admin users:', adminResult);

    process.exit(0);
  } catch (error) {
    console.error('Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
