import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    gameName: String,
    packageName: String,
    priceUsd: { type: Number, required: true },
    accountInfo: { type: Map, of: String, required: true },
    gameUsername: { type: String, required: true },
    contact: {
      email: String,
      telegramUsername: String,
      telegramChatId: String
    },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending_payment'
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    delivery: {
      provider: String,
      gameCode: String,
      catalogueName: String,
      externalOrderId: String,
      status: {
        type: String,
        enum: ['not_configured', 'pending', 'submitted', 'completed', 'failed'],
        default: 'pending'
      },
      rawResponse: mongoose.Schema.Types.Mixed,
      error: String,
      submittedAt: Date,
      deliveredAt: Date
    },
    notes: String
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'contact.telegramChatId': 1 });
orderSchema.index({ 'contact.telegramUsername': 1 });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
