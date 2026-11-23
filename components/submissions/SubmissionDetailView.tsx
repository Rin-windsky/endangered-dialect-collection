"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReviewDetail, SubmissionDetail } from "@/lib/types";
import { CONTENT_TYPE_LABEL, STATUS_LABEL, formatDateTime } from "@/lib/constants";
import { StatusBadge, CreditLine } from "@/components/ui/StatusBadge";
import { Icon } from "@/components/ui/Icon";
import { SoundSection } from "@/components/audio/SoundSection";
import { EmptyState } from "@/components/ui/State";

type DetailData = SubmissionDetail & {
  submitter?: { username: string; displayName: string };
};

export function SubmissionDetailView({
  data,
  mode,
  backHref,
  backLabel,
  actions,
  note,
}: {
  data: DetailData;
  mode: "owner" | "review";
  backHref: string;
  backLabel: string;
  actions?: React.ReactNode;
  note?: string;
}) {
  const latestReturn = [...data.logs].reverse().find((log) => log.action === "return");

  return (
    <div className="submission-detail-view">
      <div className="detail-topbar">
        <Link href={backHref} className="back-link">
          <Icon name="arrow-left" size={16} />
          {backLabel}
        </Link>
        <StatusBadge status={data.status} />
      </div>

      <header className="page-head detail-head">
        <p className="eyebrow">{mode === "review" ? "REVIEW · 投稿审核" : "MY SUBMISSION · 我的投稿"}</p>
        <h1 className="page-title">{data.title}</h1>
        <div className="detail-meta">
          <span>{CONTENT_TYPE_LABEL[data.contentType]}</span>
          <span className="dot" aria-hidden="true" />
          <span>{data.language?.name ?? "方言暂不确定"}</span>
          <span className="dot" aria-hidden="true" />
          <span>{data.region.name}</span>
          <span className="dot" aria-hidden="true" />
          <span>提交于 {formatDateTime(data.createdAt)}</span>
        </div>
        {note ? <p className="detail-note">{note}</p> : null}
      </header>

      {data.status === "needs_changes" && latestReturn?.reason ? (
        <div className="return-callout" role="status">
          <span className="return-callout-icon" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <div>
            <strong>审核员请补充以下内容</strong>
            <p>{latestReturn.reason}</p>
            <span className="return-callout-time">{formatDateTime(latestReturn.createdAt)}</span>
          </div>
        </div>
      ) : null}

      <div className="submission-layout">
        <div className="submission-main">
          <section className="panel">
            <h2 className="section-label">
              <Icon name="mic" size={16} />
              声音与主视觉
            </h2>
            <SoundSection
              audioUrl={data.audio.url}
              duration={data.audio.durationSeconds}
              title={data.title}
              subtitles={data.subtitleSegments}
              visualType={data.visual?.type ?? null}
              visualUrl={data.visual?.url ?? null}
            />
          </section>

          <section className="panel">
            <h2 className="section-label">
              <Icon name="book" size={16} />
              内容说明
            </h2>
            <p className="prose">{data.summary}</p>
          </section>

          {data.translationZh ? (
            <section className="panel">
              <h2 className="section-label">
                <Icon name="book" size={16} />
                普通话释义
              </h2>
              <p className="prose">{data.translationZh}</p>
            </section>
          ) : null}

          {data.cultureContext ? (
            <section className="panel">
              <h2 className="section-label">
                <Icon name="compass" size={16} />
                文化背景
              </h2>
              <p className="prose">{data.cultureContext}</p>
            </section>
          ) : null}

          <section className="panel">
            <h2 className="section-label">
              <Icon name="clock" size={16} />
              审核记录
            </h2>
            {data.logs.length === 0 ? (
              <EmptyState
                title="还没有审核记录"
                description={data.status === "pending" ? "投稿已提交，等待审核员处理。" : undefined}
                icon="check"
              />
            ) : (
              <ol className="log-timeline">
                {data.logs.map((log, index) => (
                  <li key={`${log.createdAt}-${index}`} className={`log-item log-${log.action}`}>
                    <span className="log-dot" aria-hidden="true">
                      <Icon name={log.action === "publish" ? "check" : "alert"} size={13} />
                    </span>
                    <div className="log-body">
                      <div className="log-head">
                        <strong>{log.action === "publish" ? "通过并发布" : "退回补充"}</strong>
                        <span className="log-time">{formatDateTime(log.createdAt)}</span>
                      </div>
                      <p className="log-transition">
                        {STATUS_LABEL[log.fromStatus]} → {STATUS_LABEL[log.toStatus]}
                      </p>
                      {log.reason ? <p className="log-reason">{log.reason}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="submission-aside">
          <div className="panel aside-panel">
            <h2 className="section-label">
              <Icon name="info" size={16} />
              投稿信息
            </h2>
            <dl className="info-list">
              <div>
                <dt>当前状态</dt>
                <dd><StatusBadge status={data.status} /></dd>
              </div>
              <div>
                <dt>提交时间</dt>
                <dd>{formatDateTime(data.createdAt)}</dd>
              </div>
              <div>
                <dt>最近更新</dt>
                <dd>{formatDateTime(data.updatedAt)}</dd>
              </div>
              {data.publishedAt ? (
                <div>
                  <dt>发布时间</dt>
                  <dd>{formatDateTime(data.publishedAt)}</dd>
                </div>
              ) : null}
              <div>
                <dt>署名方式</dt>
                <dd><CreditLine mode={data.submitterCredit.mode} name={data.submitterCredit.name} /></dd>
              </div>
              <div>
                <dt>录音授权</dt>
                <dd className="info-ok">
                  <Icon name="check" size={14} />
                  {data.recordingAuthorized ? "已勾选授权声明" : "未勾选"}
                </dd>
              </div>
              <div>
                <dt>主视觉</dt>
                <dd>{data.visual ? (data.visual.type === "image" ? "图片" : "短视频") : "未提供"}</dd>
              </div>
              <div>
                <dt>逐句字幕</dt>
                <dd>{data.subtitleSegments.length ? `${data.subtitleSegments.length} 句` : "未提供"}</dd>
              </div>
            </dl>
          </div>

          {mode === "review" && data.submitter ? (
            <div className="panel aside-panel">
              <h2 className="section-label">
                <Icon name="user" size={16} />
                投稿者账号
              </h2>
              <p className="submitter-name">{data.submitter.displayName}</p>
              <p className="submitter-account">@{data.submitter.username}</p>
              <p className="aside-fineprint">仅审核必要范围内可见，不返回给公开接口。</p>
            </div>
          ) : null}

          {actions ? <div className="panel aside-panel aside-actions">{actions}</div> : null}
        </aside>
      </div>
    </div>
  );
}