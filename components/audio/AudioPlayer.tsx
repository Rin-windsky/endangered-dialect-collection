"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { formatDuration } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";
import { WaveBars } from "@/components/ui/WaveBars";

export type AudioPlayerHandle = {
  seekTo: (seconds: number) => void;
  play: () => void;
  getCurrentTime: () => number;
};

type Props = {
  audioUrl: string;
  durationHint?: number | null;
  title?: string;
  onPlayStart?: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlayingChange?: (playing: boolean) => void;
};

export const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(function AudioPlayer(
  { audioUrl, durationHint, title, onPlayStart, onTimeUpdate, onPlayingChange },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setCurrent(0);
    setDuration(durationHint ?? 0);
    setPlaying(false);
    setError(null);
    setLoading(true);
  }, [audioUrl, durationHint, attempt]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const target = Math.max(0, Math.min(seconds, audio.duration || seconds));
      audio.currentTime = target;
      setCurrent(target);
      onTimeUpdate?.(target);
    },
    play: () => {
      void audioRef.current?.play().catch(() => setError("音频播放失败，请重试"));
    },
    getCurrentTime: () => audioRef.current?.currentTime ?? 0,
  }));

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (audio.paused) {
      onPlayStart?.();
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          setError("音频加载失败，请检查网络后重试");
        });
    } else {
      audio.pause();
    }
  };

  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrent(audio.currentTime);
    onTimeUpdate?.(audio.currentTime);
  };

  if (!audioUrl) {
    return (
      <div className="player player-error" role="alert">
        <Icon name="alert" size={20} />
        <span>音频暂不可用</span>
      </div>
    );
  }

  const progress = duration > 0 ? current / duration : 0;

  return (
    <div className={`player ${error ? "player-error" : ""}`}>
      <audio
        ref={audioRef}
        key={`${audioUrl}-${attempt}`}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || durationHint || 0);
          setLoading(false);
        }}
        onCanPlay={() => setLoading(false)}
        onPlay={() => {
          setPlaying(true);
          onPlayingChange?.(true);
        }}
        onPause={() => {
          setPlaying(false);
          onPlayingChange?.(false);
        }}
        onTimeUpdate={(event) => {
          setCurrent(event.currentTarget.currentTime);
          onTimeUpdate?.(event.currentTarget.currentTime);
        }}
        onEnded={() => {
          setPlaying(false);
          onPlayingChange?.(false);
          setCurrent(0);
          onTimeUpdate?.(0);
        }}
        onError={() => {
          setError("音频加载失败，请重试");
          setLoading(false);
          setPlaying(false);
        }}
      />
      <div className="player-top">
        <button
          type="button"
          className="player-toggle"
          onClick={toggle}
          aria-label={playing ? "暂停音频" : "播放音频"}
          disabled={Boolean(error)}
        >
          {loading ? <span className="spinner" aria-hidden="true" /> : <Icon name={playing ? "pause" : "play"} size={22} />}
        </button>
        <div className="player-wave">
          <WaveBars playing={playing && !error} count={52} progress={progress} />
          <input
            className="range player-range"
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="音频播放进度"
            disabled={Boolean(error)}
          />
        </div>
        <span className="player-time" aria-live="off">
          {formatDuration(current)} / {formatDuration(duration || durationHint || null)}
        </span>
      </div>
      {error ? (
        <div className="player-foot" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setError(null);
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            <Icon name="refresh" size={14} />
            重试
          </button>
        </div>
      ) : (
        <div className="player-foot">
          <span className="player-note">
            <Icon name="volume" size={14} />
            {title ? `${title} · 录音` : "可直接播放"}
          </span>
          <span className="player-note is-dim">进度可拖动</span>
        </div>
      )}
    </div>
  );
});