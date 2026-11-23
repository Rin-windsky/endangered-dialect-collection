"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type EditableSubtitle = { start: number; text: string };

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatStart(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${pad(m)}:${s.toFixed(1).padStart(4, "0")}`;
}

export function parseStart(textValue: string): number | null {
  const value = textValue.trim();
  if (!value) return null;
  let seconds: number;
  if (value.includes(":")) {
    const parts = value.split(":");
    if (parts.length !== 2) return null;
    const minutes = Number(parts[0]);
    const rest = Number(parts[1]);
    if (!Number.isFinite(minutes) || !Number.isFinite(rest)) return null;
    seconds = minutes * 60 + rest;
  } else {
    seconds = Number(value);
  }
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.round(seconds * 10) / 10;
}

function TimeInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(formatStart(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(formatStart(value));
  }, [value]);

  const commit = () => {
    const parsed = parseStart(text);
    if (parsed == null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setText(formatStart(parsed));
    onChange(parsed);
  };

  return (
    <input
      className={`input time-input ${invalid ? "is-invalid" : ""}`}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      disabled={disabled}
      inputMode="decimal"
      aria-label="本句开始时间"
      placeholder="00:00.0"
    />
  );
}

export function SubtitleEditor({
  segments,
  onChange,
  audioUrl,
}: {
  segments: EditableSubtitle[];
  onChange: (segments: EditableSubtitle[]) => void;
  audioUrl: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
  }, [audioUrl]);

  const update = (index: number, patch: Partial<EditableSubtitle>) => {
    onChange(segments.map((segment, i) => (i === index ? { ...segment, ...patch } : segment)));
  };

  const addRow = () => {
    const last = segments[segments.length - 1];
    const nextStart = last ? Math.round((last.start + 4) * 10) / 10 : Math.round(time * 10) / 10;
    onChange([...segments, { start: nextStart, text: "" }]);
  };

  const removeRow = (index: number) => {
    onChange(segments.filter((_, i) => i !== index));
  };

  const togglePreview = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  };

  return (
    <div className="subtitle-editor">
      {audioUrl ? (
        <div className="subtitle-toolbar">
          <button type="button" className="btn btn-outline btn-sm" onClick={togglePreview}>
            <Icon name={playing ? "pause" : "play"} size={14} />
            {playing ? "暂停试听" : "试听录音"}
          </button>
          <span className="subtitle-clock">{formatStart(time)}</span>
          <span className="field-hint">播放音频，点「取当前」填入整句开始时间</span>
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
          />
        </div>
      ) : (
        <p className="subtitle-empty-hint">选择录音后可在此试听并对齐字幕时间。</p>
      )}

      {segments.length === 0 ? (
        <div className="subtitle-empty">
          <p>未添加字幕时，详情页只展示正常音频播放。</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>
            <Icon name="plus" size={14} />
            添加第一句字幕
          </button>
        </div>
      ) : (
        <ol className="subtitle-rows">
          {segments.map((segment, index) => (
            <li className="subtitle-row" key={index}>
              <span className="subtitle-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="subtitle-row-main">
                <div className="subtitle-row-top">
                  <TimeInput value={segment.start} onChange={(value) => update(index, { start: value })} />
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => update(index, { start: Math.round(time * 10) / 10 })}
                    disabled={!audioUrl}
                  >
                    取当前
                  </button>
                  <button
                    type="button"
                    className="icon-btn subtitle-remove"
                    onClick={() => removeRow(index)}
                    aria-label={`删除第 ${index + 1} 句`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
                <input
                  className="input"
                  value={segment.text}
                  onChange={(event) => update(index, { text: event.target.value })}
                  placeholder="本句原文，例如：阿婆讲，五月五，食粽看龙船。"
                  maxLength={300}
                  aria-label={`第 ${index + 1} 句字幕原文`}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="subtitle-editor-foot">
        <button type="button" className="btn btn-text btn-sm" onClick={addRow}>
          <Icon name="plus" size={14} />
          添加一句
        </button>
        {segments.length > 0 ? (
          <button type="button" className="btn btn-text btn-sm" onClick={() => onChange([])}>
            清空字幕
          </button>
        ) : null}
        <span className="field-hint">结束时间自动取下一句开始时间，最后一句到音频结束。</span>
      </div>
    </div>
  );
}