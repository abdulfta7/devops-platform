const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Set test environment variables
process.env.JWT_SECRET = 'test_jwt_secret_for_testing';

// Mock database
const mockDb = {
  prepare: jest.fn(() => ({
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn()
  }))
};

jest.mock('../src/database', () => mockDb);

const app = express();
app.use(express.json());

// Import and use auth routes
const authRoutes = require('../src/routes/auth');
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test1234'
      };

      const mockGet = jest.fn().mockReturnValue(null); // No existing user
      const mockRun = jest.fn();

      mockDb.prepare.mockImplementation((query) => {
        if (query.includes('SELECT id FROM users WHERE email')) {
          return { get: mockGet };
        } else if (query.includes('INSERT INTO users')) {
          return { run: mockRun };
        } else if (query.includes('SELECT id, name, email, role, avatar')) {
          return { get: jest.fn().mockReturnValue({
            id: '123',
            name: userData.name,
            email: userData.email.toLowerCase(),
            role: 'student',
            avatar: null
          })};
        }
        return { get: jest.fn(), run: jest.fn() };
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email.toLowerCase());
    });

    it('should return error for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Test1234'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for weak password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for existing email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test1234'
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({ id: '123' }), // Existing user
        run: jest.fn()
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test1234'
      };

      const hashedPassword = bcrypt.hashSync('Test1234', 10);

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue({
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          role: 'student'
        })
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return error for invalid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockDb.prepare.mockReturnValue({
        get: jest.fn().mockReturnValue(null)
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return error for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Test1234'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
