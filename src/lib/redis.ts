import Redis from "ioredis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;

if (!redisUrl) {
  throw new Error("Missing UPSTASH_REDIS_REST_URL");
}

export const redis = new Redis(redisUrl, {
  tls: {},
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});
