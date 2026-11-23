import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function LoadingBlock({ label = "正在加载", lines = 3 }: { label?: string; lines?: number }) {
  return (
    <div className="state-box state-loading" role="status" aria-live="polite">
      <div className="loading-lines" aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <span key={index} style={{ animationDelay: `${index * 120}ms` }} />
        ))}
      </div>
      <span className="state-label">{label}</span>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-cover" />
          <div className="skeleton-line" style={{ width: "70%" }} />
          <div className="skeleton-line" style={{ width: "92%" }} />
          <div className="skeleton-line" style={{ width: "56%" }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "book",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="state-box">
      <span className="state-icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="state-title">{title}</h3>
      {description ? <p className="state-desc">{description}</p> : null}
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "加载失败",
  description = "请检查网络后重试",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-box state-error" role="alert">
      <span className="state-icon" aria-hidden="true">
        <Icon name="alert" size={26} />
      </span>
      <h3 className="state-title">{title}</h3>
      <p className="state-desc">{description}</p>
      {onRetry ? (
        <div className="state-action">
          <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
            <Icon name="refresh" size={16} />
            重新加载
          </button>
        </div>
      ) : null}
    </div>
  );
}