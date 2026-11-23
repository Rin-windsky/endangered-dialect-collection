import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginView } from "@/components/auth/LoginView";
import { LoadingBlock } from "@/components/ui/State";

export const metadata: Metadata = {
  title: "登录",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container guard-wrap">
          <LoadingBlock label="正在打开登录页" lines={2} />
        </div>
      }
    >
      <LoginView />
    </Suspense>
  );
}