"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { SubmissionDetail } from "@/lib/types";
import { RequireRole } from "@/components/layout/AuthGuard";
import { SubmissionDetailView } from "./SubmissionDetailView";
import { WithdrawButton } from "./WithdrawButton";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/State";
import { Icon } from "@/components/ui/Icon";

export function MySubmissionDetailView({ id }: { id: string }) {
  return (
    <RequireRole role="contributor">
      <MySubmissionDetailInner id={id} />
    </RequireRole>
  );
}

function MySubmissionDetailInner({ id }: { id: string }) {
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    api
      .get<SubmissionDetail>(`/submissions/${encodeURIComponent(id)}`)
      .then(setData)
      .catch((err) => {
        if (isApiError(err) && (err.status === 404 || err.code === "NOT_FOUND")) setNotFound(true);
        else setError(errorMessage(err, "投稿加载失败"));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load, attempt]);

  if (loading) {
    return (
      <div className="container detail-loading">
        <LoadingBlock label="正在打开投稿" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container detail-state">
        <EmptyState
          icon="archive"
          title="找不到这条投稿"
          description="它可能不属于当前账号，或已经不存在。"
          action={
            <Link href="/my-submissions" className="btn btn-primary btn-sm">
              返回我的投稿
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container detail-state">
        <ErrorState description={error ?? "投稿加载失败"} onRetry={() => setAttempt((value) => value + 1)} />
      </div>
    );
  }

  const actions =
    data.status === "withdrawn" ? (
      <div className="aside-action-stack">
        <p className="aside-fineprint">这条投稿已撤回，不能恢复。你可以创建一条新的投稿。</p>
        <Link href="/submit" className="btn btn-primary btn-sm btn-wide">
          重新投稿
        </Link>
      </div>
    ) : (
      <div className="aside-action-stack">
        {data.status === "needs_changes" ? (
          <Link href={`/my-submissions/${data.id}/edit`} className="btn btn-primary btn-sm btn-wide">
            <Icon name="edit" size={14} />
            修改并重新提交
          </Link>
        ) : null}
        {data.status === "published" ? (
          <Link href={`/collections/${data.id}`} className="btn btn-outline btn-sm btn-wide">
            <Icon name="play" size={14} />
            查看公开页面
          </Link>
        ) : null}
        <WithdrawButton itemId={data.id} status={data.status} onWithdrawn={load} variant="wide" />
      </div>
    );

  return (
    <div className="my-detail">
      <div className="container">
        <SubmissionDetailView
          data={data}
          mode="owner"
          backHref="/my-submissions"
          backLabel="返回我的投稿"
          actions={actions}
          note={
            data.status === "needs_changes"
              ? "审核员留下了修改建议。补充完成后重新提交，内容会再次进入审核队列。"
              : undefined
          }
        />
      </div>
    </div>
  );
}