import { createServer } from 'http';
import app from './app.js';
import dbConnect from './config/db.js';
import { initSocket } from './socket/index.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await dbConnect();

  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
    console.log(`💬 Chat en http://localhost:${PORT}/chat.html`);
    console.log(`📚 Docs en http://localhost:${PORT}/api-docs`);
  });

  process.on('SIGINT', () => {
    httpServer.close(() => {
      console.log('Servidor cerrado');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    httpServer.close(() => process.exit(0));
  });
};

startServer();
