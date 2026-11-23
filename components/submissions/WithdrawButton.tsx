"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { ItemStatus } from "@/lib/types";
import { useToast } from "@/lib/providers/toast-provider";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";

export function WithdrawButton({
  itemId,
  status,
  onWithdrawn,
  variant = "default",
}: {
  itemId: string;
  status: ItemStatus;
  onWithdrawn: () => void;
  variant?: "default" | "small" | "wide";
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (status === "withdrawn") return null;

  const withdraw = async () => {
    setLoading(true);
    try {
      await api.post(`/submissions/${itemId}/withdraw`);
      toast("投稿已撤回", "success");
      setOpen(false);
      onWithdrawn();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost ${variant === "small" ? "btn-sm" : ""} ${variant === "wide" ? "btn-wide" : ""} withdraw-btn`}
        onClick={() => setOpen(true)}
      >
        <Icon name="close" size={15} />
        撤回投稿
      </button>
      {open ? (
        <ConfirmDialog
          title="确认撤回这条投稿？"
          description={
            status === "published"
              ? "撤回后，收藏馆、详情页和地图将立即不再展示这条内容，公开的音频与主视觉地址也会失效。撤回不可恢复，如需重新投稿请创建新的收藏品。"
              : "撤回后状态将变为「已撤回」，不能恢复。如需重新投稿，需要创建新的收藏品。"
          }
          confirmText="确认撤回"
          tone="danger"
          loading={loading}
          onConfirm={withdraw}
          onClose={() => !loading && setOpen(false)}
        />
      ) : null}
    </>
  );
}