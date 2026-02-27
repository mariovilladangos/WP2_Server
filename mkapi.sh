#!/bin/bash
PROGRAM=$0
WORKSPACE=$(dirname "$PROGRAM")
COMAND_NAME=$(basename "$PROGRAM")
API_NAME=""
PROJECT_NAME=""
PORT=3000
SHOW_HELP=false
YES=false;

ShowUsage() {
    echo -e "\e[32mUsage: $COMAND_NAME [options]\e[0m"
    echo -e "\e[32mOptions:\e[0m"
    echo -e "  \e[32m-n, --name\e[0m\t\tAPI name (directory). On default base directory will be used (after confirmation)"
    echo -e "  \e[32m-p, --port\e[0m\t\tPort number. On default port 3000 will be used"
    echo -e "  \e[32m-t, --title\e[0m\t\tProject title. Set a name for the 'project'. By default it will be the same as the API (used on informative comments)"
    echo -e "  \e[32m-h, --help\e[0m\t\tShow help message. This will force exit on usage, ignoring other parameters"
    echo -e "  \e[32m-y, --yes\e[0m\t\tSkip confirmation questions"
}

# hacer los parámetros como en los comandos (-param value)
while [[ "$#" -gt 0 ]]; do
    param="$1"
    value="$2"

    if [[ "$param" == "-h" || "$param" == "--help" || "$param" == "-y" || "$param" == "--yes" || "$param" == "-e" || "$param" == "--express" || "$param" == "-m" || "$param" == "--mongo" ]]; then
        # ignore, this sets parameters without value
    else if [[ -z "$param" || -z "$value" ]]; then
        echo -e "\e[31mError: Null parameter/value\e[0m"
        exit 1
    fi

    case $param in
        -n|--name) API_NAME="$value"; shift ;;
        -p|--port) PORT="$value"; shift ;;
        -t|--title) PROJECT_NAME="$value"; shift ;;
        -e|--express) INSTALL_EXPRESS=true; shift ;;
        -m|--mongo) INSTALL_MONGO=true; shift ;;
        -h|--help) SHOW_HELP=true; shift ;;
        -y|--yes) YES=true; shift ;;
        *) echo -e "\e[31mUnknown parameter passed: $param\e[0m"; ShowUsage; exit 1 ;;
    esac
    shift
done

if [ "$SHOW_HELP" = true ]; then
    ShowUsage
    exit 0
fi

cd "$WORKSPACE" || exit

if [[ -z "$API_NAME" ]]; then

    if [ "$YES" = true ]; then
        useParent="y"
    else
        read -p "No name was provided, do you want to use base directory as the proyect dir? (Y/n): " useParent
        useParent=$(echo "$useParent" | tr '[:upper:]' '[:lower:]')
        if [ "$useParent" != "y" ]; then
            ShowUsage
            exit 1
        fi
    fi
fi

if [ ! -z "$API_NAME" ]; then
    [[ -d "$API_NAME" ]] || mkdir -v "$API_NAME"
    cd "$API_NAME"
fi

# Initialize npm project (Express 5 and dependencies)
npm init -y

echo 

echo '{
  "name": "'"${API_NAME}"'",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch --env-file=.env src/index.js",
    "start": "node --env-file=.env src/index.js"
  },
  "engines": {
    "node": ">=20.11.0"
  }
}' > package.json

npm install express@5
npm install zod helmet cors morgan

echo "NODE_ENV=development
PORT=${PORT}
DATABASE_URL=mongodb://localhost:27017/${API_NAME}
JWT_SECRET=tu_secreto_super_seguro_minimo_32_caracteres" > .env

echo "node_modules
.env
.env.local
local.env" > .gitignore

echo "@baseUrl = http://localhost:${PORT}
@apiUrl ={{baseUrl}}/api

### HEALTH CHECK
GET {{baseUrl}}/health

### API INFO
GET {{apiUrl}}" > index.http

# Src directory
mkdir src
cd src

mkdir config routes controllers middleware schemas data
touch index.js app.js

# Mandatory files
touch config/env.js
touch routes/index.js
touch middleware/errorHandler.js middleware/validateRequest.js middleware/logger.js

# CONFIG DIRECTORY
## Content for config/env.js
echo "import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:');
  parsed.error.issues.forEach(issue => {
        console.error(\`  - \${issue.path.join('.') || 'env'}: \${issue.message}\`);
  });
  process.exit(1);
}

export const env = parsed.data;" > config/env.js

# ROUTES DIRECTORY
## Content for routes/index.js
echo "import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    mensaje: 'API de ${PROJECT_NAME} v1.0',
    endpoints: {
      health: '/health'
    }
  });
});

export default router;" > routes/index.js

# MIDDLEWARE DIRECTORY
## Content for middleware/logger.js
echo "export const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(\`[\${timestamp}] \${req.method} \${req.url}\`);
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
};" > middleware/logger.js

## Content for middleware/errorHandler.js
echo "export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
  
  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  
  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message);
  }
  
  static internal(message = 'Error interno del servidor') {
    return new ApiError(500, message);
  }
}

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { detalles: err.details })
    });
  }
  
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev && { stack: err.stack, message: err.message })
  });
};" > middleware/errorHandler.js

## Content for middleware/validateRequest.js
echo "import { ZodError } from 'zod';

export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
            
      return res.status(400).json({
        error: 'Error de validación',
        detalles: error.message
      });
    }
    next(error);
  }
};" > middleware/validateRequest.js

# SRC DIRECTORY
## Content for app.js
echo "import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Seguridad
app.use(helmet());
app.use(cors());

// Parseo de body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rutas de la API
app.use('/api', routes);

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

export default app;" > app.js

## Content for index.js
echo "import app from './app.js';

const PORT = process.env.PORT || ${PORT};

app.listen(PORT, () => {
  console.log(\`Servidor ejecutándose en http://localhost:\${PORT}\`);
  console.log(\`Entorno: \${process.env.NODE_ENV || 'development'}\`);
});" > index.js

echo
echo
echo -e "\e[32mAPI '${API_NAME}' creada exitosamente en ${PWD}\e[0m"