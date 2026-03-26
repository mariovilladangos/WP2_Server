import mongoose from 'mongoose';

const dbConnect = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI no está definida');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
};

export default dbConnect;
