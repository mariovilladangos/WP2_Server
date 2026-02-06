## 7. Middleware

### 7.1 ¿Qué es Middleware?

El middleware son funciones que se ejecutan **entre** la solicitud y la respuesta. Tienen acceso a `req`, `res` y `next()`.

```
Request → Middleware 1 → Middleware 2 → ... → Route Handler → Response
```

### 7.2 Tipos de Middleware

```javascript
// Middleware de aplicación
app.use(express.json());
app.use(helmet());

// Middleware de ruta
app.use('/api', authMiddleware, routes);

// Middleware inline
app.get('/admin', authMiddleware, adminMiddleware, handler);

// Middleware de error (4 parámetros)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});
```

### 7.3 Middleware Común

```javascript
// src/middleware/logger.js
export const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
};

// src/middleware/auth.js
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  // Verificar token...
  next();
};
```

### 7.4 Middleware de Terceros

```javascript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

const app = express();

// Seguridad
app.use(helmet());

// CORS
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

// Compresión
app.use(compression());

// Parseo de JSON
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
```

> ⚠️ **body-parser está deprecado**. Usa `express.json()` y `express.urlencoded()` directamente.

---