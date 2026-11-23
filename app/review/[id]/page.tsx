import { ReviewDetailView } from "@/components/review/ReviewDetailView";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewDetailView id={id} />;
}