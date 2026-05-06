import { Redis } from 'ioredis';
import { logger } from '../lib/logger.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    redisClient = new Redis(url, { maxRetriesPerRequest: null });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }
  return redisClient;
}
