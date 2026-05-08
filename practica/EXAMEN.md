# Informe — Reto F12

> **Capa de autorización granular y tests de aislamiento multi-tenant en albaranes firmados**


## 1. Reto

**F12 — Capa de autorización granular y tests de aislamiento multi-tenant en albaranes firmados.**

**Fundamento que mide:** reglas de negocio + tests de seguridad + control de acceso por rol.

El endpoint `PATCH /api/deliverynote/:id/sign` filtraba únicamente por `company`, lo que permitía a cualquier usuario de la misma compañía firmar cualquier albarán (incluso un *guest* invitado firmando partes ajenos). El reto pide cerrar ese hueco y, de paso, generalizar el middleware `checkRole` para futuras rutas que necesiten una autorización tipo "admin O propietario".

---

## 2. Tarea técnica

### 2.1. Check owner/admin en `signDeliveryNote`

**Archivo:** `src/controllers/deliverynote.controller.js:106-156`

Se inserta el check tras el `404` (existencia) y **antes** de validar el estado del albarán y el fichero, manteniendo el orden REST canónico **404 → 403 → 400**:

```js
if (!note) return next(new AppError('Delivery note not found', 404));

const isOwner = note.user._id.equals(req.user._id); // note.user viene populado
const isAdmin = req.user.role === 'admin';
if (!isOwner && !isAdmin) {
  return next(new AppError('Not authorized to sign this delivery note', 403));
}

if (note.signed) return next(new AppError('Delivery note is already signed', 400));
if (!req.file)   return next(new AppError('Signature image is required', 400));
```

**Nota técnica:** la consigna sugería `note.user.equals(req.user._id)`. Sin embargo, la query usa `.populate('user', 'name lastName email')`, así que `note.user` es un sub-documento de Mongoose y la comparación correcta es `note.user._id.equals(req.user._id)`. La forma del enunciado solo funcionaría si el campo no se populara, y ese populate es necesario aguas abajo para generar el PDF.

**Por qué en el controlador y no como `checkRole` en la ruta:** la decisión depende del documento (quién es `note.user`), que solo se conoce tras la consulta a BD. Externalizarlo al middleware obligaría a duplicar la query.

### 2.2. Extensión de `checkRole`

**Archivo:** `src/middleware/role.middleware.js:1-21`

```js
export const checkRole = (...args) => {
  const ownerCheck = typeof args[args.length - 1] === 'function' ? args.pop() : null;
  const roles = args;

  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    const roleOk  = roles.includes(req.user.role);
    const ownerOk = ownerCheck ? !!ownerCheck(req) : false;

    if (!roleOk && !ownerOk) {
      return next(new AppError(`Access denied. Required role: ${roles.join(' or ')}`, 403));
    }
    next();
  };
};
```

- **Semántica:** OR. Pasa si el rol coincide **o** si `ownerCheck(req)` devuelve truthy.
- **Backward compatible:** `checkRole('admin')` en `src/routes/user.routes.js:331` sigue funcionando sin cambios (no hay último argumento función → `ownerCheck = null` → OR degenera al check de rol original).
- **Uso futuro:** `checkRole('admin', (req) => req.user._id.equals(req.params.id))` para rutas tipo `/users/:id` donde un usuario puede ver/editar su propio recurso o cualquier admin puede.

### 2.3. Tests añadidos

**Archivo:** `tests/deliverynote.signing.test.js` — nuevo `describe('PATCH /api/deliverynote/:id/sign — authorization')` con dos casos:

| Caso | Setup | Esperado |
|---|---|---|
| Guest no creador firma | Note creada por admin, token de un guest de la misma compañía | **403** + `signed=false` en BD |
| Admin no creador firma | Note creada por guest, token de admin de la misma compañía | **200** + `signed=true` + `pdfUrl` |

**Resultado de la suite completa:** `Tests: 135 passed, 135 total` (125 originales + 10 de verificación de las respuestas socráticas; ver §5) — sin regresiones.

---

## 3. Respuestas socráticas

### 3.1. Guest de la misma compañía llamando a `PATCH /:id/sign`

**Antes** del fix: el albarán quedaba firmado por un usuario distinto al operario que ejecutó el trabajo. El controlador solo filtraba por `company`, así que cualquier guest invitado podía marcar como firmados partes ajenos, persistiendo `signatureUrl` apuntando a la firma del usuario equivocado y rompiendo la trazabilidad.

**Ahora:** 403.

**Justificación de negocio:** la firma del albarán es legalmente vinculante — es el "OK" del operario presente en obra sobre el material entregado o las horas trabajadas. Por eso solo dos roles tienen legitimidad para firmar:

1. **El creador del parte** (`note.user`): es quien estuvo en obra y tiene conocimiento directo del trabajo realizado.
2. **Un admin** (`req.user.role === 'admin'`): rol delegado de la compañía, típicamente el responsable que puede firmar en nombre de un operario ausente o cerrar partes pendientes al cierre del mes.

Un *guest* invitado a la compañía (rol observador, p. ej. un cliente externo o un becario) no puede asumir esa responsabilidad sobre trabajo de otro. La línea que separa "ver" de "firmar" es exactamente la que separa `guest` de `admin/owner`.

### 3.2. Middleware genérico "admin OR propietario" sin acoplar lógica de negocio

La trampa es que "ser propietario" depende del recurso: en albaranes es `note.user`; en proyectos es `project.user`; en clientes podría ser `client.user`. Un middleware **no debe saber qué modelo cargar**.

**Diseño elegido (el que se ha implementado):** delegar al *caller* la responsabilidad de definir cómo resolver la propiedad, vía un callback `ownerCheck(req) → boolean`. El middleware solo conoce roles + un predicado opaco. Cero acoplamiento al dominio.

**Diseño alternativo más sofisticado** (no aplicado aquí porque YAGNI):

```js
const requireRole  = (...roles) => (req, _r, next) => roles.includes(req.user.role) ? next() : next(forbidden);
const requireOwner = (resolver) => async (req, _r, next) => (await resolver(req)).equals(req.user._id) ? next() : next(forbidden);
const anyOf = (...mws) => (req, res, next) => { /* corre todos en paralelo, si alguno hace next() sin error, pasa */ };

router.patch('/:id/sign', anyOf(requireRole('admin'), requireOwner(async (req) => (await DeliveryNote.findById(req.params.id))?.user)), ...);
```

Esto descompone la autorización en piezas atómicas y un combinador. Trade-off: hace doble query a BD (la del middleware + la del controller) salvo que se cachee el documento en `req.note`. Para este reto bastaba con la solución mínima: callback opaco al final de `checkRole`.

### 3.3. Reintentos / circuit-breaker en `uploadBuffer` para evitar `signed=true` sin `pdfUrl`

**Riesgo actual:** en `signDeliveryNote` se hace `note.signed = true; await note.save()` **antes** de subir el PDF. Si el segundo `uploadBuffer` (el del PDF) falla, el albarán queda firmado pero sin `pdfUrl` — estado inconsistente que el endpoint `GET /pdf/:id` paliará regenerando el PDF al vuelo, pero perdiendo la URL canónica almacenada.

**Estrategia propuesta para `src/services/storage.service.js`:**

1. **Wrapper con backoff exponencial + jitter** (p.ej. 3 intentos: 200 ms, 800 ms, 3 s ± 30 % jitter). Cubre fallos transitorios de red o picos de latencia de Cloudinary.
2. **Idempotencia ya garantizada:** los `publicId` que se generan en el controller (`sign_<noteId>`, `pdf_<noteId>`) son deterministas, por lo que un reintento sobre el mismo recurso no duplica — Cloudinary sobrescribe.
3. **Circuit-breaker** (con `opossum` por ejemplo): si la tasa de errores supera un umbral en una ventana, abre el circuito durante N segundos, devolviendo error inmediatamente sin saturar más Cloudinary.
4. **Rollback transaccional en `signDeliveryNote`:** si tras retries falla el PDF, revertir `signed=false`, `signatureUrl=''`, `signedAt=undefined` y borrar la firma con `deleteResource(sig_<noteId>)`. Alternativa más resiliente: mantener `signed=true` pero marcar `pdfStatus: 'pending'` y delegar a un job batch (BullMQ) que reintente; el endpoint `GET /pdf/:id` ya genera al vuelo, así que el cliente final no se rompe.

### 3.4. "Race condition" con `signatureUrl` — corrección tras verificar empíricamente

**Hipótesis inicial (incorrecta):** PDFKit descargaría `signatureUrl` por HTTP al renderizar, así que la propagación lenta del CDN podía dejar el PDF con la imagen rota.

**Realidad verificada con test** (`tests/examen.verification.test.js` — Q4): pasamos a `generateDeliveryNotePdf` un `signatureUrl` apuntando a un host inexistente (`https://this-host-definitely-does-not-exist.invalid/sig.png`) y el PDF **se genera sin lanzar**, devolviendo un buffer válido (firma `%PDF`). Esto solo es posible si pdfkit no realiza fetch HTTP alguno.

**Causa real** (`pdf.service.js:73-80`):
```js
if (note.signatureUrl) {
  try {
    doc.image(note.signatureUrl, { width: 150 });
  } catch (_) {
    doc.text('[Firma adjunta]');
  }
}
```
`PDFDocument.image()` solo acepta `Buffer` o **path a fichero local**. Cuando recibe una URL HTTP la trata como path → falla con `ENOENT` → el `try/catch` lo silencia → el PDF cae al fallback de texto `[Firma adjunta]`.

**Implicación más grave que la "race":** los PDFs de albaranes firmados **nunca contienen la imagen de la firma embebida**, independientemente del estado del CDN. Lo único que permanece es el texto literal "[Firma adjunta]". Bug funcional silente.

**Solución correcta:** pasar el buffer de la firma (`req.file.buffer` tras `processSignatureImage`, ya en memoria) directamente al servicio de PDF en lugar de la URL:

```js
// signDeliveryNote
const pdfBuffer = await generateDeliveryNotePdf(note, req.file.buffer);
// pdf.service.js
export const generateDeliveryNotePdf = (note, signatureBuffer) => { ...
  if (note.signed && signatureBuffer) doc.image(signatureBuffer, { width: 150 });
};
```

Con esto desaparecen tres problemas a la vez: el bug del fallback silencioso, el viaje extra de red, y la "race" hipotética con la propagación CDN.

### 3.5. `req.io` inyectado vía middleware global — implicaciones en tests

**Problema:** `src/app.js:48-51` inyecta `req.io = io` en cada request. La instancia `io` se crea al cargar el módulo, ligada al `httpServer` de `app.js:16`, que **nunca se inicia en el flujo de tests** (no se invoca `httpServer.listen()`; supertest levanta su propio servidor efímero al recibir `request(app)`). Resultado:

- La instancia `io` (con su `engine` adjunto) persiste mientras el módulo `app.js` esté cargado y aporta handles que sobreviven al final de la suite → la configuración actual usa `--forceExit` para terminar (`package.json:10`).
- Cualquier `req.io.emit(...)` en controladores ejecuta sin error pero no llega a ningún cliente (el `httpServer` de `app.js` no acepta conexiones, y el servidor que sí levanta supertest no está enlazado a `io`), contaminando el entorno de test sin avisar.
- Imposible verificar qué eventos se emiten desde un test sin trampear el módulo entero.

**Refactor propuesto — abstracción `EventPublisher`:**

```js
// src/services/events.service.js
export const createSocketPublisher = (io) => ({
  publish: (room, event, payload) => io.to(room).emit(event, payload),
});
export const createNoopPublisher = () => ({ publish: () => {} });
```

```js
// src/app.js — factory en vez de singleton
export function createApp({ events = createNoopPublisher() } = {}) {
  const app = express();
  app.use((req, _r, next) => { req.events = events; next(); });
  // ...
  return app;
}
```

En producción (`src/index.js`) se construye con `createSocketPublisher(io)`; en tests se usa el `noop` por defecto, o un `jest.fn()` para asertar que se publicó el evento correcto. Beneficios:

- Tests aislados sin handles abiertos (eliminamos `--forceExit`).
- Aserciones explícitas de eventos (`expect(events.publish).toHaveBeenCalledWith('<companyId>', 'deliverynote:signed', ...)`).
- Facilita migrar el transporte (Socket.IO → Redis pub/sub → Kafka) sin tocar controladores.

---

## 4. Proceso

### 4.1. Cronología

1. **Lectura del código objetivo** — `signDeliveryNote` (`deliverynote.controller.js:106-150`), `checkRole` (`role.middleware.js`), modelo `User` y rutas implicadas.
2. **Plan inicial** — orden de checks `404 → 403 → 400`, semántica OR para `ownerCheck`, decisión de hacer el check en controller (no en ruta) por necesidad de cargar el albarán.
3. **Edición del controller** — añadido el bloque `isOwner || isAdmin` justo después del `404`. Verificado que los tests existentes en `tests/deliverynote.test.js:187-219` siguen funcionando porque sus albaranes los crea el mismo admin que firma (`isOwner = true` siempre).
4. **Extensión de `checkRole`** — variádica con detección de función al final: `args.pop()` solo si `typeof === 'function'`. Compatibilidad confirmada con la única llamada existente en `user.routes.js:331` (`checkRole('admin')`).
5. **Tests** — nuevo `describe` "authorization" en `deliverynote.signing.test.js`, reaprovechando el mock global `uploadBufferMock` ya existente y el `sharp`-PNG generado al vuelo.
6. **Debugging — caso real durante TDD**: el primer run del test del guest devolvió **500 ("Cannot destructure property 'url'")** en lugar de 403. Investigación: el "guest" estaba pasando el check de admin → significaba `req.user.role === 'admin'`. Causa raíz en `src/models/user.model.js:44`: `role` tiene `default: 'admin'` (porque el primer registrado de cada compañía es el owner). Solución: forzar explícitamente `role: 'guest'` en el `findByIdAndUpdate` del setup del test.
7. **Suite completa** — `npm test` → `Tests: 125 passed, 125 total`.
8. **Verificación de las respuestas socráticas con tests ejecutables** (`tests/examen.verification.test.js`, 10 casos). El test de Q4 reveló que la hipótesis inicial sobre la "race con la CDN" era incorrecta y descubrió un bug funcional adicional (el PDF nunca embebe la firma — siempre cae al fallback `[Firma adjunta]`). La respuesta de §3.4 se reescribió para reflejar el hallazgo real. Suite total tras añadir verificación: 135/135.

### 4.2. Decisiones notables

- **No cablear `checkRole` con `ownerCheck` en la ruta de firma**, porque la propiedad del recurso solo se conoce tras la query: hacer el check en el controller evita una doble consulta a BD. La extensión de `checkRole` queda como herramienta para casos donde el owner sí es derivable de `req.params` (p. ej. `/users/:id` con `req.user._id.equals(req.params.id)`).
- **Comparar `note.user._id` y no `note.user`**, porque el populate transforma el campo en un sub-documento. `Document.equals(ObjectId)` no funciona como uno espera, mientras que `ObjectId.equals(ObjectId)` sí.
- **No tocar la firma global de `checkRole`** (sigue siendo variádica) para evitar refactorizar el único callsite existente. La detección por `typeof` mantiene una API limpia.

### 4.3. Cumplimiento de los criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| Check owner/admin en `signDeliveryNote` con respuesta 403 | ✅ | `src/controllers/deliverynote.controller.js:113-118` |
| `checkRole` extendido aceptando `ownerCheck` opcional | ✅ | `src/middleware/role.middleware.js:3-19` |
| Test de un guest no creador recibe 403 al firmar | ✅ | `tests/deliverynote.signing.test.js` — "returns 403 when a guest who is not the creator tries to sign" |
| Test de admin sí puede firmar aunque no sea creador | ✅ | `tests/deliverynote.signing.test.js` — "allows an admin to sign a note created by another user" |
| `EXAMEN.md` con respuestas + Proceso | ✅ | Este documento |

---

## 5. Verificación de las respuestas socráticas con tests

Cada respuesta de §3 está respaldada por aserciones ejecutables en `tests/examen.verification.test.js` (10 casos, todos en verde):

| Pregunta | Test(s) | Veredicto |
|---|---|---|
| **Q1** — guest no creador → 403 | `Q1 — guest no creador → 403` (1 test) | ✅ Confirmado: respuesta 403 + `signed=false` en BD. |
| **Q2** — `checkRole` con OR semántico | `Q2 — checkRole(...roles, ownerCheck?)` (6 tests) | ✅ Confirmado: cubre las 6 combinaciones (con/sin `ownerCheck`, rol pasa/falla, owner true/false, sin `req.user` → 401). |
| **Q3** — `signed=true` sin `pdfUrl` ante fallo | `Q3 — race "signed=true sin pdfUrl"` (1 test) | ✅ Riesgo confirmado: mockeando rechazo del 2º `uploadBuffer`, el albarán queda persistido con `signed=true` y `pdfUrl=''`. Justifica retry+rollback. |
| **Q4** — race CDN propagación | `Q4 — comportamiento real de pdfkit ante una URL` (1 test) | ⚠️ **Hipótesis falsada** — el PDF se genera sin error con un host inexistente, lo que demuestra que pdfkit no hace fetch HTTP. Hallazgo más grave: la firma nunca se embebe (ver §3.4 reescrita). |
| **Q5** — `req.io` siempre inyectado | `Q5 — req.io presente incluso en tests` (1 test) | ✅ Confirmado: la instancia `io` está definida tras importar `app.js`, tiene `engine` activo (handle abierto) — esto justifica `--forceExit` en `package.json:10`. |

Comando: `npm test -- tests/examen.verification.test.js` → `Tests: 10 passed, 10 total`.
