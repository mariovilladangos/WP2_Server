import { Router } from 'express';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL  } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);  
const __dirname = dirname(__filename);  

const router = Router();

const routeFiles = readdirSync(__dirname).filter(
  (file) => file.endsWith('.routes.js')
);

const loadRoutes = async () => {
  for (const file of routeFiles) {
    const routeName = file.replace('.routes.js', '');
    const fileURL = pathToFileURL(join(__dirname, file)).href;
    const routeModule = await import(fileURL);

    router.use(`/${routeName}`, routeModule.default);
    console.log(`📍 Ruta cargada: /api/${routeName}`);
  }
};


loadRoutes();

export default router;