import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street:   { type: String, trim: true, default: '' },
  number:   { type: String, trim: true, default: '' },
  postal:   { type: String, trim: true, default: '' },
  city:     { type: String, trim: true, default: '' },
  province: { type: String, trim: true, default: '' },
}, { _id: false });

const companySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  cif: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  address: {
    type: addressSchema,
    default: () => ({}),
  },
  logo: {
    type: String,
    default: '',
  },
  isFreelance: {
    type: Boolean,
    default: false,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.model('Company', companySchema);
