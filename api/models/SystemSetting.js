import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: 'Lyka Topup' },
    currency: { type: String, default: 'USD' },
    slides: {
      type: [
        new mongoose.Schema(
          {
            title: String,
            subtitle: String,
            ctaLabel: { type: String, default: 'Claim Now' },
            imageUrl: String,
            gameSlug: String,
            active: { type: Boolean, default: true },
            sortOrder: { type: Number, default: 0 }
          },
          { _id: true }
        )
      ],
      default: []
    },
    catalog: {
      featuredGameSlugs: { type: [String], default: [] },
      featuredOnly: { type: Boolean, default: false },
      flashTitle: { type: String, default: 'Flash Sale Today!' },
      flashSubtitle: { type: String, default: 'Up to 30% off on selected games' },
      flashCtaLabel: { type: String, default: 'View' },
      categories: {
        type: [
          new mongoose.Schema(
            {
              name: String,
              slug: String,
              active: { type: Boolean, default: true },
              color: String,
              icon: String,
              imageUrl: String,
              sortOrder: { type: Number, default: 0 }
            },
            { _id: true }
          )
        ],
        default: []
      },
      categoryOverrides: { type: Map, of: String, default: {} }
    },
    khqr: {
      merchantName: String,
      bakongId: String,
      enabled: { type: Boolean, default: true }
    },
    maintenanceMode: { type: Boolean, default: false },
    analyticsAutoReports: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.models.SystemSetting || mongoose.model('SystemSetting', systemSettingSchema);
