import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPriceCache, fetchPrices, isSupportedCrypto, symbolToGeckoId } from '../services/coinGeckoService.js';
import { app, bitcoin, createAsset, createUser, db, request, resetDb } from './helpers.js';

const fetchMock = vi.fn();

const geckoReplies = (body, status = 200) =>
  fetchMock.mockResolvedValue({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  resetDb();
  clearPriceCache();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => vi.unstubAllGlobals());

describe('symbol mapping', () => {
  it.each([
    ['btc', 'bitcoin'],
    ['BTC', 'bitcoin'],
    ['avax', 'avalanche-2'],
    ['nope', null],
  ])('%s -> %s', (symbol, id) => {
    expect(symbolToGeckoId(symbol)).toBe(id);
    expect(isSupportedCrypto(symbol)).toBe(id !== null);
  });
});

describe('fetchPrices', () => {
  it('maps CoinGecko ids back to the requested symbols', async () => {
    geckoReplies({ bitcoin: { usd: 65000 }, ethereum: { usd: 3000 } });
    const result = await fetchPrices('btc, ETH');
    expect(result).toEqual({ prices: { BTC: 65000, ETH: 3000 }, fromCache: false });
    expect(fetchMock.mock.calls[0][0]).toContain('ids=bitcoin,ethereum');
  });

  it('does not call the API for unsupported symbols', async () => {
    const result = await fetchPrices('nope,fake');
    expect(result.errors).toEqual(['No valid crypto symbols provided']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serves a repeat request from cache', async () => {
    geckoReplies({ bitcoin: { usd: 65000 } });
    await fetchPrices('btc');
    const second = await fetchPrices('btc');
    expect(second).toEqual({ prices: { BTC: 65000 }, fromCache: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to cached prices when rate limited', async () => {
    geckoReplies({ bitcoin: { usd: 65000 } });
    await fetchPrices('btc');
    geckoReplies({}, 429);
    const result = await fetchPrices('btc,eth');
    expect(result.prices).toEqual({ BTC: 65000 });
    expect(result.errors[0]).toMatch(/Rate limit/);
  });

  it('reports a network failure instead of throwing', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    expect(await fetchPrices('btc')).toEqual({ prices: {}, errors: ['ECONNRESET'] });
  });
});

describe('GET /api/prices', () => {
  it('requires a symbols query', async () => {
    await request(app).get('/api/prices').expect(400);
  });

  it('lists supported symbols', async () => {
    const res = await request(app).get('/api/prices/supported').expect(200);
    expect(res.body.symbols).toContain('BTC');
  });
});

describe('GET /api/prices/portfolio', () => {
  // Regression: this route had no auth and updated every user's assets.
  it('requires authentication', async () => {
    await request(app).get('/api/prices/portfolio').expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only reads and updates the caller's assets", async () => {
    const ana = await createUser();
    const bob = await createUser();
    const anaAsset = await createAsset(ana.auth, bitcoin);
    await createAsset(bob.auth, { ...bitcoin, assetName: 'Solana', symbol: 'sol' });
    geckoReplies({ bitcoin: { usd: 70000 } });

    const res = await request(app).get('/api/prices/portfolio').set('Authorization', ana.auth).expect(200);

    expect(fetchMock.mock.calls[0][0]).toContain('ids=bitcoin&');
    expect(res.body.prices).toEqual({ BTC: 70000 });
    expect(db.prepare('SELECT currentPrice FROM assets WHERE id = ?').get(anaAsset.id).currentPrice).toBe(70000);
  });
});
