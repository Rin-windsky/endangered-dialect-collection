import { MySubmissionDetailView } from "@/components/submissions/MySubmissionDetailView";

export default async function MySubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MySubmissionDetailView id={id} />;
}