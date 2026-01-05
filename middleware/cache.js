// middleware/cache.js - SUPER SHORT VERSION
const cache = new Map();

export const cacheMiddleware = (duration) => (req, res, next) => {
  if (req.method !== 'GET') return next();
  
  const key = req.originalUrl || req.url;
  const cached = cache.get(key);
  
  if (cached && (Date.now() - cached.time < duration * 1000)) {
    console.log(`✅ Cache HIT: ${key}`);
    return res.json(cached.data);
  }
  
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    cache.set(key, { time: Date.now(), data });
    console.log(`💾 Cached: ${key}`);
    return originalJson(data);
  };
  
  next();
};

export const clearCache = () => {
  cache.clear();
  console.log('🧹 Cache cleared');
};

export const clearCacheByPattern = (pattern) => {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  }
  console.log(`🧹 Cleared ${count} entries`);
};