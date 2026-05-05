import { httpServer } from './app.js';
import { io } from './app.js';
import dbConnect from './config/db.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await dbConnect();

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    io.close(() => console.log('Socket.IO closed'));
    httpServer.close(async () => {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
      process.exit(0);
    });
    // Forzar cierre tras 10 segundos
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

startServer();