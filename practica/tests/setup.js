import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET ||= 'test-secret-32chars-minimum-fallback';
  process.env.JWT_EXPIRES_IN ||= '15m';
  process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  console.log(`[test setup] mongodb-memory-server ready at ${uri}`);
  global.__MONGOD__ = mongod;
}