import Project from '../models/project.model.js';
import Client from '../models/client.model.js';
import { AppError } from '../utils/AppError.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';

// ── POST /api/project ──────────────────────────────────────────────────────────
export const createProject = async (req, res, next) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0].message, 400));

    const { client: clientId, name, projectCode, address, email, notes, active } = parsed.data;
    const companyId = req.user.company;
    if (!companyId) return next(new AppError('User has no company assigned', 400));

    // Verify client belongs to same company
    const client = await Client.findOne({ _id: clientId, company: companyId, deleted: false });
    if (!client) return next(new AppError('Client not found in your company', 404));

    // Check unique projectCode
    const existing = await Project.findOne({ company: companyId, projectCode });
    if (existing) return next(new AppError('A project with this code already exists in your company', 409));

    const project = await Project.create({
      user: req.user._id, company: companyId,
      client: clientId, name, projectCode, address, email, notes, active,
    });

    if (req.io) req.io.to(companyId.toString()).emit('project:new', project);

    return res.status(201).json({ project });
  } catch (err) { next(err); }
};

// ── PUT /api/project/:id ───────────────────────────────────────────────────────
export const updateProject = async (req, res, next) => {
  try {
    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0].message, 400));

    const project = await Project.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!project) return next(new AppError('Project not found', 404));

    if (parsed.data.projectCode && parsed.data.projectCode !== project.projectCode) {
      const dup = await Project.findOne({ company: req.user.company, projectCode: parsed.data.projectCode });
      if (dup) return next(new AppError('Another project already uses this code', 409));
    }

    if (parsed.data.client) {
      const client = await Client.findOne({ _id: parsed.data.client, company: req.user.company, deleted: false });
      if (!client) return next(new AppError('Client not found in your company', 404));
    }

    Object.assign(project, parsed.data);
    await project.save();

    return res.status(200).json({ project });
  } catch (err) { next(err); }
};

// ── GET /api/project ───────────────────────────────────────────────────────────
export const listProjects = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const { client, name, active, sort = '-createdAt' } = req.query;

    const filter = { company: req.user.company, deleted: false };
    if (client) filter.client = client;
    if (name)   filter.name = { $regex: name, $options: 'i' };
    if (active !== undefined) filter.active = active === 'true';

    const skip = (page - 1) * limit;
    const [projects, total] = await Promise.all([
      Project.find(filter).populate('client', 'name cif email').sort(sort).skip(skip).limit(limit),
      Project.countDocuments(filter),
    ]);

    return res.status(200).json({
      projects,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) { next(err); }
};

// ── GET /api/project/archived ──────────────────────────────────────────────────
export const listArchivedProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ company: req.user.company, deleted: true })
      .populate('client', 'name cif');
    return res.status(200).json({ projects });
  } catch (err) { next(err); }
};

// ── GET /api/project/:id ───────────────────────────────────────────────────────
export const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, company: req.user.company, deleted: false })
      .populate('client', 'name cif email phone address');
    if (!project) return next(new AppError('Project not found', 404));
    return res.status(200).json({ project });
  } catch (err) { next(err); }
};

// ── DELETE /api/project/:id ────────────────────────────────────────────────────
export const deleteProject = async (req, res, next) => {
  try {
    const soft = req.query.soft !== 'false';
    const project = await Project.findOne({ _id: req.params.id, company: req.user.company, deleted: false });
    if (!project) return next(new AppError('Project not found', 404));

    if (soft) {
      project.deleted = true;
      await project.save();
      return res.status(200).json({ message: 'Project archived' });
    } else {
      await project.deleteOne();
      return res.status(200).json({ message: 'Project permanently deleted' });
    }
  } catch (err) { next(err); }
};

// ── PATCH /api/project/:id/restore ────────────────────────────────────────────
export const restoreProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, company: req.user.company, deleted: true });
    if (!project) return next(new AppError('Archived project not found', 404));
    project.deleted = false;
    await project.save();
    return res.status(200).json({ project });
  } catch (err) { next(err); }
};