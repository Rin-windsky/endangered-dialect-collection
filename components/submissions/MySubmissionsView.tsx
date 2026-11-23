"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { ItemStatus, MySubmissionListItem, Paginated } from "@/lib/types";
import { CONTENT_TYPE_LABEL, PAGE_LIMIT, STATUS_LABEL, formatDateTime } from "@/lib/constants";
import { RequireRole } from "@/components/layout/AuthGuard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VisualStage } from "@/components/audio/VisualStage";
import { WithdrawButton } from "@/components/submissions/WithdrawButton";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/State";
import { Pagination } from "@/components/ui/Pagination";
import { Icon } from "@/components/ui/Icon";

type Tab = "all" | ItemStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: STATUS_LABEL.pending },
  { key: "needs_changes", label: STATUS_LABEL.needs_changes },
  { key: "published", label: STATUS_LABEL.published },
  { key: "withdrawn", label: STATUS_LABEL.withdrawn },
];

const EMPTY_COPY: Record<Tab, { title: string; description: string }> = {
  all: { title: "你还没有投稿", description: "录下一段熟悉的乡音，它可以是故事、俗语、童谣，或一句日常的话。" },
  pending: { title: "没有等待审核的投稿", description: "提交后的内容会在这里排队，等待审核员处理。" },
  needs_changes: { title: "没有需要修改的投稿", description: "如果审核员请补充内容，会出现在这里。" },
  published: { title: "还没有已发布的收藏", description: "通过审核后，你的声音会出现在收藏馆与方言地图上。" },
  withdrawn: { title: "没有已撤回的投稿", description: "撤回后的投稿会保留在这里，但不能恢复。" },
};

function statusTabClass(tab: Tab, active: Tab): string {
  return `status-tab status-tab-${tab}${tab === active ? " is-active" : ""}`;
}

export function MySubmissionsView() {
  return (
    <RequireRole role="contributor">
      <MySubmissionsInner />
    </RequireRole>
  );
}

function MySubmissionsInner() {
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<MySubmissionListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({});

  const loadCounts = useCallback(() => {
    Promise.all(
      TABS.map(async (entry) => {
        const result = await api.get<Paginated<MySubmissionListItem>>(
          `/my-submissions?status=${entry.key}&page=1&limit=1`,
        );
        return [entry.key, result.total] as const;
      }),
    )
      .then((entries) => setCounts(Object.fromEntries(entries)))
      .catch(() => {
        // Counts are a nice-to-have; the list itself still works.
      });
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<Paginated<MySubmissionListItem>>(`/my-submissions?status=${tab}&page=${page}&limit=${PAGE_LIMIT}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, "投稿列表加载失败"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, page, attempt]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const refresh = () => {
    setAttempt((value) => value + 1);
    loadCounts();
  };

  return (
    <div className="my-view">
      <div className="container">
        <header className="page-head">
          <div className="page-head-main">
            <p className="eyebrow">MY SUBMISSIONS · 投稿管理</p>
            <h1 className="page-title">我的投稿</h1>
            <p className="page-lead">查看每一条声音的去向：待审核、需要补充，或已经被收藏。</p>
          </div>
          <div className="page-head-side">
            <Link href="/submit" className="btn btn-primary btn-sm">
              <Icon name="plus" size={15} />
              新的投稿
            </Link>
          </div>
        </header>

        <div className="tabs" role="tablist" aria-label="按状态筛选投稿">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={tab === entry.key}
              className={statusTabClass(entry.key, tab)}
              onClick={() => switchTab(entry.key)}
            >
              {entry.label}
              <span className="tab-count tnum">{counts[entry.key] ?? "·"}</span>
            </button>
          ))}
        </div>

        <div className="my-body">
          {loading ? (
            <SkeletonGrid count={3} />
          ) : error ? (
            <ErrorState description={error} onRetry={() => setAttempt((value) => value + 1)} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon="mic"
              title={EMPTY_COPY[tab].title}
              description={EMPTY_COPY[tab].description}
              action={
                tab === "all" ? (
                  <Link href="/submit" className="btn btn-primary btn-sm">
                    开始投稿
                  </Link>
                ) : (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => switchTab("all")}>
                    查看全部投稿
                  </button>
                )
              }
            />
          ) : (
            <>
              <ul className="submission-list">
                {data.items.map((item) => (
                  <li key={item.id} className={`submission-row status-row-${item.status}`}>
                    <Link href={`/my-submissions/${item.id}`} className="submission-thumb" aria-label={`查看 ${item.title}`}>
                      {item.visualType && item.visualUrl ? (
                        <VisualStage
                          type={item.visualType}
                          url={item.visualUrl}
                          alt={item.title}
                          variant="thumb"
                          className="thumb-media"
                        />
                      ) : (
                        <span className="thumb-fallback" aria-hidden="true">
                          {item.title.slice(0, 1)}
                        </span>
                      )}
                    </Link>

                    <div className="submission-info">
                      <div className="submission-info-top">
                        <Link href={`/my-submissions/${item.id}`} className="submission-title">
                          {item.title}
                        </Link>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="submission-meta">
                        <span>{CONTENT_TYPE_LABEL[item.contentType]}</span>
                        <span className="dot" aria-hidden="true" />
                        <span>{item.region.name}</span>
                        <span className="dot" aria-hidden="true" />
                        <span>更新于 {formatDateTime(item.updatedAt)}</span>
                      </p>
                      {item.status === "needs_changes" && item.lastReview?.reason ? (
                        <p className="submission-reason">
                          <Icon name="alert" size={13} />
                          {item.lastReview.reason}
                        </p>
                      ) : null}
                      {item.status === "published" && item.lastReview ? (
                        <p className="submission-reason is-ok">
                          <Icon name="check" size={13} />
                          已于 {formatDateTime(item.lastReview.createdAt)} 通过审核
                        </p>
                      ) : null}
                    </div>

                    <div className="submission-actions">
                      <Link href={`/my-submissions/${item.id}`} className="btn btn-outline btn-sm">
                        查看
                      </Link>
                      {item.status === "needs_changes" ? (
                        <Link href={`/my-submissions/${item.id}/edit`} className="btn btn-primary btn-sm">
                          修改并重新提交
                        </Link>
                      ) : null}
                      {item.status !== "withdrawn" ? (
                        <WithdrawButton itemId={item.id} status={item.status} onWithdrawn={refresh} variant="small" />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={page} limit={data.limit} total={data.total} onChange={setPage} itemLabel="条投稿" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}