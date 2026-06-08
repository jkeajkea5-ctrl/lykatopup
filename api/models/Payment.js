import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    provider: { type: String, default: 'tola-khqr' },
    amountUsd: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['created', 'pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'], default: 'created' },
    qrText: String,
    qrImageUrl: String,
    qrDataUrl: String,
    providerTransactionId: String,
    providerReference: String,
    providerMd5: String,
    rawResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date
  },
  { timestamps: true }
);

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
