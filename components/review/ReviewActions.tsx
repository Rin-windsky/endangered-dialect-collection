"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { ItemStatus } from "@/lib/types";
import { useToast } from "@/lib/providers/toast-provider";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, ReasonDialog } from "@/components/ui/Modal";

export function ReviewActions({
  itemId,
  status,
  title,
  onUpdated,
}: {
  itemId: string;
  status: ItemStatus;
  title: string;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [publishOpen, setPublishOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    setLoading(true);
    try {
      await api.post(`/review/submissions/${itemId}/publish`);
      toast("已通过并发布，收藏馆与地图已同步更新", "success");
      setPublishOpen(false);
      onUpdated();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  const returnItem = async (reason: string) => {
    setLoading(true);
    try {
      await api.post(`/review/submissions/${itemId}/return`, { reason });
      toast("已退回补充，投稿者可以看到原因", "success");
      setReturnOpen(false);
      onUpdated();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  if (status !== "pending") {
    const message =
      status === "published"
        ? "已发布内容在本期仅供查看，不提供拒绝或下架操作。如需下线，由投稿者本人撤回。"
        : status === "needs_changes"
          ? "已退回补充，等待投稿者修改并重新提交。"
          : "这条投稿已由投稿者撤回，仅可查看。";
    return (
      <div className="review-readonly">
        <h3 className="aside-title">
          <Icon name="lock" size={15} />
          只读状态
        </h3>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div className="review-actions">
      <h3 className="aside-title">审核操作</h3>
      <p className="review-actions-note">
        核對核心信息、音频和录音授权声明即可判断；选填资料缺失本身不是退回理由。
      </p>
      <button type="button" className="btn btn-primary btn-wide" onClick={() => setPublishOpen(true)}>
        <Icon name="check" size={17} />
        通过并发布
      </button>
      <button type="button" className="btn btn-outline btn-wide" onClick={() => setReturnOpen(true)}>
        <Icon name="edit" size={16} />
        退回补充
      </button>
      <p className="aside-fineprint">审核记录只追加，不可修改或删除。</p>

      {publishOpen ? (
        <ConfirmDialog
          title="确认通过并发布？"
          description={`《${title}》将进入公开收藏馆、详情页和方言地图，音频会复制到公开媒体区。主视觉、字幕等选填资料缺失不影响发布。`}
          confirmText="确认发布"
          loading={loading}
          onConfirm={publish}
          onClose={() => !loading && setPublishOpen(false)}
        />
      ) : null}

      {returnOpen ? (
        <ReasonDialog
          loading={loading}
          onSubmit={returnItem}
          onClose={() => !loading && setReturnOpen(false)}
        />
      ) : null}
    </div>
  );
}