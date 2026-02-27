## 6. CRUD con MongoDB

### 6.1 Operaciones Básicas

```javascript
// CREATE
const user = await User.create({ name: 'Juan', email: 'juan@mail.com' });
// o
const user = new User({ name: 'Juan', email: 'juan@mail.com' });
await user.save();

// READ
const users = await User.find();                          // Todos
const users = await User.find({ role: 'admin' });         // Con filtro
const user = await User.findById(id);                     // Por ID
const user = await User.findOne({ email: 'juan@mail.com' }); // Uno solo

// UPDATE
const user = await User.findByIdAndUpdate(id, { name: 'Juan Pérez' }, { new: true });
const result = await User.updateMany({ role: 'user' }, { isActive: false });

// DELETE
const user = await User.findByIdAndDelete(id);
const result = await User.deleteMany({ isActive: false });
```

### 6.2 Consultas Avanzadas

```javascript
// Selección de campos
const users = await User.find().select('name email -_id');

// Ordenamiento
const users = await User.find().sort({ createdAt: -1 }); // DESC
const users = await User.find().sort('name');            // ASC

// Paginación
const page = 2;
const limit = 10;
const users = await User.find()
  .skip((page - 1) * limit)
  .limit(limit);

// Operadores de comparación
const users = await User.find({
  age: { $gte: 18, $lte: 65 },           // >= 18 AND <= 65
  role: { $in: ['user', 'moderator'] },   // IN array
  name: { $regex: /^J/i }                 // Regex
});

// Operadores lógicos
const users = await User.find({
  $or: [
    { role: 'admin' },
    { isActive: true }
  ]
});

// Contar
const count = await User.countDocuments({ isActive: true });

// Verificar existencia
const exists = await User.exists({ email: 'juan@mail.com' });
```

### 6.3 Optimización con lean()

Por defecto, Mongoose retorna documentos con métodos y getters. Para consultas de solo lectura, `lean()` mejora significativamente el rendimiento:

```javascript
// Sin lean() - retorna documento Mongoose completo
const users = await User.find();
// users[0] tiene métodos como .save(), .toJSON(), etc.

// Con lean() - retorna objetos JavaScript planos
const users = await User.find().lean();
// ~5x más rápido, usa menos memoria
// Ideal para APIs que solo envían JSON

// Combinar con otras operaciones
const users = await User.find({ isActive: true })
  .select('name email')
  .sort({ createdAt: -1 })
  .limit(10)
  .lean();
```

**Cuándo usar `lean()`:**
- ✅ Endpoints GET que solo retornan datos
- ✅ Listados y búsquedas
- ❌ Cuando necesitas modificar y guardar el documento
- ❌ Cuando necesitas virtuals o métodos del modelo

---
---

### Criterios de éxito
- CRUD completo de películas funcionando
- Filtro por género implementado
- Sistema de alquiler/devolución con validaciones
- Estadísticas de top 5 películas
- Manejo de errores apropiado (404, 400, etc.)
- Validaciones en el modelo Mongoose
- Subida de carátula con Multer funcionando
- Endpoint GET para recuperar la carátula

### BONUS (puntuable)

- Añadir paginación a GET /api/movies (?page=1&limit=10)
- Implementar búsqueda por título (?search=matrix)
- Añadir campo rating y endpoint para valorar películas
- Crear endpoint /api/movies/available que solo muestre películas con copias disponibles