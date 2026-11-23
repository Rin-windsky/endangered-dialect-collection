"use client";

import { useEffect, useState } from "react";
import type { LanguageOption, RegionOption } from "@/lib/types";
import { CONTENT_TYPES, cx } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";

export type CollectionFilters = {
  q: string;
  type: string;
  languageId: string;
  regionId: string;
  sort: "latest" | "featured";
};

export function FilterBar({
  filters,
  languages,
  regions,
  onChange,
  onReset,
}: {
  filters: CollectionFilters;
  languages: LanguageOption[];
  regions: RegionOption[];
  onChange: (patch: Partial<CollectionFilters>) => void;
  onReset: () => void;
}) {
  const [search, setSearch] = useState(filters.q);

  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (search === filters.q) return;
    const timer = window.setTimeout(() => {
      onChange({ q: search });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasActive = Boolean(filters.q || filters.type || filters.languageId || filters.regionId || filters.sort !== "latest");

  return (
    <div className="filter-bar">
      <form
        className="search-box"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onChange({ q: search });
        }}
      >
        <Icon name="search" size={18} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="搜索标题、方言或地区"
          aria-label="搜索收藏品"
          maxLength={50}
        />
        {search ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => setSearch("")}
            aria-label="清空搜索"
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </form>

      <div className="filter-selects">
        <label className="select-wrap">
          <span className="select-label">类型</span>
          <select
            className="select"
            value={filters.type}
            onChange={(event) => onChange({ type: event.target.value })}
            aria-label="按内容类型筛选"
          >
            <option value="">全部类型</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <Icon name="chevron-down" size={14} className="select-chevron" />
        </label>

        <label className="select-wrap">
          <span className="select-label">方言</span>
          <select
            className="select"
            value={filters.languageId}
            onChange={(event) => onChange({ languageId: event.target.value })}
            aria-label="按方言筛选"
          >
            <option value="">全部方言</option>
            {languages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name}{language.count != null ? `（${language.count}）` : ""}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={14} className="select-chevron" />
        </label>

        <label className="select-wrap">
          <span className="select-label">地区</span>
          <select
            className="select"
            value={filters.regionId}
            onChange={(event) => onChange({ regionId: event.target.value })}
            aria-label="按地区筛选"
          >
            <option value="">全部地区</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}{region.count != null ? `（${region.count}）` : ""}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={14} className="select-chevron" />
        </label>

        <div className="sort-group" role="group" aria-label="排序">
          <button
            type="button"
            className={cx("sort-btn", filters.sort === "latest" && "is-active")}
            onClick={() => onChange({ sort: "latest" })}
          >
            最新
          </button>
          <button
            type="button"
            className={cx("sort-btn", filters.sort === "featured" && "is-active")}
            onClick={() => onChange({ sort: "featured" })}
          >
            精选优先
          </button>
        </div>

        {hasActive ? (
          <button type="button" className="btn btn-text btn-sm filter-reset" onClick={onReset}>
            <Icon name="refresh" size={14} />
            重置
          </button>
        ) : null}
      </div>
    </div>
  );
}