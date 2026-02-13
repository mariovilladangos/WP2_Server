import { Router } from 'express';
import * as todos from '../controllers/todos.controller.js';
import { validate } from '../middleware/validateRequest.js';
import { createTodosSchema, updateTodosSchema } from '../schemas/todos.schema.js';

const router = Router();

router.get('/', todos.getAll);
router.get('/:id', todos.getById);
router.post('/', validate(createTodosSchema), todos.create);
router.put('/:id', validate(updateTodosSchema), todos.update);
router.delete('/:id', todos.remove);
router.patch('/:id/toggle', todos.toggleCompleted);

export default router;