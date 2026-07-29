const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("✅ Redis Connected");
  } catch (err) {
  console.warn("⚠️ Redis unavailable. Continuing without Redis.");

}};

module.exports = {
  redisClient,
  connectRedis,
};
