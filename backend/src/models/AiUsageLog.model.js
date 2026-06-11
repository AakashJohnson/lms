import mongoose from 'mongoose';

const aiUsageLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    feature: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: 'nvidia',
    },
    model: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'fallback'],
      default: 'success',
      index: true,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    requestMeta: {
      type: Object,
      default: {},
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const AiUsageLog = mongoose.model('AiUsageLog', aiUsageLogSchema);

export default AiUsageLog;
