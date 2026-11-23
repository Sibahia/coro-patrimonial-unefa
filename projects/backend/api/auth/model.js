import mongoose from 'mongoose';

const { Schema } = mongoose;

const refreshTokenSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('RefreshToken', refreshTokenSchema);
