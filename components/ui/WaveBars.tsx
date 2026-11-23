export function WaveBars({
  playing = false,
  count = 40,
  progress = 0,
  className = "",
}: {
  playing?: boolean;
  count?: number;
  progress?: number;
  className?: string;
}) {
  const bars = Array.from({ length: count }).map((_, index) => {
    const wave = Math.abs(Math.sin(index * 1.7 + 0.4)) * 0.55 + Math.abs(Math.cos(index * 0.63)) * 0.45;
    return Math.round(18 + wave * 74);
  });
  return (
    <span className={`wave-bars ${playing ? "is-playing" : ""} ${className}`} aria-hidden="true">
      {bars.map((height, index) => {
        const passed = count > 1 ? index / (count - 1) <= progress : false;
        return (
          <span
            key={index}
            className={`wave-bar ${passed ? "is-passed" : ""}`}
            style={{ height: `${height}%`, animationDelay: `${(index % 9) * 70}ms` }}
          />
        );
      })}
    </span>
  );
}