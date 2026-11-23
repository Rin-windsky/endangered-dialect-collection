"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { ItemCard, LanguageOption, Paginated, RegionOption } from "@/lib/types";
import { CONTENT_TYPE_LABEL, PAGE_LIMIT } from "@/lib/constants";
import { FilterBar, type CollectionFilters } from "@/components/collections/FilterBar";
import { ItemCard as ItemCardView } from "@/components/collections/ItemCard";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui/State";
import { Pagination } from "@/components/ui/Pagination";
import { Icon } from "@/components/ui/Icon";

type Parsed = { filters: CollectionFilters; page: number };

function parseParams(key: string): Parsed {
  const params = new URLSearchParams(key);
  const sort = params.get("sort") === "featured" ? "featured" : "latest";
  return {
    filters: {
      q: params.get("q") ?? "",
      type: params.get("type") ?? "",
      languageId: params.get("languageId") ?? "",
      regionId: params.get("regionId") ?? "",
      sort,
    },
    page: Math.max(1, Number(params.get("page")) || 1),
  };
}

function buildQuery(filters: CollectionFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.languageId) params.set("languageId", filters.languageId);
  if (filters.regionId) params.set("regionId", filters.regionId);
  if (filters.sort === "featured") params.set("sort", "featured");
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function CollectionsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const key = searchParams.toString();
  const { filters, page } = useMemo(() => parseParams(key), [key]);

  const [data, setData] = useState<Paginated<ItemCard> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<LanguageOption[]>("/languages?scope=public"),
      api.get<RegionOption[]>("/regions?scope=public"),
    ])
      .then(([languageOptions, regionOptions]) => {
        if (!active) return;
        setLanguages(languageOptions);
        setRegions(regionOptions);
      })
      .catch(() => {
        // Filter options failing should not block the archive list.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const query = new URLSearchParams(key);
    query.set("limit", String(PAGE_LIMIT));
    api
      .get<Paginated<ItemCard>>(`/collections?${query.toString()}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, "收藏馆加载失败"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, attempt]);

  const apply = (patch: Partial<CollectionFilters>, nextPage = 1) => {
    const merged = { ...filters, ...patch };
    const query = buildQuery(merged, nextPage);
    router.replace(query ? `/collections?${query}` : "/collections", { scroll: false });
  };

  const reset = () => router.replace("/collections", { scroll: false });

  const goPage = (nextPage: number) => {
    apply({}, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.q) chips.push({ label: `搜索：${filters.q}`, onRemove: () => apply({ q: "" }) });
  if (filters.type) {
    const label = CONTENT_TYPE_LABEL[filters.type as keyof typeof CONTENT_TYPE_LABEL];
    if (label) chips.push({ label, onRemove: () => apply({ type: "" }) });
  }
  if (filters.languageId) {
    const language = languages.find((entry) => entry.id === filters.languageId);
    chips.push({ label: language?.name ?? "已选方言", onRemove: () => apply({ languageId: "" }) });
  }
  if (filters.regionId) {
    const region = regions.find((entry) => entry.id === filters.regionId);
    chips.push({ label: region?.name ?? "已选地区", onRemove: () => apply({ regionId: "" }) });
  }
  if (filters.sort === "featured") chips.push({ label: "精选优先", onRemove: () => apply({ sort: "latest" }) });

  return (
    <div className="collections-view">
      <div className="container">
        <header className="page-head">
          <div className="page-head-main">
            <p className="eyebrow">ARCHIVE · 公开收藏</p>
            <h1 className="page-title">收藏馆</h1>
            <p className="page-lead">
              一段录音，一句方言，一件被认真收藏的地方记忆。
              在这里搜索、筛选，然后按下播放键。
            </p>
          </div>
          <div className="page-head-side">
            <span className="page-count">
              <strong>{loading ? "—" : data?.total ?? 0}</strong>
              件公开收藏
            </span>
            <span className="page-count-note">每页 {PAGE_LIMIT} 件</span>
          </div>
        </header>

        <FilterBar
          filters={filters}
          languages={languages}
          regions={regions}
          onChange={(patch) => apply(patch)}
          onReset={reset}
        />

        {chips.length ? (
          <div className="active-chips" aria-label="当前筛选条件">
            {chips.map((chip) => (
              <button key={chip.label} type="button" className="active-chip" onClick={chip.onRemove}>
                {chip.label}
                <Icon name="close" size={12} />
              </button>
            ))}
            <button type="button" className="active-chip clear" onClick={reset}>清除全部</button>
          </div>
        ) : null}

        <div className="collections-body">
          {loading ? (
            <SkeletonGrid count={6} />
          ) : error ? (
            <ErrorState description={error} onRetry={() => setAttempt((value) => value + 1)} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon="search"
              title="没有找到符合条件的收藏品"
              description="试试换一个关键词，或去掉一些筛选条件。"
              action={
                <button type="button" className="btn btn-outline btn-sm" onClick={reset}>
                  重置筛选
                </button>
              }
            />
          ) : (
            <>
              <div className="grid-list">
                {data.items.map((item, index) => (
                  <ItemCardView key={item.id} item={item} index={index} />
                ))}
              </div>
              <Pagination page={page} limit={data.limit} total={data.total} onChange={goPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}