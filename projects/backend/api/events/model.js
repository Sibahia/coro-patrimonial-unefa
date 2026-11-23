import mongoose from 'mongoose';

const { Schema } = mongoose;

const eventSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, default: null },
  venue: {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true }
  },
  type: { type: String, enum: ['concert', 'rehearsal', 'recording', 'activity'], default: 'concert' },
  coverUrl: { type: String, trim: true },
  gallery: [{ type: String, trim: true }],
  workIds: [{ type: Schema.Types.ObjectId, ref: 'Work' }],
  memberIds: [{ type: Schema.Types.ObjectId, ref: 'Member' }],
  status: { type: String, enum: ['draft', 'published', 'finished'], default: 'draft' },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

eventSchema.index({ startAt: 1, status: 1 });

export default mongoose.model('Event', eventSchema);
