"use client";

import { RequireRole } from "@/components/layout/AuthGuard";
import { SubmissionForm } from "@/components/forms/SubmissionForm";
import { isMockMode } from "@/lib/constants";

export function SubmitView() {
  return (
    <RequireRole role="contributor">
      <div className="submit-view">
        <div className="container">
          <header className="page-head submit-head">
            <div className="page-head-main">
              <p className="eyebrow">CONTRIBUTE · 收录投稿</p>
              <h1 className="page-title">留下一段乡音</h1>
              <p className="page-lead">
                录下你最熟悉的那句话，讲讲它背后的地方与故事。
                通过审核后，它会被永久收进收藏馆。
              </p>
            </div>
            <div className="submit-head-note">
              <span className="seal-sm">录</span>
              <p>投稿后将进入人工审核，请确保录音已获得讲述者同意。</p>
            </div>
          </header>
          {isMockMode ? (
            <div className="mock-banner" role="note">
              当前为演示模式：音频与图片保存在浏览器内，刷新后可能失效，但可完整走通投稿、审核、退回流程。
            </div>
          ) : null}
          <SubmissionForm mode="create" />
        </div>
      </div>
    </RequireRole>
  );
}