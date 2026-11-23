import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionsView } from "@/components/collections/CollectionsView";
import { LoadingBlock } from "@/components/ui/State";

export const metadata: Metadata = {
  title: "收藏馆",
};

export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="container guard-wrap">
          <LoadingBlock label="正在打开收藏馆" />
        </div>
      }
    >
      <CollectionsView />
    </Suspense>
  );
}