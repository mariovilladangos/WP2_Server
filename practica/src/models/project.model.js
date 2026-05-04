import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street:   { type: String, trim: true, default: '' },
  number:   { type: String, trim: true, default: '' },
  postal:   { type: String, trim: true, default: '' },
  city:     { type: String, trim: true, default: '' },
  province: { type: String, trim: true, default: '' },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  company:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },
  name:        { type: String, required: true, trim: true },
  projectCode: { type: String, required: true, trim: true },
  address:     { type: addressSchema, default: () => ({}) },
  email:       { type: String, trim: true, lowercase: true, default: '' },
  notes:       { type: String, trim: true, default: '' },
  active:      { type: Boolean, default: true },
  deleted:     { type: Boolean, default: false, index: true },
}, { timestamps: true });

// Código único por compañía
projectSchema.index({ company: 1, projectCode: 1 }, { unique: true });

export default mongoose.model('Project', projectSchema);