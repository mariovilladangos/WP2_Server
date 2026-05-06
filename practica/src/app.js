import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import User from './models/user.model.js';
import { createServer } from 'http';
import { swaggerSpec } from './config/swagger.js';
import { verifyToken } from './utils/jwt.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const httpServer = createServer(app);

// Socket.IO
export const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Autenticación JWT en WebSocket
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('No token provided'));
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user || user.deleted) return next(new Error('Unauthorized'));
    socket.user = user;
    // Unirse a la room de su compañía
    if (user.company) socket.join(user.company.toString());
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Connected: ${socket.user?.email} (company: ${socket.user?.company})`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Disconnected: ${socket.user?.email}`);
  });
});

// Middleware para pasar io a los controladores
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Security
app.use(helmet());
app.use(cors());

if (process.env.NODE_ENV !== 'test') {
  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  const loginLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
  app.use(globalLimiter);
  app.use('/api/user/login', loginLimiter);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// NoSQL injection sanitization (manual; Express 5 makes req.query immutable)
app.use((req, _res, next) => {
  if (req.body)   mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check (ampliado)
import mongoose from 'mongoose';
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export { httpServer };
export default app;