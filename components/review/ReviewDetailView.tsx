"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { ReviewDetail } from "@/lib/types";
import { RequireRole } from "@/components/layout/AuthGuard";
import { SubmissionDetailView } from "@/components/submissions/SubmissionDetailView";
import { ReviewActions } from "./ReviewActions";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/State";

export function ReviewDetailView({ id }: { id: string }) {
  return (
    <RequireRole role="reviewer">
      <ReviewDetailInner id={id} />
    </RequireRole>
  );
}

function ReviewDetailInner({ id }: { id: string }) {
  const [data, setData] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    api
      .get<ReviewDetail>(`/review/submissions/${encodeURIComponent(id)}`)
      .then(setData)
      .catch((err) => {
        if (isApiError(err) && (err.status === 404 || err.code === "NOT_FOUND")) setNotFound(true);
        else setError(errorMessage(err, "审核内容加载失败"));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load, attempt]);

  if (loading) {
    return (
      <div className="container detail-loading">
        <LoadingBlock label="正在打开待审核内容" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container detail-state">
        <EmptyState
          icon="archive"
          title="找不到这条投稿"
          description="它可能已被删除，或链接不正确。"
          action={
            <Link href="/review" className="btn btn-primary btn-sm">
              返回审核工作台
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container detail-state">
        <ErrorState description={error ?? "审核内容加载失败"} onRetry={() => setAttempt((value) => value + 1)} />
      </div>
    );
  }

  return (
    <div className="review-detail">
      <div className="container">
        <SubmissionDetailView
          data={data}
          mode="review"
          backHref="/review"
          backLabel="返回审核工作台"
          actions={
            <ReviewActions
              itemId={data.id}
              status={data.status}
              title={data.title}
              onUpdated={load}
            />
          }
        />
      </div>
    </div>
  );
}