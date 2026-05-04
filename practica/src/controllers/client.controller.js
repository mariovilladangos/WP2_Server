import Client from '../models/Client.js';
import { AppError } from '../utils/AppError.js';
import { createClientSchema, updateClientSchema } from '../validators/client.validator.js';

// Helper paginación
const paginate = (query, page, limit) => ({
  skip: (page - 1) * limit,
  limit,
});

// POST /api/client
export const createClient = async (req, res, next) => {
  try {
    const parsed = createClientSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0].message, 400));

    const { name, cif, email, phone, address } = parsed.data;
    const companyId = req.user.company;
    if (!companyId) return next(new AppError('User has no company assigned', 400));

    const existing = await Client.findOne({ company: companyId, cif, deleted: false });
    if (existing) return next(new AppError('A client with this CIF already exists in your company', 409));

    const client = await Client.create({
      user: req.user._id,
      company: companyId,
      name, cif, email, phone, address,
    });

    // Socket.IO event (se añade en Fase 5)
    if (req.io) req.io.to(companyId.toString()).emit('client:new', client);

    return res.status(201).json({ client });
  } catch (err) { next(err); }
};

// PUT /api/client/:id
export const updateClient = async (req, res, next) => {
  try {
    const parsed = updateClientSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0].message, 400));

    const client = await Client.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!client) return next(new AppError('Client not found', 404));

    // Si cambia el CIF, verificar unicidad
    if (parsed.data.cif && parsed.data.cif !== client.cif) {
      const dup = await Client.findOne({ company: req.user.company, cif: parsed.data.cif, deleted: false });
      if (dup) return next(new AppError('Another client already uses this CIF', 409));
    }

    Object.assign(client, parsed.data);
    await client.save();

    return res.status(200).json({ client });
  } catch (err) { next(err); }
};

// GET /api/client
export const listClients = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const { name, sort = 'createdAt' } = req.query;

    const filter = { company: req.user.company, deleted: false };
    if (name) filter.name = { $regex: name, $options: 'i' };

    const { skip } = paginate({}, page, limit);
    const [clients, total] = await Promise.all([
      Client.find(filter).sort(sort).skip(skip).limit(limit),
      Client.countDocuments(filter),
    ]);

    return res.status(200).json({
      clients,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) { next(err); }
};

// GET /api/client/archived
export const listArchivedClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ company: req.user.company, deleted: true });
    return res.status(200).json({ clients });
  } catch (err) { next(err); }
};

// GET /api/client/:id
export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!client) return next(new AppError('Client not found', 404));
    return res.status(200).json({ client });
  } catch (err) { next(err); }
};

// DELETE /api/client/:id
export const deleteClient = async (req, res, next) => {
  try {
    const soft = req.query.soft !== 'false'; // soft por defecto
    const client = await Client.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!client) return next(new AppError('Client not found', 404));

    if (soft) {
      client.deleted = true;
      await client.save();
      return res.status(200).json({ message: 'Client archived successfully' });
    } else {
      await client.deleteOne();
      return res.status(200).json({ message: 'Client permanently deleted' });
    }
  } catch (err) { next(err); }
};

// PATCH /api/client/:id/restore 
export const restoreClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, company: req.user.company, deleted: true });
    if (!client) return next(new AppError('Archived client not found', 404));
    client.deleted = false;
    await client.save();
    return res.status(200).json({ client });
  } catch (err) { next(err); }
};