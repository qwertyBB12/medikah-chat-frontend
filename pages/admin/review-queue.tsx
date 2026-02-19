import { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react';
import { getAdminFromContext, AdminUser } from '../../lib/adminAuth';
import AdminLayout from '../../components/admin/AdminLayout';
import ReviewCard from '../../components/admin/ReviewCard';

interface ReviewItem {
  id: string;
  physicianName: string;
  physicianEmail: string;
  reviewType: string;
  priority: string;
  reason: string;
  slaDeadline: string;
  createdAt?: string;
}

interface ReviewQueueProps {
  admin: AdminUser;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const admin = await getAdminFromContext(ctx);
  if (!admin) {
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: { admin } };
};

export default function ReviewQueuePage({ admin }: ReviewQueueProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/api/admin/pending-reviews');
        if (!res.ok) throw new Error('Failed to fetch reviews');
        const data = await res.json();
        const items: ReviewItem[] = (data.reviews || []).map((r: Record<string, unknown>) => ({
          id: r.id,
          physicianName: (r.reviewData as Record<string, unknown>)?.physicianName || 'Unknown',
          physicianEmail: (r.reviewData as Record<string, unknown>)?.physicianEmail || '',
          reviewType: r.reviewType,
          priority: r.priority,
          reason: r.reason,
          slaDeadline: r.slaDeadline,
        }));
        setReviews(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, []);

  return (
    <AdminLayout adminName={admin.fullName} pendingReviewCount={reviews.length}>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-dm-sans text-2xl font-bold text-deep-charcoal mb-1">
          Review Queue
        </h1>
        <p className="font-dm-sans text-sm text-body-slate mb-6">
          Pending manual verification reviews
        </p>

        {loading && (
          <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-8 text-center">
            <p className="font-dm-sans text-sm text-body-slate">Loading reviews...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[12px] p-4">
            <p className="font-dm-sans text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && reviews.length === 0 && (
          <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-8 text-center">
            <p className="font-dm-sans text-sm text-body-slate">No pending reviews</p>
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
