// Input validation middleware
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Minimum 8 characters, at least one letter and one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const validateRegistration = (req, res, next) => {
  const { name, email, password, phone } = req.body;

  if (!name || name.length < 2 || name.length > 50) {
    return res.status(400).json({ error: 'Name must be between 2 and 50 characters' });
  }

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!password || !validatePassword(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters with at least one letter and one number' 
    });
  }

  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'Phone number must be at least 10 digits' });
  }

  // Sanitize inputs
  req.body.name = sanitizeInput(name);
  req.body.email = sanitizeInput(email).toLowerCase();
  req.body.phone = sanitizeInput(phone);

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  req.body.email = sanitizeInput(email).toLowerCase();

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  sanitizeInput
};
