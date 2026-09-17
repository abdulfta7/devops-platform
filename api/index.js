const app = require('../backend/index.js');
const db = require('../backend/src/database');

module.exports = async (req, res) => {
  // Set proper headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Wrap the response to close DB connection after response
  const originalEnd = res.end;
  let dbClosed = false;
  res.end = function(...args) {
    if (!dbClosed) {
      dbClosed = true;
      db.close().catch(err => console.error('Error closing DB:', err));
    }
    originalEnd.apply(this, args);
  };

  app(req, res);
};
