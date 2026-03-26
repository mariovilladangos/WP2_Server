import { ZodError } from 'zod';

const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: true, message: 'Error de validación', details: err.errors });
    }
    next(err);
  }
};

export default validate;
