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

### Con docker
```bash
cp .env.example .env    # docker compose lee del .env del directorio actual
docker compose up --build
```
La [API](http://localhost:3000) estará en `http://localhost:3000` y [Swagger](http://localhost:3000/api-docs) en `http://localhost:3000/api-docs`

### Tests
```bash
npm test                  # ejecutar tests (no necesita .env: tests/setup.js aporta defaults)
npm run test:coverage     # con cobertura (umbral mínimo: 70%)
```

### Variables de entorno
Ver [.env.example](.env.example) para todas las variables necesarias.