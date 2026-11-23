import { DetailView } from "@/components/collections/DetailView";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetailView id={id} />;
}