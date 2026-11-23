import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
