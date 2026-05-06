import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  street:   { type: String, trim: true, default: '' },
  number:   { type: String, trim: true, default: '' },
  postal:   { type: String, trim: true, default: '' },
  city:     { type: String, trim: true, default: '' },
  province: { type: String, trim: true, default: '' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  name: {
    type: String,
    trim: true,
    default: '',
  },
  lastName: {
    type: String,
    trim: true,
    default: '',
  },
  nif: {
    type: String,
    trim: true,
    uppercase: true,
    default: '',
  },
  role: {
    type: String,
    enum: ['admin', 'guest'],
    default: 'admin',
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'verified'],
    default: 'pending',
    index: true,
  },
  verificationCode: {
    type: String,
    select: false,
  },
  verificationAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
    index: true,
  },
  address: {
    type: addressSchema,
    default: () => ({}),
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  refreshToken: {
    type: String,
    default: null,
    select: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.virtual('fullName').get(function () {
  if (this.name || this.lastName) {
    return `${this.name} ${this.lastName}`.trim();
  }
  return '';
});

export default mongoose.model('User', userSchema);
