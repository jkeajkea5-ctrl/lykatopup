import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema(
  {
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    name: { type: String, required: true, trim: true },
    amountLabel: { type: String, required: true, trim: true },
    packageCategory: {
      type: String,
      enum: ['item-package', 'pass', 'other'],
      default: 'item-package',
      index: true
    },
    priceUsd: { type: Number, required: true, min: 0 },
    supplierCostUsd: { type: Number, min: 0 },
    deliveryProvider: { type: String, trim: true },
    providerGameCode: { type: String, trim: true },
    providerCatalogueName: { type: String, trim: true },
    providerCatalogueId: { type: Number },
    bonusLabel: String,
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

packageSchema.index({ game: 1, active: 1, sortOrder: 1, priceUsd: 1 });
packageSchema.index({ active: 1, game: 1 });
packageSchema.index({ game: 1, packageCategory: 1, active: 1 });

export const Package = mongoose.models.Package || mongoose.model('Package', packageSchema);
