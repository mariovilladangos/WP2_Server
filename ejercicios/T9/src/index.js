import 'dotenv/config';
import app from './app.js';
import prisma from './config/prisma.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
  console.log(`📚 API Biblioteca Digital - T9`);
  console.log(`📖 Documentación: GET /api`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
