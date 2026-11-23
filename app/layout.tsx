import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { ToastProvider } from "@/lib/providers/toast-provider";
import { PlaybackProvider } from "@/lib/providers/playback-provider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "乡音 · 方言收藏馆",
    template: "%s · 乡音",
  },
  description:
    "把一段真实录音做成可以继续被听见、被阅读、被理解的收藏品。收藏那些正在远去的声音。",
  applicationName: "乡音 · 方言收藏馆",
  keywords: ["方言", "乡音", "收藏馆", "地方文化", "录音", "Hack4Good"],
};

export const viewport: Viewport = {
  themeColor: "#F4EEE2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          跳到主要内容
        </a>
        <ToastProvider>
          <AuthProvider>
            <PlaybackProvider>
              <div className="app-shell">
                <SiteHeader />
                <main id="main" className="site-main">
                  {children}
                </main>
                <SiteFooter />
              </div>
            </PlaybackProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}