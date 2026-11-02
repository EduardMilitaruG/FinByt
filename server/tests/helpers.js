import request from 'supertest';
import app from '../app.js';
import db from '../models/database.js';

export { app, db, request };

export const resetDb = () => {
  db.exec('DELETE FROM assets; DELETE FROM users;');
};

let counter = 0;

/** Registers a fresh user and returns { token, user, auth } where auth is the header value. */
export const createUser = async (email = `user${++counter}@test.dev`, password = 'secret123') => {
  const res = await request(app).post('/api/auth/register').send({ email, password }).expect(201);
  return { ...res.body, auth: `Bearer ${res.body.token}` };
};

export const bitcoin = {
  assetName: 'Bitcoin',
  symbol: 'btc',
  assetType: 'crypto',
  quantity: 0.5,
  buyPrice: 42000,
};

export const createAsset = async (auth, body = bitcoin) => {
  const res = await request(app).post('/api/assets').set('Authorization', auth).send(body).expect(201);
  return res.body;
};
