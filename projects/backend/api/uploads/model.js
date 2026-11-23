import mongoose from 'mongoose';

const { Schema } = mongoose;

const assetSchema = new Schema({
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  folder: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Asset', assetSchema);
