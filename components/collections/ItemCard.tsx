"use client";

import Link from "next/link";
import type { ItemCard as ItemCardType } from "@/lib/types";
import { CONTENT_TYPE_LABEL, formatDuration } from "@/lib/constants";
import { usePlayback } from "@/lib/providers/playback-provider";
import { Icon } from "@/components/ui/Icon";
import { CreditLine } from "@/components/ui/StatusBadge";
import { VisualStage } from "@/components/audio/VisualStage";

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i++) {
    result = (result * 31 + value.charCodeAt(i)) >>> 0;
  }
  return result;
}

export function ItemCard({
  item,
  variant = "default",
  index = 0,
}: {
  item: ItemCardType;
  variant?: "default" | "featured" | "compact";
  index?: number;
}) {
  const playback = usePlayback();
  const tone = hash(item.id) % 4;
  const serial = (hash(item.id) % 90) + 10;
  const hasVisual = Boolean(item.visualType && item.visualUrl);
  const regionChar = item.region.name.replace(/(省|市|自治区|特别行政区)/g, "").slice(0, 1) || "乡";

  return (
    <article className={`item-card card-${variant}`} style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <div className={`card-cover tone-${tone}`}>
        {hasVisual ? (
          <VisualStage
            type={item.visualType}
            url={item.visualUrl}
            alt={`${item.title} 主视觉`}
            variant="card"
            className="card-visual"
          />
        ) : (
          <div className="cover-typo" aria-hidden="true">
            <span className="cover-glyph">{regionChar}</span>
            <span className="cover-ring ring-1" />
            <span className="cover-ring ring-2" />
            <span className="cover-vertical">{item.title.slice(0, 8)}</span>
            <span className="cover-serial">NO.{serial}</span>
          </div>
        )}
        <span className="card-kind">{CONTENT_TYPE_LABEL[item.contentType]}</span>
        {item.featured ? <span className="card-featured">精选</span> : null}
        {item.durationSeconds != null ? (
          <span className="card-duration">
            <Icon name="clock" size={12} />
            {formatDuration(item.durationSeconds)}
          </span>
        ) : null}
        {item.audioUrl ? (
          <button
            type="button"
            className="play-fab"
            onClick={() =>
              playback.playTrack({
                id: item.id,
                title: item.title,
                subtitle: `${item.language?.name ?? "方言暂不确定"} · ${item.region.name}`,
                audioUrl: item.audioUrl,
                href: `/collections/${item.id}`,
              })
            }
            aria-label={`播放 ${item.title}`}
          >
            <Icon name="play" size={18} />
          </button>
        ) : null}
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span>{item.language?.name ?? "方言暂不确定"}</span>
          <span className="dot" aria-hidden="true" />
          <span>{item.region.name}</span>
        </div>
        <h3 className="card-title">
          <Link href={`/collections/${item.id}`} className="card-hit">
            {item.title}
          </Link>
        </h3>
        <p className="card-summary">{item.summary}</p>
        <div className="card-foot">
          <CreditLine mode={item.submitterCredit.mode} name={item.submitterCredit.name} />
          <span className="card-more">
            聆听
            <Icon name="arrow-up-right" size={14} />
          </span>
        </div>
      </div>
    </article>
  );
}