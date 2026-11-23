import mongoose from 'mongoose';

const { Schema } = mongoose;

const heritageItemSchema = new Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['photo', 'document', 'audio', 'video', 'object'], required: true },
  description: { type: String },
  year: { type: Number },
  fileUrl: { type: String, trim: true },
  thumbnailUrl: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  credit: { type: String, trim: true },
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

heritageItemSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('HeritageItem', heritageItemSchema);
