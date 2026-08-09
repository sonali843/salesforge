// Redis config removed. Using in-memory fallback.
module.exports = {
  redisClient: { isOpen: false },
  connectRedis: async () => {}
};
