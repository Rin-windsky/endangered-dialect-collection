"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function VisualStage({
  type,
  url,
  alt = "收藏品主视觉",
  variant = "detail",
  className = "",
}: {
  type: "image" | "video" | null;
  url: string | null;
  alt?: string;
  variant?: "detail" | "card" | "thumb";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!type || !url) return null;

  if (failed) {
    return (
      <div className={`visual-fallback visual-${variant} ${className}`} role="img" aria-label="主视觉加载失败">
        <Icon name="image" size={variant === "thumb" ? 18 : 26} />
        {variant !== "thumb" ? (
          <>
            <span>主视觉加载失败</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFailed(false);
                setAttempt((value) => value + 1);
              }}
            >
              <Icon name="refresh" size={14} />
              重试
            </button>
          </>
        ) : null}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className={`visual-stage visual-${variant} ${className}`}>
        <video
          key={attempt}
          src={url}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          aria-label={alt}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`visual-stage visual-${variant} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={attempt}
        src={url}
        alt={alt}
        loading={variant === "detail" ? "eager" : "lazy"}
        onError={() => setFailed(true)}
      />
    </div>
  );
}