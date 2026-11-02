// CoinGecko API integration with caching
// Maps common crypto symbols to CoinGecko IDs since the API uses IDs, not symbols

// Symbol to CoinGecko ID mapping
// CoinGecko uses unique IDs (e.g., "bitcoin") rather than symbols (e.g., "BTC")
// This map covers the most common cryptocurrencies
const SYMBOL_TO_COINGECKO_ID = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  ada: 'cardano',
  xrp: 'ripple',
  dot: 'polkadot',
  doge: 'dogecoin',
  shib: 'shiba-inu',
  avax: 'avalanche-2',
  matic: 'matic-network',
  link: 'chainlink',
  uni: 'uniswap',
  atom: 'cosmos',
  ltc: 'litecoin',
  etc: 'ethereum-classic',
  xlm: 'stellar',
  algo: 'algorand',
  vet: 'vechain',
  fil: 'filecoin',
  trx: 'tron',
  bnb: 'binancecoin',
  usdt: 'tether',
  usdc: 'usd-coin',
  busd: 'binance-usd',
  dai: 'dai',
  aave: 'aave',
  mkr: 'maker',
  comp: 'compound-governance-token',
  snx: 'havven',
  crv: 'curve-dao-token',
  sushi: 'sushi',
  yfi: 'yearn-finance',
  near: 'near',
  ftm: 'fantom',
  sand: 'the-sandbox',
  mana: 'decentraland',
  axs: 'axie-infinity',
  gala: 'gala',
  ape: 'apecoin',
  ldo: 'lido-dao',
  arb: 'arbitrum',
  op: 'optimism',
  sui: 'sui',
  apt: 'aptos',
  inj: 'injective-protocol',
  sei: 'sei-network',
  tia: 'celestia',
  jup: 'jupiter-exchange-solana',
  wif: 'dogwifcoin',
  pepe: 'pepe',
  bonk: 'bonk',
};

// In-memory cache for price data
const priceCache = {
  data: {},
  timestamp: 0,
};

// Lets tests start from an empty cache
export const clearPriceCache = () => {
  priceCache.data = {};
  priceCache.timestamp = 0;
};

// Get cache TTL from environment (default 5 minutes)
const getCacheTTL = () => parseInt(process.env.PRICE_CACHE_TTL_MS) || 300000;

// Check if cache is still valid
const isCacheValid = () => {
  return Date.now() - priceCache.timestamp < getCacheTTL();
};

// Convert symbol to CoinGecko ID
export const symbolToGeckoId = (symbol) => {
  const lowerSymbol = symbol.toLowerCase();
  return SYMBOL_TO_COINGECKO_ID[lowerSymbol] || null;
};

// Get CoinGecko ID to symbol mapping (reverse lookup)
const geckoIdToSymbol = (geckoId) => {
  for (const [symbol, id] of Object.entries(SYMBOL_TO_COINGECKO_ID)) {
    if (id === geckoId) return symbol.toUpperCase();
  }
  return null;
};

// Fetch prices from CoinGecko API
export const fetchPrices = async (symbols) => {
  // Filter and map symbols to CoinGecko IDs
  const symbolsArray = symbols.split(',').map(s => s.trim().toLowerCase());
  const geckoIds = symbolsArray
    .map(symbol => ({ symbol: symbol.toUpperCase(), geckoId: symbolToGeckoId(symbol) }))
    .filter(item => item.geckoId !== null);

  if (geckoIds.length === 0) {
    return { prices: {}, errors: ['No valid crypto symbols provided'] };
  }

  // Check cache first
  const uncachedIds = [];
  const cachedPrices = {};

  if (isCacheValid()) {
    for (const { symbol, geckoId } of geckoIds) {
      if (priceCache.data[geckoId]) {
        cachedPrices[symbol] = priceCache.data[geckoId];
      } else {
        uncachedIds.push({ symbol, geckoId });
      }
    }
  } else {
    uncachedIds.push(...geckoIds);
  }

  // If all prices are cached, return them
  if (uncachedIds.length === 0) {
    return { prices: cachedPrices, fromCache: true };
  }

  // Fetch uncached prices from CoinGecko
  const idsToFetch = uncachedIds.map(item => item.geckoId).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsToFetch}&vs_currencies=usd`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Handle rate limiting gracefully
      if (response.status === 429) {
        console.warn('CoinGecko rate limit reached, using cached data if available');
        return {
          prices: cachedPrices,
          errors: ['Rate limit reached, showing cached prices'],
          fromCache: true
        };
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    // Update cache with new data
    priceCache.timestamp = Date.now();

    const newPrices = {};
    for (const { symbol, geckoId } of uncachedIds) {
      if (data[geckoId]?.usd) {
        const price = data[geckoId].usd;
        priceCache.data[geckoId] = price;
        newPrices[symbol] = price;
      }
    }

    return {
      prices: { ...cachedPrices, ...newPrices },
      fromCache: false
    };
  } catch (error) {
    console.error('Error fetching prices from CoinGecko:', error.message);

    // Return cached prices if available, otherwise error
    if (Object.keys(cachedPrices).length > 0) {
      return {
        prices: cachedPrices,
        errors: [error.message],
        fromCache: true
      };
    }

    return {
      prices: {},
      errors: [error.message]
    };
  }
};

// Get all supported crypto symbols
export const getSupportedSymbols = () => {
  return Object.keys(SYMBOL_TO_COINGECKO_ID).map(s => s.toUpperCase());
};

// Check if a symbol is a supported cryptocurrency
export const isSupportedCrypto = (symbol) => {
  return symbolToGeckoId(symbol) !== null;
};
