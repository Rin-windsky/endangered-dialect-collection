"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { SubmissionDetail } from "@/lib/types";
import { RequireRole } from "@/components/layout/AuthGuard";
import { SubmissionForm } from "@/components/forms/SubmissionForm";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/State";
import { Icon } from "@/components/ui/Icon";

export function EditSubmissionView({ id }: { id: string }) {
  return (
    <RequireRole role="contributor">
      <EditSubmissionInner id={id} />
    </RequireRole>
  );
}

function EditSubmissionInner({ id }: { id: string }) {
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setNotFound(false);
    api
      .get<SubmissionDetail>(`/submissions/${encodeURIComponent(id)}`)
      .then((detail) => {
        if (active) setData(detail);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiError(err) && (err.status === 404 || err.code === "NOT_FOUND")) setNotFound(true);
        else setError(errorMessage(err, "投稿加载失败"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  if (loading) {
    return (
      <div className="container detail-loading">
        <LoadingBlock label="正在准备修改" />
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

  if (data.status !== "needs_changes") {
    return (
      <div className="container detail-state">
        <EmptyState
          icon="lock"
          title="这条投稿当前不需要修改"
          description="只有被审核员退回补充的投稿才可以修改。你可以在投稿详情里查看它的状态。"
          action={
            <Link href={`/my-submissions/${data.id}`} className="btn btn-primary btn-sm">
              查看投稿详情
            </Link>
          }
        />
      </div>
    );
  }

  const latestReturn = [...data.logs].reverse().find((log) => log.action === "return");

  return (
    <div className="submit-view">
      <div className="container">
        <div className="detail-topbar">
          <Link href={`/my-submissions/${data.id}`} className="back-link">
            <Icon name="arrow-left" size={16} />
            返回投稿详情
          </Link>
          <span className="edit-mode-tag">修改中</span>
        </div>

        <header className="page-head submit-head">
          <div className="page-head-main">
            <p className="eyebrow">EDIT · 退回修改</p>
            <h1 className="page-title">补充这段乡音</h1>
            <p className="page-lead">
              根据审核建议修改内容，保存后会重新提交并回到审核队列。
            </p>
          </div>
        </header>

        {latestReturn?.reason ? (
          <div className="return-callout" role="status">
            <span className="return-callout-icon" aria-hidden="true">
              <Icon name="alert" size={18} />
            </span>
            <div>
              <strong>需要补充的内容</strong>
              <p>{latestReturn.reason}</p>
            </div>
          </div>
        ) : null}

        <SubmissionForm mode="edit" initial={data} />
      </div>
    </div>
  );
}