import mongoose, { Schema, Document } from 'mongoose';

export interface IMemory extends Document {
  userId: string;
  fact: string;
  createdAt: Date;
}

const MemorySchema: Schema = new Schema({
  userId: { type: String, required: true, default: 'default_user', index: true },
  fact: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Memory = mongoose.models.Memory || mongoose.model<IMemory>('Memory', MemorySchema);
export default Memory;
