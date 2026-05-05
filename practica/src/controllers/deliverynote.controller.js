import DeliveryNote from '../models/deliverynote.model.js';
import Project from '../models/project.model.js';
import Client from '../models/client.model.js';
import { AppError } from '../utils/AppError.js';
import { createDeliveryNoteSchema } from '../validators/deliverynote.validator.js';
import { uploadBuffer } from '../services/storage.service.js';
import { generateDeliveryNotePdf } from '../services/pdf.service.js';

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
  try {
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('user', 'name lastName email')
      .populate('client', 'name cif email phone address')
      .populate('project', 'name projectCode address');

    if (!note) return next(new AppError('Delivery note not found', 404));
    if (note.signed) return next(new AppError('Delivery note is already signed', 400));

    if (!req.file) return next(new AppError('Signature image is required', 400));

    // 1. Subir firma a Cloudinary
    const { url: signatureUrl } = await uploadBuffer(req.file.buffer, {
      folder: `bildyapp/signatures/${note.company}`,
      publicId: `sign_${note._id}`,
    });

    // 2. Marcar como firmado
    note.signed      = true;
    note.signedAt    = new Date();
    note.signatureUrl = signatureUrl;
    await note.save();

    // Refrescar nota con URL de firma para el PDF
    note.signatureUrl = signatureUrl;

    // 3. Generar PDF
    const pdfBuffer = await generateDeliveryNotePdf(note);

    // 4. Subir PDF a Cloudinary
    const { url: pdfUrl } = await uploadBuffer(pdfBuffer, {
      folder: `bildyapp/pdfs/${note.company}`,
      publicId: `pdf_${note._id}`,
      resourceType: 'raw',
    });

    note.pdfUrl = pdfUrl;
    await note.save();

    // Socket.IO event
    if (req.io) req.io.to(note.company.toString()).emit('deliverynote:signed', { _id: note._id, pdfUrl });

    return res.status(200).json({ deliveryNote: note });
  } catch (err) { next(err); }
};

// GET /api/deliverynote/pdf/:id
export const downloadPdf = async (req, res, next) => {
  try {
    const note = await DeliveryNote.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('user', 'name lastName email')
      .populate('client', 'name cif email phone address')
      .populate('project', 'name projectCode address');

    if (!note) return next(new AppError('Delivery note not found', 404));

    // Si ya existe PDF firmado en la nube, redirigir
    if (note.signed && note.pdfUrl) {
      return res.redirect(note.pdfUrl);
    }

    // Generar PDF al vuelo
    const pdfBuffer = await generateDeliveryNotePdf(note);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="albaran-${note._id}.pdf"`,
    });
    return res.send(pdfBuffer);
  } catch (err) { next(err); }
};