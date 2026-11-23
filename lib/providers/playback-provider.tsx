"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { formatDuration } from "../constants";

export type PlaybackTrack = {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  href?: string;
};

type PlaybackContextValue = {
  track: PlaybackTrack | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: PlaybackTrack) => void;
  toggle: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
};

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

const WAVE_BARS = [18, 30, 44, 26, 52, 36, 60, 28, 40, 54, 24, 46, 32, 58, 22, 38, 50, 30, 42, 20];

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<PlaybackTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    setCurrentTime(0);
    setDuration(0);
    audio.src = track.audioUrl;
    audio.load();
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [track]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const playTrack = useCallback(
    (next: PlaybackTrack) => {
      if (track?.id === next.id && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        return;
      }
      if (track?.id === next.id && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        return;
      }
      setTrack(next);
    },
    [track],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setTrack(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  const value = useMemo<PlaybackContextValue>(
    () => ({ track, playing, currentTime, duration, playTrack, toggle, stop, seekTo }),
    [track, playing, currentTime, duration, playTrack, toggle, stop, seekTo],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
      />
      {track ? (
        <div className="audio-dock" role="region" aria-label="正在播放">
          <div className="audio-dock-inner">
            <button
              type="button"
              className="dock-play"
              onClick={toggle}
              aria-label={playing ? "暂停" : "播放"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="dock-main">
              <div className="dock-head">
                {track.href ? (
                  <Link className="dock-title" href={track.href}>
                    {track.title}
                  </Link>
                ) : (
                  <span className="dock-title">{track.title}</span>
                )}
                {track.subtitle ? <span className="dock-sub">{track.subtitle}</span> : null}
              </div>
              <div className="dock-progress">
                <span className="dock-time">{formatDuration(currentTime)}</span>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  aria-label="播放进度"
                />
                <span className="dock-time">{formatDuration(duration || null)}</span>
              </div>
            </div>
            <div className="dock-wave" aria-hidden="true">
              {WAVE_BARS.map((height, index) => (
                <span
                  key={index}
                  style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }}
                  className={playing ? "is-live" : ""}
                />
              ))}
            </div>
            <button type="button" className="dock-close" onClick={stop} aria-label="关闭播放器">
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : null}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used inside PlaybackProvider");
  return context;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}