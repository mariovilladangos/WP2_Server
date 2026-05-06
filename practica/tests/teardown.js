import mongoose from 'mongoose';

export default async function globalTeardown() {
  try {
    await mongoose.disconnect();
  } catch (_) { /* ignore */ }
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
}