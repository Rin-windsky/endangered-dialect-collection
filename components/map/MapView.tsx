"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import type { MapRegion } from "@/lib/types";
import { ChinaMap } from "@/components/map/ChinaMap";
import { ErrorState, LoadingBlock } from "@/components/ui/State";
import { Icon } from "@/components/ui/Icon";

export function MapView() {
  const router = useRouter();
  const [regions, setRegions] = useState<MapRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<MapRegion[]>("/map/regions")
      .then((payload) => {
        if (active) setRegions(payload);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, "地图数据加载失败"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const sorted = useMemo(() => [...regions].sort((a, b) => b.count - a.count), [regions]);
  const total = useMemo(() => regions.reduce((sum, region) => sum + region.count, 0), [regions]);
  const hovered = regions.find((region) => region.regionId === hoveredId) ?? null;
  const maxCount = Math.max(1, ...regions.map((region) => region.count));

  const open = (region: MapRegion) => {
    router.push(`/collections?regionId=${encodeURIComponent(region.regionId)}`);
  };

  return (
    <div className="map-view">
      <div className="container">
        <header className="page-head map-head">
          <div className="page-head-main">
            <p className="eyebrow">ATLAS · 方言地图</p>
            <h1 className="page-title">乡音地图</h1>
            <p className="page-lead">
              声音是有地理形状的。颜色越深的地方，被收藏的乡音越多。
              点一点省份，去听那片土地上的话。
            </p>
          </div>
          {!loading && !error ? (
            <div className="map-stats">
              <div>
                <strong className="tnum">{regions.length}</strong>
                <span>个省级地区有收藏</span>
              </div>
              <div>
                <strong className="tnum">{total}</strong>
                <span>件公开声音</span>
              </div>
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="map-panel-loading">
            <LoadingBlock label="正在读取地图与收藏数据" />
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={() => setAttempt((value) => value + 1)} />
        ) : regions.length === 0 ? (
          <div className="map-empty">
            <p className="state-title">地图上还没有被点亮的地方</p>
            <p className="state-desc">第一段公开的录音，会在这里留下第一个颜色。</p>
            <Link href="/submit" className="btn btn-primary btn-sm">
              成为第一个讲述者
            </Link>
          </div>
        ) : (
          <div className="map-layout">
            <div className="map-stage">
              <ChinaMap
                regions={regions}
                selectedId={hoveredId}
                onSelect={open}
                onHover={setHoveredId}
              />
              <div className="map-legend" aria-hidden="true">
                <span>收藏较少</span>
                <i className="map-legend-bar" />
                <span>收藏较多</span>
              </div>
              <div className="map-hint">
                {hovered ? (
                  <>
                    <strong>{hovered.name}</strong>
                    <span>{hovered.count} 件收藏 · 点击进入</span>
                  </>
                ) : (
                  <>
                    <strong>点击省份</strong>
                    <span>查看该地区的全部声音</span>
                  </>
                )}
              </div>
            </div>

            <aside className="map-list" aria-label="有收藏的地区列表">
              <div className="map-list-head">
                <h2>被点亮的地区</h2>
                <span>按收藏数排序</span>
              </div>
              <ol className="region-list">
                {sorted.map((region, index) => (
                  <li key={region.regionId}>
                    <Link
                      href={`/collections?regionId=${encodeURIComponent(region.regionId)}`}
                      className={`region-row${hoveredId === region.regionId ? " is-active" : ""}`}
                      onMouseEnter={() => setHoveredId(region.regionId)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <span className="region-index tnum">{String(index + 1).padStart(2, "0")}</span>
                      <span className="region-main">
                        <span className="region-name">{region.name}</span>
                        <span className="region-bar">
                          <i style={{ width: `${Math.max(8, (region.count / maxCount) * 100)}%` }} />
                        </span>
                      </span>
                      <span className="region-count tnum">{region.count} 件</span>
                      <Icon name="arrow-right" size={13} />
                    </Link>
                  </li>
                ))}
              </ol>
              <p className="map-list-note">
                仅展示已公开收藏的地区。没有出现的省份，安静地等待第一段乡音。
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}