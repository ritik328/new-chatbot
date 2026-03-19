import mongoose, { Document, Schema } from 'mongoose';

interface SearchSource {
  title: string;
  url: string;
  description: string;
}

export interface IMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: SearchSource[];
  reaction: 'upvote' | 'downvote' | null;
  tokens: number;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        title: String,
        url: String,
        description: String,
      },
    ],
    reaction: {
      type: String,
      enum: ['upvote', 'downvote', null],
      default: null,
    },

    // Token count (useful for billing/analytics)
    tokens: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.set('toJSON', {
  transform: (_doc, ret: unknown) => {
    const r = ret as Record<string, unknown>;
    r['__v'] = undefined;
    return r;
  },
});

export const Message = mongoose.model<IMessageDocument>('Message', MessageSchema);
