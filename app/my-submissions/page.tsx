import type { Metadata } from "next";
import { MySubmissionsView } from "@/components/submissions/MySubmissionsView";

export const metadata: Metadata = {
  title: "我的投稿",
};

export default function MySubmissionsPage() {
  return <MySubmissionsView />;
}