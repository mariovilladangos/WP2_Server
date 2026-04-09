import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import router from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
