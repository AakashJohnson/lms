import { useState, useEffect } from 'react';
import { X, Star, Check, FileText } from 'lucide-react';
import { submitRating, getMyRating, getReviewTemplates, ReviewTemplate } from '../../services/ratingService';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

export function RatingModal({ isOpen, onClose, courseId, courseTitle, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReviewTemplate | null>(null);
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    if (isOpen && courseId) {
      // Fetch existing rating if any
      setLoadingExisting(true);
      getMyRating(courseId)
        .then(res => {
          if (res.success && res.data) {
            setExistingRating(res.data);
            setRating(res.data.rating);
            setReview(res.data.review || '');
          }
        })
        .catch(() => {})
        .finally(() => setLoadingExisting(false));

      // Fetch templates
      getReviewTemplates()
        .then(res => {
          if (res.success) {
            setTemplates(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const res = await submitRating({
        courseId,
        rating,
        review: review.trim() || undefined,
        templateId: selectedTemplate?._id
      });

      if (res.success) {
        alert(existingRating ? 'Rating updated successfully!' : 'Rating submitted successfully!');
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: ReviewTemplate) => {
    if (selectedTemplate?._id === template._id) {
      setSelectedTemplate(null);
      setReview('');
    } else {
      setSelectedTemplate(template);
      setReview(template.templateText);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRating(0);
      setHoverRating(0);
      setReview('');
      setSelectedTemplate(null);
      setExistingRating(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {existingRating ? 'Update Your Rating' : 'Rate This Course'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{courseTitle}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loadingExisting ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Your Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-3 text-lg font-semibold text-gray-700">
                    {rating} / 5
                  </span>
                )}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {rating === 5 && '⭐ Excellent!'}
                  {rating === 4 && '👍 Very Good!'}
                  {rating === 3 && '😊 Good'}
                  {rating === 2 && '😐 Fair'}
                  {rating === 1 && '😞 Poor'}
                </p>
              )}
            </div>

            {/* Template Selection */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Or pick a pre-written review
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template._id}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedTemplate?._id === template._id
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 ${
                          selectedTemplate?._id === template._id ? 'text-indigo-600' : 'text-gray-400'
                        }`}>
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{template.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-2">{template.templateText}</p>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          template.category === 'positive' ? 'bg-green-100 text-green-700' :
                          template.category === 'negative' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {template.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Review Text */}
            <div>
              <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
                Your Review (Optional)
              </label>
              <textarea
                id="review"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Share your experience with this course..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {review.length} / 1000 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
