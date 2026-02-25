/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */

import Redis from 'ioredis';
import redisConnection from '../../../redis-connection';

const CACHE_KEY_PREFIX = process.env.CACHE_KEY_PREFIX || '';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = redisConnection;
  }

  async get(key: string): Promise<string | null> {
    const fullKey = CACHE_KEY_PREFIX + key;

    try {
      const value = await this.client.get(fullKey);
      return value;
    } catch (err) {
      console.error(`Error getting key "${fullKey}":`, err);
      throw err;
    }
  }

  async set(key: string, value: unknown, expiryInSeconds = 0): Promise<void> {
    const fullKey = CACHE_KEY_PREFIX + key;

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (expiryInSeconds > 0) {
        await this.client.set(fullKey, stringValue, 'EX', expiryInSeconds);
      } else {
        await this.client.set(fullKey, stringValue);
      }

      console.log(`Key "${fullKey}" set successfully`);
    } catch (err) {
      console.error(`Error setting key "${fullKey}":`, err);
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = CACHE_KEY_PREFIX + key;

    try {
      await this.client.del(fullKey);
    } catch (err) {
      console.error(`Error deleting key "${fullKey}":`, err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      console.log(`Cache Service disconnected successfully`);
    } catch (err) {
      console.error(`Error disconnecting Cache Service:`, err);
      throw err;
    }
  }
}

export default new RedisService();
