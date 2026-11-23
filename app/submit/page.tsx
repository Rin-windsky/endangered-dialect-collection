import type { Metadata } from "next";
import { SubmitView } from "@/components/submissions/SubmitView";

export const metadata: Metadata = {
  title: "我要投稿",
};

export default function SubmitPage() {
  return <SubmitView />;
}