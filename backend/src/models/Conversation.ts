import mongoose, { Document, Schema } from 'mongoose';

export interface IConversationDocument extends Document {
  title: string;
  aiModel: 'gpt-4o' | 'gpt-4o-mini';
  searchEnabled: boolean;
  folder: string | null;
  messageCount: number;
  isPublic: boolean;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    title: {
      type: String,
      default: 'New Chat',
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    aiModel: {
      type: String,
      enum: ['gpt-4o', 'gpt-4o-mini'],
      default: 'gpt-4o-mini',
    },
    searchEnabled: {
      type: Boolean,
      default: false,
    },
    folder: {
      type: String,
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    systemPrompt: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.set('toJSON', {
  transform: (_doc, ret: unknown) => {
    const r = ret as Record<string, unknown>;
    r['__v'] = undefined;
    return r;
  },
});

export const Conversation = mongoose.model<IConversationDocument>(
  'Conversation',
  ConversationSchema
);
