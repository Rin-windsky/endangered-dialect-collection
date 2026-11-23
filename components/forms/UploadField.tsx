"use client";

import { useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function UploadField({
  label,
  hint,
  accept,
  required = false,
  file,
  progress,
  error,
  disabled = false,
  existingUrl,
  existingType,
  onSelect,
  onRemove,
  onRemoveExisting,
}: {
  label: string;
  hint: string;
  accept: string;
  required?: boolean;
  file: File | null;
  progress?: number;
  error?: string | null;
  disabled?: boolean;
  existingUrl?: string | null;
  existingType?: "audio" | "image" | "video";
  onSelect: (file: File) => void;
  onRemove: () => void;
  onRemoveExisting?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState(false);
  const errorId = useId();

  const pick = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={`upload-field ${error ? "has-error" : ""}`}>
      <div className="upload-head">
        <span className="field-label">
          {label}
          {required ? <em>必填</em> : <span className="tag-optional">选填</span>}
        </span>
        <span className="field-hint">{hint}</span>
      </div>

      {existingUrl && !file ? (
        <div className="upload-existing">
          {existingType === "audio" ? (
            <div className="existing-audio">
              <Icon name="mic" size={18} />
              <audio src={existingUrl} controls preload="metadata" />
            </div>
          ) : existingType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="existing-thumb" src={existingUrl} alt={`已上传的${label}`} />
          ) : existingType === "video" ? (
            <video className="existing-thumb" src={existingUrl} muted loop playsInline controls preload="metadata" />
          ) : null}
          <span className="existing-label">已上传，可重新选择替换</span>
          {onRemoveExisting ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRemoveExisting} disabled={disabled}>
              移除
            </button>
          ) : null}
        </div>
      ) : null}

      {file ? (
        <div className="upload-file-card">
          <span className="upload-file-icon" aria-hidden="true">
            <Icon name={existingType === "video" ? "film" : existingType === "image" ? "image" : "mic"} size={18} />
          </span>
          <div className="upload-file-main">
            <span className="upload-file-name">{file.name}</span>
            <span className="upload-file-meta">
              {humanSize(file.size)}
              {progress != null && progress < 100 ? ` · 上传中 ${progress}%` : progress === 100 ? " · 已上传" : ""}
            </span>
            {progress != null ? (
              <span className="progress-track" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </span>
            ) : null}
          </div>
          <button type="button" className="icon-btn" onClick={onRemove} disabled={disabled} aria-label="移除文件">
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`upload-drop ${drag ? "is-drag" : ""}`}
          onClick={pick}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDrag(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped && !disabled) onSelect(dropped);
          }}
          disabled={disabled}
        >
          <span className="upload-drop-icon" aria-hidden="true">
            <Icon name="upload" size={20} />
          </span>
          <span className="upload-drop-title">{existingUrl ? "选择新文件替换" : "点击选择文件，或拖拽到此处"}</span>
          <span className="upload-drop-hint">{hint}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onSelect(selected);
          event.target.value = "";
        }}
      />
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}