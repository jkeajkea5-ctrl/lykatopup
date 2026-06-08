import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Lyka Admin' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
    lastLoginAt: Date
  },
  { timestamps: true }
);

export const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
