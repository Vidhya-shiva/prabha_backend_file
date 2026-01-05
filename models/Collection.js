import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: '',
    },
    offerEnabled: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Existing indexes
collectionSchema.index({ enabled: 1 });
collectionSchema.index({ normalizedName: 1 });

// NEW HIGH-PERFORMANCE INDEXES
collectionSchema.index({ order: 1 });        // faster sorting
collectionSchema.index({ createdAt: 1 });    // faster sorting

const Collection = mongoose.model('Collection', collectionSchema);

export default Collection;