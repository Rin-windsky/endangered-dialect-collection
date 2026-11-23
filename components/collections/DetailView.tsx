"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { ItemDetail } from "@/lib/types";
import { CONTENT_TYPE_LABEL, formatDateTime, formatDuration } from "@/lib/constants";
import { useToast } from "@/lib/providers/toast-provider";
import { SoundSection } from "@/components/audio/SoundSection";
import { ItemCard } from "@/components/collections/ItemCard";
import { CreditLine } from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/State";
import { Icon } from "@/components/ui/Icon";

export function DetailView({ id }: { id: string }) {
  const { toast } = useToast();
  const [item, setItem] = useState<ItemDetail | null>(null);
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
      .get<ItemDetail>(`/collections/${encodeURIComponent(id)}`)
      .then((detail) => {
        if (active) setItem(detail);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiError(err) && (err.status === 404 || err.code === "NOT_FOUND")) {
          setNotFound(true);
        } else {
          setError(errorMessage(err, "收藏品加载失败"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("链接已复制", "success");
    } catch {
      toast("复制失败，请手动复制地址栏链接", "error");
    }
  };

  if (loading) {
    return (
      <div className="container detail-loading">
        <LoadingBlock label="正在取出这件收藏…" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container detail-state">
        <EmptyState
          icon="archive"
          title="这件收藏不存在或尚未公开"
          description="它可能已经下架，或仍在等待审核。去看看收藏馆里的其他声音吧。"
          action={
            <Link href="/collections" className="btn btn-primary btn-sm">
              返回收藏馆
            </Link>
          }
        />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container detail-state">
        <ErrorState description={error ?? "收藏品加载失败"} onRetry={() => setAttempt((value) => value + 1)} />
      </div>
    );
  }

  return (
    <div className="detail-view">
      <div className="container">
        <nav className="breadcrumb" aria-label="面包屑">
          <Link href="/collections">收藏馆</Link>
          <span>/</span>
          <span>{CONTENT_TYPE_LABEL[item.contentType]}</span>
          <span>/</span>
          <span className="current">{item.title}</span>
        </nav>

        <header className="detail-head">
          {item.featured ? <span className="detail-featured">本周精选</span> : null}
          <h1 className="detail-title">{item.title}</h1>
          <div className="detail-subline">
            <span className="detail-region">
              <Icon name="pin" size={14} />
              {item.region.name}
            </span>
            {item.language ? <span className="detail-divider">{item.language.name}</span> : null}
            <span className="detail-divider">{CONTENT_TYPE_LABEL[item.contentType]}</span>
            {item.durationSeconds ? (
              <span className="detail-divider tnum">{formatDuration(item.durationSeconds)}</span>
            ) : null}
          </div>
          <p className="detail-summary">{item.summary}</p>
        </header>

        <div className="detail-layout">
          <div className="detail-main">
            <SoundSection
              audioUrl={item.audioUrl}
              duration={item.durationSeconds}
              title={item.title}
              subtitles={item.subtitleSegments}
              visualType={item.visualType}
              visualUrl={item.visualUrl}
            />

            <div className="detail-panels">
              <section className="detail-panel">
                <h2 className="panel-title">
                  <span className="panel-index">01</span>
                  它讲了什么
                </h2>
                <p className="panel-text">{item.summary}</p>
              </section>

              {item.translationZh ? (
                <section className="detail-panel">
                  <h2 className="panel-title">
                    <span className="panel-index">02</span>
                    普通话译文
                  </h2>
                  <p className="panel-text translation">{item.translationZh}</p>
                </section>
              ) : null}

              {item.cultureContext ? (
                <section className="detail-panel">
                  <h2 className="panel-title">
                    <span className="panel-index">{item.translationZh ? "03" : "02"}</span>
                    文化背景
                  </h2>
                  <p className="panel-text">{item.cultureContext}</p>
                </section>
              ) : null}
            </div>
          </div>

          <aside className="detail-aside">
            <div className="aside-card">
              <p className="aside-label">收录信息</p>
              <dl className="aside-meta">
                <div>
                  <dt>收录于</dt>
                  <dd>{formatDateTime(item.publishedAt)}</dd>
                </div>
                <div>
                  <dt>讲述者</dt>
                  <dd>
                    <CreditLine mode={item.submitterCredit.mode} name={item.submitterCredit.name} />
                  </dd>
                </div>
                <div>
                  <dt>方言</dt>
                  <dd>{item.language?.name ?? "未标注"}</dd>
                </div>
                <div>
                  <dt>地区</dt>
                  <dd>
                    <Link href={`/collections?regionId=${encodeURIComponent(item.region.id)}`} className="text-link">
                      {item.region.name}
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>类型</dt>
                  <dd>{CONTENT_TYPE_LABEL[item.contentType]}</dd>
                </div>
                <div>
                  <dt>时长</dt>
                  <dd className="tnum">{item.durationSeconds ? formatDuration(item.durationSeconds) : "未知"}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn-outline btn-sm aside-share" onClick={share}>
                <Icon name="copy" size={14} />
                复制分享链接
              </button>
            </div>

            <div className="aside-note">
              <p className="aside-note-title">关于这段录音</p>
              <p>
                本馆展品均为经讲述者同意收录的方言声音。
                如果你也有一段想留下的乡音，欢迎成为讲述者。
              </p>
              <Link href="/submit" className="text-link">
                我要投稿 <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          </aside>
        </div>

        {item.related.length ? (
          <section className="detail-related">
            <div className="section-head">
              <div>
                <p className="eyebrow">NEARBY VOICES</p>
                <h2 className="section-title">相近的声音</h2>
              </div>
              <Link href={`/collections?regionId=${encodeURIComponent(item.region.id)}`} className="text-link">
                更多 {item.region.name} 的声音 <Icon name="arrow-right" size={12} />
              </Link>
            </div>
            <div className="grid-list">
              {item.related.map((related, index) => (
                <ItemCard key={related.id} item={related} index={index} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}