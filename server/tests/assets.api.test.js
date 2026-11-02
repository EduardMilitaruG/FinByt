import { beforeEach, describe, expect, it } from 'vitest';
import { app, bitcoin, createAsset, createUser, db, request, resetDb } from './helpers.js';

beforeEach(resetDb);

describe('asset CRUD', () => {
  it('creates, reads, updates and deletes an asset', async () => {
    const { auth } = await createUser();

    const created = await createAsset(auth, { ...bitcoin, notes: '  long term  ' });
    expect(created).toMatchObject({ symbol: 'BTC', quantity: 0.5, currentPrice: 42000, notes: 'long term' });

    const list = await request(app).get('/api/assets').set('Authorization', auth).expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(app)
      .put(`/api/assets/${created.id}`)
      .set('Authorization', auth)
      .send({ quantity: 1.25 })
      .expect(200);
    expect(updated.body).toMatchObject({ quantity: 1.25, assetName: 'Bitcoin', buyPrice: 42000 });

    await request(app).delete(`/api/assets/${created.id}`).set('Authorization', auth).expect(200);
    await request(app).get(`/api/assets/${created.id}`).set('Authorization', auth).expect(404);
  });

  // Regression: `currentPrice || buyPrice` replaced an explicit 0 with the buy price.
  it('keeps an explicit currentPrice of 0', async () => {
    const { auth } = await createUser();
    const asset = await createAsset(auth, { ...bitcoin, currentPrice: 0 });
    expect(asset.currentPrice).toBe(0);
  });

  it('requires authentication on every asset route', async () => {
    const routes = [
      request(app).get('/api/assets'),
      request(app).get('/api/assets/1'),
      request(app).post('/api/assets').send(bitcoin),
      request(app).put('/api/assets/1').send({ quantity: 1 }),
      request(app).delete('/api/assets/1'),
      request(app).post('/api/assets/update-prices').send({ prices: { BTC: 1 } }),
    ];
    for (const res of await Promise.all(routes)) expect(res.status).toBe(401);
  });
});

describe('tenant isolation', () => {
  it("one user cannot see, change or delete another user's asset", async () => {
    const ana = await createUser();
    const bob = await createUser();
    const anaAsset = await createAsset(ana.auth);

    const bobList = await request(app).get('/api/assets').set('Authorization', bob.auth);
    expect(bobList.body).toEqual([]);

    await request(app).get(`/api/assets/${anaAsset.id}`).set('Authorization', bob.auth).expect(404);
    await request(app).put(`/api/assets/${anaAsset.id}`).set('Authorization', bob.auth).send({ quantity: 99 }).expect(404);
    await request(app).delete(`/api/assets/${anaAsset.id}`).set('Authorization', bob.auth).expect(404);

    const stillThere = await request(app).get(`/api/assets/${anaAsset.id}`).set('Authorization', ana.auth).expect(200);
    expect(stillThere.body.quantity).toBe(0.5);
  });

  it("batch price updates only touch the caller's assets", async () => {
    const ana = await createUser();
    const bob = await createUser();
    const anaAsset = await createAsset(ana.auth);
    const bobAsset = await createAsset(bob.auth);

    await request(app)
      .post('/api/assets/update-prices')
      .set('Authorization', bob.auth)
      .send({ prices: { btc: 1 } })
      .expect(200);

    const price = (id) => db.prepare('SELECT currentPrice FROM assets WHERE id = ?').get(id).currentPrice;
    expect(price(bobAsset.id)).toBe(1);
    expect(price(anaAsset.id)).toBe(42000);
  });
});

describe('input validation', () => {
  // Regression for the string cases: SQLite stored "abc" in the REAL column
  // and CHECK (quantity > 0) let it through, because text sorts above numbers.
  it.each([
    ['quantity as a string', { quantity: 'abc' }],
    ['quantity of 0', { quantity: 0 }],
    ['negative quantity', { quantity: -1 }],
    ['negative buyPrice', { buyPrice: -5 }],
    ['buyPrice as a string', { buyPrice: '100' }],
    ['unknown assetType', { assetType: 'nft' }],
    ['numeric assetName', { assetName: 123 }],
    ['blank symbol', { symbol: '   ' }],
    ['numeric notes', { notes: 5 }],
  ])('POST rejects %s with 400', async (_name, override) => {
    const { auth } = await createUser();
    const res = await request(app).post('/api/assets').set('Authorization', auth).send({ ...bitcoin, ...override });
    expect(res.status).toBe(400);
    expect(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n).toBe(0);
  });

  it.each(['assetName', 'symbol', 'assetType', 'quantity', 'buyPrice'])('POST names missing field %s', async (field) => {
    const { auth } = await createUser();
    const body = { ...bitcoin };
    delete body[field];
    const res = await request(app).post('/api/assets').set('Authorization', auth).send(body).expect(400);
    expect(res.body.error).toContain(field);
  });

  it.each([
    ['quantity as a string', { quantity: 'abc' }],
    ['quantity of 0', { quantity: 0 }],
    ['currentPrice as a string', { currentPrice: 'free' }],
  ])('PUT rejects %s with 400 and leaves the asset unchanged', async (_name, body) => {
    const { auth } = await createUser();
    const asset = await createAsset(auth);
    await request(app).put(`/api/assets/${asset.id}`).set('Authorization', auth).send(body).expect(400);
    const after = await request(app).get(`/api/assets/${asset.id}`).set('Authorization', auth);
    expect(after.body).toEqual(asset);
  });

  it.each([
    ['missing prices', {}],
    ['prices as an array', { prices: [1, 2] }],
    ['a price as a string', { prices: { BTC: 'lots' } }],
    ['a negative price', { prices: { BTC: -1 } }],
  ])('update-prices rejects %s with 400', async (_name, body) => {
    const { auth } = await createUser();
    await request(app).post('/api/assets/update-prices').set('Authorization', auth).send(body).expect(400);
  });

  it('returns 400, not 500, for malformed JSON', async () => {
    const { auth } = await createUser();
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', auth)
      .set('Content-Type', 'application/json')
      .send('{"assetName": ');
    expect(res.status).toBe(400);
  });
});
