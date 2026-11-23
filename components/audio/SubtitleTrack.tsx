"use client";

import { useEffect, useMemo, useRef } from "react";
import type { SubtitleSegment } from "@/lib/types";
import { formatTimecode } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";

export function SubtitleTrack({
  segments,
  currentTime,
  playing,
  onSeek,
}: {
  segments: SubtitleSegment[];
  currentTime: number;
  playing: boolean;
  onSeek: (seconds: number) => void;
}) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = useMemo(() => {
    if (!segments.length) return -1;
    if (!playing && currentTime <= 0.05) return -1;
    let index = 0;
    for (let i = 0; i < segments.length; i++) {
      if (currentTime + 0.05 >= segments[i].start) index = i;
      else break;
    }
    return index;
  }, [segments, currentTime]);

  useEffect(() => {
    if (!playing || activeIndex < 0) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, playing]);

  if (!segments.length) return null;

  return (
    <section className="subtitle-block" aria-label="逐句字幕">
      <div className="subtitle-head">
        <h3 className="section-label">
          <Icon name="book" size={15} />
          逐句字幕
        </h3>
        <span className="subtitle-hint">播放时高亮，点击任意一句可跳转</span>
      </div>
      <ol className="subtitle-track">
        {segments.map((segment, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={`${segment.start}-${index}`}>
              <button
                type="button"
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                className={`subtitle-line ${isActive ? "is-active" : ""}`}
                onClick={() => onSeek(segment.start)}
                aria-current={isActive ? "true" : undefined}
              >
                <span className="subtitle-time">{formatTimecode(segment.start)}</span>
                <span className="subtitle-text-wrap">
                  <span className="subtitle-text">{segment.text}</span>
                  {segment.translation ? (
                    <span className="subtitle-translation">{segment.translation}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}