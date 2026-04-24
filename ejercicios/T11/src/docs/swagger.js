import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'PodcastHub API',
      version: '1.0.0',
      description: 'API REST para gestión de podcasts con autenticación JWT y autorización por roles',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65f8b3a2c9d1e20012345678' },
            name: { type: 'string', example: 'Juan Pérez' },
            email: { type: 'string', format: 'email', example: 'juan@ejemplo.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Podcast: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65f8b3a2c9d1e20012345679' },
            title: { type: 'string', example: 'Tech Talk Weekly' },
            description: { type: 'string', example: 'Un podcast sobre tecnología y programación' },
            author: { $ref: '#/components/schemas/User' },
            category: { type: 'string', enum: ['tech', 'science', 'history', 'comedy', 'news'] },
            duration: { type: 'number', example: 3600 },
            episodes: { type: 'number', example: 10 },
            published: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Mensaje de error' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token no proporcionado o inválido',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Error' } },
          },
        },
        Forbidden: {
          description: 'Permisos insuficientes',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Error' } },
          },
        },
        BadRequest: {
          description: 'Error de validación',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Error' } },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export default swaggerJsdoc(options);
