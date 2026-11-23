"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { cx, SITE_SLOGAN } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";

const NAV = [
  { href: "/", label: "首页", match: (path: string) => path === "/" },
  { href: "/collections", label: "收藏馆", match: (path: string) => path.startsWith("/collections") },
  { href: "/map", label: "方言地图", match: (path: string) => path.startsWith("/map") },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      router.push("/");
    } finally {
      setBusy(false);
    }
  };

  const showSubmit = !user || user.role === "contributor";
  const nav = [
    ...NAV,
    ...(showSubmit ? [{ href: "/submit", label: "我要投稿", match: (path: string) => path.startsWith("/submit") }] : []),
  ];

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label={`${SITE_SLOGAN} 回到首页`}>
          <span className="brand-mark" aria-hidden="true">乡</span>
          <span className="brand-text">
            <span className="brand-name">乡音</span>
            <span className="brand-sub">方言收藏馆</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="主导航">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={cx("nav-link", item.match(pathname) && "is-active")}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {loading ? (
            <span className="header-skeleton" aria-hidden="true" />
          ) : user ? (
            <>
              {user.role === "reviewer" ? (
                <Link href="/review" className={cx("nav-link nav-review", pathname.startsWith("/review") && "is-active")}>
                  审核工作台
                </Link>
              ) : (
                <Link
                  href="/my-submissions"
                  className={cx("nav-link nav-mine", pathname.startsWith("/my-submissions") && "is-active")}
                >
                  我的投稿
                </Link>
              )}
              <span className="user-chip" title={user.role === "reviewer" ? "审核员" : "投稿者"}>
                <span className="user-avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</span>
                <span className="user-name">{user.displayName}</span>
              </span>
              <button
                type="button"
                className="icon-btn header-logout"
                onClick={handleLogout}
                disabled={busy}
                aria-label="退出登录"
                title="退出登录"
              >
                <Icon name="logout" size={17} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={cx("nav-link", pathname === "/login" && "is-active")}>
                登录
              </Link>
              <Link href="/submit" className="btn btn-primary btn-sm header-cta">
                我要投稿
              </Link>
            </>
          )}
          <button
            type="button"
            className="icon-btn mobile-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="打开菜单"
          >
            <Icon name={open ? "close" : "menu"} size={20} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="mobile-nav">
          <div className="container mobile-nav-inner">
            {[...nav, ...(user?.role === "reviewer" ? [{ href: "/review", label: "审核工作台", match: (path: string) => path.startsWith("/review") }] : []), ...(user?.role === "contributor" ? [{ href: "/my-submissions", label: "我的投稿", match: (path: string) => path.startsWith("/my-submissions") }] : [])].map((item) => (
              <Link key={item.href} href={item.href} className={cx("mobile-nav-link", item.match(pathname) && "is-active")}>
                {item.label}
                <Icon name="arrow-right" size={16} />
              </Link>
            ))}
            {!user ? (
              <Link href="/login" className="mobile-nav-link">
                登录 / 注册
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : (
              <button type="button" className="mobile-nav-link mobile-logout" onClick={handleLogout} disabled={busy}>
                退出登录
                <Icon name="logout" size={16} />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}