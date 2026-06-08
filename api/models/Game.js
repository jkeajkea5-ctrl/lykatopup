import mongoose from 'mongoose';

const requiredFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    placeholder: String,
    required: { type: Boolean, default: true }
  },
  { _id: false }
);

const usernameApiSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    method: { type: String, enum: ['GET', 'POST'], default: 'GET' },
    url: String,
    headers: { type: Map, of: String, default: {} },
    bodyTemplate: { type: Map, of: String, default: {} },
    usernamePath: { type: String, default: 'data.username' }
  },
  { _id: false }
);

const gameSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, trim: true, default: 'Other' },
    currencyLabel: { type: String, trim: true, default: 'Diamonds' },
    publisher: { type: String, trim: true },
    imageUrl: String,
    description: String,
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    requiredFields: { type: [requiredFieldSchema], default: [{ key: 'userId', label: 'User ID', required: true }] },
    usernameApi: { type: usernameApiSchema, default: () => ({}) },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

gameSchema.index({ active: 1, sortOrder: 1, name: 1 });
gameSchema.index({ slug: 1, active: 1 });

export const Game = mongoose.models.Game || mongoose.model('Game', gameSchema);
