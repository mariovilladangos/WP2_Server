import mongoose from 'mongoose';

const workerSchema = new mongoose.Schema({
  name:  { type: String, trim: true },
  hours: { type: Number, min: 0 },
}, { _id: false });

const deliveryNoteSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  company:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client',  required: true, index: true },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  format:      { type: String, enum: ['material', 'hours'], required: true },
  description: { type: String, trim: true, default: '' },
  workDate:    { type: Date, required: true },
  // Campos para format: 'material'
  material:    { type: String, trim: true, default: '' },
  quantity:    { type: Number, min: 0, default: 0 },
  unit:        { type: String, trim: true, default: '' },
  // Campos para format: 'hours'
  hours:       { type: Number, min: 0, default: 0 },
  workers:     { type: [workerSchema], default: [] },
  // Firma
  signed:      { type: Boolean, default: false, index: true },
  signedAt:    { type: Date },
  signatureUrl:{ type: String, default: '' },
  pdfUrl:      { type: String, default: '' },
  deleted:     { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model('DeliveryNote', deliveryNoteSchema);