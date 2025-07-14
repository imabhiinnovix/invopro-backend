import Redis from 'ioredis';

const redisConfig = {
  host: 'redis', // or 'localhost' if running locally
  maxRetriesPerRequest: null, // required for BullMQ
};

const redisConnection = new Redis(redisConfig);

redisConnection.on('connect', () => {
  console.log('✅ Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

export default redisConnection;
