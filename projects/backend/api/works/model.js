import mongoose from 'mongoose';

const { Schema } = mongoose;

const workSchema = new Schema({
  title: { type: String, required: true, trim: true },
  composer: { type: String, required: true, trim: true },
  arranger: { type: String, trim: true },
  category: { type: String, enum: ['sacred', 'secular', 'popular', 'patriotic'], default: 'secular' },
  era: { type: String, trim: true },
  language: { type: String, trim: true },
  lyrics: { type: String },
  scoreUrl: { type: String, trim: true },
  audioUrl: { type: String, trim: true },
  durationSeconds: { type: Number, min: 0 },
  tags: [{ type: String, trim: true }],
  isPublished: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// El campo `language` es metadato (código idiomático), no el override de idioma
// del índice de texto. Mongoose lo detecta automáticamente como `language_override`
// y Atlas rechaza valores como 'la'. Se usa un campo inexistente para forzar el
// idioma por defecto del índice.
workSchema.index({ title: 'text', composer: 'text' }, { language_override: 'textLanguage' });

export default mongoose.model('Work', workSchema);
