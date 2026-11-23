"use client";

import Link from "next/link";
import { isMockMode } from "@/lib/constants";
import { useAuth } from "@/lib/providers/auth-provider";
import { Icon } from "@/components/ui/Icon";

export function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand-mark brand-mark-sm" aria-hidden="true">乡</span>
          <div>
            <p className="footer-name">乡音 · 方言收藏馆</p>
            <p className="footer-slogan">收藏那些正在远去的声音。</p>
          </div>
        </div>
        <p className="footer-poem">
          「少小离家老大回，乡音无改鬓毛衰。」
          <span>—— 贺知章《回乡偶书》</span>
        </p>
        <div className="footer-links">
          <Link href="/collections">收藏馆</Link>
          <Link href="/map">方言地图</Link>
          {user?.role !== "reviewer" ? <Link href="/submit">我要投稿</Link> : null}
          {user ? (
            <Link href={user.role === "reviewer" ? "/review" : "/my-submissions"}>
              {user.role === "reviewer" ? "审核工作台" : "我的投稿"}
            </Link>
          ) : (
            <Link href="/login">登录</Link>
          )}
        </div>
        <div className="footer-meta">
          <span>地区公开展示精确到省级，不采集精确位置与联系方式。</span>
          <span>
            <Icon name="info" size={13} />
            {isMockMode ? "演示环境使用本地示例数据与合成音频。" : "所有公开内容均经人工审核。"}
          </span>
          <span>© 2026 乡音 · 2026 Qoder 高校创造力大赛 Hack4Good</span>
        </div>
      </div>
    </footer>
  );
}