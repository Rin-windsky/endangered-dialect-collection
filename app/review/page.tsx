import type { Metadata } from "next";
import { ReviewListView } from "@/components/review/ReviewListView";

export const metadata: Metadata = {
  title: "审核工作台",
};

export default function ReviewPage() {
  return <ReviewListView />;
}