import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  userId: string;
  name: string;
  colour: string;
  systemPrompt: string;
  aiModel: string;
  webSearch: boolean;
  files: {
    name: string;
    qdrantCollection: string;
  }[];
  chatCount: number;
  createdAt: Date;
}

const ProjectSchema: Schema = new Schema({
  userId: { type: String, required: true, default: 'default_user' },
  name: { type: String, required: true },
  colour: { type: String, default: '#7F77DD' },
  systemPrompt: { type: String, default: 'You are a helpful assistant.' },
  aiModel: { type: String, default: 'gpt-4o-mini' },
  webSearch: { type: Boolean, default: false },
  files: [{
    name: { type: String },
    qdrantCollection: { type: String }
  }],
  chatCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
