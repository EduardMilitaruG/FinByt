import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../models/database.js';
import { getJwtSecret, getJwtExpiry } from '../config.js';
import { isValidEmail, normalizeEmail } from '../validation.js';

const signToken = (userId) => jwt.sign({ userId }, getJwtSecret(), { expiresIn: getJwtExpiry() });

export const register = async (req, res) => {
  try {
    const { password } = req.body;

    // Validation
    if (!req.body.email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(req.body.email)) {
      return res.status(400).json({ error: 'Email is not valid' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // One account per address, whatever the casing
    const email = normalizeEmail(req.body.email);

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = db.prepare(
      'INSERT INTO users (email, passwordHash) VALUES (?, ?)'
    ).run(email, passwordHash);

    const token = signToken(result.lastInsertRowid);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.lastInsertRowid, email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email));
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getMe = (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, createdAt FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};
