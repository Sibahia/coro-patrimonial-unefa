import mongoose from 'mongoose';

const { Schema } = mongoose;

const memberSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  voiceType: { type: String, enum: ['soprano', 'contralto', 'tenor', 'bass'] },
  role: { type: String, trim: true },
  bio: { type: String, trim: true },
  photoUrl: { type: String, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Member', memberSchema);
