import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createUser, request, resetDb } from './helpers.js';

beforeEach(resetDb);

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token that works on /me', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@test.dev', password: 'secret123' })
      .expect(201);

    expect(res.body.user).toMatchObject({ email: 'ana@test.dev' });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`).expect(200);
    expect(me.body.user.email).toBe('ana@test.dev');
  });

  it('returns 409 for an email that is already registered', async () => {
    await createUser('ana@test.dev');
    const res = await request(app).post('/api/auth/register').send({ email: 'ana@test.dev', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  // Regression: emails were stored as typed, so Ana@Test.dev opened a second account.
  it('treats email addresses case-insensitively', async () => {
    await createUser('ana@test.dev');
    await request(app).post('/api/auth/register').send({ email: 'Ana@Test.DEV', password: 'secret123' }).expect(409);
    await request(app).post('/api/auth/login').send({ email: ' ANA@test.dev ', password: 'secret123' }).expect(200);
  });

  it.each([
    ['no body', {}],
    ['no password', { email: 'ana@test.dev' }],
    ['not an email', { email: 'ana', password: 'secret123' }],
    ['5-char password', { email: 'ana@test.dev', password: '12345' }],
    // Regression: a numeric password reached bcrypt and crashed with 500.
    ['numeric password', { email: 'ana@test.dev', password: 12345678 }],
  ])('returns 400 for %s', async (_name, body) => {
    const res = await request(app).post('/api/auth/register').send(body).expect(400);
    expect(res.body.error).toBeTruthy();
  });

  it('accepts a password of exactly 6 characters', async () => {
    await request(app).post('/api/auth/register').send({ email: 'ana@test.dev', password: '123456' }).expect(201);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right password', async () => {
    await createUser('ana@test.dev', 'secret123');
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@test.dev', password: 'secret123' }).expect(200);
    expect(res.body.token).toBeTruthy();
  });

  it('gives the same 401 for a wrong password and an unknown user', async () => {
    await createUser('ana@test.dev', 'secret123');
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'ana@test.dev', password: 'nope123' });
    const unknownUser = await request(app).post('/api/auth/login').send({ email: 'bob@test.dev', password: 'nope123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownUser.body);
  });

  it('returns 400, not 500, when email is not a string', async () => {
    await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: 'x' }).expect(400);
  });
});

describe('authentication middleware', () => {
  const me = () => request(app).get('/api/auth/me');

  it('rejects a request with no token', async () => {
    expect((await me()).status).toBe(401);
  });

  it('rejects a token signed with another secret', async () => {
    const forged = jwt.sign({ userId: 1 }, 'your-secret-key-change-in-production');
    const res = await me().set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ userId: 1, exp: Math.floor(Date.now() / 1000) - 60 }, 'test-secret');
    const res = await me().set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token expired');
  });

  it('rejects an unsigned "alg: none" token', async () => {
    const unsigned = jwt.sign({ userId: 1 }, null, { algorithm: 'none' });
    expect((await me().set('Authorization', `Bearer ${unsigned}`)).status).toBe(401);
  });

  it('rejects a non-Bearer scheme', async () => {
    const { token } = await createUser();
    expect((await me().set('Authorization', `Basic ${token}`)).status).toBe(401);
  });
});
