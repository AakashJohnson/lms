import { asyncHandler } from '../utils/asyncHandler.js';
import AiUsageLog from '../models/AiUsageLog.model.js';

export const getAiUsageSummary = asyncHandler(async (req, res) => {
  const [byFeature, byStatus, recentFailures] = await Promise.all([
    AiUsageLog.aggregate([
      { $group: { _id: '$feature', count: { $sum: 1 }, avgLatencyMs: { $avg: '$latencyMs' } } },
      { $sort: { count: -1 } },
    ]),
    AiUsageLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    AiUsageLog.find({ status: { $in: ['failed', 'fallback'] } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('feature status errorMessage createdAt user'),
  ]);

  res.status(200).json({
    success: true,
    data: {
      byFeature,
      byStatus,
      recentFailures,
    },
  });
});
