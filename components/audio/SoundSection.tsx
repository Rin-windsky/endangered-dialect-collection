"use client";

import { useRef, useState } from "react";
import type { SubtitleSegment, VisualType } from "@/lib/types";
import { usePlayback } from "@/lib/providers/playback-provider";
import { AudioPlayer, type AudioPlayerHandle } from "./AudioPlayer";
import { SubtitleTrack } from "./SubtitleTrack";
import { VisualStage } from "./VisualStage";

export function SoundSection({
  audioUrl,
  duration,
  title,
  subtitles,
  visualType,
  visualUrl,
}: {
  audioUrl: string;
  duration: number | null;
  title: string;
  subtitles: SubtitleSegment[];
  visualType: VisualType | null;
  visualUrl: string | null;
}) {
  const playerRef = useRef<AudioPlayerHandle | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playback = usePlayback();

  return (
    <div className="sound-section">
      {visualType && visualUrl ? (
        <VisualStage type={visualType} url={visualUrl} alt={`${title} 主视觉`} variant="detail" className="sound-visual" />
      ) : null}
      <div className="sound-player-wrap">
        <AudioPlayer
          ref={playerRef}
          audioUrl={audioUrl}
          durationHint={duration}
          title={title}
          onPlayStart={() => playback.stop()}
          onTimeUpdate={setCurrentTime}
          onPlayingChange={setPlaying}
        />
        <SubtitleTrack
          segments={subtitles}
          currentTime={currentTime}
          playing={playing}
          onSeek={(seconds) => {
            playerRef.current?.seekTo(seconds);
            setCurrentTime(seconds);
          }}
        />
      </div>
    </div>
  );
}