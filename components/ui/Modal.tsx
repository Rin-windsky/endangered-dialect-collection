"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

function DialogShell({
  title,
  description,
  children,
  onClose,
  footer,
  tone = "default",
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  tone?: "default" | "danger";
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`dialog dialog-${tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="dialog-head">
          <h2 id={titleId} className="dialog-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="close" size={18} />
          </button>
        </div>
        {description ? <p className="dialog-desc">{description}</p> : null}
        {children}
        <div className="dialog-footer">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  tone = "default",
  loading = false,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <DialogShell
      title={title}
      description={description}
      onClose={onClose}
      tone={tone}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "处理中…" : confirmText}
          </button>
        </>
      }
    >
      {children}
    </DialogShell>
  );
}

export function ReasonDialog({
  title = "退回补充",
  loading = false,
  onSubmit,
  onClose,
}: {
  title?: string;
  loading?: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reasonId = useId();

  const submit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError("退回原因至少 5 个字");
      return;
    }
    if (trimmed.length > 500) {
      setError("退回原因不能超过 500 个字");
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  return (
    <DialogShell
      title={title}
      description="请写明需要修改的具体字段和问题。选填资料缺失本身不能作为退回理由。"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "提交中…" : "确认退回"}
          </button>
        </>
      }
    >
      <label className="field" htmlFor={reasonId}>
        <span className="field-label">退回原因 <em>必填</em></span>
        <textarea
          id={reasonId}
          className="textarea"
          rows={5}
          value={reason}
          maxLength={500}
          autoFocus
          placeholder="例如：内容说明没有写清录音场景与说话人关系，请补充后再提交。"
          onChange={(event) => {
            setReason(event.target.value);
            if (error) setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${reasonId}-error` : undefined}
        />
      </label>
      <div className="field-foot">
        {error ? (
          <span className="field-error" id={`${reasonId}-error`} aria-live="polite">{error}</span>
        ) : (
          <span className="field-hint">5–500 字，投稿者可见</span>
        )}
        <span className="char-count">{reason.trim().length}/500</span>
      </div>
    </DialogShell>
  );
}