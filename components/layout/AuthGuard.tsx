"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { LoadingBlock } from "@/components/ui/State";

export function RequireRole({
  role,
  children,
}: {
  role: "contributor" | "reviewer";
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== role) {
      router.replace(user.role === "reviewer" ? "/review" : "/submit");
    }
  }, [loading, user, role, router, pathname]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="container guard-wrap">
        <LoadingBlock label="正在确认登录状态" lines={2} />
      </div>
    );
  }

  return <>{children}</>;
}