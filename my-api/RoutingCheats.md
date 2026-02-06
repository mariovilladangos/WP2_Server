## 4. Routing en Express 5

### 4.1 Métodos HTTP

Express proporciona métodos para cada verbo HTTP:

```javascript
app.get('/recurso', handler);      // Obtener
app.post('/recurso', handler);     // Crear
app.put('/recurso/:id', handler);  // Reemplazar
app.patch('/recurso/:id', handler);// Modificar parcialmente
app.delete('/recurso/:id', handler);// Eliminar
app.all('/recurso', handler);      // Todos los métodos
```

### 4.2 Parámetros de Ruta

```javascript
// Parámetro obligatorio
app.get('/cursos/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id });
});

// Múltiples parámetros
app.get('/cursos/:categoria/:id', (req, res) => {
  const { categoria, id } = req.params;
  res.json({ categoria, id });
});
```

**⚠️ Cambios en Express 5:**

```javascript
// Express 4 - Parámetro opcional
app.get('/users/:id?', handler);

// Express 5 - Nueva sintaxis con llaves
app.get('/users{/:id}', handler);

// Express 4 - Wildcard anónimo
app.get('/files/*', handler);

// Express 5 - Wildcard con nombre obligatorio
app.get('/files/*filepath', (req, res) => {
  console.log(req.params.filepath); // Captura todo después de /files/
});
```

### 4.3 Query Parameters

```javascript
// GET /cursos?nivel=basico&orden=vistas&limit=10
app.get('/cursos', (req, res) => {
  const { nivel, orden, limit } = req.query;
  
  console.log(nivel);  // 'basico'
  console.log(orden);  // 'vistas'
  console.log(limit);  // '10' (siempre string)
  
  res.json({ filtros: req.query });
});
```

### 4.4 Respuestas

```javascript
// JSON (más común para APIs)
res.json({ data: usuarios });

// Con código de estado
res.status(201).json({ mensaje: 'Creado', data: nuevo });
res.status(404).json({ error: 'No encontrado' });

// Sin contenido
res.status(204).end();

// Texto plano
res.send('Hola mundo');

// HTML
res.send('<h1>Título</h1>');

// Archivo
res.sendFile('/ruta/archivo.pdf');

// Redirección
res.redirect('/nueva-ruta');
res.redirect(301, '/nueva-ruta-permanente');
```

---