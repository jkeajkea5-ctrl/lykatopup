import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, sparse: true },
    passwordHash: { type: String, select: false },
    avatar: String,
    role: { type: String, enum: ['buyer', 'admin'], default: 'buyer' },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    providers: {
      googleId: String,
      telegramId: String,
      telegramUsername: String
    },
    telegramChatId: String,
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.index({ 'providers.telegramId': 1 }, { sparse: true });
userSchema.index({ updatedAt: -1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
