# BildyApp Backend

REST API en Node.js + Express + MongoDB para gestión de albaranes digitales (clientes, proyectos, albaranes con firma y PDF).

## 🚀 Instalación y ejecución

### Requisitos
- Node.js >= 22
- MongoDB >= 7 (o usa Docker)

### Desarrollo local
```bash
cp .env.example .env    # configura tus variables
npm install
npm run dev
```

### Con Docker
```bash
cp .env.example .env    # docker compose lee del .env del directorio actual
docker compose up --build
```
La [API](http://localhost:3000) estará en `http://localhost:3000` y la [documentación Swagger](http://localhost:3000/api-docs) en `http://localhost:3000/api-docs`.

### Tests
```bash
npm test                  # ejecuta tests (no necesita .env: tests/setup.js aporta defaults)
npm run test:watch        # modo watch
npm run test:coverage     # con cobertura (umbral mínimo configurado: 70%)
```
Los tests usan `mongodb-memory-server`, así que **no necesitan ningún MongoDB externo**. El umbral mínimo de cobertura está configurado en `package.json` (`coverageThreshold: 70%` en branches, funcs, lines y statements) y `npm run test:coverage` falla si baja.

### Pipeline CI
`.github/workflows/test.yml` ejecuta `npm ci` + `npm run test:coverage` en cada push y PR sobre Node 22, y sube el reporte de cobertura como artefacto.

### Variables de entorno
Ver [.env.example](.env.example). Resumen:

| Variable | Para qué |
|---|---|
| `PORT` | Puerto HTTP (default 3000) |
| `MONGODB_URI` | URI de MongoDB |
| `JWT_SECRET` | Firma de access tokens (15 min) |
| `JWT_REFRESH_SECRET` | Firma de refresh tokens (7 días) |
| `JWT_EXPIRES_IN` | TTL del access token |
| `JWT_REFRESH_EXPIRES_IN` | TTL del refresh token |
| `CLOUDINARY_*` | Subida de logos, firmas y PDFs |
| `SMTP_*` | Emails de verificación e invitación (Nodemailer) |
| `SLACK_WEBHOOK_URL` | Notificación de errores 5XX |

## 📚 Endpoints

Documentación interactiva en **`/api-docs`** (Swagger UI). Resumen:

### Usuarios y autenticación
- `POST /api/user/register` — registro (email + password ≥8)
- `PUT /api/user/validation` — verificar código de 6 dígitos (3 intentos, 429 si se agotan)
- `POST /api/user/login` — login
- `PUT /api/user/register` — onboarding personal (name, lastName, nif)
- `PATCH /api/user/company` — onboarding compañía (`discriminatedUnion`: freelance vs empresa)
- `PATCH /api/user/logo` — sube logo (Multer + Sharp + Cloudinary, max 5MB)
- `GET /api/user` — perfil con `populate('company')` y virtual `fullName`
- `POST /api/user/refresh` — rota tokens
- `POST /api/user/logout` — invalida refresh token
- `DELETE /api/user?soft=true` — soft o hard delete
- `POST /api/user/invite` — invita guest (admin-only)
- `PUT /api/user/password` — cambia password (Zod `.refine()` new ≠ current)

### Clientes, proyectos, albaranes
- `POST | GET /api/client` (+ `/archived`, `/:id`, `/:id/restore`)
- `POST | GET /api/project` (+ `/archived`, `/:id`, `/:id/restore`)
- `POST | GET /api/deliverynote`
  - `PATCH /api/deliverynote/:id/sign` — sube firma (Sharp → WebP), genera PDF (pdfkit), almacena ambos en Cloudinary
  - `GET /api/deliverynote/pdf/:id` — redirige al PDF firmado o genera al vuelo
  - `DELETE /api/deliverynote/:id` — soft delete (los firmados no se borran)

### Diagnóstico
- `GET /health` — estado del servidor, conexión a MongoDB, uptime, timestamp
- `GET /api` — info y enlaces

### Probar a mano
[`index.http`](index.http) tiene ejemplos completos para cada endpoint. Usable con la extensión "REST Client" de VS Code.

## 🧱 Estructura

```
src/
├── app.js                  # express + helmet + rate-limit + sanitize + socket.io
├── index.js                # bootstrap + graceful shutdown (SIGTERM/SIGINT)
├── config/
│   ├── db.js               # mongoose.connect
│   └── swagger.js          # OpenAPI 3.0 spec (componentes + tags)
├── controllers/            # user, client, project, deliverynote
├── middleware/             # auth (JWT), role, error, upload (Multer + Sharp)
├── models/                 # User, Company, Client, Project, DeliveryNote
├── routes/                 # rutas con anotaciones swagger-jsdoc
├── schemas/ + validators/  # Zod (.transform, .refine, .discriminatedUnion)
├── services/
│   ├── notification.service.js  # EventEmitter (user:registered, ...)
│   ├── mail.service.js          # Nodemailer (verificación + invitación)
│   ├── storage.service.js       # Cloudinary (logo, firma, PDF)
│   ├── pdf.service.js           # pdfkit
│   └── logger.service.js        # Slack incoming webhook (errores 5XX)
└── utils/                  # AppError, jwt, password
tests/                      # Jest + Supertest + mongodb-memory-server
```

## 🔒 Seguridad y robustez

- JWT con secretos separados access/refresh y rotación de refresh token en `/refresh`.
- `helmet`, `cors`, `express-rate-limit` (global + login).
- Sanitización NoSQL manual sobre `req.body` y `req.params` (Express 5 hace `req.query` inmutable).
- Subida de archivos limitada a 5 MB y restringida a JPEG/PNG/WebP.
- Soft delete (User, Company, Client, Project, DeliveryNote).
- Graceful shutdown: cierra Socket.IO, HTTP y MongoDB en SIGTERM/SIGINT con timeout de 10s.
- Errores 5XX se notifican a Slack vía webhook (silencioso si no hay webhook configurado).

## 🔌 WebSockets

`io.use` autentica con el JWT del handshake; cada cliente se une a la room de su `company`. Eventos emitidos por compañía: `client:new`, `project:new`, `deliverynote:new`, `deliverynote:signed`.
