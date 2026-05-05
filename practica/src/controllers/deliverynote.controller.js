import DeliveryNote from '../models/deliverynote.model.js';
import Project from '../models/project.model.js';
import Client from '../models/client.model.js';
import { AppError } from '../utils/AppError.js';
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js';

// POST /api/deliverynote
export const createDeliveryNote = async (req, res, next) => {
  try {
    const parsed = createDeliveryNoteSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0].message, 400));

    const data = parsed.data;
    const companyId = req.user.company;
    if (!companyId) return next(new AppError('User has no company', 400));

    // Verify client and project belong to company
    const [client, project] = await Promise.all([
      Client.findOne({ _id: data.client, company: companyId, deleted: false }),
      Project.findOne({ _id: data.project, company: companyId, deleted: false }),
    ]);

    if (!client)  return next(new AppError('Client not found in your company', 404));
    if (!project) return next(new AppError('Project not found in your company', 404));

    const note = await DeliveryNote.create({
      user: req.user._id,
      company: companyId,
      ...data,
      workDate: new Date(data.workDate),
    });

    // Socket.IO (Fase 5)
    if (req.io) req.io.to(companyId.toString()).emit('deliverynote:new', note);

    return res.status(201).json({ deliveryNote: note });
  } catch (err) { next(err); }
};

// GET /api/deliverynote
export const listDeliveryNotes = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const { project, client, format, signed, from, to, sort = '-workDate' } = req.query;

    const filter = { company: req.user.company, deleted: false };
    if (project) filter.project = project;
    if (client)  filter.client  = client;
    if (format)  filter.format  = format;
    if (signed !== undefined) filter.signed = signed === 'true';
    if (from || to) {
      filter.workDate = {};
      if (from) filter.workDate.$gte = new Date(from);
      if (to)   filter.workDate.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      DeliveryNote.find(filter)
        .populate('client', 'name cif')
        .populate('project', 'name projectCode')
        .sort(sort).skip(skip).limit(limit),
      DeliveryNote.countDocuments(filter),
    ]);

    return res.status(200).json({
      deliveryNotes: notes,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) { next(err); }
};

// GET /api/deliverynote/:id
export const getDeliveryNote = async (req, res, next) => {
  try {
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('user', 'name lastName email')
      .populate('client', 'name cif email phone address')
      .populate('project', 'name projectCode address email');

    if (!note) return next(new AppError('Delivery note not found', 404));
    return res.status(200).json({ deliveryNote: note });
  } catch (err) { next(err); }
};

// DELETE /api/deliverynote/:id
export const deleteDeliveryNote = async (req, res, next) => {
  try {
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!note) return next(new AppError('Delivery note not found', 404));
    if (note.signed) return next(new AppError('Signed delivery notes cannot be deleted', 403));

    // Soft delete (albaranes no tienen hard delete en el enunciado)
    note.deleted = true;
    await note.save();
    return res.status(200).json({ message: 'Delivery note deleted' });
  } catch (err) { next(err); }
};

// PATCH /api/deliverynote/:id/sign
export const signDeliveryNote = async (req, res, next) => {
  return next(new AppError('onwork', 501));
};

// GET /api/deliverynote/pdf/:id
export const downloadPdf = async (req, res, next) => {
  return next(new AppError('onwork', 501));
};