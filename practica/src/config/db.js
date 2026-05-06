import mongoose from 'mongoose';

const dbConnect = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    if (process.env.NODE_ENV !== 'test') {
      console.log('[DB] MongoDB connected:', mongoose.connection.host);
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

export default dbConnect;
