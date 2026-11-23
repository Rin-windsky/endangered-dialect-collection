"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container guard-wrap">
      <div className="state-box state-error" role="alert">
        <h2 className="state-title">页面出了点问题</h2>
        <p className="state-desc">可以先重试，或稍后再回来。</p>
        <div className="state-action">
          <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
            重新加载
          </button>
        </div>
      </div>
    </div>
  );
}