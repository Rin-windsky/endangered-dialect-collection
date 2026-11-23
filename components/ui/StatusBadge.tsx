import { STATUS_LABEL } from "@/lib/constants";
import type { ItemStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CreditLine({
  mode,
  name,
  prefix = "投稿",
}: {
  mode: "anonymous" | "nickname";
  name?: string | null;
  prefix?: string;
}) {
  if (mode === "nickname" && name) {
    return (
      <span className="credit-line">
        <span className="credit-avatar" aria-hidden="true">{name.slice(0, 1)}</span>
        {name}
        <span className="credit-suffix">{prefix}</span>
      </span>
    );
  }
  return (
    <span className="credit-line is-anonymous">
      <span className="credit-avatar" aria-hidden="true">匿</span>
      匿名
      <span className="credit-suffix">{prefix}</span>
    </span>
  );
}