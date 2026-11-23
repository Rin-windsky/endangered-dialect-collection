"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { ItemStatus, Paginated, ReviewListItem } from "@/lib/types";
import { CONTENT_TYPE_LABEL, PAGE_LIMIT, STATUS_LABEL, formatDateTime } from "@/lib/constants";
import { RequireRole } from "@/components/layout/AuthGuard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/State";
import { Pagination } from "@/components/ui/Pagination";
import { Icon } from "@/components/ui/Icon";

type Tab = ItemStatus | "all";
type Sort = "oldest" | "newest";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: STATUS_LABEL.pending },
  { key: "needs_changes", label: STATUS_LABEL.needs_changes },
  { key: "published", label: STATUS_LABEL.published },
  { key: "withdrawn", label: STATUS_LABEL.withdrawn },
  { key: "all", label: "全部" },
];

const EMPTY_COPY: Record<Tab, string> = {
  pending: "审核队列已经清空，暂时没有待处理的投稿。",
  needs_changes: "没有等待投稿者修改的内容。",
  published: "还没有已发布的内容。",
  withdrawn: "没有已撤回的内容。",
  all: "还没有任何投稿记录。",
};

export function ReviewListView() {
  return (
    <RequireRole role="reviewer">
      <ReviewListInner />
    </RequireRole>
  );
}

function ReviewListInner() {
  const [tab, setTab] = useState<Tab>("pending");
  const [sort, setSort] = useState<Sort>("oldest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ReviewListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [counts, setCounts] = useState<Partial<Record<Tab, number>>>({});

  const loadCounts = useCallback(() => {
    Promise.all(
      TABS.map(async (entry) => {
        const result = await api.get<Paginated<ReviewListItem>>(
          `/review/submissions?status=${entry.key}&sort=${sort}&page=1&limit=1`,
        );
        return [entry.key, result.total] as const;
      }),
    )
      .then((entries) => setCounts(Object.fromEntries(entries)))
      .catch(() => {
        // Counts are supplementary; list loading has its own error state.
      });
  }, [sort]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<Paginated<ReviewListItem>>(
        `/review/submissions?status=${tab}&sort=${sort}&page=${page}&limit=${PAGE_LIMIT}`,
      )
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, "审核列表加载失败"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, sort, page, attempt]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const switchSort = (next: Sort) => {
    if (next === sort) return;
    setSort(next);
    setPage(1);
  };

  return (
    <div className="review-view">
      <div className="container">
        <header className="page-head">
          <div className="page-head-main">
            <p className="eyebrow">REVIEW DESK · 审核工作台</p>
            <h1 className="page-title">倾听，然后判断</h1>
            <p className="page-lead">
              核对核心信息、音频与录音授权即可。选填资料缺失，本身不是退回的理由。
            </p>
          </div>
          <div className="review-head-stats">
            <div>
              <strong className="tnum">{counts.pending ?? "·"}</strong>
              <span>待审核</span>
            </div>
            <div>
              <strong className="tnum">{counts.published ?? "·"}</strong>
              <span>已发布</span>
            </div>
            <div>
              <strong className="tnum">{counts.needs_changes ?? "·"}</strong>
              <span>退回补充</span>
            </div>
          </div>
        </header>

        <div className="review-toolbar">
          <div className="tabs" role="tablist" aria-label="按状态筛选审核内容">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={tab === entry.key}
                className={`status-tab status-tab-${entry.key}${tab === entry.key ? " is-active" : ""}`}
                onClick={() => switchTab(entry.key)}
              >
                {entry.label}
                <span className="tab-count tnum">{counts[entry.key] ?? "·"}</span>
              </button>
            ))}
          </div>
          <div className="sort-toggle" role="group" aria-label="排序方式">
            <button
              type="button"
              className={sort === "oldest" ? "is-active" : ""}
              onClick={() => switchSort("oldest")}
            >
              最早提交
            </button>
            <button
              type="button"
              className={sort === "newest" ? "is-active" : ""}
              onClick={() => switchSort("newest")}
            >
              最新提交
            </button>
          </div>
        </div>

        <div className="review-body">
          {loading ? (
            <SkeletonGrid count={3} />
          ) : error ? (
            <ErrorState description={error} onRetry={() => setAttempt((value) => value + 1)} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={tab === "pending" ? "check" : "archive"}
              title={EMPTY_COPY[tab]}
              description={tab === "pending" ? "可以稍后回来，或者去收藏馆听听已经发布的声音。" : undefined}
              action={
                tab === "pending" ? (
                  <Link href="/collections" className="btn btn-outline btn-sm">
                    去收藏馆
                  </Link>
                ) : (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => switchTab("pending")}>
                    回到待审核
                  </button>
                )
              }
            />
          ) : (
            <>
              <ul className="review-list">
                {data.items.map((item, index) => (
                  <li key={item.id} className={`review-row${item.status === "pending" ? " is-pending" : ""}`}>
                    <span className="review-queue tnum" aria-hidden="true">
                      {String((page - 1) * data.limit + index + 1).padStart(2, "0")}
                    </span>
                    <div className="review-main">
                      <div className="review-title-line">
                        <Link href={`/review/${item.id}`} className="review-title">
                          {item.title}
                        </Link>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="review-meta">
                        <span className="review-submitter">
                          <Icon name="user" size={13} />
                          {item.submitter.displayName}
                          <span className="review-username">@{item.submitter.username}</span>
                        </span>
                        <span className="dot" aria-hidden="true" />
                        <span>{CONTENT_TYPE_LABEL[item.contentType]}</span>
                        <span className="dot" aria-hidden="true" />
                        <span>{item.region.name}</span>
                        <span className="dot" aria-hidden="true" />
                        <span>提交于 {formatDateTime(item.createdAt)}</span>
                      </p>
                      {item.status === "needs_changes" && item.lastReview?.reason ? (
                        <p className="review-reason">退回原因：{item.lastReview.reason}</p>
                      ) : null}
                      {item.status === "published" && item.lastReview ? (
                        <p className="review-reason is-ok">
                          发布于 {formatDateTime(item.lastReview.createdAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="review-actions-cell">
                      <Link
                        href={`/review/${item.id}`}
                        className={`btn btn-sm ${item.status === "pending" ? "btn-primary" : "btn-outline"}`}
                      >
                        {item.status === "pending" ? "开始审核" : "查看详情"}
                        <Icon name="arrow-right" size={14} />
                      </Link>
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