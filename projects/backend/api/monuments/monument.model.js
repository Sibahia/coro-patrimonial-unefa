import mongoose from 'mongoose';

const { Schema } = mongoose;

const locationSchema = new Schema({
  lat: { type: Number },
  lng: { type: Number },
  address: { type: String, trim: true }
}, { _id: false });

const monumentSchema = new Schema({
  title: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  category: {
    type: String,
    required: true,
    enum: ['Religioso', 'Civil', 'Militar', 'Plaza', 'Museo']
  },
  period: { type: String, trim: true },
  constructionType: {
    type: String,
    required: true,
    enum: ['Tapia', 'Adobe', 'Bahareque', 'Mampostería']
  },
  location: { type: locationSchema, default: () => ({}) },
  history: { type: String },
  images: [{ type: String, trim: true }],
  audioGuideUrl: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Excelente', 'Regular', 'Deteriorado', 'Critico'],
    default: 'Regular'
  },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

monumentSchema.index({ title: 'text', history: 'text', code: 'text', 'location.address': 'text' });

export default mongoose.model('Monument', monumentSchema);
