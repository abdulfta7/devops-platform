const crypto = require('crypto');

// Generate a secure random 64-character string for JWT_SECRET
const secret = crypto.randomBytes(32).toString('base64');
console.log('Generated JWT_SECRET:');
console.log(secret);
console.log('\nCopy this to your .env file as JWT_SECRET');
