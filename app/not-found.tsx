import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container notfound-wrap">
      <div className="notfound">
        <span className="notfound-seal" aria-hidden="true">乡</span>
        <p className="eyebrow">404 · LOST VOICE</p>
        <h1>这一段声音，走丢了。</h1>
        <p>页面可能已移动或不存在。回到收藏馆，继续听那些仍在的声音。</p>
        <div className="notfound-actions">
          <Link href="/" className="btn btn-primary">回到首页</Link>
          <Link href="/collections" className="btn btn-outline">去收藏馆</Link>
        </div>
      </div>
    </div>
  );
}