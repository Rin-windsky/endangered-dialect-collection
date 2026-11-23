import type { SVGProps } from "react";

type IconName =
  | "play"
  | "pause"
  | "search"
  | "map"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up-right"
  | "copy"
  | "check"
  | "close"
  | "plus"
  | "trash"
  | "upload"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "user"
  | "logout"
  | "clock"
  | "menu"
  | "volume"
  | "refresh"
  | "alert"
  | "lock"
  | "compass"
  | "book"
  | "mic"
  | "seal"
  | "mail"
  | "image"
  | "film"
  | "edit"
  | "download"
  | "info"
  | "eye"
  | "eye-off"
  | "pin"
  | "archive";

const paths: Record<IconName, React.ReactNode> = {
  play: <path d="M8 5.2v13.6L19 12 8 5.2Z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  map: (
    <>
      <path d="M9 4.5 4 6.8v12.7l5-2.3 6 2.3 5-2.3V4.5l-5 2.3-6-2.3Z" />
      <path d="M9 4.5v12.7M15 6.8v12.7" />
    </>
  ),
  "arrow-right": <path d="M4 12h15m-6-6 6 6-6 6" />,
  "arrow-left": <path d="M20 12H5m6-6-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M9 7h8v8" />,
  copy: (
    <>
      <rect x="9" y="9" width="10.5" height="10.5" rx="2" />
      <path d="M6.5 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 13h9.4l.8-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4.5m0 0L7.5 9M12 4.5 16.5 9" />
      <path d="M4.5 15.5v3a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3" />
    </>
  ),
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.7-3.6 3.5-5.4 7-5.4s6.3 1.8 7 5.4" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="m16 8 4 4-4 4M20 12H9.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  volume: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" />
    </>
  ),
  refresh: <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4.5V10h-5.5" />,
  alert: (
    <>
      <path d="M12 4 2.8 20h18.4L12 4Z" />
      <path d="M12 9.5v5M12 17.3v.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2.2 5-5 2 2.2-5 5-2Z" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h13.5v15H6a1.5 1.5 0 0 0-1.5 1.5V5.5Z" />
      <path d="M4.5 18.5V20H18M8 8h7M8 11.5h5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </>
  ),
  seal: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 8h8M8 12h8M10 16h4" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 17 4.8-4.8 3.4 3.4 2.6-2.6 4.2 4.2" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M8 5v14M16 5v14M3.5 9.5h4.5M3.5 14.5h4.5M16 9.5h4.5M16 14.5h4.5" />
    </>
  ),
  edit: (
    <>
      <path d="m4.5 19.5.8-4L16 4.8a1.8 1.8 0 0 1 2.6 0l.6.6a1.8 1.8 0 0 1 0 2.6L8.5 18.7l-4 1.3Z" />
      <path d="m14.5 6.3 3.2 3.2" />
    </>
  ),
  download: <path d="M12 4.5v11m0 0 4.5-4.5M12 15.5 7.5 11M4.5 19.5h15" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.6v.2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.9 5.2A9.8 9.8 0 0 1 12 4.8c6 0 9.2 7.2 9.2 7.2a17 17 0 0 1-2.8 4M6.3 7.3A16.7 16.7 0 0 0 2.8 12s3.2 7.2 9.2 7.2a9 9 0 0 0 4.3-1.1" />
      <path d="M9.9 10.2a3 3 0 0 0 4 4.2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0C5.5 15 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4.5" width="17" height="5" rx="1.2" />
      <path d="M5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9.5M9.5 13h5" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export type { IconName };