import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Biblioteca Digital - T9',
      version: '1.0.0',
      description: 'API REST para gestionar una biblioteca digital con Supabase + Prisma',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Servidor de desarrollo' }],
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
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'LIBRARIAN', 'ADMIN'] },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            isbn: { type: 'string' },
            title: { type: 'string' },
            author: { type: 'string' },
            genre: { type: 'string' },
            description: { type: 'string' },
            publishedYear: { type: 'integer' },
            copies: { type: 'integer' },
            available: { type: 'integer' },
          },
        },
        Loan: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            bookId: { type: 'integer' },
            loanDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time' },
            returnDate: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'RETURNED', 'OVERDUE'] },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            bookId: { type: 'integer' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
