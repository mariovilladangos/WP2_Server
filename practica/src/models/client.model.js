import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street:   { type: String, trim: true, default: '' },
  number:   { type: String, trim: true, default: '' },
  postal:   { type: String, trim: true, default: '' },
  city:     { type: String, trim: true, default: '' },
  province: { type: String, trim: true, default: '' },
}, { _id: false });

const clientSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name:    { type: String, required: true, trim: true },
  cif:     { type: String, required: true, trim: true, uppercase: true },
  email:   { type: String, trim: true, lowercase: true, default: '' },
  phone:   { type: String, trim: true, default: '' },
  address: { type: addressSchema, default: () => ({}) },
  deleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// CIF único por compañía
clientSchema.index({ company: 1, cif: 1 }, { unique: true });

export default mongoose.model('Client', clientSchema);