import { todos } from '../data/todos.js';
import { ApiError } from '../middleware/errorHandler.js';

const items = todos.items;
let id = 0;

export const getAll = (req, res) => {
  let resultado = [...items];
  
  const pHigh = resultado.filter(c => c.priority === "high");
  const pMedium = resultado.filter(c => c.priority === "medium");
  const pLow = resultado.filter(c => c.priority === "low");

  resultado = [...pHigh, ...pMedium, ...pLow];
  res.json(resultado);
};

export const getById = (req, res) => {
  const id = parseInt(req.params.id);
  const curso = items.find(c => c.id === id);
  
  if (!curso) {
    throw ApiError.notFound(`Curso con ID ${id} no encontrado`);
  }
  
  res.json(curso);
};

export const create = (req, res) => {
  const { title, description, priority } = req.body;
  
  const newTodo = {
        id:	++id,
        title:	title,
        description:	description || null,
        priority:	priority || "medium",
        completed: false,
        createdAt:	new Date()

  };

  
  items.push(newTodo);
  res.status(201).json(newTodo);
};

export const update = (req, res) => {
  const id = parseInt(req.params.id);
  const index = items.findIndex(c => c.id === id);
  
  if (index === -1) {
    throw ApiError.notFound(`Curso con ID ${id} no encontrado`);
  }
  
  const lastValues = items[index];
  const { title, description, priority } = req.body;
  
  

  items[index] = {
    ...items[index],
    title: title || lastValues.title,
    description: description || lastValues.description,
    priority: priority || lastValues.priority
  };
  
  res.json(items[index]);
};

export const remove = (req, res) => {
  const id = parseInt(req.params.id);
  const index = items.findIndex(c => c.id === id);
  
  if (index === -1) {
    throw ApiError.notFound(`Curso con ID ${id} no encontrado`);
  }
  
  items.splice(index, 1);
  res.status(204).end();
};

export const toggleCompleted = (req, res) => {
  const id = parseInt(req.params.id);
  const index = items.findIndex(c => c.id === id);
  
  if (index === -1) {
    throw ApiError.notFound(`Curso con ID ${id} no encontrado`);
  }
  
  items[index] = {
    ...items[index],
    completed: !items[index].completed
  };
  
  res.json(items[index]);
};