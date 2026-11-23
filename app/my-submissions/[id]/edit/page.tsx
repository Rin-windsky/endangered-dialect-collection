import { EditSubmissionView } from "@/components/submissions/EditSubmissionView";

export default async function EditSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditSubmissionView id={id} />;
}