import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BildyApp API',
      version: '2.0.0',
      description: 'REST API for BildyApp — gestión de albaranes digitales',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Address: {
          type: 'object',
          properties: {
            street:   { type: 'string', example: 'Calle Mayor' },
            number:   { type: 'string', example: '10' },
            postal:   { type: 'string', example: '28013' },
            city:     { type: 'string', example: 'Madrid' },
            province: { type: 'string', example: 'Madrid' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id:      { type: 'string', example: '507f1f77bcf86cd799439011' },
            email:    { type: 'string', example: 'usuario@example.com' },
            name:     { type: 'string', example: 'Mario' },
            lastName: { type: 'string', example: 'Villadangos' },
            role:     { type: 'string', enum: ['admin', 'guest'] },
            status:   { type: 'string', enum: ['pending', 'verified'] },
            company:  { type: 'string', example: '507f1f77bcf86cd799439012' },
          },
        },
        Company: {
          type: 'object',
          properties: {
            _id:        { type: 'string' },
            name:       { type: 'string', example: 'Obras García S.L.' },
            cif:        { type: 'string', example: 'B12345678' },
            logo:       { type: 'string' },
            isFreelance:{ type: 'boolean' },
            address:    { $ref: '#/components/schemas/Address' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            _id:     { type: 'string' },
            name:    { type: 'string', example: 'Cliente S.A.' },
            cif:     { type: 'string', example: 'A87654321' },
            email:   { type: 'string' },
            phone:   { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
            deleted: { type: 'boolean' },
          },
        },
        CreateClient: {
          type: 'object',
          required: ['name', 'cif'],
          properties: {
            name:    { type: 'string', example: 'Cliente S.A.' },
            cif:     { type: 'string', example: 'A87654321' },
            email:   { type: 'string', format: 'email' },
            phone:   { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            name:        { type: 'string', example: 'Reforma oficinas' },
            projectCode: { type: 'string', example: 'PRO-2025-001' },
            client:      { $ref: '#/components/schemas/Client' },
            active:      { type: 'boolean' },
            address:     { $ref: '#/components/schemas/Address' },
            notes:       { type: 'string' },
          },
        },
        CreateProject: {
          type: 'object',
          required: ['client', 'name', 'projectCode'],
          properties: {
            client:      { type: 'string', description: 'Client ObjectId' },
            name:        { type: 'string', example: 'Reforma oficinas' },
            projectCode: { type: 'string', example: 'PRO-2025-001' },
            address:     { $ref: '#/components/schemas/Address' },
            email:       { type: 'string', format: 'email' },
            notes:       { type: 'string' },
            active:      { type: 'boolean', default: true },
          },
        },
        DeliveryNote: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            format:      { type: 'string', enum: ['material', 'hours'] },
            description: { type: 'string' },
            workDate:    { type: 'string', format: 'date-time' },
            material:    { type: 'string' },
            quantity:    { type: 'number' },
            unit:        { type: 'string' },
            hours:       { type: 'number' },
            workers:     {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name:  { type: 'string' },
                  hours: { type: 'number' },
                },
              },
            },
            signed:       { type: 'boolean' },
            signedAt:     { type: 'string', format: 'date-time' },
            signatureUrl: { type: 'string' },
            pdfUrl:       { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error:   { type: 'boolean', example: true },
            message: { type: 'string', example: 'Something went wrong' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [join(__dirname, '../routes/*.js')],
};

export const swaggerSpec = swaggerJsdoc(options);