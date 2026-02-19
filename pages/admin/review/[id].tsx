import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { getAdminFromContext, AdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import AdminLayout from '../../../components/admin/AdminLayout';
import ReviewDetailPanel from '../../../components/admin/ReviewDetailPanel';

interface ReviewData {
  id: string;
  reviewType: string;
  priority: string;
  reason: string;
  slaDeadline: string;
  reviewData: Record<string, unknown>;
  status: string;
}

interface PhysicianData {
  full_name: string;
  email: string;
  primary_specialty: string;
  photo_url?: string;
  verification_status: string;
}

interface ReviewDetailProps {
  admin: AdminUser;
  review: ReviewData;
  physician: PhysicianData;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const admin = await getAdminFromContext(ctx);
  if (!admin) {
    return { redirect: { destination: '/', permanent: false } };
  }

  const reviewId = ctx.params?.id as string;
  if (!reviewId || !supabaseAdmin) {
    return { notFound: true };
  }

  const { data: review, error } = await supabaseAdmin
    .from('physician_manual_review_queue')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (error || !review) {
    return { notFound: true };
  }

  const { data: physician } = await supabaseAdmin
    .from('physicians')
    .select('full_name, email, primary_specialty, photo_url, verification_status')
    .eq('id', review.physician_id)
    .single();

  if (!physician) {
    return { notFound: true };
  }

  return {
    props: {
      admin,
      review: {
        id: review.id,
        reviewType: review.review_type,
        priority: review.priority,
        reason: review.reason,
        slaDeadline: review.sla_deadline,
        reviewData: review.review_data || {},
        status: review.status,
      },
      physician,
    },
  };
};

export default function ReviewDetailPage({ admin, review, physician }: ReviewDetailProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleApprove(notes: string) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/review/${review.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to approve');
        return;
      }
      router.push('/admin/review-queue');
    } catch {
      alert('Failed to approve review');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(reason: string) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/review/${review.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to reject');
        return;
      }
      router.push('/admin/review-queue');
    } catch {
      alert('Failed to reject review');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout adminName={admin.fullName}>
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/admin/review-queue')}
          className="font-dm-sans text-sm text-clinical-teal hover:underline mb-4 inline-block"
        >
          &larr; Back to Review Queue
        </button>

        <h1 className="font-dm-sans text-2xl font-bold text-deep-charcoal mb-6">
          Review Detail
        </h1>

        <ReviewDetailPanel
          review={review}
          physician={physician}
          onApprove={handleApprove}
          onReject={handleReject}
          isSubmitting={isSubmitting}
        />
      </div>
    </AdminLayout>
  );
}
